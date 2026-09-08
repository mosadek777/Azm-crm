// Syncs tools/tasks.json to the ClickUp list named in its `listId`.
//
// IDEMPOTENT BY DESIGN. Each node in tasks.json carries a `clickupId`, initially
// null. The first run CREATES a ClickUp task for every node and writes the
// returned id back into tasks.json. Every subsequent run reads that id and
// UPDATES the existing task instead of creating a new one — so running this
// repeatedly as the codebase changes produces no duplicates, only a synced
// name, status, description and tag set.
//
// This is the same pattern as spec 002's ticket reference (a stored value read
// back, never recomputed) and it exists for the same reason: deriving "which
// ClickUp task is this" from the name would break the moment two tasks share a
// name, or a name is edited on either side.
//
// STRUCTURE. tasks.json is a two-level tree: top-level tasks, each optionally
// holding `subtasks`. Parents are synced first so a child always has a parent
// id to attach to. ClickUp's PUT /task accepts `parent`, so a task that already
// exists at the top level is MOVED under its parent rather than recreated —
// which is how the earlier flat board was restructured without deleting
// anything or orphaning an id.
//
// RETIRING. A subtask CANNOT be promoted back to a top-level task. PUT /task
// with `parent: null` — and with `parent: ""` — answers 200 and leaves the
// parent exactly where it was; this was verified against throwaway tasks on the
// live list rather than assumed from the documentation. So when a child has to
// become a top-level task, tasks.json clears its `clickupId` and pushes the old
// id onto `retiredIds`. This script deletes those ids before syncing and then
// empties the list, so the board never carries both the old subtask and its
// replacement. A retired id that no longer exists is not an error — the delete
// is idempotent by intent.
//
// TAGS. ClickUp's v2 PUT /task silently ignores a `tags` field: tags only apply
// on create, or through the dedicated tag endpoints. So updates reconcile tags
// explicitly — add what is missing, remove what is no longer wanted. Passing
// them in the PUT body and assuming it worked is exactly the kind of unverified
// "done" this project is trying not to produce.
//
// Requires CLICKUP_TOKEN in backend/.env. That file is gitignored and the token
// is never written into tasks.json or any other tracked file.
//
// Usage:  node tools/sync-clickup.js

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// No dependency on the `dotenv` package here on purpose: this script lives in
// tools/, outside backend/'s node_modules resolution, so importing a package
// installed only in backend/ fails at the module graph rather than at runtime.
// A few lines of manual parsing avoid making tools/ a second npm project just
// to read one file.
const readEnvFile = (path) => {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return out
}

const env = readEnvFile(join(__dirname, '../backend/.env'))
const TOKEN = env.CLICKUP_TOKEN
const TASKS_PATH = join(__dirname, 'tasks.json')

if (!TOKEN) {
  console.error('CLICKUP_TOKEN is not set in backend/.env — nothing to sync.')
  console.error('Add it there (the file is gitignored); never hardcode it here.')
  process.exit(1)
}

const API = 'https://api.clickup.com/api/v2'
const headers = { Authorization: TOKEN, 'Content-Type': 'application/json' }

// The three statuses a default ClickUp list ships with, confirmed against the
// target list before this mapping was written. tasks.json describes THIS
// project's states; the translation into one list's configuration belongs here,
// not in the task data.
const STATUS_MAP = {
  done: 'complete',
  'in progress': 'in progress',
  'not started': 'to do'
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// The board is now 84 nodes and each one costs two or three calls, which is
// past ClickUp's per-minute allowance. A 429 is a normal part of a full sync,
// not a failure: wait for the window the response names and try again. Without
// this a large sync half-completes and the ids it did not reach are written on
// the next run instead, which is how duplicates start.
const request = async (path, options = {}, attempt = 0) => {
  const res = await fetch(`${API}${path}`, { ...options, headers })
  if (res.status === 429 && attempt < 5) {
    const reset = Number(res.headers.get('x-ratelimit-reset'))
    const wait = Number.isFinite(reset) && reset > 0
      ? Math.max(1000, reset * 1000 - Date.now())
      : (attempt + 1) * 10000
    console.log(`  rate limited — waiting ${Math.ceil(wait / 1000)}s`)
    await sleep(Math.min(wait, 70000))
    return request(path, options, attempt + 1)
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(`ClickUp ${options.method ?? 'GET'} ${path} -> ${res.status}: ${JSON.stringify(body)}`)
  }
  return body
}

const buildDescription = (node) => {
  const parts = [node.description]
  if (node.blocker) parts.push(`**Blocked by:** ${node.blocker}`)
  parts.push(`**Tags:** ${node.tags.join(', ')}`)
  parts.push('_Synced from tools/tasks.json — edit there, not here._')
  return parts.join('\n\n')
}

// ClickUp encodes the tag name into the URL path, so a name with a space or a
// slash would need encoding. Ours are single words, but encode anyway rather
// than relying on that staying true.
const addTag = (id, tag) => request(`/task/${id}/tag/${encodeURIComponent(tag)}`, { method: 'POST' })
const removeTag = (id, tag) => request(`/task/${id}/tag/${encodeURIComponent(tag)}`, { method: 'DELETE' })

const reconcileTags = async (id, wanted) => {
  const task = await request(`/task/${id}`)
  const current = (task.tags ?? []).map(t => t.name)
  let changed = 0
  for (const tag of wanted) {
    if (!current.includes(tag)) { await addTag(id, tag); changed++ }
  }
  for (const tag of current) {
    if (!wanted.includes(tag)) { await removeTag(id, tag); changed++ }
  }
  return changed
}

const counts = { created: 0, updated: 0, retagged: 0, failed: 0 }

const sync = async (node, listId, parentId = null) => {
  const payload = {
    name: node.name,
    description: buildDescription(node),
    status: STATUS_MAP[node.status] ?? node.status
  }
  // `parent` on PUT moves an existing task under a parent; on POST it creates
  // the task as a subtask directly.
  if (parentId) payload.parent = parentId

  if (node.clickupId) {
    await request(`/task/${node.clickupId}`, { method: 'PUT', body: JSON.stringify(payload) })
    counts.updated++
    const retagged = await reconcileTags(node.clickupId, node.tags)
    if (retagged) counts.retagged++
    console.log(`  updated  ${node.key.padEnd(28)} -> ${node.clickupId}${retagged ? `  (tags: ${retagged} change${retagged > 1 ? 's' : ''})` : ''}`)
  } else {
    // Created once. Tags apply on create, so no reconcile pass is needed here.
    const res = await request(`/list/${listId}/task`, { method: 'POST', body: JSON.stringify({ ...payload, tags: node.tags }) })
    node.clickupId = res.id
    counts.created++
    console.log(`  created  ${node.key.padEnd(28)} -> ${node.clickupId}`)
  }
  return node.clickupId
}

const run = async () => {
  const config = JSON.parse(readFileSync(TASKS_PATH, 'utf8'))

  // A duplicated id would mean two nodes updating the same ClickUp task and one
  // of them losing silently — the exact failure the write-back is meant to
  // prevent. Refuse before touching the API rather than half-syncing.
  const seen = new Map()
  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.clickupId) {
        if (seen.has(n.clickupId)) {
          console.error(`Duplicate clickupId ${n.clickupId} on '${n.key}' and '${seen.get(n.clickupId)}' — refusing to sync.`)
          process.exit(1)
        }
        seen.set(n.clickupId, n.key)
      }
      if (n.subtasks) walk(n.subtasks)
    }
  }
  walk(config.tasks)

  // Ids are written back after every node, not batched at the end, so a failure
  // partway through does not lose the ids already assigned and cause the next
  // run to create duplicates of the tasks that succeeded.
  const saveConfig = () => writeFileSync(TASKS_PATH, JSON.stringify(config, null, 2) + '\n')

  // Retire first, create second. A subtask that has become a top-level task is
  // deleted here and recreated below; doing it in this order means the board is
  // never showing both at once.
  if (config.retiredIds?.length) {
    console.log(`Retiring ${config.retiredIds.length} task(s) the file no longer describes:`)
    const survivors = []
    for (const entry of config.retiredIds) {
      const { id, key } = typeof entry === 'string' ? { id: entry, key: '(unnamed)' } : entry
      try {
        await request(`/task/${id}`, { method: 'DELETE' })
        console.log(`  deleted  ${key.padEnd(28)} -> ${id}`)
      } catch (err) {
        // Already gone is the desired end state, so a 404 is success.
        if (/-> 404/.test(err.message)) {
          console.log(`  absent   ${key.padEnd(28)} -> ${id} (nothing to delete)`)
        } else {
          counts.failed++
          survivors.push(entry)
          console.error(`  FAILED   ${key.padEnd(28)} -> ${err.message}`)
        }
      }
    }
    // Only clear the ones actually dealt with, so a failure is retried next run.
    config.retiredIds = survivors
    saveConfig()
    console.log('')
  }

  const save = saveConfig

  for (const parent of config.tasks) {
    try {
      const parentId = await sync(parent, config.listId)
      save()
      for (const child of parent.subtasks ?? []) {
        try {
          await sync(child, config.listId, parentId)
          save()
        } catch (err) {
          counts.failed++
          console.error(`  FAILED   ${child.key.padEnd(28)} -> ${err.message}`)
        }
      }
    } catch (err) {
      // A parent that failed has no id, so its children have nothing to attach
      // to. Skip them rather than creating orphans at the top level.
      counts.failed++
      console.error(`  FAILED   ${parent.key.padEnd(28)} -> ${err.message}`)
      if (parent.subtasks?.length) {
        console.error(`           skipping ${parent.subtasks.length} subtask(s): no parent id to attach to`)
      }
    }
  }

  save()

  const total = config.tasks.length + config.tasks.reduce((a, t) => a + (t.subtasks?.length ?? 0), 0)
  console.log('')
  console.log(`created: ${counts.created}  updated: ${counts.updated}  tag changes on: ${counts.retagged}  failed: ${counts.failed}  total nodes: ${total}`)
  if (counts.created === 0 && counts.failed === 0) {
    console.log('Zero created — every node already had an id. The sync is idempotent.')
  }

  // Read the board back and count what is actually on it. Counting the file we
  // just wrote would only prove the file is self-consistent; the point of the
  // count is whether ClickUp agrees. A task the file no longer describes shows
  // up here as a surplus, which is how a stale card gets noticed.
  console.log('')
  console.log('Board readback — counted from ClickUp, not from tasks.json:')
  const onBoard = []
  for (let page = 0; page < 20; page++) {
    const res = await request(`/list/${config.listId}/task?subtasks=true&include_closed=true&page=${page}`)
    onBoard.push(...(res.tasks ?? []))
    if (res.last_page || (res.tasks ?? []).length === 0) break
  }
  const byStatus = new Map()
  for (const t of onBoard) {
    const s = t.status?.status ?? 'unknown'
    const bucket = byStatus.get(s) ?? { top: 0, sub: 0 }
    t.parent ? bucket.sub++ : bucket.top++
    byStatus.set(s, bucket)
  }
  const pad = Math.max(...[...byStatus.keys()].map(s => s.length), 8)
  for (const [status, b] of [...byStatus].sort((a, z) => (z[1].top + z[1].sub) - (a[1].top + a[1].sub))) {
    console.log(`  ${status.toUpperCase().padEnd(pad)}  ${String(b.top + b.sub).padStart(3)}  (${b.top} task${b.top === 1 ? '' : 's'}, ${b.sub} subtask${b.sub === 1 ? '' : 's'})`)
  }
  console.log(`  ${'TOTAL'.padEnd(pad)}  ${String(onBoard.length).padStart(3)}`)

  const described = new Set()
  for (const t of config.tasks) for (const n of [t, ...(t.subtasks ?? [])]) if (n.clickupId) described.add(n.clickupId)
  const surplus = onBoard.filter(t => !described.has(t.id))
  if (surplus.length) {
    console.log('')
    console.log(`  ${surplus.length} task(s) on the board that tasks.json does not describe:`)
    for (const t of surplus) console.log(`    ${t.id}  ${t.name}`)
    console.log('  Add them to tasks.json or put their ids on retiredIds — the file is the source of truth.')
  } else if (onBoard.length === total) {
    console.log('  The board matches tasks.json exactly: no surplus, no missing.')
  }

  process.exit(counts.failed > 0 ? 1 : 0)
}

run().catch(err => { console.error(err); process.exit(1) })

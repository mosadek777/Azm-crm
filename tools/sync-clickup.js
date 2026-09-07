// Syncs tools/tasks.json to the ClickUp list named in its `listId`.
//
// IDEMPOTENT BY DESIGN. Each task in tasks.json carries a `clickupId`, initially
// null. The first run CREATES a task in ClickUp for every entry and writes the
// returned id back into tasks.json. Every subsequent run reads that id and
// UPDATES the existing ClickUp task instead of creating a new one — so running
// this repeatedly after the codebase changes never produces duplicates, only a
// synced status and description.
//
// This is the same pattern as spec 002's ticket reference (a stored value read
// back rather than recomputed) and it exists for the same reason: recomputing
// "which ClickUp task is this" from the name alone would break the moment two
// tasks share a name, or a name is edited on either side.
//
// Requires CLICKUP_TOKEN in backend/.env. Never commit that file or this
// script's output containing a token — see tools/.clickup-cache/ in .gitignore.
//
// Usage:  node tools/sync-clickup.js

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// No dependency on the `dotenv` package here on purpose: this script lives in
// tools/, outside backend/'s node_modules resolution, so importing a package
// installed only in backend/ fails at the module graph rather than at runtime.
// A few lines of manual parsing avoid adding tools/ as a second npm project
// just to read one file.
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
  process.exit(1)
}

const API = 'https://api.clickup.com/api/v2'

const headers = {
  Authorization: TOKEN,
  'Content-Type': 'application/json'
}

// ClickUp's built-in statuses vary per list configuration. These two names are
// what a default ClickUp list ships with; if the target list uses custom
// statuses, override the mapping here rather than in the task data, so
// tasks.json stays a description of THIS project, not of one ClickUp list's
// configuration.
const STATUS_MAP = {
  done: 'complete',
  'not started': 'to do'
}

const request = async (path, options = {}) => {
  const res = await fetch(`${API}${path}`, { ...options, headers })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(`ClickUp ${options.method ?? 'GET'} ${path} -> ${res.status}: ${JSON.stringify(body)}`)
  }
  return body
}

const buildDescription = (task) => {
  const tagLine = `**Tags:** ${task.tags.join(', ')}`
  return `${task.description}\n\n${tagLine}\n\n_Synced from tools/tasks.json — edit there, not here._`
}

const run = async () => {
  const config = JSON.parse(readFileSync(TASKS_PATH, 'utf8'))
  let created = 0
  let updated = 0
  let failed = 0

  for (const task of config.tasks) {
    const payload = {
      name: task.name,
      description: buildDescription(task),
      status: STATUS_MAP[task.status] ?? task.status,
      tags: task.tags
    }

    try {
      if (task.clickupId) {
        // UPDATE. The id already exists — never re-create.
        await request(`/task/${task.clickupId}`, { method: 'PUT', body: JSON.stringify(payload) })
        updated++
        console.log(`  updated  ${task.key.padEnd(24)} -> ${task.clickupId}`)
      } else {
        // CREATE, once. The returned id is written back immediately after
        // each call, not batched at the end — so a failure partway through a
        // large run does not lose the ids already assigned.
        const res = await request(`/list/${config.listId}/task`, { method: 'POST', body: JSON.stringify(payload) })
        task.clickupId = res.id
        created++
        console.log(`  created  ${task.key.padEnd(24)} -> ${task.clickupId}`)
        writeFileSync(TASKS_PATH, JSON.stringify(config, null, 2) + '\n')
      }
    } catch (err) {
      failed++
      console.error(`  FAILED   ${task.key.padEnd(24)} -> ${err.message}`)
    }
  }

  // Final write, in case only updates ran (no ids were assigned mid-loop).
  writeFileSync(TASKS_PATH, JSON.stringify(config, null, 2) + '\n')

  console.log('')
  console.log(`created: ${created}  updated: ${updated}  failed: ${failed}  total: ${config.tasks.length}`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => { console.error(err); process.exit(1) })

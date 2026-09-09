// spec 010 — implements the backup half of FR-017
//
// "The system MUST be backed up such that the agreed RPO and RTO are met, MUST
// support point-in-time restore, and MUST have a restore drill performed before
// go-live and at the configured interval." (`NFR-008`: before go-live, then at
// least quarterly.)
//
// ⚠ WHAT THIS DOES AND DOES NOT SATISFY.
//
// It takes a consistent, restorable snapshot of the database and proves the
// snapshot restores (see restore-drill.js). That is the part that is usually
// skipped and it is the part that matters.
//
// It does NOT satisfy FR-017 on its own, and saying so is the point:
//
//   - **No agreed RPO or RTO.** `010 [CLARIFY-5]` is open, and `NFR-007` reads
//     "Per [CLARIFY-5] — currently unspecified". A snapshot every N hours meets
//     a recovery-point objective only once somebody has said what N may be.
//     Until then this is a backup with no stated promise attached.
//   - **No point-in-time restore.** That needs continuous capture of the oplog,
//     not periodic snapshots. A snapshot restores to the moment it was taken;
//     everything after it is lost. Building oplog capture against a laptop
//     would be work thrown away once hosting is decided.
//   - **The snapshot is written to local disk by default.** A backup on the same
//     machine as the database is not a backup. Point BACKUP_DIR at other
//     storage before this counts for anything.
//
// REQUIRES the MongoDB Database Tools (`mongodump`), which ship separately from
// the server. If they are absent this fails with the install command rather
// than half-working.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import 'dotenv/config'
import { DB_NAME } from '../DB/connection.db.js'

// The tools are not on PATH on a default Windows install, so look where the
// installer puts them before giving up.
const CANDIDATES = [
  'mongodump',
  'C:/Program Files/MongoDB/Tools/100/bin/mongodump.exe',
  'C:/Program Files/MongoDB/Tools/bin/mongodump.exe'
]

export const findTool = (name) => {
  if (process.env.MONGO_TOOLS_DIR) {
    const explicit = join(process.env.MONGO_TOOLS_DIR, `${name}.exe`)
    if (existsSync(explicit)) return explicit
    const bare = join(process.env.MONGO_TOOLS_DIR, name)
    if (existsSync(bare)) return bare
  }
  for (const c of CANDIDATES.map(p => p.replace('mongodump', name))) {
    if (c === name) continue
    if (existsSync(c)) return c
  }
  // Try bare name last: it works if the tools are on PATH.
  return name
}

export const toolMissingMessage = (name) => [
  `${name} was not found.`,
  '',
  'The MongoDB Database Tools are a SEPARATE download from the MongoDB server —',
  'installing the server does not install them. Nothing here can back up or',
  'restore without them.',
  '',
  '  winget install MongoDB.DatabaseTools',
  '',
  'or download from https://www.mongodb.com/try/download/database-tools and set',
  'MONGO_TOOLS_DIR in backend/.env to the bin directory.'
].join('\n')

export const run = (cmd, args) => new Promise((resolvePromise) => {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  let out = '', err = ''
  child.stdout.on('data', d => { out += d })
  child.stderr.on('data', d => { err += d })
  child.on('error', e => resolvePromise({ code: -1, out, err: e.message }))
  child.on('close', code => resolvePromise({ code, out, err }))
})

const dirSize = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((total, e) => {
  const p = join(dir, e.name)
  return total + (e.isDirectory() ? dirSize(p) : statSync(p).size)
}, 0)

export const takeBackup = async ({ quiet = false } = {}) => {
  const tool = findTool('mongodump')
  const root = resolve(process.env.BACKUP_DIR ?? join(process.cwd(), 'backups'))
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const target = join(root, stamp)
  mkdirSync(target, { recursive: true })

  // ⚠ NO --oplog, AND THAT IS A REAL LIMITATION, NOT A TIDY-UP.
  //
  // `--oplog` is what makes a dump consistent to a single instant rather than
  // smeared across the minutes it takes to run. mongodump refuses it on a
  // scoped dump — "--oplog mode only supported on full dumps" — so a
  // single-database snapshot cannot have it.
  //
  // The consequence matters here more than it would in most projects.
  // Constitution II couples every mutation to its audit entry through a
  // transaction; a smeared dump could copy the `tickets` collection before a
  // write and the `auditentries` collection after it, producing a restored
  // database in which that coupling appears broken. The pairing is not lost —
  // both records exist in the live database — but the SNAPSHOT can straddle it.
  //
  // Two ways out, both of which wait on the hosting decision:
  //   - dump the whole instance with --oplog, which is what a real backup job
  //     would do, and which is only sensible once the instance holds this
  //     application alone;
  //   - use a managed provider's continuous backup, which handles it.
  //
  // Until then `npm run audit:reconcile` against a restored copy is the check
  // that would catch a straddled pair, and the drill reports counts so a
  // mismatch is at least visible.
  const args = ['--uri', process.env.MONGO_URI, '--db', DB_NAME, '--out', target]
  const res = await run(tool, args)

  if (res.code === -1 && /ENOENT|not found/i.test(res.err)) {
    throw new Error(toolMissingMessage('mongodump'))
  }
  if (res.code !== 0) throw new Error(`mongodump exited ${res.code}\n${res.err}`)

  const bytes = dirSize(target)
  if (bytes === 0) throw new Error(`mongodump wrote nothing to ${target} — refusing to call that a backup`)

  if (!quiet) {
    console.log(`backup written : ${target}`)
    console.log(`size           : ${(bytes / 1024).toFixed(1)} KiB`)
    console.log(`database       : ${DB_NAME}`)
    console.log('')
    console.log('⚠ This is on the same machine as the database. Set BACKUP_DIR to')
    console.log('  separate storage before treating it as a backup.')
    console.log('⚠ No RPO or RTO is agreed (010 [CLARIFY-5]), so this snapshot')
    console.log('  carries no stated recovery promise.')
  }
  return { target, bytes }
}

// Run directly:  npm run backup
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  takeBackup().catch(err => { console.error(err.message); process.exit(1) })
}

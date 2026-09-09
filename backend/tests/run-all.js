// npm test — runs every acceptance suite in backend/tests/, each against a
// freshly dropped database and a freshly started server.
//
// WHY A FULL RESET PER SUITE, NOT ONE AT THE START
//
// Every suite builds its own fixtures, and they overlap: each creates its own
// `sara@azmsquad.com`. Run two in sequence against one database and the second
// suite's user creation fails silently on the duplicate email, the suite then
// signs in as the FIRST suite's Sara — who is scoped to a different branch —
// and the failure surfaces later as a scope assertion that looks like a genuine
// bug in the scope predicate. It is not. It is fixture collision, and it cost
// real time to diagnose once already.
//
// Making the suites share fixtures would be the other fix. That is worse: it
// couples them, so a change to one suite's setup breaks another, and it makes
// any single suite un-runnable on its own. Resetting is cheap (a drop and a
// process start, about two seconds) and it makes each suite independently
// meaningful.
//
// WHY THE SERVER RESTARTS TOO, RATHER THAN STAYING UP
//
// Dropping the database drops its indexes with it. Mongoose builds indexes when
// a model is compiled at startup, not on demand — so a long-lived server after
// a drop serves a database with no indexes. The unique partial index behind
// "one primary contact point per channel type" would simply not exist, and the
// customer suite would pass while enforcing nothing. That constraint has
// already gone silently missing once, when two indexes collided on a generated
// name, so it is not a hypothetical.
//
// Usage:  npm test              (from backend/)
//         npm test -- ticket    (only suites whose filename contains "ticket")

import 'dotenv/config'
import { spawn } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { DB_NAME } from '../src/DB/connection.db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendDir = join(__dirname, '..')

const PORT = process.env.PORT ?? 3000
const BASE_URL = `http://localhost:${PORT}`

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not set in backend/.env — refusing to run.')
  process.exit(1)
}

// Suites run in this order. Order does not matter for correctness — each gets a
// clean database — but scope first means a broken scope predicate reports
// against the smallest suite rather than as noise inside the ticket run.
const ORDER = ['scope.test.js', 'customer.test.js', 'ticket.test.js', 'portal.test.js', 'security.test.js']

const filter = process.argv[2]
const suites = readdirSync(__dirname)
  .filter(f => f.endsWith('.test.js'))
  .sort((a, b) => {
    const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b)
  })
  .filter(f => !filter || f.includes(filter))

if (!suites.length) {
  console.error(filter ? `No suite matches "${filter}".` : 'No *.test.js files in backend/tests/.')
  process.exit(1)
}

// No `shell: true`. Everything spawned here is process.execPath with a fixed
// argument list, so a shell buys nothing and Node warns about it (DEP0190):
// under a shell the arguments are concatenated rather than escaped.
const run = (cmd, args, opts = {}) => new Promise((resolve) => {
  const child = spawn(cmd, args, { cwd: backendDir, ...opts })
  child.on('close', code => resolve(code ?? 1))
})

const dropDatabase = async () => {
  // Connected with an explicit dbName, deliberately: MONGO_URI names no
  // database, so omitting it here would drop `test` while the app uses DB_NAME.
  await mongoose.connect(process.env.MONGO_URI, { dbName: DB_NAME })
  await mongoose.connection.db.dropDatabase()
  await mongoose.disconnect()
}

const waitFor = async (predicate, { timeoutMs, everyMs = 250 }) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) return true
    await new Promise(r => setTimeout(r, everyMs))
  }
  return false
}

const serverAnswers = async () => {
  try {
    const res = await fetch(BASE_URL + '/', { signal: AbortSignal.timeout(1000) })
    return res.ok
  } catch { return false }
}

const startServer = async () => {
  const child = spawn(process.execPath, ['index.js'], {
    cwd: backendDir,
    stdio: ['ignore', 'ignore', 'pipe']   // stderr kept: a crash should be visible
  })
  let stderr = ''
  child.stderr.on('data', d => { stderr += d.toString() })

  const up = await waitFor(serverAnswers, { timeoutMs: 30000 })
  if (!up) {
    child.kill()
    console.error(`\nThe server did not answer on ${BASE_URL} within 30s.`)
    if (stderr.trim()) console.error(stderr.trim())
    else console.error('Is mongod running as a replica set? Transactions require one.')
    process.exit(1)
  }
  return child
}

const stopServer = async (child) => {
  child.kill()
  // The next suite starts a server on the same port, so wait for this one to
  // actually let go rather than racing it into EADDRINUSE.
  await waitFor(async () => !(await serverAnswers()), { timeoutMs: 10000 })
}

const results = []

for (const suite of suites) {
  console.log('')
  console.log('='.repeat(74))
  console.log(`  ${suite}`)
  console.log('='.repeat(74))

  await dropDatabase()

  const seeded = await run(process.execPath, ['src/utils/seed-admin.js'], { stdio: 'ignore' })
  if (seeded !== 0) {
    console.error('seed-admin failed — check BREAKGLASS_EMAIL and BREAKGLASS_PASSWORD in .env')
    results.push({ suite, code: seeded })
    continue
  }

  const server = await startServer()
  const code = await run(process.execPath, [join('tests', suite)], { stdio: 'inherit' })
  await stopServer(server)

  results.push({ suite, code })
}

// Leave the database empty rather than holding the last suite's fixtures, so a
// developer who runs the app straight afterwards does not mistake test data for
// their own. seed-admin restores the only account needed to sign in.
await dropDatabase()
await run(process.execPath, ['src/utils/seed-admin.js'], { stdio: 'ignore' })

console.log('')
console.log('='.repeat(74))
for (const { suite, code } of results) {
  console.log(`  ${code === 0 ? 'PASS' : 'FAIL'}  ${suite}${code === 0 ? '' : `   (exit ${code})`}`)
}
const failed = results.filter(r => r.code !== 0)
console.log('='.repeat(74))
console.log(failed.length
  ? `${failed.length} of ${results.length} suite(s) FAILED`
  : `all ${results.length} suites passed`)
console.log('database left empty, break-glass administrator re-seeded')

process.exit(failed.length ? 1 : 0)

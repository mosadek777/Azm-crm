// spec 010 — implements the restore-drill half of FR-017 and NFR-008
//
// NFR-008: "Restore drill cadence — before go-live, then at least quarterly."
//
// THE DRILL IS THE POINT. Taking backups is easy and almost everybody does it;
// finding out whether they restore is the step that gets skipped, and the
// discovery that they do not is always made at the worst possible moment. This
// script exists so that "we have backups" is a claim somebody has tested.
//
// IT NEVER TOUCHES THE LIVE DATABASE. The snapshot is restored into a scratch
// database with a generated name, compared against the original collection by
// collection, and then dropped. A drill that restored over production would be
// an outage, not a rehearsal — so `--nsFrom/--nsTo` redirects every namespace
// and the live database is only ever READ.
//
// WHAT IT PROVES:      the snapshot is complete and restorable, and every
//                      collection comes back with the same document count.
// WHAT IT DOES NOT:    that the restore meets a recovery-time objective, because
//                      no RTO has been agreed (010 [CLARIFY-5], NFR-007 empty).
//                      The elapsed time is reported so that when a number is
//                      agreed, there is a measurement to compare it against.

import mongoose from 'mongoose'
import { rmSync } from 'node:fs'
// join is no longer needed: --dir points at the dump root, not the db folder.
import 'dotenv/config'
import { DB_NAME } from '../DB/connection.db.js'
import { takeBackup, findTool, toolMissingMessage, run } from './backup.js'

const drill = async () => {
  const started = Date.now()
  const scratch = `${DB_NAME}_drill_${Date.now()}`
  console.log(`restore drill — ${new Date().toISOString()}`)
  console.log(`source ${DB_NAME}  ->  scratch ${scratch}\n`)

  console.log('1. taking a fresh backup')
  const { target, bytes } = await takeBackup({ quiet: true })
  console.log(`   ${target}  (${(bytes / 1024).toFixed(1)} KiB)`)

  // Count the live data BEFORE restoring, so the comparison is against what was
  // actually there rather than against the dump's own manifest — a dump that
  // silently skipped a collection would otherwise agree with itself.
  await mongoose.connect(process.env.MONGO_URI, { dbName: DB_NAME })
  const live = {}
  for (const c of await mongoose.connection.db.listCollections().toArray()) {
    live[c.name] = await mongoose.connection.db.collection(c.name).countDocuments()
  }
  console.log(`\n2. live database holds ${Object.keys(live).length} collection(s), ` +
              `${Object.values(live).reduce((a, b) => a + b, 0)} document(s)`)

  console.log(`\n3. restoring into ${scratch}`)
  const tool = findTool('mongorestore')
  const res = await run(tool, [
    '--uri', process.env.MONGO_URI,
    '--nsFrom', `${DB_NAME}.*`,
    '--nsTo', `${scratch}.*`,
    '--dir', target,
    '--nsInclude', `${DB_NAME}.*`
  ])
  if (res.code === -1 && /ENOENT|not found/i.test(res.err)) {
    await mongoose.disconnect()
    throw new Error(toolMissingMessage('mongorestore'))
  }
  if (res.code !== 0) {
    await mongoose.disconnect()
    throw new Error(`mongorestore exited ${res.code}\n${res.err}`)
  }

  console.log('\n4. comparing restored data against live, collection by collection')
  const restored = mongoose.connection.useDb(scratch)
  let mismatches = 0
  for (const [name, count] of Object.entries(live).sort()) {
    const got = await restored.collection(name).countDocuments()
    const ok = got === count
    if (!ok) mismatches++
    console.log(`   ${ok ? 'OK  ' : 'DIFF'}  ${name.padEnd(24)} live ${String(count).padStart(5)}   restored ${String(got).padStart(5)}`)
  }

  // A collection the restore invented would not show up above, because the loop
  // walks the LIVE collections. Check the other direction too.
  const extra = (await restored.db.listCollections().toArray())
    .map(c => c.name).filter(n => !(n in live))
  for (const name of extra) { mismatches++; console.log(`   DIFF  ${name.padEnd(24)} not present in live`) }

  console.log(`\n5. dropping ${scratch}`)
  await restored.dropDatabase()
  await mongoose.disconnect()

  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  console.log('')
  if (mismatches === 0) {
    console.log(`RESTORE DRILL PASSED — every collection restored with an identical document count.`)
  } else {
    console.log(`RESTORE DRILL FAILED — ${mismatches} collection(s) did not match.`)
  }
  console.log(`elapsed: ${seconds}s (backup + restore + verify)`)
  console.log('')
  console.log('⚠ This measures a drill on a laptop against a local replica set. It is')
  console.log('  evidence the procedure works, not evidence that any recovery-time')
  console.log('  target is met — none is agreed (010 [CLARIFY-5]).')
  console.log('⚠ NFR-008 requires this before go-live and at least quarterly.')
  console.log('  Nothing schedules it yet; today it is a command somebody runs.')

  // Keep the drill's own snapshot from accumulating on every run.
  if (process.env.BACKUP_KEEP_DRILL !== 'true') rmSync(target, { recursive: true, force: true })

  return mismatches
}

drill()
  .then(m => process.exit(m === 0 ? 0 : 1))
  .catch(err => { console.error('\n' + err.message); process.exit(1) })

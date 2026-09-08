// spec 010 — verifies FR-008, E-11, NFR-005, §13; constitution II
//
// REPORT ONLY. This script never writes, never repairs, never deletes. A
// correction to the audit log is an APPEND of a compensating entry made by a
// person who has understood the discrepancy (FR-008: no role may edit or
// delete an entry), so automatic repair here would be the exact thing the
// append-only rule forbids.
//
// It checks both directions, because they mean opposite things.
//
// DIRECTION 1 — an audit entry with no record. The false positive that
// src/utils/audit.js knowingly permits: on a standalone MongoDB there is no
// transaction, so the writer records first and mutates second, and a mutation
// that fails after its entry was written leaves an entry for something that did
// not happen. Recoverable, and this is what makes it detectable rather than
// theoretical.
//
// DIRECTION 2 — a record with no audit entry. The VIOLATION. Constitution II
// admits no exception, and spec 010 §13 measures "mutations lacking an audit
// entry: 0". Direction 1 is untidiness; direction 2 is a defect in the code
// that wrote the record, because it bypassed src/utils/audit.js.
//
// Once the replica set is in place and the writer uses a transaction, direction
// 1 should be permanently empty. Direction 2 should be empty now.
//
// Run:  npm run audit:reconcile

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectMongoose } from '../DB/connection.db.js'
import { AuditEntry } from '../DB/models/audit-entry.model.js'
import { User } from '../DB/models/user.model.js'
import { RoleAssignment } from '../DB/models/role-assignment.model.js'
import { Branch } from '../DB/models/branch.model.js'
import { Department } from '../DB/models/department.model.js'
import { Customer } from '../DB/models/customer.model.js'
import { ContactPoint } from '../DB/models/contact-point.model.js'
import { Ticket } from '../DB/models/ticket.model.js'
import { Message } from '../DB/models/message.model.js'
import { Counter } from '../DB/models/counter.model.js'
import { PortalIdentity } from '../DB/models/portal-identity.model.js'

// The collections whose creation this system audits. A model absent from here
// is not checked — so adding a model without adding it here is itself a gap,
// and the report says so at the end.
// NOTE ON THE COVERAGE CHECK BELOW. It compares this map against
// `mongoose.modelNames()`, which only lists models this process has IMPORTED.
// So a new model that is never imported here is invisible to the check and the
// report says "0 unchecked" — a false clean. That happened when Customer and
// ContactPoint were added in step 4; both are imported above for that reason.
// Adding a model to the system means adding it here, or the report lies.
const AUDITED = {
  User,
  RoleAssignment,
  Branch,
  Department,
  Customer,
  ContactPoint,
  Ticket,
  Message,
  PortalIdentity
}

// Counter holds no auditable records — it is the reference sequence, not a
// domain entity. Imported above so the coverage check can SEE it and not
// report a false clean; excluded here so it is not expected to have creation
// entries.
const NOT_AUDITABLE = ["Counter"]

// Actions that assert a record now exists. Only these are reconcilable: a
// `permission.refused` entry describes an attempt with no record behind it, and
// an `audit.edit_attempted` entry stores a query filter rather than an id.
const CREATION_ACTIONS = [
  'user.created',
  'role_assignment.granted',
  'branch.created',
  'department.created',
  'customer.created',
  'contact_point.added',
  'ticket.created',
  'message.added',
  'portal_identity.created'
]

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value)
  && String(new mongoose.Types.ObjectId(String(value))) === String(value)

const run = async () => {
  await connectMongoose()

  console.log('')
  console.log('audit reconciliation — spec 010 FR-008 / E-11 / §13')
  console.log('report only; nothing is written or repaired')
  console.log('='.repeat(72))

  // ---- Direction 1: audit entries with no corresponding record ------------
  const claims = await AuditEntry.find({ action: { $in: CREATION_ACTIONS } })
    .sort({ occurredAt: 1 })

  const orphanEntries = []
  let unreconcilable = 0

  for (const entry of claims) {
    const Model = AUDITED[entry.entityType]

    if (!Model || !entry.entityId || !isObjectId(entry.entityId)) {
      unreconcilable++
      continue
    }

    const exists = await Model.exists({ _id: entry.entityId })
    if (!exists) orphanEntries.push(entry)
  }

  console.log('')
  console.log('DIRECTION 1 — audit entry with no record  (the E-11 false positive)')
  console.log(`  creation claims examined : ${claims.length}`)
  console.log(`  not reconcilable         : ${unreconcilable}  (no model mapped, or no object id)`)
  console.log(`  ORPHANED ENTRIES         : ${orphanEntries.length}`)

  for (const entry of orphanEntries) {
    console.log('')
    console.log(`    ${entry.action}  ${entry.entityType} ${entry.entityId}`)
    console.log(`      recorded : ${entry.occurredAt.toISOString()}`)
    console.log(`      actor    : ${entry.actorRef}`)
    console.log(`      entry id : ${entry._id}`)
    console.log('      meaning  : the entry claims this record was created; it does not exist.')
    console.log('      likely   : the mutation failed after its audit entry was written.')
    console.log('      action   : append a compensating entry. DO NOT delete this one.')
  }

  // ---- Direction 2: records with no audit entry ---------------------------
  console.log('')
  console.log('DIRECTION 2 — record with no audit entry  (constitution II VIOLATION)')

  let unaudited = 0

  for (const [name, Model] of Object.entries(AUDITED)) {
    const records = await Model.find({}, { _id: 1, createdAt: 1 })
    const missing = []

    for (const record of records) {
      const entry = await AuditEntry.exists({
        entityType: name,
        entityId: record._id,
        action: { $in: CREATION_ACTIONS }
      })
      if (!entry) missing.push(record)
    }

    const verdict = missing.length === 0 ? 'clean' : `${missing.length} UNAUDITED`
    console.log(`  ${name.padEnd(16)} ${String(records.length).padStart(4)} records   ${verdict}`)

    for (const record of missing) {
      console.log(`      ${name} ${record._id}  created ${record.createdAt?.toISOString() ?? 'unknown'}`)
      console.log('        meaning : this record exists and nothing recorded its creation.')
      console.log('        action  : find the code path that wrote it without utils/audit.js.')
    }

    unaudited += missing.length
  }

  // ---- Coverage of the check itself ---------------------------------------
  const allModels = mongoose.modelNames().filter(n => n !== 'AuditEntry')
  const unchecked = allModels.filter(n => !AUDITED[n] && !NOT_AUDITABLE.includes(n))

  console.log('')
  console.log('COVERAGE — is the check itself complete?')
  console.log(`  models checked   : ${Object.keys(AUDITED).join(', ')}`)
  console.log(`  models UNCHECKED : ${unchecked.length ? unchecked.join(', ') : 'none'}`)
  if (unchecked.length) {
    console.log('    a model missing from AUDITED is a gap in this report, not a clean result.')
  }

  console.log('')
  console.log('='.repeat(72))
  const clean = orphanEntries.length === 0 && unaudited === 0 && unchecked.length === 0
  console.log(clean
    ? 'RECONCILED — 0 orphaned entries, 0 unaudited records, 0 unchecked models'
    : `FINDINGS — ${orphanEntries.length} orphaned, ${unaudited} unaudited, ${unchecked.length} unchecked`)
  console.log('')

  await mongoose.disconnect()

  // Non-zero on findings, so this can gate a release rather than only inform.
  process.exit(clean ? 0 : 1)
}

run().catch(err => { console.error(err); process.exit(1) })

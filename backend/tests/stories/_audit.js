// READ-ONLY audit access, for story tests only.
//
// ⚠ WHY THIS DOES NOT BREAK THE RULE IN tests/db.js.
//
// That file says: "Nothing in this file may be used to ASSERT anything. Every
// assertion goes through the API — a test that both writes and reads the
// database proves only that mongoose works." That rule is right and it still
// holds, because it is about tests that WRITE and READ directly.
//
// Here the write always goes through the API — the real endpoint, the real
// scope predicate, the real audit writer, inside the real transaction. Only the
// OBSERVATION is direct, and it is direct for one reason: **there is no
// endpoint that reads the audit log.** `010 FR-008` requires the trail to
// exist; `010 FR-009` (auditors search and export it) is unbuilt and tracked on
// the board as `audit-viewer`.
//
// So the choice is between asserting the trail this way, or not asserting it at
// all — and "the reason is recorded so nobody wonders later why" is precisely
// the promise that cannot be proven any other way today.
//
// WHEN `audit-viewer` SHIPS, these reads should move to the API and this file
// should shrink to nothing. Until then it is the narrowest possible exception:
// read-only, audit entries only, no writes of any kind.

import mongoose from 'mongoose'
import { DB_NAME } from '../../src/DB/connection.db.js'
import { AuditEntry } from '../../src/DB/models/audit-entry.model.js'

let connected = false

export const openAudit = async () => {
  if (connected) return
  await mongoose.connect(process.env.MONGO_URI, { dbName: DB_NAME })
  connected = true
}

export const closeAudit = async () => {
  if (!connected) return
  await mongoose.disconnect()
  connected = false
}

/** The most recent entry for an action, optionally narrowed to one record. */
export const latest = async (action, entityId = null) => {
  const q = { action }
  if (entityId) q.entityId = new mongoose.Types.ObjectId(String(entityId))
  return AuditEntry.findOne(q).sort({ occurredAt: -1, _id: -1 }).lean()
}

/** Every entry for one record, oldest first — the history a person would read. */
export const historyFor = async (entityId) =>
  AuditEntry.find({ entityId: new mongoose.Types.ObjectId(String(entityId)) })
    .sort({ occurredAt: 1, _id: 1 }).lean()

export const countOf = async (action, entityId = null) => {
  const q = { action }
  if (entityId) q.entityId = new mongoose.Types.ObjectId(String(entityId))
  return AuditEntry.countDocuments(q)
}

/**
 * Attempts to MUTATE an audit entry, and reports what happened. Used to prove
 * the trail is append-only in fact and not merely by convention — `002 FR-013`
 * says "no user or role MAY edit or delete history", and a model hook that is
 * never exercised is a claim, not a guarantee.
 */
export const tryTamper = async (id) => {
  const results = {}
  try { await AuditEntry.updateOne({ _id: id }, { $set: { action: 'tampered' } }); results.update = 'ALLOWED' }
  catch (e) { results.update = 'refused' }
  try { await AuditEntry.deleteOne({ _id: id }); results.delete = 'ALLOWED' }
  catch (e) { results.delete = 'refused' }
  return results
}

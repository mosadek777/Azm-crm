// spec 010 — implements SEC-08, FR-008, AS-08, NFR-005; constitution II
//
// The append-only audit log. This spec defines the audit mechanism every other
// spec relies on, so this shape is the one all twelve others write into.
//
// NO ROLE MAY EDIT OR DELETE AN ENTRY — not agent, not administrator, not the
// application itself. That is enforced below by hooks on every mutating query
// path, not by reviewers remembering. An attempt is refused AND recorded
// (AS-08).
//
// NO TTL INDEX, NO EXPIRY FIELD, NO DELETION PATH. Audit retention is FR-015,
// which is blocked by [CLARIFY-4] (data-protection regime and retention period
// per record type). Adding an expiry here would be implementing FR-015 with a
// guessed number.

import { Schema, model } from 'mongoose'

export const AUDIT_SEVERITY = ['normal', 'high']

const auditEntrySchema = new Schema({
  // §3: "actor_id | ref User | portal identity | `system` | rule ref".
  // Two fields because a failed sign-in has an *attempted identity* and no user
  // (§10, "actor or attempted identity"): actorRef always holds something
  // printable, actorId is set only when a real user is known.
  actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, immutable: true },
  actorRef: { type: String, required: true, immutable: true },

  // §3: required, SERVER-ASSIGNED. Never taken from a request.
  occurredAt: { type: Date, default: Date.now, required: true, immutable: true },

  action: { type: String, required: true, immutable: true },

  // §3: required except for session events.
  entityType: { type: String, default: null, immutable: true },
  entityId: { type: Schema.Types.Mixed, default: null, immutable: true },

  // §3: required for field changes.
  before: { type: Schema.Types.Mixed, default: null, immutable: true },
  after: { type: Schema.Types.Mixed, default: null, immutable: true },

  // §3: required for user-initiated actions.
  ip: { type: String, default: null, immutable: true },
  userAgent: { type: String, default: null, immutable: true },

  // §3: "the branch, department and team in effect". EMPTY UNTIL STEP 3 —
  // populating it requires FR-004, blocked by spec 012 [CLARIFY-6] and
  // [CLARIFY-3]. The field exists so the shape does not change later.
  scopeContext: { type: Schema.Types.Mixed, default: {}, immutable: true },

  // §10 marks break-glass sign-in and out-of-scope access as high severity.
  severity: { type: String, enum: AUDIT_SEVERITY, default: 'normal', required: true, immutable: true }
})

auditEntrySchema.index({ occurredAt: -1 })
auditEntrySchema.index({ actorId: 1, occurredAt: -1 })
auditEntrySchema.index({ entityType: 1, entityId: 1, occurredAt: -1 })

// --- Append-only enforcement (FR-008, AS-08) -------------------------------
//
// Every mongoose path that could change or remove an entry is refused. `save`
// is refused for an already-persisted document, so an entry cannot be loaded,
// altered and re-saved. Only creation gets through.

const REFUSAL = 'spec 010 FR-008: audit entries are append-only. Refused.'

const refuseAndRecord = async function (operation) {
  // AS-08: "the attempt is itself recorded with the actor and the target entry".
  // Creation does not fire these hooks, so this cannot recurse.
  try {
    await AuditEntry.create({
      actorRef: 'system',
      action: 'audit.edit_attempted',
      entityType: 'AuditEntry',
      entityId: JSON.stringify(this.getFilter ? this.getFilter() : { _id: this._id }),
      after: { operation },
      severity: 'high'
    })
  } catch (err) {
    console.error('CRITICAL: could not record an audit-edit attempt', err)
  }
  throw new Error(REFUSAL)
}

for (const op of [
  'updateOne', 'updateMany', 'replaceOne', 'findOneAndUpdate',
  'deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndReplace'
]) {
  auditEntrySchema.pre(op, function () { return refuseAndRecord.call(this, op) })
}

auditEntrySchema.pre('save', function () {
  if (!this.isNew) return refuseAndRecord.call(this, 'save')
})

export const AuditEntry = model('AuditEntry', auditEntrySchema)

// spec 010 FR-011; spec 002 §8; constitution I.
//
// The administrator-configurable label for one ratified status or priority key.
//
// ── ONE COLLECTION FOR BOTH, DELIBERATELY ──────────────────────────────────
//
// A status and a priority differ in exactly one stored field (`pausesSla`) and
// in nothing else about how they are administered: both are a fixed key, a
// bilingual label and a display order. Two collections would mean two services,
// two controllers, two screens and two chances for the both-languages refusal
// to be implemented differently — and constitution I is precisely the rule that
// must not have two implementations.
//
// ── WHAT IS IMMUTABLE, AND WHY EACH ────────────────────────────────────────
//
//   `kind`, `key`  The key is written onto every ticket and into every audit
//                  entry. Renaming one orphans history. The SET is fixed too —
//                  see config/ticket-labels.js for why adding a status needs a
//                  transition graph nobody has specified, and why adding a
//                  priority needs a rank the queue ordering can use.
//
//   `terminal`     Structural, not cosmetic. "Terminal statuses accept no reply
//                  and no assignment" (002 §3), so flipping this would make
//                  already-closed tickets writable, or freeze open ones,
//                  retroactively and silently. Decision 14 ratified these
//                  values. Stored so the administration screen can SHOW it, and
//                  immutable so it cannot be edited there.
//
// ── `pausesSla` IS EDITABLE AND IS NOT AN ORDINARY FIELD ───────────────────
//
// FR-011 names statuses as configurable, and `pausesSla` is part of configuring
// one. It is editable. But it is the one field on this model whose change
// CANNOT BE APPLIED BACKWARDS:
//
//   - Decision 14 ratified the current values.
//   - Spec 005's pause ledger is append-only: once a pause has been recorded
//     against a ticket, changing the flag does not rewrite it.
//   - So a ticket that sat in `resolved` for three days under "pauses the
//     clock" keeps those three days paused, whatever the flag says afterwards.
//
// Today there IS no pause ledger — spec 005 is not built and
// `elapsed-time.js` answers `unavailable` — so a change made now affects
// nothing retroactively because nothing has been computed. That will stop being
// true the day 005 lands, and it will stop being true silently.
//
// The screen therefore says what the change cannot undo, and the audit entry
// records `retroactive: false` explicitly rather than leaving it to be assumed.

import { Schema, model } from 'mongoose'

export const LABEL_KINDS = ['status', 'priority']

// Constitution I in the schema rather than only in the service: BOTH languages
// are required at the database level, so a write that bypassed the service
// still cannot store a half-translated label.
// `_id: false` — a label is a value, not a record. Without it mongoose gives
// the subdocument an id and it appears in every API response, where a client
// might come to depend on it.
const bilingual = new Schema({
  ar: { type: String, required: true, trim: true },
  en: { type: String, required: true, trim: true }
}, { _id: false })

const ticketLabelSchema = new Schema({
  kind: { type: String, enum: LABEL_KINDS, required: true, immutable: true },
  key: { type: String, required: true, immutable: true, trim: true },

  label: { type: bilingual, required: true },

  /** Status only. Editable, and NOT retroactive — see the header. */
  pausesSla: { type: Boolean, default: null },

  /** Status only. Structural; shown but never edited. */
  terminal: { type: Boolean, default: false, immutable: true },

  /** Display order within the kind. For priorities this mirrors the rank the
   *  queue ordering uses, so the screen lists them the way the queue sorts. */
  order: { type: Number, default: 0 }
}, { timestamps: true })

ticketLabelSchema.index({ kind: 1, key: 1 }, { unique: true })
ticketLabelSchema.index({ kind: 1, order: 1 })

// NO SCOPE CO-ORDINATE. A status is not a record of one branch's work — it is
// platform configuration, shared by every branch and every department, exactly
// as the global quick-reply scope is. There is nothing to scope it BY, so an
// empty co-ordinate makes `assignmentCovers` fail closed and authorisation is
// decided by role alone: read for all staff (every screen renders these), write
// for ADM only (010 FR-001). That is stated rather than left as an absence.
ticketLabelSchema.methods.scopeCoordinate = function () { return {} }

export const TicketLabel = model('TicketLabel', ticketLabelSchema)

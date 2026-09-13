// spec 004 §3 — a quick reply. FR-006, FR-007; constitution I.
//
// WHAT IT IS. A saved answer with an Arabic body and an English body, and
// placeholders that are substituted at insertion time. AD-06: "common answers
// cost one keystroke, not five minutes."
//
// BOTH LANGUAGES, ALWAYS. FR-006: "MUST store an Arabic and an English body."
// The NAME carries both too — that is a choice rather than a requirement, and
// it is made because the name is a label rendered in an interface, which is
// what constitution I is about, and because an author writing two bodies is
// already writing in two languages. There is no path that stores one.
//
// SCOPE — and the honest limit of it.
//
// FR-007 wants three scopes: personal, team and global. `Team` does not exist
// (decision 20, and the defect is recorded in decisions-pending §7), so this
// carries two:
//
//   personal   owned by one agent, visible to nobody else. `ownerId` set.
//   global     visible to every member of staff; only a LEAD or above may
//              create or change one. `ownerId` null.
//
// ⚠ A GLOBAL QUICK REPLY CARRIES NO BRANCH OR DEPARTMENT, and that is stated
// here rather than left to be noticed. Constitution IV applies a scope
// predicate "against the target record" — a global template has no branch
// coordinate to evaluate, because it is not customer data: it is wording the
// organisation reuses. What IS enforced is that rendering one happens against a
// TICKET, and that ticket goes through `findInScope` like every other read, so
// no template can be used to reach a record out of scope.
//
// If the client wants per-branch libraries, that is FR-007's "team" scope and
// it arrives with the Team entity, not by bolting a branch onto this.

import { Schema, model } from 'mongoose'
import { localizedTextSchema } from './localized-text.schema.js'

export const QUICK_REPLY_SCOPES = ['personal', 'global']

const quickReplySchema = new Schema({
  // Constitution I: both languages, both required. The subdocument refuses a
  // save with one missing, which is where the rule is enforced.
  name: { type: localizedTextSchema, required: true },
  body: { type: localizedTextSchema, required: true },

  scope: { type: String, enum: QUICK_REPLY_SCOPES, required: true },

  // Set for `personal`, null for `global`. The list query keys off this, so a
  // personal reply cannot appear in anybody else's picker.
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },

  // Deactivate, never delete — the same rule as branches, departments and
  // users. A retired template's wording may be quoted in tickets already sent.
  active: { type: Boolean, default: true }
}, { timestamps: true })

// The picker asks "mine, plus everything global", which is exactly this.
quickReplySchema.index({ scope: 1, ownerId: 1, active: 1 })

export const QuickReply = model('QuickReply', quickReplySchema)

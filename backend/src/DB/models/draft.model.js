// spec 004 §3 — a draft. FR-015, E-02, E-03, E-12, AS-09; §11's predicate.
//
// Unsent reply text, preserved server-side so a crashed tab does not cost an
// agent a long answer (AD-15).
//
// ── ONE DRAFT PER AGENT PER TICKET ──────────────────────────────────────────
//
// The unique index is the whole ownership model. §11 gives the predicate for
// both saving and fetching as `user = caller AND ticket scope`, so a draft
// belongs to the person who typed it. On reassignment it therefore STAYS WITH
// ITS AUTHOR and the new assignee never sees it — that is specified, not a
// preference, and E-02 agrees: "the draft is preserved and THE AGENT is told
// they no longer own it".
//
// ── THIS IS NOT A MESSAGE, AND MUST NEVER BECOME ONE ────────────────────────
//
// Draft text is what somebody was about to say and thought better of. It gets
// the same treatment as an internal note and then some: it lives in its own
// collection and is never written to `Message`, which is what the portal reads.
// There is no query on the portal side that could return one even if
// authentication were somehow bypassed. Three further barriers are recorded in
// docs/decisions-pending.md §18, and tests/draft.test.js asserts each.
//
// ── STALENESS IS RECORDED, NOT GUESSED ──────────────────────────────────────
//
// AS-09: "if the customer replied meanwhile, the draft is restored AND FLAGGED
// as possibly stale." So the draft stores what the thread looked like when it
// was written — the message count and the last message's id — and the fetch
// compares. Storing a timestamp instead would make this a clock comparison, and
// a clock comparison is the kind of date arithmetic constitution III keeps out
// of durations; this is an equality check on identity, not elapsed time.

import { Schema, model } from 'mongoose'
import { VISIBILITY } from './message.model.js'

const draftSchema = new Schema({
  ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },

  // The AUTHOR. Every read is keyed on this; there is no parameter that widens
  // it, so no other member of staff reaches this draft either.
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  body: { type: String, required: true, maxlength: 20000 },

  // What the agent had chosen when they stopped typing, so returning does not
  // silently reset it to the blank default FR-014 requires.
  visibility: { type: String, enum: [...VISIBILITY, ''], default: '' },

  // The thread as it stood when this was written — see the note above.
  threadMessageCount: { type: Number, required: true, default: 0 },
  threadLastMessageId: { type: Schema.Types.ObjectId, ref: 'Message', default: null }
}, { timestamps: true })

// ONE draft per agent per ticket. An agent returning to a ticket gets what they
// left, not a pile of fragments, and the upsert below relies on this.
draftSchema.index({ ticketId: 1, userId: 1 }, { unique: true })

// E-12's sweep reads this. Not a TTL index: a TTL would delete the record
// silently, and E-12 requires the agent be TOLD on return rather than shown
// stale text — which means the expiry has to be observed by a request, not by
// a background process that leaves nothing behind to observe.
draftSchema.index({ updatedAt: 1 })

export const Draft = model('Draft', draftSchema)

// spec 002 — implements TM-14, FR-014; the §3 Message entity
//
// FR-014 (MUST): messages carry a `visibility` of `customer` or `internal`, and
// internal messages "MUST NOT be delivered on any channel or appear on any
// customer-facing surface." AS-07 is the test: three customer replies and two
// internal notes must show the customer exactly three.
//
// `visibility` is IMMUTABLE. An internal note that could be flipped to
// customer-visible afterwards would make AS-07 unprovable, and the audit trail
// would show a message the customer never saw as one they did.
//
// The body is user-authored: single language, direction detected per message at
// render time (spec 012 §8, AS-05). Not a localised subdocument.

import { Schema, model } from 'mongoose'

export const VISIBILITY = ['customer', 'internal']
export const AUTHOR_KINDS = ['user', 'customer', 'system']

const messageSchema = new Schema({
  ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, immutable: true, index: true },
  visibility: { type: String, enum: VISIBILITY, required: true, immutable: true },
  authorKind: { type: String, enum: AUTHOR_KINDS, required: true, immutable: true },
  authorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, immutable: true },
  authorCustomerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null, immutable: true },
  body: { type: String, required: true, immutable: true },
  // §3: "a channel where applicable". Null today — channels are spec 003.
  channel: { type: String, default: null, immutable: true },
  // spec 004 FR-009 — who was named in this note.
  //
  // IMMUTABLE like everything else here: a mention notified somebody, and
  // editing the list afterwards would leave a notification pointing at a note
  // that no longer names them. The ids are VALIDATED at save time against the
  // ticket scope (decision 39) and never re-checked on read — what is stored is
  // what was permitted then, which is the same reasoning as the audit trail.
  //
  // Only meaningful on an INTERNAL note. FR-009 says "mention a colleague in an
  // internal note", and the service refuses one on a customer-visible reply:
  // a customer must never see a colleague being pulled in.
  mentions: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [], immutable: true },

  // §3: "an immutable timestamp". Server-assigned, never from a request.
  sentAt: { type: Date, default: Date.now, required: true, immutable: true }
}, { timestamps: true })

messageSchema.index({ ticketId: 1, sentAt: 1 })

// No scope of its own — §3 gives it none and it inherits the ticket's. An empty
// co-ordinate makes scope.js#assignmentCovers fail closed, so a message can
// never be authorised by itself.
messageSchema.methods.scopeCoordinate = function () { return {} }
messageSchema.statics.inheritsScopeFrom = 'ticketId'

export const Message = model('Message', messageSchema)

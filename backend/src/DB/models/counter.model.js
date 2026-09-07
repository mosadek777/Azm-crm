// spec 002 — implements TM-02, FR-002, AS-02, E-16
//
// The reference sequence. Decision 11 fixed the format as TKT-YYYY-NNNNN with a
// 5-digit sequence resetting annually.
//
// WHY A COUNTER AND NOT A COUNT. `countDocuments() + 1` is the obvious shortcut
// and it is wrong twice: it reuses a reference after a ticket is merged or
// cancelled (FR-002 forbids reuse; AS-02 tests it), and two concurrent creates
// read the same count. AS-02 requires 1,000 concurrent creations across three
// branches to yield 1,000 unique references.
//
// The increment is one atomic findOneAndUpdate issued inside the creating
// transaction. A rolled-back ticket may leave a gap in the sequence; a gap is
// harmless, a duplicate is not.
//
// E-16: "Reference collision under concurrent creation — Impossible by
// construction." This is that construction.

import { Schema, model } from 'mongoose'

const counterSchema = new Schema({
  _id: { type: String, required: true },   // e.g. ticket-reference-2026
  seq: { type: Number, default: 0, required: true }
}, { versionKey: false })

export const Counter = model('Counter', counterSchema)

// Must be called with the caller's transaction session, so the number is
// consumed under the same commit as the ticket.
export const nextTicketReference = async (session) => {
  const year = new Date().getUTCFullYear()
  const doc = await Counter.findOneAndUpdate(
    { _id: `ticket-reference-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  )
  return `TKT-${year}-${String(doc.seq).padStart(5, '0')}`
}

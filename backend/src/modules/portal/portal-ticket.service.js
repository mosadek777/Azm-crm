// spec 008 — the customer's own tickets. FR-005 (list), FR-003 (detail).
//
// THE RULE THIS FILE EXISTS TO ENFORCE, before anything else it does:
//
//   FR-019 (MUST): "No internal note, AI output, automation log, assignment
//   detail or agent identity beyond what spec 002 permits MUST appear on any
//   portal surface, export or notification."
//
//   AS-06: given "two customer replies, three internal notes and an AI summary
//   … they see two messages".
//
// It is enforced in the QUERY, not in the projection and not in the view. A
// filter on the way out is one refactor away from being lost; a query that
// never loads an internal note cannot leak one by accident. The staff read in
// ticket.service.js deliberately returns both visibilities — 002 §9 gives staff
// both — which is exactly why the portal has its own read rather than a flag on
// that one.
//
// AGENT IDENTITY IS NEVER SENT. 002 [CLARIFY-6] was resolved 2026-09-08
// (decision 29): a customer sees the owning team only, and no individual agent,
// including the author of a reply they can read. So no message carries an
// author name, and `assignedAgentId` is not projected at all.

import mongoose from 'mongoose'
import { Ticket } from '../../DB/models/ticket.model.js'
import { Message } from '../../DB/models/message.model.js'
import { recordAudit } from '../../utils/audit.js'
import { customerActorRef } from './portal.service.js'
import { portalScope } from '../../middlewares/portal-auth.middleware.js'
import { STATUSES } from '../../utils/ticket-status.js'
import { elapsedBusinessMinutes } from '../../utils/elapsed-time.js'

const NOT_FOUND = {
  ar: 'غير موجود',
  en: 'Not found'
}

// What a customer is allowed to know about a ticket. Built as an allow-list, so
// a field added to the Ticket model later is absent here until somebody decides
// it should be visible — the opposite default from projecting the document and
// deleting what is secret.
//
// `owningTeam` is absent because Team is not built (decision 20, extended to
// this surface by decision 35). FR-003 requires it, so this response does not
// yet satisfy FR-003 in full and the gap is recorded rather than filled.
const publicTicket = (t) => ({
  _id: t._id,
  reference: t.reference,
  subject: t.subject,
  status: t.status,
  // §8: the customer-facing label comes from 002 §3's Status entity, which
  // carries label_ar and label_en. The code's status map has no labels yet
  // (remaining.md A1), so the key is sent and the client renders what it can.
  statusLabel: STATUSES[t.status]?.label ?? null,
  priority: t.priority,
  category: t.category,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
  // FR-034 and constitution III: read, never computed. Returns
  // { status: 'unavailable' } until spec 005 exists, and 008 [CLARIFY-2] was
  // resolved provisionally to show nothing (decision 28), so the client has
  // nothing to render from this either way.
  sla: elapsedBusinessMinutes({ ticketId: t._id, targetKind: 'resolution' })
})

const publicMessage = (m) => ({
  _id: m._id,
  body: m.body,
  sentAt: m.sentAt,
  // Who, at the coarsest honest grain: the customer's own words, or ours.
  // Never a name — decision 29.
  from: m.authorKind === 'customer' ? 'you' : 'support'
})

// FR-005: "list, search and filter all their own requests, open and closed".
export const listMyTickets = async (req, res, next) => {
  try {
    const scope = await portalScope(req)

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25))

    const filter = { ...scope }
    if (req.query.status) {
      filter.status = { $in: String(req.query.status).split(',').map(s => s.trim()) }
    }

    const [tickets, total] = await Promise.all([
      Ticket.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Ticket.countDocuments(filter)
    ])

    return res.json({
      tickets: tickets.map(publicTicket),
      total,
      page,
      limit
    })
  } catch (err) { return next(err) }
}

// FR-003: the ticket view. AS-02: another customer's ticket is "not-found, not
// forbidden", and the attempt "is recorded as a security event".
export const getMyTicket = async (req, res, next) => {
  try {
    const scope = await portalScope(req)

    // A malformed id must reach the same 404 as an out-of-scope one, not a
    // CastError. AS-02 requires "not-found, not forbidden" — a 500 here would
    // distinguish a badly-formed id from a real one, which is a disclosure of a
    // different shape.
    const ticket = mongoose.isValidObjectId(req.params.id)
      ? await Ticket.findOne({ _id: req.params.id, ...scope })
      : null

    if (!ticket) {
      // AS-02's third clause. Recorded before answering, and at high severity,
      // because §10 lists "Cross-customer access attempted" as a security event.
      // A genuine typo lands here too — the log cannot tell them apart, and the
      // response deliberately cannot either.
      await recordAudit({
        actorRef: customerActorRef(req.customer._id),
        action: 'portal.cross_customer_access_attempted',
        entityType: 'Ticket',
        // Mixed in the schema, so a malformed id from the URL is stored as the
        // string it was rather than throwing — what was attempted is the point.
        entityId: String(req.params.id),
        after: { requestedTicketId: String(req.params.id) },
        severity: 'high',
        req,
        // Stands alone: nothing was mutated, so there is no transaction for it
        // to be atomic with. Declared rather than omitted, per utils/audit.js.
        session: null
      })
      return res.status(404).json({ message: NOT_FOUND })
    }

    // FR-019 / AS-06 enforced here: `visibility: 'customer'` is part of the
    // query. An internal note is never loaded, so it cannot be projected,
    // logged or serialised by mistake.
    const messages = await Message
      .find({ ticketId: ticket._id, visibility: 'customer' })
      .sort({ sentAt: 1 })

    return res.json({
      ticket: publicTicket(ticket),
      messages: messages.map(publicMessage)
    })
  } catch (err) { return next(err) }
}

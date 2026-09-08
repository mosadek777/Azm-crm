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
import { nextTicketReference } from '../../DB/models/counter.model.js'
import { recordAudit } from '../../utils/audit.js'
import { customerActorRef } from './portal.service.js'
import { portalScope } from '../../middlewares/portal-auth.middleware.js'
import { STATUSES, isTerminal } from '../../utils/ticket-status.js'
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

// ---------------------------------------------------------------------------
// FR-002 / AS-04 — the customer submits a request
// ---------------------------------------------------------------------------
//
// WHAT A CUSTOMER MAY SET, AND WHY THE LIST IS CLOSED.
//
// FR-002 (MUST) is the whole of it: "submit a request with category,
// description and attachments" — three things, one excluded for the demo by
// decision 34. Everything else about a new ticket is ours, and 002 §9 says so
// directly: the customer column carries `—` for *Assign / self-assign*, and
// *Change status* is footnoted "A customer may confirm resolution, reopen
// within the window, and cancel their own ticket before resolution. Nothing
// else."
//
// So the body is an ALLOW-LIST and anything outside it is REFUSED BY NAME
// rather than quietly dropped. Silently ignoring `priority: 'urgent'` would
// leave the customer believing they had escalated their own request, and would
// leave us unable to tell a hostile caller from a confused integration.
//
// The values a customer does not choose are set below:
//   customerId  — from the session (§11), never the body
//   branch/dept — from the CUSTOMER record (AS-04)
//   status      — `new`;  priority — `normal`;  assignee — null ("queued", §3)
//   source      — `portal` (AS-04, decision 37)
const SUBMITTABLE = ['subject', 'description', 'category']

export const submitTicket = async (req, res, next) => {
  try {
    const body = req.body ?? {}

    const notYours = Object.keys(body).filter(k => !SUBMITTABLE.includes(k))
    if (notYours.length) {
      return res.status(400).json({
        message: {
          ar: `لا يمكن تحديد هذه الحقول عند إرسال الطلب: ${notYours.join('، ')}`,
          en: `These fields cannot be set when submitting a request: ${notYours.join(', ')}. `
            + 'A request carries a subject, a description and a category. Priority, '
            + 'status, assignment and routing are set by us (spec 002 §9).'
        },
        fields: notYours
      })
    }

    const { subject, description, category } = body
    const missing = []
    if (!subject || !String(subject).trim()) missing.push('subject')
    if (!description || !String(description).trim()) missing.push('description')
    if (!category || !String(category).trim()) missing.push('category')
    if (missing.length) {
      return res.status(400).json({
        message: {
          ar: `حقول مطلوبة ناقصة: ${missing.join('، ')}`,
          en: `Required fields are missing: ${missing.join(', ')}`
        },
        fields: missing
      })
    }

    // §3: subject is 3-300 characters. Checked here so the refusal is a 400
    // naming the field rather than a 500 out of mongoose.
    const trimmedSubject = String(subject).trim()
    if (trimmedSubject.length < 3 || trimmedSubject.length > 300) {
      return res.status(400).json({
        message: {
          ar: 'الموضوع يجب أن يكون بين ٣ و ٣٠٠ حرف',
          en: 'Subject must be between 3 and 300 characters'
        },
        fields: ['subject']
      })
    }

    // From the SESSION, never the body — §11's "writes customer = session".
    // There is no customerId to spoof, because that field is refused above.
    const customer = req.customer

    const ticketId = new mongoose.Types.ObjectId()
    const messageId = new mongoose.Types.ObjectId()
    const actorRef = customerActorRef(customer._id)

    let reference = null
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        // Consumed inside the transaction, as staff creation does (002 E-16):
        // a rolled-back create must burn no reference.
        reference = await nextTicketReference(session)

        const doc = {
          _id: ticketId,
          reference,
          customerId: customer._id,
          category: String(category).trim(),
          priority: 'normal',
          prioritySource: 'manual',
          source: 'portal',
          status: 'new',
          assignedAgentId: null,
          branchId: customer.branchId,
          departmentId: customer.departmentId,
          subject: trimmedSubject,
          tags: []
        }

        // FR-020: attributed to the customer and distinguishable from a staff
        // action — actorId stays null because a customer is not a User, and
        // actorRef carries the `customer:` prefix.
        await recordAudit({
          actorRef,
          action: 'ticket.created',
          entityType: 'Ticket',
          entityId: ticketId,
          before: null,
          after: { ...doc, owningTeamId: null, owningTeamNote: 'team scoped out — decision 20' },
          req,
          session
        })
        await Ticket.create([doc], { session })

        // The description becomes the first message on the thread, authored by
        // the customer. `authorKind: 'customer'` and `authorCustomerId` have
        // been on the Message model since it was written.
        const msg = {
          _id: messageId,
          ticketId,
          visibility: 'customer',
          authorKind: 'customer',
          authorCustomerId: customer._id,
          body: String(description),
          channel: null
        }
        await recordAudit({
          actorRef,
          action: 'message.added',
          entityType: 'Message',
          entityId: messageId,
          before: null,
          after: msg,
          req,
          session
        })
        await Message.create([msg], { session })
      })
    } finally { await session.endSession() }

    const created = await Ticket.findById(ticketId)
    return res.status(201).json({ ticket: publicTicket(created) })
  } catch (err) { return next(err) }
}

// ---------------------------------------------------------------------------
// FR-004 / AS-07 — the customer replies onto the same thread
// ---------------------------------------------------------------------------
//
// AS-07: "the message appends to that ticket, visible to the agent in the
// unified timeline … and no new ticket is created" — constitution VI, one
// thread.
//
// VISIBILITY IS NOT A PARAMETER HERE. A customer's message is
// `visibility: 'customer'` by construction, so there is no code path on this
// route that can produce an internal note and FR-019's guarantee cannot be
// inverted by a crafted body. The staff route takes visibility explicitly
// because staff genuinely choose between the two; a customer never does.
export const replyToTicket = async (req, res, next) => {
  try {
    const body = req.body ?? {}

    const notYours = Object.keys(body).filter(k => k !== 'body')
    if (notYours.length) {
      return res.status(400).json({
        message: {
          ar: `لا يمكن تحديد هذه الحقول في الرد: ${notYours.join('، ')}`,
          en: `These fields cannot be set on a reply: ${notYours.join(', ')}. `
            + 'A customer reply is always visible to you and to us; there is no internal option.'
        },
        fields: notYours
      })
    }

    if (!body.body || !String(body.body).trim()) {
      return res.status(400).json({
        message: { ar: 'نص الرسالة مطلوب', en: 'A message body is required' },
        fields: ['body']
      })
    }

    const scope = await portalScope(req)
    const ticket = mongoose.isValidObjectId(req.params.id)
      ? await Ticket.findOne({ _id: req.params.id, ...scope })
      : null

    // AS-02 again: someone else's ticket is not-found, and the attempt is a
    // security event.
    if (!ticket) {
      await recordAudit({
        actorRef: customerActorRef(req.customer._id),
        action: 'portal.cross_customer_access_attempted',
        entityType: 'Ticket',
        entityId: String(req.params.id),
        after: { requestedTicketId: String(req.params.id), attempted: 'reply' },
        severity: 'high',
        req,
        session: null
      })
      return res.status(404).json({ message: NOT_FOUND })
    }

    // §3: "Terminal statuses accept no reply and no assignment." The customer
    // meets the same refusal an agent would.
    //
    // NOT BUILT, and refused rather than guessed: 008 E-08 says a reply to a
    // `resolved` ticket within the reopen window should REOPEN it (FR-009), and
    // E-07 says a reply to a `cancelled` ticket should create a new linked
    // ticket. Both are piece F3. `resolved` is not terminal, so a reply to a
    // resolved ticket is accepted here and simply does not reopen it yet.
    if (isTerminal(ticket.status)) {
      return res.status(409).json({
        message: {
          ar: `هذا الطلب مغلق (${ticket.status}) ولا يقبل ردودًا`,
          en: `This request is closed (${ticket.status}) and accepts no reply`
        }
      })
    }

    const messageId = new mongoose.Types.ObjectId()
    const actorRef = customerActorRef(req.customer._id)

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        const msg = {
          _id: messageId,
          ticketId: ticket._id,
          visibility: 'customer',   // fixed, not taken from the request
          authorKind: 'customer',
          authorCustomerId: req.customer._id,
          body: String(body.body),
          channel: null
        }
        await recordAudit({
          actorRef,
          action: 'message.added',
          entityType: 'Message',
          entityId: messageId,
          before: null,
          after: msg,
          req,
          session
        })
        await Message.create([msg], { session })
      })
    } finally { await session.endSession() }

    const created = await Message.findById(messageId)
    return res.status(201).json({ message: publicMessage(created) })
  } catch (err) { return next(err) }
}

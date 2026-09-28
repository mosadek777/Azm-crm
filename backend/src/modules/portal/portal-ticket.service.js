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
import { notify } from '../notification/notification.service.js'
import { nextTicketReference } from '../../DB/models/counter.model.js'
import { recordAudit } from '../../utils/audit.js'
import { customerActorRef } from './portal.service.js'
import { portalScope } from '../../middlewares/portal-auth.middleware.js'
import { STATUSES, isTerminal, canTransition, reachableFrom } from '../../utils/ticket-status.js'
import { labelMap } from '../config/label.service.js'
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
const publicTicket = (t, labels) => ({
  _id: t._id,
  reference: t.reference,
  subject: t.subject,
  status: t.status,
  // §8: "Customer-facing status labels | Required | Required | Sourced from
  // spec 002 status labels, not re-authored here." They come from the
  // TicketLabel collection through labelMap() — the same source /ticket/meta
  // reads — so an administrator's edit reaches the customer without a release.
  //
  // BOTH LANGUAGES ARE SENT AND THE SERVER NEVER PICKS ONE. Constitution I
  // admits no fallback, so choosing here would mean choosing on behalf of a
  // customer whose language this code does not have. The client renders the
  // one its language service is in.
  //
  // ⚠ THIS READ `STATUSES[t.status]?.label` UNTIL 2026-09-27, AND THAT WAS
  // ALWAYS NULL. utils/ticket-status.js has never carried a label — it holds
  // pausesSla, terminal and requiresResolutionFields and nothing else. So every
  // portal response sent statusLabel: null, both portal screens fell through to
  // their `?? t.status` fallback, and an Arabic customer read "resolved". The
  // labels arrived on 2026-09-14 with 010 FR-011 and this call site was never
  // moved onto them. Nothing failed, because nothing asserted it — portal.test.js
  // now does, which is what stops the regression repeating.
  statusLabel: labels.status[t.status] ?? null,
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

    const [tickets, total, labels] = await Promise.all([
      Ticket.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Ticket.countDocuments(filter),
      labelMap()
    ])

    return res.json({
      // NOT `tickets.map(publicTicket)`: map passes (element, INDEX, array), so
      // the row number would arrive as `labels` and every label read would throw
      // on a number. Written out rather than point-free for that reason.
      tickets: tickets.map(t => publicTicket(t, labels)),
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
      ticket: publicTicket(ticket, await labelMap()),
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
    return res.status(201).json({ ticket: publicTicket(created, await labelMap()) })
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

        // 004 FR-013's `customer_replied` — the only place it is produced,
        // because this is the only place a customer speaks.
        //
        // ⚠ `actorId` IS NULL AND `actorRef` IS THE CUSTOMER'S. A customer is
        // not a User, so the notification's `actorId` (a User ref) must stay
        // empty; the audit entry carries the customer reference, which is what
        // `utils/actor.js` already knows how to render. Putting a customer id
        // in a User field would make the actor resolver answer "deactivated
        // user" for a person who is not a user at all.
        //
        // Only the ASSIGNEE is told. An unassigned ticket notifies nobody: the
        // team queue is where unheld work is found, and notifying a whole
        // branch would train everyone to ignore the badge.
        if (ticket.assignedAgentId) {
          await notify({
            userIds: [ticket.assignedAgentId],
            kind: 'customer_replied',
            ticketId: ticket._id,
            actorId: null,
            actorRef,
            req,
            session
          })
        }
      })
    } finally { await session.endSession() }

    const created = await Message.findById(messageId)
    return res.status(201).json({ message: publicMessage(created) })
  } catch (err) { return next(err) }
}


// ---------------------------------------------------------------------------
// 002 FR-031 — the customer confirms closure
// ---------------------------------------------------------------------------
//
// FR-031 (SHOULD): "Transition from `resolved` to `closed` MUST occur on
// explicit customer confirmation, or automatically after the configured grace
// period, per [CLARIFY-2]."
//
// [CLARIFY-2] was resolved 2026-09-07 (decision 9) and the requirement is
// HALF-COVERED by that decision, deliberately:
//
//   - the CONFIRMATION path is in scope, and is this endpoint;
//   - the GRACE-PERIOD path is deferred, because a grace period stated in
//     working days is a business duration and constitution III routes every
//     duration through the spec 005 engine, which does not exist.
//
// So there is no auto-close anywhere in this codebase, and this route is the
// only way a ticket reaches `closed`. That is why it exists on the portal
// rather than in the staff module: 002 §9 gives the customer column "Close:
// confirm only", and until this route there was no customer who could confirm
// — which is what docs/portal-plan.md §5.3 meant by "blocked on there being a
// customer who can confirm, which is the portal itself".
//
// WHAT THIS ROUTE DOES NOT DO, and each absence is a requirement, not an
// oversight:
//
//   REOPEN        — 008 FR-009. The window runs from `closed`, not from
//                   `resolved` (002 FR-022, AS-11, decision 10), so reopening
//                   is an action on a CLOSED ticket and does not belong here.
//                   Not built; board card `ticket-reopen`.
//   WITHDRAW      — 008 FR-014 and AS-12: "given the ticket is already
//                   resolved, withdrawal is not offered." Refusing it here is
//                   the specified behaviour rather than a gap.
//   RATE          — 008 FR-008, blocked on 008 [CLARIFY-3]: the satisfaction
//                   scale and the delay are an open client question, and
//                   inventing a scale would make the data incomparable across
//                   the change point (009 FR-005 reports it as a mean).
export const confirmClosure = async (req, res, next) => {
  try {
    const scope = await portalScope(req)
    const ticket = mongoose.isValidObjectId(req.params.id)
      ? await Ticket.findOne({ _id: req.params.id, ...scope })
      : null

    // AS-02, exactly as the read and the reply do it: someone else's ticket is
    // not-found, never forbidden, and the attempt is a security event.
    if (!ticket) {
      await recordAudit({
        actorRef: customerActorRef(req.customer._id),
        action: 'portal.cross_customer_access_attempted',
        entityType: 'Ticket',
        entityId: String(req.params.id),
        after: { requestedTicketId: String(req.params.id), attempted: 'confirm_closure' },
        severity: 'high',
        req,
        session: null
      })
      return res.status(404).json({ message: NOT_FOUND })
    }

    // FR-031 names ONE transition and this route offers only that one. There is
    // no `status` parameter to supply, so this endpoint cannot be used to move
    // a ticket anywhere else — the same construction as the reply route having
    // no `visibility` parameter.
    if (ticket.status !== 'resolved') {
      return res.status(409).json({
        message: {
          ar: 'لا يمكن تأكيد الإغلاق إلا على طلب تم حله',
          en: `Closure can only be confirmed on a resolved request — this one is "${ticket.status}"`
        },
        status: ticket.status
      })
    }

    // Belt and braces against the graph and the rule drifting apart. Decision
    // 22's graph already carries resolved -> closed; if somebody edits it out,
    // this refuses rather than writing a status the graph forbids.
    if (!canTransition(ticket.status, 'closed')) {
      return res.status(409).json({
        message: {
          ar: `الانتقال من "${ticket.status}" إلى "closed" غير مسموح`,
          en: `Transition from "${ticket.status}" to "closed" is not defined`
        },
        from: ticket.status,
        reachableStatuses: reachableFrom(ticket.status)
      })
    }

    const before = { status: ticket.status, followUpAt: ticket.followUpAt ?? null }
    const actorRef = customerActorRef(req.customer._id)

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        // FR-020 and constitution II: written in the SAME transaction as the
        // mutation, and attributed to the customer — actorId stays null because
        // a customer is not a User, and actorRef carries the `customer:` prefix
        // that makes a portal action distinguishable from a staff one.
        await recordAudit({
          actorRef,
          action: 'ticket.status_changed',
          entityType: 'Ticket',
          entityId: ticket._id,
          before,
          after: {
            status: 'closed',
            transition: `${ticket.status}->closed`,
            // 002 §10 records a reason "where required". None is required for a
            // confirmation, but WHO closed it and on what authority is the
            // whole point of this entry, so it is stated rather than left to be
            // inferred from the actorRef alone.
            reason: null,
            closedBy: 'customer_confirmation',
            requirement: '002 FR-031',
            followUpAt: null,
            pausesSla: STATUSES.closed?.pausesSla ?? null
          },
          req,
          session
        })

        ticket.status = 'closed'
        // `closed` does not pause a clock — decision 14 stores null for a
        // terminal status — so a follow-up date cannot survive the move.
        ticket.followUpAt = null
        await ticket.save({ session })

        // ⚠ THE ASSIGNED AGENT IS NOT NOTIFIED, and that is a recorded gap
        // rather than a decision that nobody should be told.
        //
        // 004 FR-013 enumerates the notification kinds exhaustively —
        // "assignment, mention, customer reply, escalation, task due, SLA
        // threshold, delivery failure and chat offer" — and a closure
        // confirmation is not among them. 002 FR-031 requires no notification
        // either, and 008 §10's audit table does not list one. So every source
        // is silent, and adding a ninth kind here would be inventing a
        // requirement at the keyboard, which constitution VII forbids.
        //
        // The audit entry above IS the record, and it names the actor. If the
        // client wants the agent told, that is a spec amendment to 004 FR-013
        // and a new kind in notification.model.js. Board card:
        // `portal-confirm-closure-notification`.
      })
    } finally { await session.endSession() }

    const closed = await Ticket.findById(ticket._id)
    return res.json({ ticket: publicTicket(closed, await labelMap()) })
  } catch (err) { return next(err) }
}

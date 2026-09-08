// spec 002 — implements TM-01, TM-02, TM-06, TM-07, TM-08, TM-09, TM-10,
//            TM-14, TM-20, FR-001..FR-014, FR-021, FR-033, FR-034,
//            AS-01, AS-03, AS-05, AS-06, AS-07, E-11, E-12
//            constitution II, III, IV
//
// Deviations: decision 20 (no Team — direct agent assignment) and decision 21
// (flat category). Both recorded in docs/decisions-pending.md §0.
//
// FR-034 / constitution III: nothing here subtracts dates. Elapsed and
// remaining time come from src/utils/elapsed-time.js, which currently answers
// `unavailable` — and callers render that rather than falling back.

import mongoose from 'mongoose'
import { Ticket } from '../../DB/models/ticket.model.js'
import { Message } from '../../DB/models/message.model.js'
import { Customer } from '../../DB/models/customer.model.js'
import { User } from '../../DB/models/user.model.js'
import { RoleAssignment } from '../../DB/models/role-assignment.model.js'
import { AuditEntry } from '../../DB/models/audit-entry.model.js'
import { nextTicketReference } from '../../DB/models/counter.model.js'
import { recordAudit, redact } from '../../utils/audit.js'
import { scopeFilter, rolesForTarget, assignmentCovers } from '../../utils/scope.js'
import { elapsedBusinessMinutes } from '../../utils/elapsed-time.js'
import { STATUSES, STATUS_KEYS, PRIORITIES, canTransition, reachableFrom, isTerminal } from '../../utils/ticket-status.js'

const bad = (res, ar, en, fields) =>
  res.status(400).json({ message: { ar, en }, ...(fields ? { fields } : {}) })

const NOT_FOUND = { ar: 'التذكرة غير موجودة', en: 'Ticket not found' }

// Loads a ticket THROUGH the scope predicate. Out of scope is indistinguishable
// from non-existent (AS-01, constitution IV) — 404, never 403.
const findInScope = async (req, id) =>
  Ticket.findOne({ _id: id, ...scopeFilter(req.assignments) }).catch(() => null)

// FR-034: never computed here. One call, one shape, and the `unavailable`
// branch is what callers get until spec 005 unblocks.
const slaFor = (ticket) => elapsedBusinessMinutes({ ticketId: ticket._id, targetKind: 'resolution' })

// ---------------------------------------------------------------------------
// FR-001 / AS-01 — create
// ---------------------------------------------------------------------------
export const createTicket = async (req, res, next) => {
  try {
    const { customerId, subject, description, category, priority, tags } = req.body ?? {}

    const missing = []
    if (!customerId) missing.push('customerId')
    if (!subject) missing.push('subject')
    if (!description) missing.push('description')
    if (!category) missing.push('category')
    if (!priority) missing.push('priority')
    if (missing.length) {
      return bad(res, `حقول مطلوبة ناقصة: ${missing.join('، ')}`,
        `Required fields are missing: ${missing.join(', ')}`, missing)
    }

    if (!PRIORITIES.includes(priority)) {
      return bad(res, 'أولوية غير صحيحة', `priority must be one of: ${PRIORITIES.join(', ')}`, ['priority'])
    }

    // The customer is loaded through the caller's scope, so a ticket cannot be
    // opened against a customer the caller may not see.
    const customer = await Customer.findOne({
      _id: customerId, status: 'active', ...scopeFilter(req.assignments)
    }).catch(() => null)

    if (!customer) {
      return res.status(404).json({ message: { ar: 'العميل غير موجود', en: 'Customer not found' }, fields: ['customerId'] })
    }

    // §11: "create ticket — writes caller or customer branch and department".
    // The CUSTOMER's scope is used, so a ticket always sits with its customer.
    // Taking the caller's could file a ticket in a branch the customer is not
    // in, which would then be invisible to that customer's own branch.
    const branchId = customer.branchId
    const departmentId = customer.departmentId

    const ticketId = new mongoose.Types.ObjectId()
    const messageId = new mongoose.Types.ObjectId()

    let reference = null
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        // Consumed inside the transaction (E-16).
        reference = await nextTicketReference(session)

        const doc = {
          _id: ticketId,
          reference,
          customerId: customer._id,
          category: String(category).trim(),
          priority,
          // AS-05: provenance is stored. Only `manual` can occur today —
          // category defaults need the tree (dropped), rules are spec 005, and
          // `ai` is spec 007 which constitution V forbids building.
          prioritySource: 'manual',
          status: 'new',
          assignedAgentId: null,
          branchId,
          departmentId,
          subject,
          tags: Array.isArray(tags) ? tags : []
        }

        // §10: "Ticket created | actor, timestamp, source, customer, category,
        // priority, priority source, owning team, branch, department".
        // `owningTeam` is recorded as null with its reason, so the log does not
        // imply a team existed.
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action: 'ticket.created',
          entityType: 'Ticket',
          entityId: ticketId,
          before: null,
          after: { ...doc, source: 'ui', owningTeamId: null, owningTeamNote: 'team scoped out — decision 20' },
          req,
          session
        })
        await Ticket.create([doc], { session })

        // AS-01 submits a description; §3 has no description field because the
        // thread is where it belongs. It becomes the first customer-visible
        // message, authored by the agent taking the call.
        const msg = {
          _id: messageId,
          ticketId,
          visibility: 'customer',
          authorKind: 'user',
          authorUserId: req.user._id,
          body: description,
          channel: null
        }
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
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
    } finally {
      await session.endSession()
    }

    const created = await Ticket.findById(ticketId)
    return res.status(201).json({ ticket: redact(created), sla: slaFor(created) })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------------
// FR-026-lite — list with filters. Scope-filtered, always.
// ---------------------------------------------------------------------------
export const listTickets = async (req, res, next) => {
  try {
    const { status, priority, assignedAgentId, customerId, category, tag, q, unassigned } = req.query ?? {}

    // The scope predicate is the base of the query, not an extra condition —
    // AS-01: an out-of-scope ticket appears in "no list, search, count or
    // aggregate".
    const filter = { ...scopeFilter(req.assignments) }

    if (status) {
      const wanted = String(status).split(',').filter(s => STATUS_KEYS.includes(s))
      if (wanted.length) filter.status = { $in: wanted }
    }
    if (priority) {
      const wanted = String(priority).split(',').filter(p => PRIORITIES.includes(p))
      if (wanted.length) filter.priority = { $in: wanted }
    }
    if (assignedAgentId) filter.assignedAgentId = assignedAgentId
    if (String(unassigned) === 'true') filter.assignedAgentId = null
    if (customerId) filter.customerId = customerId
    if (category) filter.category = String(category)
    if (tag) filter.tags = String(tag)
    if (q && String(q).trim().length >= 3) {
      const term = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [{ subject: new RegExp(term, 'i') }, { reference: new RegExp('^' + term, 'i') }]
    }

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25))

    const [tickets, total] = await Promise.all([
      Ticket.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Ticket.countDocuments(filter)
    ])

    // Denormalised for display only — each is re-read through the same scope
    // filter, so a joined name cannot leak an out-of-scope record.
    const customers = await Customer.find({
      _id: { $in: tickets.map(t => t.customerId) }, ...scopeFilter(req.assignments)
    })
    const agents = await User.find({ _id: { $in: tickets.map(t => t.assignedAgentId).filter(Boolean) } })
    const nameOf = (list, id) => list.find(x => String(x._id) === String(id))?.displayName ?? null

    return res.json({
      tickets: tickets.map(t => ({
        ...redact(t),
        customerName: nameOf(customers, t.customerId),
        assignedAgentName: nameOf(agents, t.assignedAgentId),
        pausesSla: STATUSES[t.status]?.pausesSla ?? null,
        terminal: isTerminal(t.status),
        // FR-034: read, never computed.
        sla: slaFor(t)
      })),
      page, limit, total
    })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------------
// Detail — ticket, thread, history
// ---------------------------------------------------------------------------
export const getTicket = async (req, res, next) => {
  try {
    const ticket = await findInScope(req, req.params.id)
    if (!ticket) return res.status(404).json({ message: NOT_FOUND })

    const customer = await Customer.findOne({ _id: ticket.customerId, ...scopeFilter(req.assignments) })
    const agent = ticket.assignedAgentId ? await User.findById(ticket.assignedAgentId) : null

    // FR-014 / AS-07: every caller here is staff, so both visibilities are
    // returned — but each message carries its own, so no surface can render an
    // internal note as customer-visible by accident.
    const messages = await Message.find({ ticketId: ticket._id }).sort({ sentAt: 1 })

    // FR-013 / AS-15: history is the audit log, read not rebuilt. Append-only,
    // so this is the whole truth about the ticket.
    const history = await AuditEntry.find({
      entityType: { $in: ['Ticket', 'Message'] },
      $or: [{ entityId: ticket._id }, { 'after.ticketId': ticket._id }]
    }).sort({ occurredAt: 1 }).limit(500)

    return res.json({
      ticket: redact(ticket),
      customer: customer ? redact(customer) : null,
      assignedAgent: agent ? { id: agent._id, displayName: agent.displayName } : null,
      messages: messages.map(m => redact(m)),
      history: history.map(h => ({
        action: h.action, actorRef: h.actorRef, occurredAt: h.occurredAt,
        before: h.before, after: h.after
      })),
      statusMeta: STATUSES[ticket.status] ?? null,
      reachableStatuses: reachableFrom(ticket.status),
      sla: slaFor(ticket)
    })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------------
// FR-009 / FR-010 / AS-06 — assign, reassign, unassign
// ---------------------------------------------------------------------------
export const assignTicket = async (req, res, next) => {
  try {
    const { assignedAgentId, reason } = req.body ?? {}

    const ticket = await findInScope(req, req.params.id)
    if (!ticket) return res.status(404).json({ message: NOT_FOUND })

    if (isTerminal(ticket.status)) {
      return res.status(409).json({
        message: {
          ar: `مرفوض: التذكرة في حالة نهائية (${ticket.status})`,
          en: `Refused: the ticket is in a terminal status (${ticket.status}) and accepts no assignment`
        }
      })
    }

    // FR-009 (MUST): "Assignment and reassignment MUST record actor, previous
    // holder, new holder and a reason". AS-06: "a reason is required and
    // stored". Not optional, and not defaulted to a placeholder.
    if (!reason || !String(reason).trim()) {
      return bad(res, 'سبب التعيين مطلوب', 'A reason is required for assignment and reassignment', ['reason'])
    }

    const previous = ticket.assignedAgentId

    // §9: reassigning ANOTHER agent's ticket needs LEAD or above. An agent may
    // self-assign an unassigned ticket (FR-010) and may release their own.
    const rolesHere = rolesForTarget(req.assignments, ticket.scopeCoordinate())
    const isLeadPlus = rolesHere.some(r => ['LEAD', 'MGR', 'ADM'].includes(r))
    const takingOverSomeoneElse = previous && String(previous) !== String(req.user._id)
    if (takingOverSomeoneElse && !isLeadPlus) {
      return res.status(403).json({
        message: {
          ar: 'مرفوض: إعادة تعيين تذكرة موظف آخر تتطلب صلاحية قائد فريق',
          en: 'Refused: reassigning another agent\'s ticket requires team lead or above'
        }
      })
    }

    let target = null
    if (assignedAgentId) {
      target = await User.findOne({ _id: assignedAgentId, state: 'active' }).catch(() => null)
      if (!target) {
        return res.status(404).json({ message: { ar: 'الموظف غير موجود', en: 'Agent not found' }, fields: ['assignedAgentId'] })
      }
      // The assignee must themselves be scoped to this ticket, or they would
      // hold a ticket they cannot open — constitution IV would then refuse
      // their own queue's contents.
      const theirAssignments = await RoleAssignment.find({ userId: target._id })
      const covered = theirAssignments.some(a => a.unrestricted || assignmentCovers(a, ticket.scopeCoordinate()))
      if (!covered) {
        return res.status(409).json({
          message: {
            ar: 'مرفوض: الموظف غير مصرح له بنطاق هذه التذكرة',
            en: 'Refused: that agent is not scoped to this ticket\'s branch and department'
          },
          fields: ['assignedAgentId']
        })
      }
    }

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        // §10: "Assigned / reassigned / unassigned | actor, timestamp, from
        // agent, to agent, reason, cause".
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action: assignedAgentId ? 'ticket.assigned' : 'ticket.unassigned',
          entityType: 'Ticket',
          entityId: ticket._id,
          before: { assignedAgentId: previous ?? null },
          after: { assignedAgentId: target?._id ?? null, reason: String(reason).trim(), cause: 'manual' },
          req,
          session
        })

        ticket.assignedAgentId = target?._id ?? null
        // Assignment alone is not a status transition, so `status` is untouched
        // here — moving `new` to `assigned` is a separate, explicit call
        // through the transition graph (FR-008).
        await ticket.save({ session })
      })
    } finally {
      await session.endSession()
    }

    return res.json({ ticket: redact(ticket), previousAgentId: previous ?? null })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------------
// FR-007 / FR-008 / AS-03 — status change
// ---------------------------------------------------------------------------
export const changeStatus = async (req, res, next) => {
  try {
    const { status, reason, followUpAt } = req.body ?? {}

    const ticket = await findInScope(req, req.params.id)
    if (!ticket) return res.status(404).json({ message: NOT_FOUND })

    if (!STATUS_KEYS.includes(status)) {
      return bad(res, 'حالة غير معروفة', `status must be one of: ${STATUS_KEYS.join(', ')}`, ['status'])
    }
    if (status === ticket.status) {
      return res.status(409).json({
        message: { ar: 'التذكرة بالفعل في هذه الحالة', en: `The ticket is already ${status}` }
      })
    }

    // AS-03 (MUST): an undefined transition is refused "naming the statuses
    // that *are* reachable", and the ticket is unchanged with NO history entry
    // written. So this returns before the transaction opens.
    if (!canTransition(ticket.status, status)) {
      return res.status(409).json({
        message: {
          ar: `الانتقال من "${ticket.status}" إلى "${status}" غير مسموح`,
          en: `Transition from "${ticket.status}" to "${status}" is not defined`
        },
        from: ticket.status,
        reachableStatuses: reachableFrom(ticket.status)
      })
    }

    // §10 records a reason "where required". Cancellation is irreversible —
    // `cancelled` is terminal with no transition out — so it requires one.
    if (status === 'cancelled' && !(reason && String(reason).trim())) {
      return bad(res, 'سبب الإلغاء مطلوب', 'A reason is required to cancel a ticket', ['reason'])
    }

    // FR-021: "A follow-up date MUST be settable only on a status where
    // `pauses_sla` is true".
    const pauses = STATUSES[status]?.pausesSla === true
    if (followUpAt && !pauses) {
      return bad(res, 'تاريخ المتابعة يُسمح به فقط على حالة تُوقف المؤقت',
        `followUpAt may only be set on a status whose pauses_sla is true — "${status}" does not`, ['followUpAt'])
    }

    const before = { status: ticket.status, followUpAt: ticket.followUpAt ?? null }

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action: 'ticket.status_changed',
          entityType: 'Ticket',
          entityId: ticket._id,
          before,
          after: {
            status,
            // §10: "transition used" — the graph edge, so a later change to the
            // graph cannot rewrite what was legal at the time.
            transition: `${ticket.status}->${status}`,
            reason: reason ? String(reason).trim() : null,
            followUpAt: pauses ? (followUpAt ?? null) : null,
            pausesSla: STATUSES[status]?.pausesSla ?? null
          },
          req,
          session
        })

        ticket.status = status
        // FR-021: cleared whenever the new status does not pause the clock.
        ticket.followUpAt = pauses ? (followUpAt ?? null) : null
        await ticket.save({ session })
      })
    } finally {
      await session.endSession()
    }

    return res.json({
      ticket: redact(ticket),
      reachableStatuses: reachableFrom(ticket.status),
      sla: slaFor(ticket)
    })
  } catch (err) {
    return next(err)
  }
}

// ---------------------------------------------------------------------------
// FR-014 — add a message (reply or internal note)
// ---------------------------------------------------------------------------
export const addMessage = async (req, res, next) => {
  try {
    const { body, visibility } = req.body ?? {}

    const ticket = await findInScope(req, req.params.id)
    if (!ticket) return res.status(404).json({ message: NOT_FOUND })

    // §3: "Terminal statuses accept no reply and no assignment."
    if (isTerminal(ticket.status)) {
      return res.status(409).json({
        message: {
          ar: `مرفوض: التذكرة في حالة نهائية (${ticket.status})`,
          en: `Refused: the ticket is in a terminal status (${ticket.status}) and accepts no reply`
        }
      })
    }

    if (!body || !String(body).trim()) {
      return bad(res, 'نص الرسالة مطلوب', 'A message body is required', ['body'])
    }
    // Explicit, with no default. A defaulted visibility is how an internal note
    // becomes a customer reply by accident, and FR-014 has no safe default.
    if (!['customer', 'internal'].includes(visibility)) {
      return bad(res, 'يجب تحديد ما إذا كانت الرسالة للعميل أم ملاحظة داخلية',
        'visibility must be stated explicitly: "customer" or "internal"', ['visibility'])
    }

    // §9 splits authorship by VISIBILITY, not by route:
    //
    //   Reply (customer-visible) | AGT ✓ | LEAD ✓ | MGR ✓ | ADM — | AUD —
    //   Internal note            | AGT ✓ | LEAD ✓ | MGR ✓ | ADM ✓ | AUD read only
    //
    // An administrator may annotate a ticket and may not speak to the customer
    // in the organisation's voice. That distinction depends on the request BODY,
    // which route-level authorize() cannot express — which is why this endpoint
    // has been wrong in both directions: it first named AGT/LEAD/MGR and locked
    // an administrator out of internal notes too, then used WRITERS and let one
    // reply to customers. The route keeps WRITERS as the coarse gate (AUD and
    // anonymous callers never arrive here) and the visibility-dependent half is
    // decided below.
    //
    // Roles are resolved against THIS ticket's coordinate, never held globally:
    // a manager in another branch is not a manager here (FR-005).
    if (visibility === 'customer') {
      const rolesHere = rolesForTarget(req.assignments, ticket.scopeCoordinate())
      const mayReplyToCustomer = rolesHere.some(r => ['AGT', 'LEAD', 'MGR'].includes(r))
      if (!mayReplyToCustomer) {
        return res.status(403).json({
          message: {
            ar: 'مرفوض: الرد المرئي للعميل يتطلب صلاحية موظف دعم أو قائد فريق أو مدير',
            en: 'Refused: a customer-visible reply requires an agent, team lead or manager role on this ticket. An internal note is permitted.'
          }
        })
      }
    }

    const messageId = new mongoose.Types.ObjectId()
    const msg = {
      _id: messageId,
      ticketId: ticket._id,
      visibility,
      authorKind: 'user',
      authorUserId: req.user._id,
      body: String(body),
      channel: null
    }

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action: 'message.added',
          entityType: 'Message',
          entityId: messageId,
          before: null,
          // §10 records the message id and its visibility, not a second copy of
          // the body — the message itself is the record.
          after: { ticketId: ticket._id, visibility, authorKind: 'user', messageId },
          req,
          session
        })
        await Message.create([msg], { session })
      })
    } finally {
      await session.endSession()
    }

    return res.status(201).json({ message: redact(await Message.findById(messageId)) })
  } catch (err) {
    return next(err)
  }
}

// Reference data for the UI, so the client never hardcodes a status list.
export const getTicketMeta = async (req, res) => {
  return res.json({
    statuses: Object.entries(STATUSES).map(([key, meta]) => ({ key, ...meta })),
    priorities: PRIORITIES,
    transitions: Object.fromEntries(STATUS_KEYS.map(k => [k, reachableFrom(k)]))
  })
}

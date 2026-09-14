// spec 004 — implements FR-004, FR-005 (the task half only), E-09, AS-05;
// §9, §10, §11; constitution II, IV.
//
// ── WHAT IS BUILT, AND WHAT IS NOT ──────────────────────────────────────────
//
// FR-004 in full: create a task against a ticket with a due date and body, and
// complete or cancel it.
//
// FR-005 has two halves and only one is buildable:
//
//   "notify ahead of a TASK DUE DATE"   built — `dueReminders` below.
//   "and ahead of each SLA THRESHOLD    NOT BUILT. Those thresholds are
//    defined in spec 005 FR-006"        005 FR-006, and 005 is blocked on
//                                       [CLARIFY-1], the actual SLA numbers.
//                                       Inventing one would train an agent to
//                                       act on a deadline nobody agreed.
//                                       Board card: reminder-sla-thresholds.
//
// ── ⚠ NOTHING RUNS WHEN NOBODY IS LOOKING ───────────────────────────────────
//
// This system has no scheduler: no cron, no queue, no worker, no timer. So a
// reminder cannot FIRE at a moment; it is EVALUATED ON REQUEST. `dueReminders`
// is a pure read over (the caller's open tasks, now) and the workspace calls it
// on load. An agent who is not looking is not notified, and the interface says
// so in as many words rather than implying otherwise.
//
// A scheduler is deliberately not added here. 005 §11 already names one — "run
// scheduled automation (internal) | Scheduler entry | system; idempotent per
// ticket per occurrence" — so it belongs to the SLA and automation engine, and
// standing up a second one inside spec 004 would pre-empt a design 005 owns.
// Because this is a pure function of (tasks, now), that engine arrives as a
// CALLER rather than as a rewrite. Board card: reminder-scheduler.
//
// ── ACCESS ──────────────────────────────────────────────────────────────────
//
// §11: "list / create / update task | Task management | own tasks, or lead for
// others". §9 splits it further: every staff role but AUD may create and
// complete their OWN; only LEAD and above may create one FOR ANOTHER AGENT.
// Both are enforced here, and the ticket is loaded through the scope predicate
// first, so a task cannot be used to learn that an out-of-scope ticket exists.

import mongoose from 'mongoose'
import { Task } from '../../DB/models/task.model.js'
import { Ticket } from '../../DB/models/ticket.model.js'
import { User } from '../../DB/models/user.model.js'
import { recordAudit, redact } from '../../utils/audit.js'
import { scopeFilter } from '../../utils/scope.js'
import { TASK_POLICY } from '../../config/task-policy.js'

const bilingual = (ar, en) => ({ ar, en })
const TICKET_NOT_FOUND = bilingual('التذكرة غير موجودة', 'Ticket not found')
const TASK_NOT_FOUND = bilingual('المهمة غير موجودة', 'Task not found')

const ticketInScope = async (req, id) =>
  Ticket.findOne({ _id: id, ...scopeFilter(req.assignments) }).catch(() => null)

const rolesOf = (req) => new Set((req.assignments ?? []).map(a => a.role))
const mayAssignToOthers = (req) => ['LEAD', 'MGR', 'ADM'].some(r => rolesOf(req).has(r))

/**
 * Which of these tasks are due for a reminder, or already overdue.
 *
 * ⚠ A PURE FUNCTION of (tasks, now). It reads nothing and writes nothing, which
 * is what lets the SLA engine's scheduler call it later without this module
 * changing — see the note at the top.
 *
 * AS-05 fixes both boundaries: "a task due tomorrow at 10:00 with a 2-hour
 * reminder ... when 08:00 tomorrow arrives, the agent is notified ... AND THE
 * TASK APPEARS IN THE OVERDUE COUNT ONLY AFTER 10:00". So `due` opens at
 * dueAt − remindBefore, and `overdue` opens strictly after dueAt. A task
 * between the two is due-soon, not late.
 */
export const dueReminders = (tasks, now = new Date()) => {
  const at = now.getTime()
  return (tasks ?? [])
    .filter(t => t.state === 'open')
    .map(t => {
      const due = new Date(t.dueAt).getTime()
      const lead = (t.remindBeforeMinutes ?? TASK_POLICY.defaultRemindBeforeMinutes.value) * 60000
      // "Only after 10:00" — strictly after, so a task due exactly now is not
      // yet late.
      const overdue = at > due
      const remindFrom = due - lead
      return { task: t, overdue, reminding: !overdue && at >= remindFrom }
    })
    .filter(r => r.overdue || r.reminding)
}

// ---------------------------------------------------------------------------
// FR-004 — create
// ---------------------------------------------------------------------------
export const createTask = async (req, res, next) => {
  try {
    const { body, dueAt, ownerId, remindBeforeMinutes } = req.body ?? {}

    const ticket = await ticketInScope(req, req.params.ticketId)
    if (!ticket) return res.status(404).json({ message: TICKET_NOT_FOUND })

    const missing = []
    if (!body || !String(body).trim()) missing.push('body')
    if (!dueAt) missing.push('dueAt')
    if (missing.length) {
      return res.status(400).json({
        message: bilingual(
          `حقول مطلوبة ناقصة: ${missing.join('، ')}`,
          `Required fields are missing: ${missing.join(', ')}`),
        fields: missing
      })
    }

    const due = new Date(dueAt)
    if (Number.isNaN(due.getTime())) {
      return res.status(400).json({
        message: bilingual('تاريخ الاستحقاق غير صالح', 'dueAt is not a valid date'),
        fields: ['dueAt']
      })
    }
    // ⚠ NO PAST-DATE CHECK. E-09: "Task due date is in the past → ACCEPTED and
    // immediately overdue; not refused." Somebody recording a follow-up they
    // already owe is the normal case.

    // §9: "Create a task for another agent — AGT —, LEAD ✓, MGR ✓, ADM ✓".
    const owner = ownerId ? String(ownerId) : String(req.user._id)
    if (owner !== String(req.user._id) && !mayAssignToOthers(req)) {
      return res.status(403).json({
        message: bilingual(
          'مرفوض: إسناد مهمة إلى زميل يتطلب قائد فريق أو أعلى',
          'Refused: creating a task for a colleague requires a team lead or above')
      })
    }
    if (owner !== String(req.user._id)) {
      const target = await User.findById(owner).catch(() => null)
      if (!target || target.state !== 'active') {
        return res.status(400).json({
          message: bilingual('المستخدم غير موجود أو موقوف', 'That user does not exist or is deactivated'),
          fields: ['ownerId']
        })
      }
    }

    const id = new mongoose.Types.ObjectId()
    const doc = {
      _id: id,
      ticketId: ticket._id,
      ownerId: owner,
      createdBy: req.user._id,
      dueAt: due,
      remindBeforeMinutes: Number.isFinite(Number(remindBeforeMinutes))
        ? Number(remindBeforeMinutes) : null,
      state: 'open',
      body: String(body).trim()
    }

    // Constitution II. §10: "Task created / completed / cancelled / reassigned
    // | actor, timestamp, ticket, owner, due at, outcome".
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action: 'task.created',
          entityType: 'Task',
          entityId: id,
          before: null,
          after: { ticketId: ticket._id, ownerId: owner, dueAt: due, outcome: 'open' },
          req,
          session
        })
        await Task.create([doc], { session })
      })
    } finally { await session.endSession() }

    const created = await Task.findById(id)
    return res.status(201).json({ task: redact(created) })
  } catch (err) { return next(err) }
}

// ---------------------------------------------------------------------------
// FR-004 — the tasks on one ticket
// ---------------------------------------------------------------------------
export const listTicketTasks = async (req, res, next) => {
  try {
    const ticket = await ticketInScope(req, req.params.ticketId)
    if (!ticket) return res.status(404).json({ message: TICKET_NOT_FOUND })

    // Everyone who can see the ticket sees its tasks. §11 bounds WRITING to
    // "own tasks, or lead for others"; a task is part of what is happening on
    // the ticket, and hiding a colleague's follow-up would mean two people
    // promising the customer the same thing.
    const tasks = await Task.find({ ticketId: ticket._id }).sort({ state: 1, dueAt: 1 })
    const owners = await User.find({ _id: { $in: tasks.map(t => t.ownerId) } }).select('displayName')
    const nameOf = (id) => owners.find(u => String(u._id) === String(id))?.displayName ?? null

    return res.json({
      tasks: tasks.map(t => ({ ...redact(t), ownerName: nameOf(t.ownerId) }))
    })
  } catch (err) { return next(err) }
}

// ---------------------------------------------------------------------------
// FR-005 (task half) — MY open tasks, and which are due or overdue
// ---------------------------------------------------------------------------
export const myTasks = async (req, res, next) => {
  try {
    // Scope is applied through the TICKETS these tasks hang from: a task whose
    // ticket has moved out of the caller's scope must not surface here.
    const inScope = await Ticket.find(scopeFilter(req.assignments)).select('_id')
    const ids = new Set(inScope.map(t => String(t._id)))

    const tasks = (await Task.find({ ownerId: req.user._id, state: 'open' }).sort({ dueAt: 1 }))
      .filter(t => ids.has(String(t.ticketId)))

    const tickets = await Ticket.find({ _id: { $in: tasks.map(t => t.ticketId) } })
      .select('reference subject')

    const decorate = (t) => {
      const ticket = tickets.find(x => String(x._id) === String(t.ticketId))
      return {
        ...redact(t),
        ticketReference: ticket?.reference ?? null,
        ticketSubject: ticket?.subject ?? null
      }
    }

    const reminders = dueReminders(tasks)

    return res.json({
      tasks: tasks.map(decorate),
      // What the workspace shows as a reminder. Computed HERE, on this request,
      // because nothing runs when nobody is looking.
      reminders: reminders.map(r => ({ ...decorate(r.task), overdue: r.overdue })),
      overdueCount: reminders.filter(r => r.overdue).length,
      // Said in the response as well as on screen, so an integrator reading the
      // API has the same warning the agent does.
      evaluatedAt: new Date(),
      evaluation: 'on_request'
    })
  } catch (err) { return next(err) }
}

// ---------------------------------------------------------------------------
// FR-004 — complete or cancel
// ---------------------------------------------------------------------------
const setState = (nextState, action) => async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).catch(() => null)
    if (!task) return res.status(404).json({ message: TASK_NOT_FOUND })

    // The ticket must still be in scope, or the task is not reachable either.
    const ticket = await ticketInScope(req, task.ticketId)
    if (!ticket) return res.status(404).json({ message: TASK_NOT_FOUND })

    // §9: "Create / COMPLETE OWN tasks". A lead may act on a colleague's,
    // because §9 gives them the row that creates one for somebody else and a
    // task they set is a task they may close.
    const mine = String(task.ownerId) === String(req.user._id)
    if (!mine && !mayAssignToOthers(req)) {
      return res.status(403).json({
        message: bilingual(
          'مرفوض: هذه مهمة زميل — إغلاقها يتطلب قائد فريق أو أعلى',
          "Refused: that is a colleague's task — closing it requires a team lead or above")
      })
    }

    if (task.state !== 'open') {
      return res.status(409).json({
        message: bilingual(
          `المهمة بالفعل في حالة "${task.state}"`,
          `The task is already "${task.state}"`)
      })
    }

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action,
          entityType: 'Task',
          entityId: task._id,
          before: { state: task.state },
          after: {
            state: nextState, ticketId: task.ticketId,
            ownerId: task.ownerId, dueAt: task.dueAt, outcome: nextState
          },
          req,
          session
        })
        await Task.updateOne(
          { _id: task._id },
          { $set: { state: nextState, closedAt: new Date() } },
          { session }
        )
      })
    } finally { await session.endSession() }

    const updated = await Task.findById(task._id)
    return res.json({ task: redact(updated) })
  } catch (err) { return next(err) }
}

export const completeTask = setState('done', 'task.completed')
export const cancelTask = setState('cancelled', 'task.cancelled')

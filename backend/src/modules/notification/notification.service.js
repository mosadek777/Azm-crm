// spec 004 — implements FR-013, AD-13, §10, §11; constitution II, IV.
//
// FR-013 (MUST): "The system MUST deliver notifications for assignment,
// mention, customer reply, escalation, task due, SLA threshold, delivery
// failure and chat offer, on the channels the user has enabled. Notifications
// for one ticket within a configured window MUST be grouped, except
// escalations, which MUST NOT be grouped or suppressed."
//
// ── WHAT IS DELIVERABLE, KIND BY KIND ───────────────────────────────────────
//
//   assigned          BUILT — written when a ticket is assigned to somebody.
//   mentioned         BUILT — FR-009, decision 39.
//   customer_replied  BUILT — written when a customer-visible reply arrives.
//   escalated         no escalation exists (005). Nothing produces it.
//   task_due          the task reminder surface answers this ON REQUEST, and
//                     deliberately does not write rows — see the note below.
//   sla_threshold     blocked on 005 [CLARIFY-1]. Board card:
//                     reminder-sla-thresholds.
//   delivery_failed   needs a channel that can fail. Spec 003.
//   chat_offered      needs chat. Spec 003 / 004 [CLARIFY-3].
//
// The enum carries all eight so the unreachable ones are visibly unreachable
// rather than absent — a reader can see what is missing and why.
//
// ── WHY `task_due` DOES NOT WRITE ROWS ──────────────────────────────────────
//
// There is no scheduler in this system, so nothing can write a task_due row at
// the moment it falls due. Writing one when somebody happens to open the
// workspace would produce a record whose timestamp claims a delivery that did
// not happen. `GET /task/mine` evaluates the rule on the request instead and
// says so. decisions-pending §20.
//
// ── IN-APP ONLY, AND `channelsSent` NEVER CLAIMS OTHERWISE ──────────────────
//
// `channelsSent: ['in_app']` is written because in-app is the only channel that
// exists. It is not a preference lookup and it must never become one until
// there is a second channel to prefer — a row claiming `email` would make
// "notification delivered" a false statement in the audit trail.
//
// ── §11: `user = caller` ONLY ───────────────────────────────────────────────
//
// "list / mark notifications | Notification centre | user = caller only."
// Narrower than branch and department scope, so it does NOT go through
// scopeFilter — every query below filters on `userId: req.user._id` and there
// is no parameter that can widen it.

import mongoose from 'mongoose'
import { Notification } from '../../DB/models/notification.model.js'
import { Ticket } from '../../DB/models/ticket.model.js'
import { recordAudit, redact } from '../../utils/audit.js'
import { resolveActors } from '../../utils/actor.js'
import { NOTIFICATION_POLICY } from '../../config/notification-policy.js'
import { conditionalJson } from '../../utils/conditional.js'

const bilingual = (ar, en) => ({ ar, en })
const NOT_FOUND = bilingual('الإشعار غير موجود', 'Notification not found')

/**
 * THE ONLY WRITER. Every producer calls this, inside its own transaction,
 * passing its session — constitution II: the notification and its audit entry
 * commit with the mutation that caused them, or none of them do.
 *
 * `session` is REQUIRED and has no default, exactly as `recordAudit` requires
 * one: a producer that forgot it would write notifications that survive a
 * rolled-back mutation, which is a notification about something that never
 * happened.
 *
 * Returns the rows created. Never throws for an empty recipient list — "nobody
 * to tell" is a normal outcome, not an error.
 */
export const notify = async ({ userIds, kind, ticketId, actorId, actorRef, req, session }) => {
  const recipients = [...new Set((userIds ?? []).map(String))]
    // Nobody is notified about their own action. A mention of yourself, or a
    // ticket you assigned to yourself, is not news.
    .filter(id => String(id) !== String(actorId ?? ''))
  if (!recipients.length) return []

  const rows = recipients.map(userId => ({
    _id: new mongoose.Types.ObjectId(),
    userId,
    kind,
    ticketId: ticketId ?? null,
    actorId: actorId ?? null,
    // IN-APP ONLY. See the header — this must not become a preference lookup
    // until there is a second channel.
    channelsSent: ['in_app'],
    readAt: null
  }))

  await Notification.insertMany(rows, { session })

  // §10: "Notification generated / delivered / failed | user, kind, ticket,
  // channels attempted, outcome". One entry per notification, because the row
  // names one user and a batched entry could not answer "was I notified".
  for (const row of rows) {
    await recordAudit({
      actorId: actorId ?? null,
      actorRef: actorRef ?? 'system',
      action: 'notification.generated',
      entityType: 'Notification',
      entityId: row._id,
      after: {
        userId: String(row.userId),
        kind: row.kind,
        ticketId: row.ticketId ? String(row.ticketId) : null,
        // "channels attempted" and "outcome" as §10 asks. Delivery is the same
        // instant as generation for in-app, and that is stated rather than
        // implied: there is no queue between the two.
        channelsAttempted: ['in_app'],
        outcome: 'delivered'
      },
      req,
      session
    })
  }

  return rows
}

// ---------------------------------------------------------------------------
// FR-013 — the notification centre
// ---------------------------------------------------------------------------

/**
 * FR-013's grouping clause, applied AT READ TIME.
 *
 * "Notifications for one ticket within a configured window MUST be grouped,
 * except escalations, which MUST NOT be grouped or suppressed."
 *
 * Grouped on the way OUT rather than suppressed on the way IN, for two reasons:
 *
 *   1. Every event stays recorded. §10 requires an audit entry per notification
 *      generated; dropping the second one at write time would make the audit
 *      trail and the centre disagree about what happened.
 *   2. "Grouped" is a presentation of several events, not the loss of all but
 *      one. The group carries its own count and the instant of the newest and
 *      oldest member, so nothing is hidden.
 *
 * ESCALATIONS ARE EXEMPT, and the exemption is written even though nothing
 * produces an escalation yet — the clause is a MUST NOT, and a later producer
 * would otherwise inherit grouping silently.
 */
export const groupNotifications = (rows, windowMs = NOTIFICATION_POLICY.groupWindowMinutes.value * 60000) => {
  const groups = []
  for (const row of rows) {
    const key = `${row.kind}:${row.ticketId ?? 'none'}`
    const last = groups.find(g =>
      g.key === key &&
      // MUST NOT be grouped or suppressed. An escalation never joins a group,
      // and never absorbs one.
      g.kind !== 'escalated' &&
      row.kind !== 'escalated' &&
      Math.abs(new Date(g.newestAt).getTime() - new Date(row.createdAt).getTime()) <= windowMs)

    if (last) {
      last.count += 1
      last.ids.push(String(row._id))
      last.oldestAt = row.createdAt
      // A group is unread if ANY member is. Marking one read must not hide the
      // rest — the caller marks the whole group.
      last.unread = last.unread || row.readAt === null
      continue
    }

    groups.push({
      key,
      kind: row.kind,
      ticketId: row.ticketId ? String(row.ticketId) : null,
      actorId: row.actorId ? String(row.actorId) : null,
      ids: [String(row._id)],
      count: 1,
      newestAt: row.createdAt,
      oldestAt: row.createdAt,
      unread: row.readAt === null
    })
  }
  return groups
}

export const listNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit) || 50))

    // §11: user = caller. Not a scope filter — a narrower one, and there is no
    // query parameter that can widen it.
    const rows = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)

    const groups = groupNotifications(rows)

    // The ticket reference is what makes a notification actionable. Re-read
    // through the scope predicate, so a notification for a ticket the caller
    // has since lost access to renders without it rather than disclosing it.
    const { scopeFilter } = await import('../../utils/scope.js')
    const tickets = await Ticket.find({
      _id: { $in: groups.map(g => g.ticketId).filter(Boolean) },
      ...scopeFilter(req.assignments)
    }).select('_id reference subject')

    const byTicket = new Map(tickets.map(t => [String(t._id), t]))

    // Names, not ids, and resolved through the one resolver — an actor may be
    // deactivated or may be the system, and both have a rendering.
    const actors = await resolveActors(
      groups.filter(g => g.actorId).map(g => ({ actorRef: g.actorId })))

    return res.json({
      notifications: groups.map(g => {
        const ticket = g.ticketId ? byTicket.get(g.ticketId) : null
        return {
          ...g,
          actor: g.actorId ? actors.get(String(g.actorId)) ?? null : null,
          // Null when the ticket is no longer reachable. The row still exists —
          // AS-01 forbids revealing the record, not the fact that you were once
          // notified.
          ticketReference: ticket?.reference ?? null,
          ticketSubject: ticket?.subject ?? null,
          reachable: !!ticket
        }
      }),
      unread: await Notification.countDocuments({ userId: req.user._id, readAt: null }),
      // In-app is the only channel. Said in the response as well as on screen,
      // so an integrator reading the API has the same warning the agent does.
      channels: ['in_app'],
      groupWindowMinutes: NOTIFICATION_POLICY.groupWindowMinutes.value
    })
  } catch (err) { return next(err) }
}

/** The unread count on its own — what the navigation badge reads. */
export const unreadCount = async (req, res, next) => {
  try {
    // FR-021: polled every few seconds, so it answers 304 when unchanged. The
    // count is still QUERIED on every poll — see utils/conditional.js for why
    // the cheaper version-token design was rejected.
    return conditionalJson(req, res, {
      unread: await Notification.countDocuments({ userId: req.user._id, readAt: null })
    })
  } catch (err) { return next(err) }
}

const markRows = async (req, res, filter, action) => {
  const session = await mongoose.startSession()
  try {
    let changed = 0
    await session.withTransaction(async () => {
      // §11 again: the filter ALWAYS carries userId, so an id belonging to
      // somebody else matches nothing — 404, never 403, and byte-identical to
      // an id that does not exist (constitution IV).
      const scoped = { ...filter, userId: req.user._id, readAt: null }
      const rows = await Notification.find(scoped).select('_id').session(session)
      if (!rows.length) { changed = 0; return }

      await recordAudit({
        actorId: req.user._id,
        actorRef: req.user._id.toString(),
        action,
        entityType: 'Notification',
        entityId: rows.map(r => String(r._id)),
        after: { count: rows.length, readAt: new Date() },
        req,
        session
      })

      const result = await Notification.updateMany(scoped, { $set: { readAt: new Date() } }, { session })
      changed = result.modifiedCount ?? 0
    })
    return changed
  } finally {
    await session.endSession()
  }
}

export const markRead = async (req, res, next) => {
  try {
    // A GROUP is marked, not a row: the centre shows groups, and marking the
    // visible group while leaving its members unread would leave a badge
    // counting things the reader cannot see.
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [req.params.id].filter(Boolean)
    if (!ids.length) {
      return res.status(400).json({ message: bilingual('لم تُحدَّد أي إشعارات', 'No notifications were named'), fields: ['ids'] })
    }

    const valid = ids.filter(id => mongoose.isValidObjectId(id))
    if (!valid.length) return res.status(404).json({ message: NOT_FOUND })

    const changed = await markRows(req, res, { _id: { $in: valid } }, 'notification.read')
    // Nothing changed is not an error: already-read is the normal repeat case.
    return res.json({ changed, unread: await Notification.countDocuments({ userId: req.user._id, readAt: null }) })
  } catch (err) { return next(err) }
}

export const markAllRead = async (req, res, next) => {
  try {
    const changed = await markRows(req, res, {}, 'notification.read_all')
    return res.json({ changed, unread: 0 })
  } catch (err) { return next(err) }
}

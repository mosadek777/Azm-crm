// spec 004 — implements FR-016, AD-16, AS-10, E-14; constitution III, IV.
//
// FR-016 (MUST): "Leads MUST have a team queue viewable by unassigned, oldest,
// at-risk and per-agent load, supporting assignment from the list, scoped to
// the teams, branches and departments they hold."
//
// ── FOUR VIEWS; THREE CAN BE ANSWERED ───────────────────────────────────────
//
//   unassigned  built — nobody holds it, ordered priority then age (E-05).
//   oldest      built — plain age order, and the one view that needs no rule.
//   agent load  built — open ticket count per agent IN SCOPE, including the
//               agents carrying ZERO, because "who can take this" is the
//               question a lead is actually asking.
//   at risk     NOT ANSWERABLE. "At risk" is a statement about remaining time
//               against an SLA target. `elapsed-time.js` answers `unavailable`
//               because 005 [CLARIFY-2] (working hours and holidays per branch)
//               is unanswered, and constitution III forbids computing a
//               substitute anywhere else. The view is still OFFERED and says
//               why it cannot answer — the same treatment the overdue counter
//               already gets. Hiding it would make a blocked requirement look
//               like a requirement nobody read.
//
// AS-08 is the reason this must not be quietly faked: "both show 45 minutes and
// the at-risk state, and the value is identical to the one spec 009 reports for
// the same ticket at the same instant". A number invented here would be a
// number that disagrees with 009 by construction.
//
// ── "TEAM" IS BRANCH + DEPARTMENT HERE, AND THAT IS NOT A SHORTCUT TAKEN ────
//
// §11's predicate is "team ∈ caller teams AND branch ∈ scope AND department ∈
// scope". Team does not exist (decision 20; spec defect §7 — no spec in this
// repository defines the entity), so the predicate runs with two of its three
// conjuncts. Dropping a conjunct from an AND WIDENS the result, and that is
// said plainly rather than buried: a lead sees every ticket in their branches
// and departments, not only their teams' share of them.
//
// That is not a new exposure. `GET /ticket` already returns exactly this set to
// exactly these callers, through the same `scopeFilter`, and has since spec
// 002. This screen re-presents what the caller can already list. When Team
// arrives it is added in `utils/scope.js` and nowhere else, and this endpoint
// narrows with it automatically.
//
// ── NOTHING HERE MUTATES ────────────────────────────────────────────────────
//
// Assignment from the list re-uses `PATCH /ticket/:id/assign`, which already
// carries FR-009's required reason, the terminal-status refusal, the
// assignee-must-be-scoped check and the audit entry in its transaction. A
// second assignment path would be a second place for those to drift.
// §10's "Bulk assignment from the team queue" is NOT built: one row at a time.
// Board card: team-queue-bulk-assign.

import { Ticket } from '../../DB/models/ticket.model.js'
import { User } from '../../DB/models/user.model.js'
import { Customer } from '../../DB/models/customer.model.js'
import { RoleAssignment } from '../../DB/models/role-assignment.model.js'
import { redact } from '../../utils/audit.js'
import { scopeFilter, reachableScope } from '../../utils/scope.js'
import { elapsedBusinessMinutes } from '../../utils/elapsed-time.js'
import { STATUSES, isTerminal } from '../../utils/ticket-status.js'

/** Work still on somebody's desk. Resolved and closed are not queue material. */
const OPEN_STATUSES = Object.keys(STATUSES).filter(k => !isTerminal(k))

export const VIEWS = ['unassigned', 'oldest', 'at_risk', 'agent']

/** FR-034 / constitution III: read, never computed. */
const slaFor = (ticket) => elapsedBusinessMinutes({ ticketId: ticket._id, targetKind: 'resolution' })

/**
 * Priority rank, then age. E-05's fallback ordering, the same one the personal
 * queue uses — two orders called "the queue" would be two different queues.
 */
const RANK = {
  $switch: {
    branches: [
      { case: { $eq: ['$priority', 'urgent'] }, then: 0 },
      { case: { $eq: ['$priority', 'high'] }, then: 1 },
      { case: { $eq: ['$priority', 'normal'] }, then: 2 }
    ],
    default: 3
  }
}

export const teamQueue = async (req, res, next) => {
  try {
    const view = VIEWS.includes(String(req.query?.view)) ? String(req.query.view) : 'unassigned'
    const agentId = req.query?.agentId ? String(req.query.agentId) : null
    const page = Math.max(1, Number(req.query?.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit) || 25))

    // The scope predicate is the BASE of every query below, never an extra
    // condition bolted on afterwards — AS-01, constitution IV.
    const base = { ...scopeFilter(req.assignments), status: { $in: OPEN_STATUSES } }
    const scope = reachableScope(req.assignments)

    // E-14: "Lead scoped to zero teams → team queue is empty with an
    // EXPLANATION, not an error." With no Team entity the analogue is a caller
    // whose assignments reach no branch or no department at all. Answered as an
    // empty queue that says why, never as a 403 and never as a 500.
    const scopeEmpty = !scope.unrestricted &&
      (scope.branchIds.length === 0 || scope.departmentIds.length === 0)

    // ── PER-AGENT LOAD ────────────────────────────────────────────────────
    //
    // Returned for EVERY view, not only the agent one: a lead deciding where a
    // ticket goes wants the list and the loads on the same screen.
    //
    // Agents carrying zero are INCLUDED. A group-by over tickets alone can only
    // produce agents who already hold work, which inverts the question — the
    // person to hand a ticket to is precisely the one with no row.
    let load = []
    if (!scopeEmpty) {
      const overlapping = scope.unrestricted
        ? await RoleAssignment.find({})
        : await RoleAssignment.find({
          branchIds: { $in: scope.branchIds },
          departmentIds: { $in: scope.departmentIds }
        })

      // AUD changes nothing and is never an assignment target, so an auditor is
      // not somebody a lead can rebalance onto. Everyone else is.
      const assignable = new Map()
      for (const a of overlapping) {
        if (a.role === 'AUD') continue
        assignable.set(String(a.userId), a.role)
      }

      const users = await User.find({ _id: { $in: [...assignable.keys()], }, state: 'active' })
        .select('_id displayName email')

      // ⚠ THE FILTER MUST BE CAST BEFORE IT REACHES $match. `find()` casts
      // query values against the schema; `aggregate()` does NOT, and
      // `reachableScope` hands back ids as STRINGS. An uncast $match compares
      // strings against ObjectIds, matches nothing, and reports every agent as
      // idle — which reads as a working answer.
      const cast = Ticket.find(base).cast(Ticket)
      const counts = await Ticket.aggregate([
        { $match: cast },
        { $group: { _id: '$assignedAgentId', open: { $sum: 1 } } }
      ])
      const byAgent = new Map(counts.map(c => [String(c._id), c.open]))

      load = users
        .map(u => ({
          userId: String(u._id),
          displayName: u.displayName,
          role: assignable.get(String(u._id)) ?? null,
          open: byAgent.get(String(u._id)) ?? 0
        }))
        // Lightest first: the answer to "who takes this" is at the top.
        .sort((a, b) => a.open - b.open || a.displayName.localeCompare(b.displayName))
    }

    // ── THE LIST ──────────────────────────────────────────────────────────
    const filter = { ...base }
    let ordering = { applied: 'priority_then_age', reason: 'sla_unavailable' }
    let unavailable = null
    let tickets = []
    let total = 0

    if (scopeEmpty) {
      ordering = { applied: 'none', reason: 'scope_empty' }
    } else if (view === 'at_risk') {
      // NOT COMPUTED, NOT GUESSED, NOT SILENTLY EMPTY. An empty list here would
      // read as "no ticket is at risk", which is a factual claim nobody can
      // make. The caller renders `unavailable` and its reason instead.
      unavailable = { reason: 'sla_unavailable', blockedBy: '005 [CLARIFY-2]' }
      ordering = { applied: 'none', reason: 'sla_unavailable' }
    } else {
      if (view === 'unassigned') filter.assignedAgentId = null
      if (view === 'agent') {
        // No agent chosen yet is not an error: the load table IS the view until
        // one is picked.
        if (!agentId) {
          ordering = { applied: 'none', reason: 'no_agent_selected' }
          return res.json(answer({ view, tickets: [], total: 0, page, limit, ordering, load, scope, scopeEmpty, unavailable }))
        }
        filter.assignedAgentId = agentId
      }

      total = await Ticket.countDocuments(filter)

      if (view === 'oldest') {
        ordering = { applied: 'oldest_first', reason: null }
        tickets = await Ticket.find(filter).sort({ createdAt: 1 })
          .skip((page - 1) * limit).limit(limit)
      } else {
        const cast = Ticket.find(filter).cast(Ticket)
        tickets = await Ticket.aggregate([
          { $match: cast },
          { $addFields: { _rank: RANK } },
          { $sort: { _rank: 1, createdAt: 1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          { $project: { _rank: 0 } }
        ])
      }
    }

    // Denormalised for display only, and each re-read THROUGH the same scope
    // filter, so a joined name cannot carry an out-of-scope record into the
    // response.
    const customers = await Customer.find({
      _id: { $in: tickets.map(t => t.customerId) }, ...scopeFilter(req.assignments)
    })
    const agents = await User.find({ _id: { $in: tickets.map(t => t.assignedAgentId).filter(Boolean) } })
    const nameOf = (list, id) => list.find(x => String(x._id) === String(id))?.displayName ?? null

    return res.json(answer({
      view,
      tickets: tickets.map(t => ({
        ...redact(t),
        customerName: nameOf(customers, t.customerId),
        assignedAgentName: nameOf(agents, t.assignedAgentId),
        sla: slaFor(t)
      })),
      total, page, limit, ordering, load, scope, scopeEmpty, unavailable
    }))
  } catch (err) { return next(err) }
}

/**
 * One response shape for every branch above, so a caller never has to test
 * which fields arrived. `teamDimension: false` is said out loud rather than
 * inferred from an absent field — see the header.
 */
const answer = ({ view, tickets, total, page, limit, ordering, load, scope, scopeEmpty, unavailable }) => ({
  view,
  tickets,
  total,
  page,
  limit,
  ordering,
  load,
  // E-14's "with an explanation": the caller renders the reason, not a blank.
  scopeEmpty,
  // AS-08 / constitution III. Null when the view could be answered at all.
  unavailable,
  scope: {
    unrestricted: !!scope.unrestricted,
    branches: scope.unrestricted ? null : scope.branchIds.length,
    departments: scope.unrestricted ? null : scope.departmentIds.length,
    // Decision 20 / spec defect §7, stated in the payload so an integrator
    // reading the API sees the same caveat the screen shows.
    teamDimension: false
  }
})

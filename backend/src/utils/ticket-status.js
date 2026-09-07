// spec 002 — implements FR-007, FR-008, AS-03; and the ratified §3 status set
//
// The status set is RATIFIED (2026-09-07): ten statuses, being the spec's
// original nine with `pending_third_party` split into `pending_supplier`
// (pauses the clock) and `pending_internal` (does not) — decision 15.
//
// THE TRANSITION GRAPH IS DECISION 22 — a developer default, flagged as data.
// FR-008 makes transitions administrator-defined and NO SPEC SUPPLIES A DEFAULT
// SET. Refusing every transition would break FR-008; permitting every
// transition would break AS-03, which requires an undefined move to be refused
// with the reachable statuses named. So a default graph is authored here, in
// one place, and is data rather than logic.
//
// `pauses_sla` is consumed only by spec 005. This module never interprets it —
// FR-034 and constitution III forbid this spec computing anything from it.

export const STATUSES = {
  new: { pausesSla: false, terminal: false, requiresResolutionFields: false },
  assigned: { pausesSla: false, terminal: false, requiresResolutionFields: false },
  in_progress: { pausesSla: false, terminal: false, requiresResolutionFields: false },
  pending_customer: { pausesSla: true, terminal: false, requiresResolutionFields: false },
  pending_supplier: { pausesSla: true, terminal: false, requiresResolutionFields: false },
  pending_internal: { pausesSla: false, terminal: false, requiresResolutionFields: false },
  resolved: { pausesSla: true, terminal: false, requiresResolutionFields: false },
  closed: { pausesSla: null, terminal: true, requiresResolutionFields: false },
  merged: { pausesSla: null, terminal: true, requiresResolutionFields: false },
  cancelled: { pausesSla: null, terminal: true, requiresResolutionFields: false }
}

export const STATUS_KEYS = Object.keys(STATUSES)

// `requiresResolutionFields` is false everywhere — DECISION 23, recorded as
// scoped out rather than covered. FR-029 and AS-13 require a root cause and a
// resolution code from administrator-defined lists on transition to a status
// that demands them, and those two lists are bilingual admin-authored entities
// (spec 002 §8) that were not built. Flipping a flag here without the lists
// would refuse every resolution with no way to satisfy it.

// Decision 22. Read as: from → the statuses reachable by a human action.
export const TRANSITIONS = {
  new: ['assigned', 'in_progress', 'cancelled'],
  assigned: ['in_progress', 'pending_customer', 'pending_supplier', 'pending_internal', 'resolved', 'cancelled'],
  in_progress: ['pending_customer', 'pending_supplier', 'pending_internal', 'resolved', 'cancelled'],
  pending_customer: ['in_progress', 'resolved', 'cancelled'],
  pending_supplier: ['in_progress', 'resolved', 'cancelled'],
  pending_internal: ['in_progress', 'resolved', 'cancelled'],
  resolved: ['closed', 'in_progress'],

  // Terminal — no human transition out. This is deliberate and it is what makes
  // AS-03 true: "Given a ticket with `status = closed`, where no transition
  // from `closed` to `in_progress` is defined ... the change is refused".
  //
  // FR-022's reopen is NOT a hole here. It is a customer-reply-driven system
  // action within the 14-calendar-day window (decision 10), not an agent
  // setting a status — and inbound replies are spec 003, out of today's scope.
  // When channels are built, reopen goes through its own path, not through
  // this graph.
  closed: [],
  merged: [],
  cancelled: []
}

export const canTransition = (from, to) => (TRANSITIONS[from] ?? []).includes(to)

export const reachableFrom = (from) => TRANSITIONS[from] ?? []

export const isTerminal = (status) => Boolean(STATUSES[status]?.terminal)

// Priority keys only. The LABELS are bilingual and administrator-authored
// (spec 002 §8), which is a configuration surface not built today — so these
// are language-neutral keys, exactly as status `key` is "language-neutral"
// per §8. Nothing here is user-visible text.
export const PRIORITIES = ['low', 'normal', 'high', 'urgent']

// §3: priority "carries `priority_source` = manual | category_default | rule |
// ai". Only `manual` can occur today: category defaults need the category tree
// (dropped by decision 21), rules are spec 005, and `ai` is spec 007 which
// constitution V forbids building.
export const PRIORITY_SOURCES = ['manual', 'category_default', 'rule', 'ai']

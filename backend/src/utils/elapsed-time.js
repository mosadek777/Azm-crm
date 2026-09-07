// spec 005 — implements FR-005 (the unavailable branch only); constitution III
//
// The single implementation of elapsed time in this system. No other file may
// subtract dates or use a duration helper (spec 002 FR-034, constitution III).
//
// "Elapsed" here means BUSINESS duration: working hours in the applicable
// branch calendar, minus the intervals in the ticket's append-only pause
// ledger. It is never `now - created_at`.
//
// The calendars do not exist yet — spec 005 [CLARIFY-2] (working hours and
// holidays per branch) and [CLARIFY-1] (the actual SLA numbers) are unanswered.
// So this returns `unavailable` unconditionally, which is the behaviour the
// spec requires while it is blocked: callers must render "unavailable" and are
// forbidden from falling back to a computed number.
//
// The return envelope is deliberately wide. When 005 unblocks, the `ok` branch
// grows to carry FR-005's six values — state, consumed, remaining, target,
// at_risk, breached — and no caller signature changes.
//
//   { status: 'ok', minutes, ... }
//   { status: 'unavailable', reason }
//
// It never returns a bare number, so no caller can silently treat a missing
// answer as zero.

export const elapsedBusinessMinutes = ({ ticketId, targetKind } = {}) => {
  return {
    status: 'unavailable',
    reason: 'no-business-calendar-configured'
  }
}

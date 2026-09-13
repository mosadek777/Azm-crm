// Where "today" starts — spec 009 E-19, spec 012 §3 and FR-008.
//
// ⚠ THIS IS NOT THE SLA CLOCK, and it must never become it.
//
// `elapsed-time.js` answers "how much WORKING time has passed", needs business
// hours, holidays and the pause ledger, and returns `unavailable` because
// 005 [CLARIFY-2] is unanswered. This file answers a much smaller question:
// which calendar day is it, right now, in one branch's timezone. That needs
// only the timezone, which 012 §3 makes a required field on every branch and
// says exists to "drive period boundaries in spec 009 E-19".
//
// So a "resolved today" counter is answerable while a duration is not, and
// neither borrows from the other. Nothing here subtracts two timestamps to
// produce a duration; it produces an INSTANT — the start of the local day —
// and the database compares against it.
//
// E-19 also requires that a result spanning several branches "states which
// timezone it used", which is why the callers are handed the set back.

/**
 * Offset, in milliseconds, between UTC and `tz` at the given instant.
 * Derived from Intl rather than a table, so it follows DST on its own.
 */
const offsetMs = (tz, at) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(at).map(p => [p.type, p.value])
  )
  const asIfUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    // Intl emits hour 24 for midnight in some locales/engines.
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second)
  )
  return asIfUtc - at.getTime()
}

/**
 * The instant at which the current local day began in `tz`.
 *
 * An unknown or malformed timezone falls back to UTC rather than throwing: a
 * counter is not worth a 500, and a branch with a bad timezone is a data
 * problem that should surface as a wrong count somebody queries, not as a
 * dead workspace. Intl throws RangeError on a bad zone, which is what is
 * caught here.
 */
export const startOfDayIn = (tz, now = new Date()) => {
  try {
    const off = offsetMs(tz, now)
    const local = new Date(now.getTime() + off)
    const localMidnightAsUtc = Date.UTC(
      local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()
    )
    return new Date(localMidnightAsUtc - off)
  } catch {
    const utc = new Date(now)
    utc.setUTCHours(0, 0, 0, 0)
    return utc
  }
}

/** True when `tz` is a timezone this runtime actually knows. */
export const isKnownTimezone = (tz) => {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true } catch { return false }
}

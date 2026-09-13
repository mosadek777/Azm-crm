// spec 004 — implements FR-015's "configured retention period"; NFR-004.
//
// "Unsent reply text MUST be preserved server-side within a CONFIGURED
// retention period and restored on return."
//
// The requirement is that the period is configurable; it supplies no figure,
// and neither does any other spec. So the mechanism is the requirement and the
// number is not — the same split as `security-policy.js`, and the same
// treatment: proposed, attributed, and overridable from .env without a code
// change. If a number could only be changed by editing this file, the file
// would be the decision.
//
// ⚠ SEVEN DAYS IS DECISION 42 — the project owner's, PROVISIONAL.
// docs/decisions-pending.md §17 carries the reasoning:
//
//   "Long enough that a draft survives a weekend or a day off, short enough
//    that a thread has usually moved on by the time it expires — and E-12
//    already handles the stale case, so the number only decides how long we
//    store text nobody came back for."
//
// That last clause is why the figure is low-risk. E-12 makes expiry explicit
// ("discarded; the agent is TOLD on return rather than shown stale text") and
// AS-09 flags a surviving draft whose thread has moved. Seven days is therefore
// a storage-and-privacy choice about how long unsent text lives — and unsent
// text is precisely what somebody may have thought better of saying.

const num = (key, fallback) => {
  const raw = process.env[key]
  if (raw === undefined || raw === '') return { value: fallback, ratified: false, source: 'default' }
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${key} must be a positive number, got ${JSON.stringify(raw)}`)
  }
  // Set by an operator, so no longer this file's guess — but "ratified" is
  // reserved for a decision in the decisions record, and this is not that.
  return { value: n, ratified: false, source: 'env' }
}

export const DRAFT_POLICY = Object.freeze({
  // Decision 42. How long an unsent draft is kept before E-12 discards it.
  retentionDays: num('DRAFT_RETENTION_DAYS', 7),

  // NFR-004: "Draft autosave interval — ≤ 10s of typing, and on blur." This is
  // the CLIENT's cadence and the server does not enforce it; it is published
  // here so the interface reads the same number rather than keeping its own,
  // for the same reason the placeholder vocabulary is served rather than copied.
  autosaveSeconds: num('DRAFT_AUTOSAVE_SECONDS', 8)
})

/** The instant before which a draft has expired. */
export const draftExpiryCutoff = (now = new Date()) =>
  new Date(now.getTime() - DRAFT_POLICY.retentionDays.value * 86400000)

/** What `GET /auth/policy` and the interface are told, without the internals. */
export const draftPolicyReport = () => ({
  retentionDays: DRAFT_POLICY.retentionDays,
  autosaveSeconds: DRAFT_POLICY.autosaveSeconds
})

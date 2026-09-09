// spec 010 — implements FR-007
//
// "The system MUST enforce a configurable password policy, session timeout,
// absolute session lifetime, failed-attempt lockout and concurrent-session
// limit."
//
// ⚠ EVERY VALUE BELOW IS UNRATIFIED.
//
// The requirement is that these are CONFIGURABLE. It supplies no figures, and
// neither does any other spec — all thirteen were searched on 2026-09-09 and
// the only related text is `008 §3`, which gives a portal identity a `locked`
// state and points back here for what causes it. So the mechanism is the
// requirement and the numbers are not: they are the developer's proposal,
// pending the project owner's ratification, and they are recorded as such in
// docs/decisions-pending.md rather than presented as derived from the specs.
//
// Constitution VII says unknowns are marked and block the requirement rather
// than being guessed. The mechanism is not blocked — it is fully specified. The
// VALUES are the unknown, so they are marked here, surfaced by
// `GET /auth/policy`, and every one of them is overridable from .env without a
// code change. That is what "configurable" has to mean for the marking to be
// honest: if a number could only be changed by editing this file, the file
// would be the decision.

const num = (key, fallback) => {
  const raw = process.env[key]
  if (raw === undefined || raw === '') return { value: fallback, ratified: false, source: 'default' }
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${key} must be a non-negative number, got ${JSON.stringify(raw)}`)
  }
  // A value set in .env is a deliberate act by an operator. It is still not
  // "ratified" — that word is reserved for a decision in the decisions record —
  // but it is no longer this file's guess, and the distinction is worth showing.
  return { value: n, ratified: false, source: 'env' }
}

export const SECURITY_POLICY = Object.freeze({
  // --- Password policy ------------------------------------------------------
  // Length only, no composition rule. Composition rules ("one capital, one
  // digit, one symbol") reliably produce a small set of predictable shapes —
  // Password1! and its cousins — while length is what actually costs an
  // attacker. This follows the modern guidance rather than the older habit.
  password: {
    minLength: num('PASSWORD_MIN_LENGTH', 12),
    // Off by default and deliberately so. Left configurable because a client
    // whose own policy mandates composition will need it, not because it is
    // recommended.
    requireMixedCase: { value: process.env.PASSWORD_REQUIRE_MIXED_CASE === 'true', ratified: false, source: process.env.PASSWORD_REQUIRE_MIXED_CASE ? 'env' : 'default' },
    requireDigit: { value: process.env.PASSWORD_REQUIRE_DIGIT === 'true', ratified: false, source: process.env.PASSWORD_REQUIRE_DIGIT ? 'env' : 'default' },
    requireSymbol: { value: process.env.PASSWORD_REQUIRE_SYMBOL === 'true', ratified: false, source: process.env.PASSWORD_REQUIRE_SYMBOL ? 'env' : 'default' }
  },

  // --- Sessions -------------------------------------------------------------
  // Idle timeout: how long a session may sit untouched before it stops working.
  idleTimeoutMinutes: num('SESSION_IDLE_TIMEOUT_MINUTES', 30),
  // Absolute lifetime: the hard ceiling, no matter how active the session is.
  absoluteLifetimeHours: num('SESSION_ABSOLUTE_LIFETIME_HOURS', 12),
  // How many sessions one identity may hold at once. Exceeding it revokes the
  // OLDEST rather than refusing the newest: refusing the new one locks a user
  // out of the device in front of them because of a session they abandoned on
  // a device they no longer have.
  maxConcurrentSessions: num('SESSION_MAX_CONCURRENT', 3),

  // --- Lockout --------------------------------------------------------------
  // Consecutive failures before the identity is locked, and for how long.
  // The lock expires on its own; it does not need an administrator. An
  // administrator-only unlock turns every fat-fingered password into a support
  // ticket, and turns the lockout itself into a denial-of-service anyone can
  // trigger against a known email address.
  lockoutThreshold: num('LOCKOUT_THRESHOLD', 10),
  lockoutMinutes: num('LOCKOUT_MINUTES', 15)
})

// Flattened for the policy endpoint and for logging: name, value, whether it
// came from .env, and the fact that none of it is ratified.
export const policyReport = () => ({
  ratified: false,
  note: 'spec 010 FR-007 requires these to be configurable and states no values. These are proposed defaults awaiting ratification.',
  values: {
    passwordMinLength: SECURITY_POLICY.password.minLength,
    passwordRequireMixedCase: SECURITY_POLICY.password.requireMixedCase,
    passwordRequireDigit: SECURITY_POLICY.password.requireDigit,
    passwordRequireSymbol: SECURITY_POLICY.password.requireSymbol,
    idleTimeoutMinutes: SECURITY_POLICY.idleTimeoutMinutes,
    absoluteLifetimeHours: SECURITY_POLICY.absoluteLifetimeHours,
    maxConcurrentSessions: SECURITY_POLICY.maxConcurrentSessions,
    lockoutThreshold: SECURITY_POLICY.lockoutThreshold,
    lockoutMinutes: SECURITY_POLICY.lockoutMinutes
  }
})

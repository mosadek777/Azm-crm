// spec 010 FR-007 — proves each of the five controls actually REFUSES.
//
// WHY THIS SUITE EXISTS SEPARATELY. When sessions, lockout and the password
// policy were added, the existing 210 checks still passed. That proved the new
// code broke nothing; it proved nothing whatever about whether the controls
// work. Every check below fails if its control is removed — which is the only
// property that makes a test a test. Same lesson as the AS-03 tautology.
//
// Three controls are exercised by ageing a session row directly rather than by
// waiting. That is deliberate and it is not a shortcut around the assertion:
// the TOKEN is left untouched and stays cryptographically valid throughout, so
// what is being proved is precisely that the session record — not the token —
// decides whether a request is allowed. Waiting thirty real minutes would prove
// the same thing and could not live in a test suite.

import mongoose from 'mongoose'
import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from './env.js'
import { createChecker } from './check.js'
import { connectMongoose } from '../src/DB/connection.db.js'
import { Session } from '../src/DB/models/session.model.js'
import { User } from '../src/DB/models/user.model.js'
import { AuditEntry } from '../src/DB/models/audit-entry.model.js'
import { SECURITY_POLICY as P } from '../src/config/security-policy.js'

const call = async (method, path, { body, token } = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })
  let json = null
  try { json = await res.json() } catch { /* no body */ }
  return { status: res.status, body: json }
}
const login = async (password = BREAKGLASS_PASSWORD) =>
  (await call('POST', '/auth/login', { body: { email: BREAKGLASS_EMAIL, password } }))

const checker = createChecker({ indent: '' })
const check = checker.chk

await connectMongoose()

// Between sections, so one section's lockout or sessions cannot alter another's.
const reset = async () => {
  await User.updateOne({ email: BREAKGLASS_EMAIL }, { $set: { failedSignInCount: 0, lockedUntil: null } })
  await Session.deleteMany({})
}

console.log('\n--- FR-007: the password policy refuses, where a password is SET ---')
await reset()
const first = await login()
check('break-glass signs in', first.status, 200)
const root = first.body.token

const short = await call('POST', '/user', {
  token: root,
  body: {
    displayName: 'Policy Probe',
    email: `probe.${Date.now()}@azmsquad.com`,
    password: 'short1',
    defaultLanguage: 'en',
    roles: ['AGT']
  }
})
check(`a 6-character password is refused (minimum ${P.password.minLength.value})`, short.status, 400)
check('the refusal names the rule that failed', JSON.stringify(short.body?.failedRules), '["minLength"]')
check('the refusal carries both languages', typeof short.body?.message?.ar === 'string' && typeof short.body?.message?.en === 'string', true)
check('and never echoes the password back', JSON.stringify(short.body).includes('short1'), false)

console.log('\n--- FR-007: failed-attempt lockout ---')
await reset()
let wrongBody = null
for (let i = 0; i < P.lockoutThreshold.value; i++) {
  wrongBody = JSON.stringify((await login('definitely-not-the-password')).body)
}
const afterLock = await login()
check(`the CORRECT password is refused after ${P.lockoutThreshold.value} failures`, afterLock.status, 401)
// §8: a locked account must be indistinguishable from a wrong password.
check('the locked refusal is byte-identical to a wrong-password refusal', JSON.stringify(afterLock.body), wrongBody)
const lockedUser = await User.findOne({ email: BREAKGLASS_EMAIL })
check('lockedUntil is set in the future', lockedUser.lockedUntil > new Date(), true)
check('a high-severity lockout entry was audited', await AuditEntry.countDocuments({ action: 'auth.locked_out', severity: 'high' }) > 0, true)

// The lock must RELEASE. A permanent lock is a denial-of-service anybody can
// trigger against a known address.
await User.updateOne({ email: BREAKGLASS_EMAIL }, { $set: { lockedUntil: new Date(Date.now() - 1000) } })
check('sign-in works again once the lock expires', (await login()).status, 200)

console.log('\n--- FR-007: idle session timeout ---')
await reset()
const idle = await login()
check('a fresh session is accepted', (await call('GET', '/user', { token: idle.body.token })).status, 200)
await Session.updateOne({}, { $set: { lastSeenAt: new Date(Date.now() - (P.idleTimeoutMinutes.value + 1) * 60000) } })
check(`the same still-valid token is refused after ${P.idleTimeoutMinutes.value} minutes idle`,
  (await call('GET', '/user', { token: idle.body.token })).status, 401)

console.log('\n--- FR-007: absolute session lifetime ---')
await reset()
const abs = await login()
check('a fresh session is accepted', (await call('GET', '/user', { token: abs.body.token })).status, 200)
// Active — lastSeenAt is now — but past its ceiling. Proves the two limits are
// independent, and that an active session cannot outlive the absolute bound.
//
// Written through the raw driver, NOT through mongoose. `absoluteExpiresAt` is
// declared immutable, so `Session.updateOne` silently discards the change and
// the check passed against an untouched session — the first run of this suite
// caught exactly that. The immutability is deliberate and worth keeping: it is
// what stops a later policy change quietly extending sessions that are already
// open. So the test goes around the model rather than the model being loosened
// for the test's convenience.
await Session.collection.updateOne({}, { $set: { absoluteExpiresAt: new Date(Date.now() - 1000), lastSeenAt: new Date() } })
check('an ACTIVE session is refused past its absolute expiry',
  (await call('GET', '/user', { token: abs.body.token })).status, 401)

console.log('\n--- FR-007: concurrent-session limit ---')
await reset()
const limit = P.maxConcurrentSessions.value
const tokens = []
for (let i = 0; i < limit; i++) tokens.push((await login()).body.token)
check(`${limit} sessions are live`, await Session.countDocuments({ revokedAt: null }), limit)
check('the oldest of them works before the limit is exceeded', (await call('GET', '/user', { token: tokens[0] })).status, 200)

const extra = await login()
check(`opening one more leaves only ${limit} live`, await Session.countDocuments({ revokedAt: null }), limit)
// Oldest-first eviction: refusing the NEW session would lock a user out of the
// device in front of them because of one they abandoned elsewhere.
check('the OLDEST session is the one revoked', (await call('GET', '/user', { token: tokens[0] })).status, 401)
check('the newest session works', (await call('GET', '/user', { token: extra.body.token })).status, 200)
check('the eviction is recorded as concurrent_limit', await Session.countDocuments({ revokedReason: 'concurrent_limit' }), 1)
check('and it was audited', await AuditEntry.countDocuments({ action: 'session.revoked' }) > 0, true)

console.log('\n--- constitution II: the sign-in write and its audit entry are atomic ---')
await reset()
const before = await AuditEntry.countDocuments({ action: 'session.opened' })
await login()
check('opening a session writes a session.opened entry',
  await AuditEntry.countDocuments({ action: 'session.opened' }), before + 1)
check('one live session exists for it', await Session.countDocuments({ revokedAt: null }), 1)

console.log('\n--- GET /auth/me is a RENDERING HINT, not a permission check ---')
await reset()
// The endpoint exists so the interface does not offer a menu section whose
// every action returns 403. The danger is that somebody later treats it as
// authorisation, so the claim is made falsifiable here rather than asserted in
// a comment: an agent is told administration is not for them, and the SERVER
// refuses them whether or not the client believes that.
const bg = await login()
const bgMe = await call('GET', '/auth/me', { token: bg.body.token })
check('the break-glass administrator is told to show administration', bgMe.body?.show?.administration, true)
check('and it carries no scope detail at all — nothing to authorise with',
  JSON.stringify(Object.keys(bgMe.body?.show ?? {}).sort()),
  '["administration","customerReply","staffDirectory","ticketWrite"]')
// THE PROPERTY THAT MATTERS as flags are added: every one is a bare boolean.
// A branch id, a department id or a record id here would be the beginning of a
// client-side scope decision; a boolean cannot be one.
check('every flag is a bare boolean — no branch, department or record anywhere',
  Object.values(bgMe.body?.show ?? {}).every(v => typeof v === 'boolean'), true)
check('and there is at least one, so that is not vacuous',
  Object.keys(bgMe.body?.show ?? {}).length > 0, true)
check('nor any role list', bgMe.body?.roles === undefined, true)

// An ordinary agent, created for this check.
const brRes = await call('POST', '/platform/branches', {
  token: bg.body.token,
  body: { name: { ar: 'فرع الفحص', en: 'Hint probe branch' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' }
})
const dpRes = await call('POST', '/platform/departments', {
  token: bg.body.token, body: { name: { ar: 'قسم الفحص', en: 'Hint probe dept' } }
})
const agentEmail = `hint.agent.${Date.now()}@azmsquad.com`
await call('POST', '/user', {
  token: bg.body.token,
  body: {
    displayName: 'Hint Probe Agent', email: agentEmail, password: FIXTURE_PASSWORD,
    defaultLanguage: 'en', roles: ['AGT'],
    scope: { branchIds: [brRes.body.branch._id], departmentIds: [dpRes.body.department._id] }
  }
})
const agentTok = (await call('POST', '/auth/login', { body: { email: agentEmail, password: FIXTURE_PASSWORD } })).body.token
const agentMe = await call('GET', '/auth/me', { token: agentTok })
check('an agent is told NOT to show administration', agentMe.body?.show?.administration, false)

// THE POINT. The hint lives in the caller's own browser, where they can edit it
// freely. Believing it says otherwise changes nothing, because the server never
// reads it back — it re-reads the roles per request (E-04).
check('and the server refuses them a branch create regardless of what they believe',
  (await call('POST', '/platform/branches', {
    token: agentTok,
    body: { name: { ar: 'ممنوع', en: 'Forbidden' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' }
  })).status, 403)
check('...and a deactivation',
  (await call('PATCH', `/platform/branches/${brRes.body.branch._id}/active`,
    { token: agentTok, body: { active: false } })).status, 403)
check('...and creating a user', (await call('POST', '/user', {
  token: agentTok,
  body: { displayName: 'x', email: `x.${Date.now()}@azmsquad.com`, password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'] }
})).status, 403)
check('the branch was not deactivated behind those refusals',
  (await call('GET', `/platform/branches/${brRes.body.branch._id}`, { token: bg.body.token })).body?.branch?.active, true)

// THE OTHER FLAGS, held to the same standard: each one hides a control the
// server refuses anyway, and the refusal is what actually protects the record.
check('the agent is told they may not reach the staff directory',
  agentMe.body?.show?.staffDirectory, false)
check('and the server refuses them the staff list regardless',
  (await call('GET', '/user', { token: agentTok })).status, 403)

// Paired with a success, or a blanket-deny regression would satisfy every
// refusal above: the same agent IS told they may write, and the server agrees.
check('the same agent IS told they may write tickets', agentMe.body?.show?.ticketWrite, true)
check('and IS told they may reply to a customer', agentMe.body?.show?.customerReply, true)

// The break-glass administrator is the mirror image, which proves these two
// flags are not simply always-true and always-false constants.
check('the administrator is told NOT to offer a customer-visible reply',
  bgMe.body?.show?.customerReply, false)
// A ticket to try it on. The runner drops the database, so this suite makes
// its own rather than depending on demo data that may or may not be there —
// the earlier version of this check reported "no ticket to test against",
// which is the empty-data failure mode dressed as a result.
const probeCustomer = (await call('POST', '/customer', {
  token: agentTok,
  body: {
    type: 'person', displayName: 'Visibility Probe', preferredLanguage: 'en',
    contactPoints: [{ channelType: 'email', value: `vis.${Date.now()}@example.com` }]
  }
})).body?.customer
const probeTicket = (await call('POST', '/ticket', {
  token: agentTok,
  body: {
    customerId: probeCustomer?._id, subject: 'Visibility probe ticket',
    description: 'Created so the customer-visible refusal has something to be refused on.',
    category: 'general', priority: 'normal'
  }
})).body?.ticket
check('a ticket exists to test the refusal against', !!probeTicket?._id, true)

check('the administrator IS allowed an internal note on it',
  (await call('POST', `/ticket/${probeTicket._id}/message`, {
    token: bg.body.token, body: { body: 'Permitted: 002 §9 internal note', visibility: 'internal' }
  })).status, 201)
check('and the server refuses the customer-visible reply on the SAME ticket',
  (await call('POST', `/ticket/${probeTicket._id}/message`, {
    token: bg.body.token, body: { body: 'Refused: 002 §9', visibility: 'customer' }
  })).status, 403)

check('the endpoint itself requires a session', (await call('GET', '/auth/me')).status, 401)

await reset()
await mongoose.disconnect()
process.exit(checker.report())

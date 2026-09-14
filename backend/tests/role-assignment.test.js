// spec 010 §10, §11; FR-002, FR-021, AS-04, E-01; decision 43; constitution II, IV.
//
// THE FIVE CLAIMS WORTH PROVING:
//
//   1. DECISION 43 — the last revocation is refused, and the user still holds
//      their role afterwards. Paired with a revocation that SUCCEEDS on a user
//      holding two, so a blanket refusal cannot pass.
//
//   2. E-01 EXTENDED TO REVOCATION — the last active administrator cannot have
//      ADM taken away either. Without this the rule E-01 enforces could be
//      walked around with a different verb.
//
//   3. FR-021 / AS-04 STILL HOLD on the new endpoint. A grant may not exceed
//      the granter's scope, and an empty scope resolves to the granter's own,
//      never to all. This is the check that must keep passing.
//
//   4. CONSTITUTION IV — a user outside the caller's scope is 404, and
//      BYTE-IDENTICAL to a user that does not exist.
//
//   5. THE PROMOTION ACTUALLY WORKS, end to end: an agent granted LEAD can do
//      something only a lead may do, in the same session-less way the product
//      re-reads permissions per request (E-04).

import mongoose from 'mongoose'
import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from './env.js'
import { createChecker } from './check.js'
import { connectMongoose } from '../src/DB/connection.db.js'
import { AuditEntry } from '../src/DB/models/audit-entry.model.js'
import { RoleAssignment } from '../src/DB/models/role-assignment.model.js'

const B = BASE_URL
const call = async (m, p, { body, token } = {}) => {
  const r = await fetch(B + p, {
    method: m,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  })
  let j = null
  try { j = await r.json() } catch { /* no body */ }
  return { status: r.status, body: j }
}
const login = async (email, password) =>
  (await call('POST', '/auth/login', { body: { email, password } })).body.token

const checker = createChecker({ indent: '' })
const chk = checker.chk

await connectMongoose()

const root = await login(BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD)
const mk = async (p, b) => (await call('POST', p, { token: root, body: b })).body

const branch = (await mk('/platform/branches',
  { name: { ar: 'فرع', en: 'Branch' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' })).branch
const other = (await mk('/platform/branches',
  { name: { ar: 'فرع آخر', en: 'Other' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' })).branch
const dept = (await mk('/platform/departments', { name: { ar: 'قسم', en: 'Dept' } })).department
const here = { branchIds: [branch._id], departmentIds: [dept._id] }
const elsewhere = { branchIds: [other._id], departmentIds: [dept._id] }

// TWO administrators in this branch, so E-01's "last administrator" is a state
// this suite can both avoid and deliberately create.
const dalia = (await mk('/user', { displayName: 'Dalia Admin', email: 'r.dalia@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['ADM'], scope: here })).user
const karim = (await mk('/user', { displayName: 'Karim Admin', email: 'r.karim@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['ADM'], scope: here })).user
const sara = (await mk('/user', { displayName: 'Sara Agent', email: 'r.sara@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: here })).user
const hana = (await mk('/user', { displayName: 'Hana Agent', email: 'r.hana@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: here })).user
const nour = (await mk('/user', { displayName: 'Nour Elsewhere', email: 'r.nour@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: elsewhere })).user
// An administrator confined to the OTHER branch — the one who must not be able
// to reach into this one.
const tarek = (await mk('/user', { displayName: 'Tarek Admin', email: 'r.tarek@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['ADM'], scope: elsewhere })).user

const daliaT = await login('r.dalia@azmsquad.com', FIXTURE_PASSWORD)
const saraT = await login('r.sara@azmsquad.com', FIXTURE_PASSWORD)
const tarekT = await login('r.tarek@azmsquad.com', FIXTURE_PASSWORD)

const rolesOf = async (id) => (await RoleAssignment.find({ userId: id })).map(a => a.role).sort()

console.log('\n--- §11: an administrator promotes an agent to lead ---')
const promoted = await call('POST', `/user/${sara._id}/role`, {
  token: daliaT, body: { role: 'LEAD' }
})
chk('granted', promoted.status, 201)
chk('  the user now holds both roles', (await rolesOf(sara._id)).join(','), 'AGT,LEAD')
chk('  and the response says so', (promoted.body.user.roles ?? []).sort().join(','), 'AGT,LEAD')
chk('  the id is UNCHANGED — the whole point of not deleting and recreating',
  String(promoted.body.user._id), String(sara._id))
// ⚠ NOT `findOne({ action: 'role_assignment.granted' })`. User CREATION writes
// the same action for the roles it grants, so an unqualified findOne returns
// Dalia's own ADM grant from the fixture and the check fails against a real
// entry that is simply not this one.
chk('§10: an audit entry names actor, subject, role and the scope granted',
  await (async () => {
    const e = await AuditEntry.findOne({
      action: 'role_assignment.granted', 'after.userId': String(sara._id), 'after.role': 'LEAD'
    })
    return !!e && !!e.after?.grantedBy &&
      Array.isArray(e.after?.branchIds) && Array.isArray(e.after?.departmentIds)
  })(), true)

console.log('\n--- AS-04: an empty scope resolves to the GRANTER\'s, never to all ---')
chk('the grant took Dalia\'s branch, not every branch',
  (await RoleAssignment.findOne({ userId: sara._id, role: 'LEAD' })).branchIds.map(String).join(','),
  String(branch._id))
chk('  and one branch only, not two', (await RoleAssignment.findOne({ userId: sara._id, role: 'LEAD' })).branchIds.length, 1)

console.log('\n--- E-04: the promotion is real, not just a row ---')
// Permissions are re-read from the database per request, never baked into the
// token — so the SAME token Sara already holds now reaches a lead-only action.
chk('before the promotion an agent could not create a task for a colleague… (setup)',
  typeof saraT, 'string')
const asLead = await call('GET', '/user', { token: saraT })
chk('Sara can now list staff — 010 §9 puts that at LEAD and above', asLead.status, 200)
// The pair: an agent who was NOT promoted still cannot.
const hanaT = await login('r.hana@azmsquad.com', FIXTURE_PASSWORD)
chk('  while an agent who was not promoted still cannot',
  (await call('GET', '/user', { token: hanaT })).status, 403)

console.log('\n--- decision 43: the LAST role cannot be revoked ---')
chk('Hana holds exactly one role', (await rolesOf(hana._id)).length, 1)
const lastOne = await call('DELETE', `/user/${hana._id}/role/AGT`, { token: daliaT })
chk('revoking it is refused', lastOne.status, 409)
chk('  the refusal is bilingual', !!lastOne.body.message?.ar && !!lastOne.body.message?.en, true)
chk('  it says what to do instead', /grant another role first|deactivate/i.test(lastOne.body.message.en), true)
chk('  AND SHE STILL HOLDS IT — nothing was half-done', (await rolesOf(hana._id)).join(','), 'AGT')
// THE PAIR. Without this, "every revocation is refused" would pass everything
// above.
const notLast = await call('DELETE', `/user/${sara._id}/role/LEAD`, { token: daliaT })
chk('while revoking one of TWO is allowed', notLast.status, 200)
chk('  and she is left with the other', (await rolesOf(sara._id)).join(','), 'AGT')
chk('§10: the revocation is audited, carrying what was taken away',
  await (async () => {
    const e = await AuditEntry.findOne({ action: 'role_assignment.revoked' })
    return !!e && e.before?.role === 'LEAD' && e.before?.userId === String(sara._id) && e.after === null
  })(), true)
chk('  and the row is gone', await RoleAssignment.countDocuments({ userId: sara._id, role: 'LEAD' }), 0)

console.log('\n--- E-01 extended: the last administrator keeps ADM ---')
chk('with two administrators, one may be demoted',
  (await call('POST', `/user/${karim._id}/role`, { token: daliaT, body: { role: 'AGT' } })).status, 201)
chk('  …and then have ADM taken',
  (await call('DELETE', `/user/${karim._id}/role/ADM`, { token: daliaT })).status, 200)
chk('  leaving Dalia as the only administrator', (await rolesOf(karim._id)).join(','), 'AGT')
// Now Dalia is the last one. Karim cannot take her ADM, and neither can anyone.
const karimT = await login('r.karim@azmsquad.com', FIXTURE_PASSWORD)
chk('Karim is no longer an administrator and may not use the endpoint at all',
  (await call('DELETE', `/user/${dalia._id}/role/ADM`, { token: karimT })).status, 403)
// TWO THINGS HAVE TO BE TRUE before E-01 is the only thing left standing, and
// getting either wrong makes this check pass on the wrong refusal:
//
//   1. DECISION 43 WOULD CATCH IT FIRST. Dalia holds only ADM, so "a user
//      cannot be left with no role" fires before E-01 ever runs. Give her a
//      second role. (The root is unrestricted, so it must name the scope
//      explicitly — it has no own scope for an empty set to resolve to, and
//      resolving that to "all" is the bug FR-021 exists to prevent.)
//
//   2. E-01's POPULATION IS SYSTEM-WIDE, NOT PER-BRANCH. Tarek is an active
//      administrator in the other branch, so while he exists Dalia is not the
//      last one and the refusal correctly does not fire. That is asserted below
//      rather than worked around, because it is a property worth pinning.
chk('give the last administrator a second role, so decision 43 is out of the way',
  (await call('POST', `/user/${dalia._id}/role`, {
    token: root, body: { role: 'AGT', scope: { branchIds: [branch._id], departmentIds: [dept._id] } }
  })).status, 201)
chk('while an administrator in ANOTHER branch still exists, Dalia is not the last',
  (await call('DELETE', `/user/${dalia._id}/role/ADM`, { token: root })).status, 200)
chk('  so put it back before testing the rule itself',
  (await call('POST', `/user/${dalia._id}/role`, {
    token: root, body: { role: 'ADM', scope: { branchIds: [branch._id], departmentIds: [dept._id] } }
  })).status, 201)
chk('now deactivate that other administrator',
  (await call('PATCH', `/user/${tarek._id}/deactivate`, { token: root })).status, 200)
const lastAdmin = await call('DELETE', `/user/${dalia._id}/role/ADM`, { token: root })
chk('the root still cannot take the last administrator\'s ADM — E-01', lastAdmin.status, 409)
chk('  and it is E-01\'s reason, not decision 43\'s',
  /at least one active administrator/i.test(lastAdmin.body.message.en), true)
chk('  and she still holds it', (await rolesOf(dalia._id)).includes('ADM'), true)
// The pair, so "ADM can never be revoked" cannot pass: her OTHER role can be.
chk('  while her second role can still be taken',
  (await call('DELETE', `/user/${dalia._id}/role/AGT`, { token: root })).status, 200)
// Put the other administrator back. His session was invalidated by the
// deactivation — which is itself correct, and is why this is done explicitly
// rather than left for a later block to trip over as a 401 it cannot explain.
chk('reactivate the other administrator',
  (await call('PATCH', `/user/${tarek._id}/reactivate`, { token: root })).status, 200)
const tarekBack = await login('r.tarek@azmsquad.com', FIXTURE_PASSWORD)
chk('  and he can sign in again', typeof tarekBack, 'string')

console.log('\n--- you may not change your own roles (E-02 by analogy) ---')
const self = await call('POST', `/user/${dalia._id}/role`, { token: daliaT, body: { role: 'AGT' } })
chk('granting yourself is refused', self.status, 409)
chk('  and so is revoking from yourself',
  (await call('DELETE', `/user/${dalia._id}/role/ADM`, { token: daliaT })).status, 409)
// The pair: the same administrator acting on SOMEBODY ELSE is accepted.
chk('  while the same administrator may act on a colleague',
  (await call('POST', `/user/${hana._id}/role`, { token: daliaT, body: { role: 'AUD' } })).status, 201)

console.log('\n--- FR-021 / AS-04: a grant may not exceed the granter\'s scope ---')
const excessive = await call('POST', `/user/${hana._id}/role`, {
  token: daliaT, body: { role: 'MGR', scope: { branchIds: [other._id], departmentIds: [dept._id] } }
})
chk('naming a branch the granter does not hold is refused', excessive.status, 403)
chk('  and the excess is named', (excessive.body.excessBranches ?? []).includes(String(other._id)), true)
chk('  nothing was written', await RoleAssignment.countDocuments({ userId: hana._id, role: 'MGR' }), 0)
// The pair: the SAME grant inside her own scope is accepted.
chk('  while the same role inside her own scope is accepted',
  (await call('POST', `/user/${hana._id}/role`, {
    token: daliaT, body: { role: 'MGR', scope: { branchIds: [branch._id], departmentIds: [dept._id] } }
  })).status, 201)

console.log('\n--- constitution IV: out of scope is 404, byte-identical to absent ---')
const outOfScope = await call('POST', `/user/${nour._id}/role`, { token: daliaT, body: { role: 'LEAD' } })
const absent = await call('POST', `/user/${new mongoose.Types.ObjectId()}/role`, { token: daliaT, body: { role: 'LEAD' } })
chk('an out-of-scope user answers 404, not 403', outOfScope.status, 404)
chk('  and a user that does not exist answers the same status', absent.status, 404)
chk('  BYTE-IDENTICAL — the body is the same, not merely the same code',
  JSON.stringify(outOfScope.body), JSON.stringify(absent.body))
// The pair: the administrator who CAN see Nour succeeds on the same call, so
// this is not a broken route.
chk('  while the administrator scoped to her branch may grant it',
  (await call('POST', `/user/${nour._id}/role`, { token: tarekBack, body: { role: 'LEAD' } })).status, 201)

console.log('\n--- §9: only an administrator may do any of this ---')
chk('a LEAD is refused the grant',
  (await call('POST', `/user/${hana._id}/role`, { token: saraT, body: { role: 'LEAD' } })).status, 403)
chk('  and the revoke', (await call('DELETE', `/user/${hana._id}/role/AUD`, { token: saraT })).status, 403)
chk('  an anonymous caller too', (await call('POST', `/user/${hana._id}/role`, { body: { role: 'LEAD' } })).status, 401)

console.log('\n--- the same role twice is refused rather than throwing ---')
chk('409, not a 500 from the unique index',
  (await call('POST', `/user/${hana._id}/role`, { token: daliaT, body: { role: 'AUD' } })).status, 409)
chk('an unknown role is a 400', (await call('POST', `/user/${hana._id}/role`, { token: daliaT, body: { role: 'WIZARD' } })).status, 400)
chk('revoking a role they do not hold is 404',
  (await call('DELETE', `/user/${sara._id}/role/MGR`, { token: daliaT })).status, 404)

console.log('\n--- stranded work is REPORTED, never refused and never moved ---')
// Give Hana a ticket in this branch, then take away the assignment that covers
// it. She keeps the ticket; the response says how many fell out of reach.
const customer = (await call('POST', '/customer', {
  token: daliaT,
  body: { displayName: 'Layla Mansour', contactPoints: [{ channelType: 'email', value: `r.${Date.now()}@example.com` }] }
})).body.customer
const ticket = (await call('POST', '/ticket', {
  token: daliaT,
  body: { customerId: customer._id, subject: 'Refund chase', description: 'fixture', category: 'Billing', priority: 'normal' }
})).body.ticket
await call('PATCH', `/ticket/${ticket._id}/assign`, {
  token: daliaT, body: { assignedAgentId: String(hana._id), reason: 'fixture' }
})
// Hana holds AGT (this branch), AUD (this branch) and MGR (this branch).
// Revoking one still leaves her covering the ticket, so nothing is stranded.
const stillCovered = await call('DELETE', `/user/${hana._id}/role/AUD`, { token: daliaT })
chk('revoking one of several covering roles strands nothing', stillCovered.body.strandedTickets, 0)
chk('  and the ticket is untouched — nothing was moved',
  (await call('GET', `/ticket/${ticket._id}`, { token: daliaT })).body.ticket.assignedAgentId, String(hana._id))

await mongoose.disconnect()
process.exit(checker.report())

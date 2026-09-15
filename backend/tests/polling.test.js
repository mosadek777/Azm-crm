// spec 004 FR-021, AD-19; NFR-002, NFR-003; constitution IV.
//
// FR-021's second sentence is the whole reason this file exists:
//
//   "An update MUST be delivered only to a recipient who could have read that
//    record through an ordinary request AT THE MOMENT OF DELIVERY, and the
//    scope predicate MUST be evaluated per recipient at that moment, never once
//    per event."
//
// THE CHECK THAT MATTERS, AND IT IS PAIRED BOTH WAYS:
//
//   An agent polling a ticket that MOVES OUT of their scope stops receiving it
//   on the very next poll — while a colleague still in scope keeps receiving
//   it. Without the second half, a poller that had simply stopped working would
//   pass the first.
//
// AND THE OTHER DIRECTION, which is the one a conditional response could get
// wrong: the caller who loses access must not be handed a **304**. A 304 says
// "what you have is still current", and for somebody who may no longer read the
// record at all, that is the stale-authorisation bug this design exists to
// avoid. It must be a 404 — the same 404 as a record that never existed.
//
// That is why utils/conditional.js hashes the response instead of using a
// version token: a record leaving your scope changes no timestamp and no count
// that you can see.

import mongoose from 'mongoose'
import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from './env.js'
import { createChecker } from './check.js'
import { connectMongoose } from '../src/DB/connection.db.js'

const B = BASE_URL
const call = async (m, p, { body, token, headers } = {}) => {
  const r = await fetch(B + p, {
    method: m,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })
  let j = null
  const text = await r.text()
  try { j = text ? JSON.parse(text) : null } catch { /* 304 has no body */ }
  return { status: r.status, body: j, etag: r.headers.get('etag'), raw: text, headers: r.headers }
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
const both = { branchIds: [branch._id, other._id], departmentIds: [dept._id] }

const dalia = (await mk('/user', { displayName: 'Dalia Admin', email: 'p.dalia@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['ADM'], scope: both })).user
// Sara is scoped to ONE branch and will lose it. Hana holds BOTH and keeps it —
// she is the pair that stops "the poll simply broke" passing.
const sara = (await mk('/user', { displayName: 'Sara Agent', email: 'p.sara@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: here })).user
await mk('/user', { displayName: 'Hana Agent', email: 'p.hana@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: both })
// Scoped to the OTHER branch only, so there is something Hana can see and Sara
// cannot. Without it the two callers' list responses are identical and the ETag
// comparison below has nothing to compare.
await mk('/user', { displayName: 'Omar Elsewhere', email: 'p.omar@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: { branchIds: [other._id], departmentIds: [dept._id] } })

const daliaT = await login('p.dalia@azmsquad.com', FIXTURE_PASSWORD)
const saraT = await login('p.sara@azmsquad.com', FIXTURE_PASSWORD)
const hanaT = await login('p.hana@azmsquad.com', FIXTURE_PASSWORD)

const customer = (await call('POST', '/customer', {
  token: saraT,
  body: { displayName: 'Layla Mansour', contactPoints: [{ channelType: 'email', value: `p.${Date.now()}@example.com` }] }
})).body.customer
const ticket = (await call('POST', '/ticket', {
  token: saraT,
  body: { customerId: customer._id, subject: 'Refund chase', description: 'fixture', category: 'Billing', priority: 'normal' }
})).body.ticket

console.log('\n--- the conditional response itself ---')
const first = await call('GET', '/ticket?limit=5', { token: saraT })
chk('a first poll answers 200', first.status, 200)
chk('  carrying an ETag', !!first.etag, true)
chk('  and marked private — never a shared cache',
  /private/.test(first.headers.get('cache-control') ?? ''), true)
const repeat = await call('GET', '/ticket?limit=5', { token: saraT, headers: { 'If-None-Match': first.etag } })
chk('an unchanged poll answers 304', repeat.status, 304)
chk('  with NO body at all', repeat.raw.length, 0)
const stale = await call('GET', '/ticket?limit=5', { token: saraT, headers: { 'If-None-Match': 'W/"not-the-one"' } })
chk('an ETag that does not match answers 200 with the data', stale.status, 200)
chk('  and the data is really there', stale.body.tickets.length > 0, true)

console.log('\n--- an ETag is per CALLER, not a shared cache key ---')
// ⚠ THIS NEEDS THE TWO CALLERS TO ACTUALLY SEE DIFFERENT THINGS, and the first
// version of this check did not arrange that. Hana holds two branches and Sara
// one, but only one branch had any tickets — so their responses were byte
// identical, hashed identically, and the check failed against correct
// behaviour rather than finding a fault.
//
// Identical content SHOULD share an ETag. It is a fingerprint of the response,
// not an authorisation token: a 304 is returned only when the hash of what THIS
// caller would now receive matches what they presented, and the scoped query
// runs on every poll to work that out. Sharing a fingerprint for identical
// bytes discloses nothing, because the bytes were already the same.
//
// So give the other branch a ticket first, and the comparison becomes real.
const omarT = await login('p.omar@azmsquad.com', FIXTURE_PASSWORD)
const otherCustomer = (await call('POST', '/customer', {
  token: omarT,
  body: { displayName: 'Faris Other', contactPoints: [{ channelType: 'email', value: `p.other.${Date.now()}@example.com` }] }
})).body.customer
await call('POST', '/ticket', {
  token: omarT,
  body: { customerId: otherCustomer._id, subject: 'Only Hana can see this', description: 'x', category: 'Billing', priority: 'normal' }
})
chk('Hana sees the other branch\'s ticket',
  (await call('GET', '/ticket?limit=25', { token: hanaT })).body.tickets.some(t => t.subject === 'Only Hana can see this'), true)
chk('  and Sara does not',
  (await call('GET', '/ticket?limit=25', { token: saraT })).body.tickets.some(t => t.subject === 'Only Hana can see this'), false)

const hanaFirst = await call('GET', '/ticket?limit=5', { token: hanaT })
chk('another caller gets a different ETag for the same URL', hanaFirst.etag === first.etag, false)
chk('  and presenting the first caller\'s ETag does not produce a 304',
  (await call('GET', '/ticket?limit=5', { token: hanaT, headers: { 'If-None-Match': first.etag } })).status, 200)

console.log('\n--- a change invalidates it; nothing else does ---')
const beforeChange = await call('GET', '/ticket?limit=5', { token: saraT })
chk('two polls with no change in between agree',
  (await call('GET', '/ticket?limit=5', { token: saraT })).etag, beforeChange.etag)
await call('POST', '/ticket', {
  token: saraT,
  body: { customerId: customer._id, subject: 'Second ticket', description: 'x', category: 'Billing', priority: 'low' }
})
const afterChange = await call('GET', '/ticket?limit=5', { token: saraT, headers: { 'If-None-Match': beforeChange.etag } })
chk('a new ticket makes the next poll answer 200, not 304', afterChange.status, 200)
chk('  and it contains the new one', afterChange.body.tickets.some(t => t.subject === 'Second ticket'), true)

console.log('\n--- FR-021: an open conversation is polled the same way ---')
const detail = await call('GET', `/ticket/${ticket._id}`, { token: saraT })
chk('the detail answers an ETag', !!detail.etag, true)
chk('  unchanged, it answers 304',
  (await call('GET', `/ticket/${ticket._id}`, { token: saraT, headers: { 'If-None-Match': detail.etag } })).status, 304)
await call('POST', `/ticket/${ticket._id}/message`, {
  token: saraT, body: { body: 'A reply that should reach the open screen', visibility: 'customer' }
})
const afterMessage = await call('GET', `/ticket/${ticket._id}`, { token: saraT, headers: { 'If-None-Match': detail.etag } })
chk('a new message makes the poll answer 200', afterMessage.status, 200)
chk('  and the message is in it',
  afterMessage.body.messages.some(m => m.body === 'A reply that should reach the open screen'), true)

console.log('\n=== THE CHECK FR-021 EXISTS FOR ===')
console.log('--- both callers can see the ticket right now ---')
const saraBefore = await call('GET', `/ticket/${ticket._id}`, { token: saraT })
const hanaBefore = await call('GET', `/ticket/${ticket._id}`, { token: hanaT })
chk('Sara can read it', saraBefore.status, 200)
chk('Hana can read it', hanaBefore.status, 200)

console.log('\n--- the ticket moves out of Sara\'s scope ---')
// Sara loses the branch this ticket lives in. Hana keeps both branches.
chk('revoke the assignment that covered it',
  (await call('DELETE', `/user/${sara._id}/role/AGT`, { token: daliaT })).status, 409)
// Decision 43 refuses the last revocation, so grant a role in the OTHER branch
// first — which is also the realistic shape of this: somebody is moved, not
// stripped.
chk('  grant her a role in the other branch instead',
  (await call('POST', `/user/${sara._id}/role`, {
    token: daliaT, body: { role: 'LEAD', scope: { branchIds: [other._id], departmentIds: [dept._id] } }
  })).status, 201)
chk('  then take the one that covered this ticket',
  (await call('DELETE', `/user/${sara._id}/role/AGT`, { token: daliaT })).status, 200)

console.log('\n--- the next poll, for each of them ---')
const saraAfter = await call('GET', `/ticket/${ticket._id}`, {
  token: saraT, headers: { 'If-None-Match': saraBefore.etag }
})
chk('Sara\'s very next poll answers 404 — she has lost it', saraAfter.status, 404)
// ⚠ THE PART A CONDITIONAL RESPONSE COULD GET WRONG. A 304 here would say
// "what you have is still current" to somebody who may no longer read it at
// all. A version-token design would have done exactly that, because losing
// access changes no timestamp she can see.
chk('  NOT 304 — she is not told her stale copy is still current', saraAfter.status === 304, false)
chk('  and the body is the ordinary not-found, never "forbidden"',
  !!saraAfter.body?.message?.ar && !!saraAfter.body?.message?.en, true)

// THE PAIR. Without this, a poller that had simply broken would pass above.
const hanaAfter = await call('GET', `/ticket/${ticket._id}`, { token: hanaT })
chk('Hana\'s next poll still answers 200 — she never lost it', hanaAfter.status, 200)
chk('  with the real ticket in it', hanaAfter.body.ticket.reference, ticket.reference)
chk('  and her unchanged poll still 304s, so polling itself still works',
  (await call('GET', `/ticket/${ticket._id}`, { token: hanaT, headers: { 'If-None-Match': hanaAfter.etag } })).status, 304)

console.log('\n--- the same, for the LIST ---')
const saraList = await call('GET', '/ticket?limit=25', { token: saraT })
chk('Sara\'s list no longer contains it', saraList.body.tickets.some(t => t._id === ticket._id), false)
chk('  and her total dropped with it — AS-01 covers counts too',
  saraList.body.tickets.length, saraList.body.total)
chk('Hana\'s list still contains it',
  (await call('GET', '/ticket?limit=25', { token: hanaT })).body.tickets.some(t => t._id === ticket._id), true)

console.log('\n--- the notification count polls the same way ---')
const unread = await call('GET', '/notification/unread', { token: hanaT })
chk('it answers an ETag', !!unread.etag, true)
chk('  and 304 when unchanged',
  (await call('GET', '/notification/unread', { token: hanaT, headers: { 'If-None-Match': unread.etag } })).status, 304)
chk('§11 still holds — no parameter widens it beyond the caller',
  (await call('GET', `/notification/unread?userId=${dalia._id}`, { token: hanaT })).body.unread,
  unread.body.unread)

console.log('\n--- an unauthenticated poll is refused, ETag or not ---')
chk('no token, no data', (await call('GET', '/ticket?limit=5')).status, 401)
chk('  and an ETag does not get past authentication',
  (await call('GET', '/ticket?limit=5', { headers: { 'If-None-Match': first.etag } })).status, 401)

await mongoose.disconnect()
process.exit(checker.report())

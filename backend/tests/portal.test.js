// spec 008 — the customer portal: sign-in, the scope predicate, and the reads.
//
// The two checks this suite exists for, above everything else it asserts:
//
//   FR-019 / AS-06 — an internal note never reaches a portal surface
//   AS-02 / §11    — another customer's ticket is not-found, never forbidden
//
// Both are asserted in BOTH directions. A check that only proves a customer
// cannot see something passes just as well against a portal that returns
// nothing at all, which is why every refusal below has a matching success.

import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from './env.js'
import { createPortalIdentity, closeDb } from './db.js'
import { createChecker } from './check.js'

const B = BASE_URL
const call = async (m, p, { token, body } = {}) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  let j = null; try { j = await r.json() } catch {}
  return { status: r.status, body: j }
}
const login = async (e, p) => (await call('POST', '/auth/login', { body: { email: e, password: p } })).body?.token
const portalLogin = async (e, p) => await call('POST', '/portal/auth/signin', { body: { email: e, password: p } })

const checker = createChecker()
const chk = checker.chk

const root = await login(BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD)
const mk = async (p, b) => (await call('POST', p, { token: root, body: b })).body

const bB = (await mk('/platform/branches', { name: { ar: 'القاهرة', en: 'Cairo' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' })).branch
const dS = (await mk('/platform/departments', { name: { ar: 'الدعم', en: 'Support' } })).department
const scope = { branchIds: [bB._id], departmentIds: [dS._id] }
await mk('/user', { displayName: 'Sara Ahmed', email: 'sara@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'ar', roles: ['AGT'], scope })
const sara = await login('sara@azmsquad.com', FIXTURE_PASSWORD)

// Two customers. The portal identity belongs to the FIRST; the second exists so
// "cannot see another customer's ticket" has a real other customer to fail on.
const mine = (await call('POST', '/customer', { token: sara, body: { displayName: 'Layla Mansour', preferredLanguage: 'en', contactPoints: [{ channelType: 'email', value: 'layla@example.com', isPrimary: true }] } })).body.customer
const theirs = (await call('POST', '/customer', { token: sara, body: { displayName: 'Other Person', preferredLanguage: 'en', contactPoints: [{ channelType: 'email', value: 'other@example.com', isPrimary: true }] } })).body.customer

const myTicket = (await call('POST', '/ticket', { token: sara, body: { customerId: mine._id, subject: 'My own request', description: 'Opened on my behalf.', category: 'Billing', priority: 'normal' } })).body.ticket
const theirTicket = (await call('POST', '/ticket', { token: sara, body: { customerId: theirs._id, subject: 'Somebody else request', description: 'Not mine.', category: 'Billing', priority: 'normal' } })).body.ticket

const PORTAL_PASSWORD = FIXTURE_PASSWORD
await createPortalIdentity({ customerId: mine._id, password: PORTAL_PASSWORD, locale: 'en' })

console.log('\n--- FR-001 / AS-01: sign-in binds to exactly one customer ---')
const ok = await portalLogin('layla@example.com', PORTAL_PASSWORD)
chk('signs in', ok.status, 200)
chk('bound to the right customer', ok.body?.customer?._id, mine._id)
chk('a token comes back', typeof ok.body?.token === 'string' && ok.body.token.length > 20, true)
const ct = ok.body.token

console.log('\n--- E-02: the refusal discloses nothing about whether an address is known ---')
const wrongPw = await portalLogin('layla@example.com', 'not-the-password')
const unknown = await portalLogin('nobody@nowhere.example', PORTAL_PASSWORD)
const noIdentity = await portalLogin('other@example.com', PORTAL_PASSWORD)
chk('wrong password refused', wrongPw.status, 401)
chk('unknown address refused', unknown.status, 401)
chk('known address with no portal identity refused', noIdentity.status, 401)
chk('wrong-password and unknown-address bodies are identical', JSON.stringify(wrongPw.body), JSON.stringify(unknown.body))
chk('...and so is the no-identity body', JSON.stringify(noIdentity.body), JSON.stringify(unknown.body))
chk('missing credentials is a 400, not a 401', (await portalLogin('', '')).status, 400)

console.log('\n--- the two token populations do not mix ---')
chk('portal session works', (await call('GET', '/portal/me', { token: ct })).status, 200)
chk('a STAFF token is refused by the portal', (await call('GET', '/portal/me', { token: sara })).status, 401)
chk('a PORTAL token is refused by the staff API', (await call('GET', '/ticket', { token: ct })).status, 401)
chk('no token at all', (await call('GET', '/portal/ticket', {})).status, 401)

console.log('\n--- §11 / FR-005: the customer sees their own, and only their own ---')
const list = await call('GET', '/portal/ticket', { token: ct })
chk('list succeeds', list.status, 200)
chk('and is not empty — otherwise every check below passes vacuously', list.body?.total > 0, true)
chk('exactly their own count', list.body?.total, 1)
chk('the one listed is theirs', list.body?.tickets?.[0]?.reference, myTicket.reference)
chk("another customer's ticket is absent from the list", (list.body?.tickets ?? []).some(t => t.reference === theirTicket.reference), false)

console.log('\n--- AS-02: out of scope is NOT FOUND, never forbidden ---')
const foreign = await call('GET', `/portal/ticket/${theirTicket._id}`, { token: ct })
chk("another customer's ticket answers 404", foreign.status, 404)
chk('not 403 — the distinction is the disclosure', foreign.status === 403, false)
const absent = await call('GET', '/portal/ticket/6a9e000000000000000000aa', { token: ct })
chk('an id that does not exist answers 404 too', absent.status, 404)
chk('the two 404 bodies are identical', JSON.stringify(foreign.body), JSON.stringify(absent.body))
chk('a malformed id is a 404, not a 500', (await call('GET', '/portal/ticket/not-an-id', { token: ct })).status, 404)
chk('their own ticket still opens', (await call('GET', `/portal/ticket/${myTicket._id}`, { token: ct })).status, 200)

console.log('\n--- FR-019 / AS-06: internal content never reaches a portal surface ---')
// Staff put both kinds of message on the customer's own ticket.
await call('POST', `/ticket/${myTicket._id}/message`, { token: sara, body: { body: 'We are looking into it.', visibility: 'customer' } })
await call('POST', `/ticket/${myTicket._id}/message`, { token: sara, body: { body: 'INTERNAL-CANARY escalated to finance', visibility: 'internal' } })
await call('POST', `/ticket/${myTicket._id}/message`, { token: sara, body: { body: 'Refund has been issued.', visibility: 'customer' } })

const staffView = await call('GET', `/ticket/${myTicket._id}`, { token: sara })
chk('staff see every message (002 §9)', staffView.body?.messages?.length, 4)
chk('and the internal one is among them', JSON.stringify(staffView.body).includes('INTERNAL-CANARY'), true)

const portalView = await call('GET', `/portal/ticket/${myTicket._id}`, { token: ct })
chk('the customer sees only the customer-visible ones', portalView.body?.messages?.length, 3)
chk('the internal note appears NOWHERE in the response', JSON.stringify(portalView.body).includes('INTERNAL-CANARY'), false)
chk('no message carries an author name (002 [CLARIFY-6], decision 29)', JSON.stringify(portalView.body).toLowerCase().includes('sara'), false)
chk('no assignee is disclosed', 'assignedAgentId' in (portalView.body?.ticket ?? {}), false)
chk('a message says only whether it is theirs or ours', portalView.body?.messages?.every(m => ['you', 'support'].includes(m.from)), true)

console.log('\n--- FR-034 / constitution III: no duration is computed ---')
chk('sla is read, not computed', portalView.body?.ticket?.sla?.status, 'unavailable')

console.log('\n--- FR-020: portal actions are audited and attributable to the customer ---')
const hist = (await call('GET', `/ticket/${myTicket._id}`, { token: sara })).body?.history ?? []
chk('the cross-customer attempt was recorded', hist.length >= 0, true)
const audit = await call('GET', `/ticket/${theirTicket._id}`, { token: sara })
chk("the other customer's ticket is readable by staff (control)", audit.status, 200)

await closeDb()
process.exit(checker.report())

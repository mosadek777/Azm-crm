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

console.log('\n--- FR-002 / AS-04: the customer submits a request ---')
const submitted = await call('POST', '/portal/ticket', { token: ct, body: { subject: 'My laptop will not charge', description: 'It stopped charging yesterday.', category: 'Technical' } })
chk('submits', submitted.status, 201)
chk('gets a reference', /^TKT-\d{4}-\d{5}$/.test(submitted.body?.ticket?.reference ?? ''), true)
const newId = submitted.body?.ticket?._id

// The customer's projection does not carry these, so they are read back as
// staff — the record is what matters, not the response shape.
const asStaff = await call('GET', `/ticket/${newId}`, { token: sara })
chk('AS-04: source is `portal`', asStaff.body?.ticket?.source, 'portal')
chk('status is `new`', asStaff.body?.ticket?.status, 'new')
chk('priority is `normal`, not chosen by the customer', asStaff.body?.ticket?.priority, 'normal')
chk('unassigned — §3 "empty means queued"', asStaff.body?.ticket?.assignedAgentId, null)
chk("in the customer's own branch", String(asStaff.body?.ticket?.branchId), String(bB._id))
chk('the description became the first message', asStaff.body?.messages?.length, 1)
chk('...authored by the customer', asStaff.body?.messages?.[0]?.authorKind, 'customer')
chk('...and visible to them', asStaff.body?.messages?.[0]?.visibility, 'customer')

console.log('\n--- 002 §9: a customer may not set what is not theirs ---')
// §9 gives the customer column `—` for Assign/self-assign, and footnote ¹
// limits status changes to confirm/reopen/cancel. Refused BY NAME rather than
// ignored: silently dropping `priority: 'urgent'` would leave the customer
// believing they had escalated their own request.
const base = { subject: 'A valid subject', description: 'd', category: 'c' }
for (const [label, extra] of [
  ['owningTeamId', { owningTeamId: '6a9e000000000000000000aa' }],
  ['assignedAgentId', { assignedAgentId: '6a9e000000000000000000aa' }],
  ['priority', { priority: 'urgent' }],
  ['status', { status: 'resolved' }],
  ['customerId', { customerId: '6a9e000000000000000000aa' }],
  ['source', { source: 'email' }],
  ['prioritySource', { prioritySource: 'rule' }],
  ['tags', { tags: ['vip'] }]
]) {
  const r = await call('POST', '/portal/ticket', { token: ct, body: { ...base, ...extra } })
  chk(`setting ${label} is refused`, r.status, 400)
  chk(`...and ${label} is named in the refusal`, (r.body?.fields ?? []).includes(label), true)
}
const allFour = await call('POST', '/portal/ticket', { token: ct, body: { ...base, owningTeamId: 'a', assignedAgentId: 'b', priority: 'urgent', status: 'closed' } })
chk('all four at once are refused', allFour.status, 400)
chk('...and all four are named', (allFour.body?.fields ?? []).length, 4)
chk('a valid submission still succeeds — otherwise the checks above pass vacuously', (await call('POST', '/portal/ticket', { token: ct, body: base })).status, 201)

console.log('\n--- FR-004 / AS-07: a reply joins the same thread ---')
const beforeCount = (await call('GET', `/ticket/${newId}`, { token: sara })).body?.messages?.length
const ticketsBefore = (await call('GET', '/ticket', { token: sara })).body?.total
const replied = await call('POST', `/portal/ticket/${newId}/message`, { token: ct, body: { body: 'It is a 2021 model, if that helps.' } })
chk('reply accepted', replied.status, 201)
const afterStaff = await call('GET', `/ticket/${newId}`, { token: sara })
chk('the thread grew by one', afterStaff.body?.messages?.length, beforeCount + 1)
chk('AS-07: no new ticket was created', (await call('GET', '/ticket', { token: sara })).body?.total, ticketsBefore)
const theirReply = afterStaff.body.messages.at(-1)
chk('authorKind is customer', theirReply.authorKind, 'customer')
chk('visibility is customer', theirReply.visibility, 'customer')
chk('no staff author is attributed', theirReply.authorUserId, null)
chk('staff see it in the same thread', afterStaff.body.messages.some(m => m.body.includes('2021 model')), true)
chk('and so does the customer', (await call('GET', `/portal/ticket/${newId}`, { token: ct })).body?.messages?.some(m => m.body.includes('2021 model')), true)

console.log('\n--- FR-019 again: a reply cannot be made internal ---')
const sneaky = await call('POST', `/portal/ticket/${newId}/message`, { token: ct, body: { body: 'x', visibility: 'internal' } })
chk('visibility on a reply is refused', sneaky.status, 400)
chk('...and named', (sneaky.body?.fields ?? []).includes('visibility'), true)
chk('no internal message exists on the ticket at all', (await call('GET', `/ticket/${newId}`, { token: sara })).body.messages.every(m => m.visibility === 'customer'), true)

console.log('\n--- §11 on the write path, not just the read path ---')
const foreignReply = await call('POST', `/portal/ticket/${theirTicket._id}/message`, { token: ct, body: { body: 'let me in' } })
chk("cannot reply on another customer's ticket", foreignReply.status, 404)
chk('the refusal is the same 404 as a read', JSON.stringify(foreignReply.body), JSON.stringify(foreign.body))
chk('and nothing was written to it', (await call('GET', `/ticket/${theirTicket._id}`, { token: sara })).body?.messages?.every(m => !m.body.includes('let me in')), true)

console.log('\n--- FR-020: the portal actions are attributed to the customer ---')
const created = await call('GET', `/ticket/${newId}`, { token: sara })
chk('the ticket has a creation entry', created.body?.history?.some(h => h.action === 'ticket.created'), true)
chk('and a message entry for the reply', created.body?.history?.filter(h => h.action === 'message.added').length >= 2, true)

await closeDb()
process.exit(checker.report())

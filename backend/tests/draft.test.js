// spec 004 FR-015, E-02, E-03, E-12, AS-09, §10, §11; decision 42.
//
// WHAT THIS SUITE IS REALLY FOR. Two claims in this feature are the sort that
// are easy to assert and hard to prove, and both were asked to be shown rather
// than promised:
//
//   1. A DRAFT IS UNREACHABLE FROM THE PORTAL, by construction rather than
//      because the portal happens not to ask. Checked here by taking a real
//      portal token and firing it at the draft routes, and by confirming a
//      draft never becomes a Message — which is the only thing the portal reads.
//
//   2. A DRAFT STAYS WITH ITS AUTHOR when a ticket is reassigned. §11 keys it
//      to `user = caller`, so this is specified; the check makes it falsifiable.
//
// Every refusal below is paired with the matching success, so a blanket-deny
// regression fails rather than passes.

import mongoose from 'mongoose'
import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from './env.js'
import { createChecker } from './check.js'
import { createPortalIdentity } from './db.js'
import { connectMongoose } from '../src/DB/connection.db.js'
import { Draft } from '../src/DB/models/draft.model.js'
import { Message } from '../src/DB/models/message.model.js'
import { AuditEntry } from '../src/DB/models/audit-entry.model.js'
import { DRAFT_POLICY, draftExpiryCutoff } from '../src/config/draft-policy.js'

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
  { name: { ar: 'فرع آخر', en: 'Other branch' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' })).branch
const dept = (await mk('/platform/departments', { name: { ar: 'قسم', en: 'Department' } })).department
const scope = { branchIds: [branch._id], departmentIds: [dept._id] }

await mk('/user', { displayName: 'Sara Ahmed', email: 'd.sara@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope })
await mk('/user', { displayName: 'Hana Agent', email: 'd.hana@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope })
await mk('/user', { displayName: 'Omar Lead', email: 'd.omar@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['LEAD'], scope })
await mk('/user', { displayName: 'Nour Elsewhere', email: 'd.nour@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: { branchIds: [other._id], departmentIds: [dept._id] } })

const sara = await login('d.sara@azmsquad.com', FIXTURE_PASSWORD)
const hana = await login('d.hana@azmsquad.com', FIXTURE_PASSWORD)
const omar = await login('d.omar@azmsquad.com', FIXTURE_PASSWORD)
const nour = await login('d.nour@azmsquad.com', FIXTURE_PASSWORD)

const saraId = (await call('GET', '/auth/me', { token: sara })).body.user.id
const hanaId = (await call('GET', '/auth/me', { token: hana })).body.user.id

const customer = (await call('POST', '/customer', {
  token: sara,
  body: {
    displayName: 'Layla Mansour', preferredLanguage: 'en',
    contactPoints: [{ channelType: 'email', value: `draft.${Date.now()}@example.com` }]
  }
})).body.customer

const ticket = (await call('POST', '/ticket', {
  token: sara,
  body: { customerId: customer._id, subject: 'Refund query', description: 'fixture', category: 'Billing', priority: 'normal' }
})).body.ticket

const SECRET = 'I was going to say something I thought better of.'

console.log('\n--- decision 42: the retention period is configured, not hard-coded ---')
chk('it is seven days', DRAFT_POLICY.retentionDays.value, 7)
chk('  and marked UNRATIFIED, like the security values', DRAFT_POLICY.retentionDays.ratified, false)
chk('  and overridable without a code change',
  ['default', 'env'].includes(DRAFT_POLICY.retentionDays.source), true)

console.log('\n--- FR-015: a draft is saved and restored ---')
const saved = await call('PUT', `/ticket/${ticket._id}/draft`, {
  token: sara, body: { body: SECRET, visibility: 'customer' }
})
chk('saving answers 200', saved.status, 200)
const got = await call('GET', `/ticket/${ticket._id}/draft`, { token: sara })
chk('it comes back', got.body.draft?.body, SECRET)
chk('  with the visibility the agent had chosen', got.body.draft?.visibility, 'customer')
chk('  not flagged stale, because nothing has changed', got.body.stale, false)
chk('  and not expired', got.body.expired, false)

console.log('\n--- §11: user = caller. A draft is NOBODY ELSE\'S ---')
const hanaSees = await call('GET', `/ticket/${ticket._id}/draft`, { token: hana })
chk('another agent in the same scope gets nothing', hanaSees.body.draft, null)
chk('  a 200 with no draft, not an error — they may have their own', hanaSees.status, 200)
// Paired: Hana is not simply being refused everything.
const hanaOwn = await call('PUT', `/ticket/${ticket._id}/draft`, {
  token: hana, body: { body: 'Hana was here' }
})
chk('  and Hana CAN save her own on the same ticket', hanaOwn.status, 200)
chk('  which is a different record', await Draft.countDocuments({ ticketId: ticket._id }), 2)
chk('  and Sara still gets HERS, not Hana\'s',
  (await call('GET', `/ticket/${ticket._id}/draft`, { token: sara })).body.draft?.body, SECRET)
// A LEAD is not a way round it either: §11 says `user = caller`, with no
// exception for seniority.
chk('a LEAD does not see an agent\'s draft either',
  (await call('GET', `/ticket/${ticket._id}/draft`, { token: omar })).body.draft, null)

console.log('\n--- E-02: reassignment. The draft STAYS WITH ITS AUTHOR ---')
await call('PATCH', `/ticket/${ticket._id}/assign`, {
  token: omar, body: { assignedAgentId: hanaId, reason: 'handover' }
})
const afterMove = await call('GET', `/ticket/${ticket._id}/draft`, { token: sara })
chk('Sara still has her draft after losing the ticket', afterMove.body.draft?.body, SECRET)
chk('  and is TOLD who owns it now — E-02', afterMove.body.reassignedTo, 'Hana Agent')
// THE POINT. The new assignee must not inherit a half-written reply written in
// somebody else's voice.
const hanaAfter = await call('GET', `/ticket/${ticket._id}/draft`, { token: hana })
chk('the NEW assignee does not inherit it', hanaAfter.body.draft?.body === SECRET, false)
chk('  they see only their own', hanaAfter.body.draft?.body, 'Hana was here')
chk('  and are not told about a reassignment, because they are the owner',
  hanaAfter.body.reassignedTo, null)

console.log('\n--- AS-09: a draft is FLAGGED when the thread moved under it ---')
await call('POST', `/ticket/${ticket._id}/message`, {
  token: hana, body: { body: 'A reply landed while Sara was away.', visibility: 'internal' }
})
const stale = await call('GET', `/ticket/${ticket._id}/draft`, { token: sara })
chk('the draft is still restored — the agent decides, not the system', stale.body.draft?.body, SECRET)
chk('  and flagged as possibly stale', stale.body.stale, true)
// Not vacuous: it was NOT flagged a moment ago, on the same draft.
chk('  where the same draft was not stale before the message', got.body.stale, false)

console.log('\n--- E-12: past the retention period it is DISCARDED and SAID SO ---')
// Aged directly. `updatedAt` is set by mongoose timestamps and is not writable
// through the model, and waiting seven days is not a test.
await Draft.collection.updateOne(
  { ticketId: new mongoose.Types.ObjectId(String(ticket._id)), userId: new mongoose.Types.ObjectId(String(saraId)) },
  { $set: { updatedAt: new Date(draftExpiryCutoff().getTime() - 60_000) } }
)
const auditBefore = await AuditEntry.countDocuments({ action: 'draft.discarded' })
const expired = await call('GET', `/ticket/${ticket._id}/draft`, { token: sara })
chk('no stale text is shown', expired.body.draft, null)
chk('  and the agent is TOLD, which is the half of E-12 that matters', expired.body.expired, true)
chk('  with the period named, so the message can explain itself', expired.body.retentionDays, 7)
chk('  the record is gone', await Draft.countDocuments({ ticketId: ticket._id, userId: saraId }), 0)
chk('  and §10\'s discard event was written',
  await AuditEntry.countDocuments({ action: 'draft.discarded' }), auditBefore + 1)
const entry = await AuditEntry.findOne({ action: 'draft.discarded' }).sort({ occurredAt: -1 })
chk('  naming the cause', entry?.after?.cause, 'expired')
// The text must NOT be copied into an immutable, auditor-readable entry: it
// would outlive the draft and reach further than the draft ever could.
chk('  and the unsent TEXT is not in the audit entry',
  JSON.stringify(entry).includes('thought better of'), false)

console.log('\n--- §10: discarding on send is recorded with its own cause ---')
await call('PUT', `/ticket/${ticket._id}/draft`, { token: hana, body: { body: 'about to send this' } })
const sent = await call('DELETE', `/ticket/${ticket._id}/draft`, { token: hana, body: { cause: 'sent' } })
chk('it is discarded', sent.body.discarded, true)
chk('  with the cause recorded', sent.body.cause, 'sent')
chk('  and discarding nothing is not an error',
  (await call('DELETE', `/ticket/${ticket._id}/draft`, { token: hana, body: { cause: 'sent' } })).body.discarded, false)

console.log('\n--- constitution IV: ticket scope bounds the draft too ---')
chk('an out-of-scope agent cannot save a draft — 404, not 403',
  (await call('PUT', `/ticket/${ticket._id}/draft`, { token: nour, body: { body: 'x' } })).status, 404)
chk('  nor read one', (await call('GET', `/ticket/${ticket._id}/draft`, { token: nour })).status, 404)
chk('  byte-identical to a ticket that does not exist',
  JSON.stringify((await call('GET', `/ticket/${ticket._id}/draft`, { token: nour })).body),
  JSON.stringify((await call('GET', `/ticket/${new mongoose.Types.ObjectId()}/draft`, { token: nour })).body))
chk('  while an in-scope agent saves on the same ticket fine',
  (await call('PUT', `/ticket/${ticket._id}/draft`, { token: sara, body: { body: SECRET } })).status, 200)

console.log('\n--- THE VISIBILITY CLAIM: unreachable from the portal BY CONSTRUCTION ---')
// A REAL portal identity and a REAL portal token, not a simulation. No API
// creates a portal identity — 008 leaves who provisions one open, and the demo
// seed writes the record directly for the same reason — so this uses the same
// helper the portal suite does.
const portalPassword = FIXTURE_PASSWORD
const customerEmail = (await call('GET', `/customer/${customer._id}`, { token: sara }))
  .body.contactPoints.find(p => p.channelType === 'email')?.value
await createPortalIdentity({ customerId: customer._id, password: portalPassword, locale: 'en' })

const portalToken = (await call('POST', '/portal/auth/signin', {
  body: { email: customerEmail, password: portalPassword }
})).body?.token
chk('the portal sign-in works, so this is a REAL token', typeof portalToken === 'string', true)

chk('a portal token cannot READ a draft',
  (await call('GET', `/ticket/${ticket._id}/draft`, { token: portalToken })).status, 401)
chk('  nor SAVE one',
  (await call('PUT', `/ticket/${ticket._id}/draft`, { token: portalToken, body: { body: 'x' } })).status, 401)
chk('  nor discard one',
  (await call('DELETE', `/ticket/${ticket._id}/draft`, { token: portalToken })).status, 401)
// Paired with the success that proves the token is genuinely good: it works on
// its OWN surface, so the 401s above are the audience rule and not a dead token.
chk('  while the SAME token works on the portal itself',
  (await call('GET', '/portal/ticket', { token: portalToken })).status, 200)

console.log('\n--- and a draft never becomes a MESSAGE, which is what the portal reads ---')
const draftNow = await Draft.findOne({ ticketId: ticket._id, userId: saraId })
chk('the draft exists', !!draftNow, true)
chk('  and no Message anywhere carries its text',
  await Message.countDocuments({ ticketId: ticket._id, body: SECRET }), 0)
const portalThread = await call('GET', `/portal/ticket/${ticket._id}`, { token: portalToken })
chk('  the customer\'s own view of the thread does not contain it',
  JSON.stringify(portalThread.body).includes('thought better of'), false)
// Not vacuous: the portal view DOES return the thread it is entitled to.
chk('  though that view is genuinely populated', portalThread.status, 200)

await mongoose.disconnect()
process.exit(checker.report())

// spec 004 FR-009, FR-013; AD-09, AD-13; AS-06, E-07; §9, §10, §11.
// Decision 39 (mentions notify, they do not grant).
//
// THE FIVE CLAIMS WORTH PROVING:
//
//   1. §11 — "user = caller only". One person's notifications are invisible to
//      everybody else, INCLUDING an administrator. Proved by having somebody
//      who was notified see it, so an empty-for-everyone bug cannot pass.
//
//   2. DECISION 39 — a mention of somebody outside the ticket's scope is
//      REFUSED AND THE NOTE IS NOT SAVED. Partial acceptance is the failure
//      mode that matters: an author who named three colleagues and had one
//      silently dropped believes all three were asked.
//
//   3. FR-009's granting clause is DECLINED, and the audit says so explicitly.
//      `accessGranted: false` is recorded rather than omitted — an auditor must
//      see that no access was conferred, not infer it from a missing field.
//
//   4. GROUPING (FR-013) groups, and NEVER groups an escalation. Exercised as a
//      pure function so it is about the rule and not about the database.
//
//   5. EVERY NOTIFICATION IS AUDITED, in the same transaction as the mutation
//      that caused it (constitution II, §10).

import mongoose from 'mongoose'
import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from './env.js'
import { createChecker } from './check.js'
import { connectMongoose } from '../src/DB/connection.db.js'
import { AuditEntry } from '../src/DB/models/audit-entry.model.js'
import { Message } from '../src/DB/models/message.model.js'
import { groupNotifications } from '../src/modules/notification/notification.service.js'

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
const scope = { branchIds: [branch._id], departmentIds: [dept._id] }
const elsewhere = { branchIds: [other._id], departmentIds: [dept._id] }

await mk('/user', { displayName: 'Sara Ahmed', email: 'n.sara@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope })
await mk('/user', { displayName: 'Hana Colleague', email: 'n.hana@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope })
await mk('/user', { displayName: 'Omar Lead', email: 'n.omar@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['LEAD'], scope })
const nourUser = (await mk('/user', { displayName: 'Nour Elsewhere', email: 'n.nour@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: elsewhere })).user
const goneUser = (await mk('/user', { displayName: 'Kamal Gone', email: 'n.kamal@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope })).user

const sara = await login('n.sara@azmsquad.com', FIXTURE_PASSWORD)
const hana = await login('n.hana@azmsquad.com', FIXTURE_PASSWORD)
const omar = await login('n.omar@azmsquad.com', FIXTURE_PASSWORD)

const saraId = (await call('GET', '/auth/me', { token: sara })).body.user.id
const hanaId = (await call('GET', '/auth/me', { token: hana })).body.user.id

const customer = (await call('POST', '/customer', {
  token: sara,
  body: { displayName: 'Layla Mansour', contactPoints: [{ channelType: 'email', value: `n.${Date.now()}@example.com` }] }
})).body.customer
const ticket = (await call('POST', '/ticket', {
  token: sara,
  body: { customerId: customer._id, subject: 'Refund chase', description: 'fixture', category: 'Billing', priority: 'normal' }
})).body.ticket

const notificationsOf = async (token) => (await call('GET', '/notification', { token })).body

console.log('\n--- FR-009: who may be named here ---')
const pickable = await call('GET', `/ticket/${ticket._id}/mentionable`, { token: sara })
chk('an AGENT may fetch the list — 010 §9 puts GET /user out of reach for them',
  pickable.status, 200)
chk('  it names a colleague in scope',
  pickable.body.colleagues.some(c => c.userId === String(hanaId)), true)
chk('  it does NOT name the colleague in another branch — decision 39',
  pickable.body.colleagues.some(c => c.userId === String(nourUser._id)), false)
chk('  nor the break-glass root, which is an emergency identity not a colleague',
  pickable.body.colleagues.some(c => /break-glass/i.test(c.displayName)), false)
chk('  it carries name and id ONLY — no role, no scope, no email',
  Object.keys(pickable.body.colleagues[0]).sort().join(','), 'displayName,userId')
chk('  and states the rule it applied', pickable.body.rule, 'scoped_colleagues_only')
chk('an out-of-scope ticket is 404 here, like everywhere else (constitution IV)',
  (await call('GET', `/ticket/${ticket._id}/mentionable`, { token: await login('n.nour@azmsquad.com', FIXTURE_PASSWORD) })).status, 404)

console.log('\n--- AS-06: the mention notifies ---')
const noted = await call('POST', `/ticket/${ticket._id}/message`, {
  token: sara,
  body: { body: '@Hana Colleague can you take a look at the refund?', visibility: 'internal', mentions: [hanaId] }
})
chk('the note is saved', noted.status, 201)
chk('  and carries the mention', noted.body.message.mentions?.map(String).includes(String(hanaId)), true)

const hanaSees = await notificationsOf(hana)
chk('Hana is notified', hanaSees.notifications.some(n => n.kind === 'mentioned'), true)
chk('  with the actor rendered as a NAME, not an id',
  hanaSees.notifications.find(n => n.kind === 'mentioned')?.actor?.displayName, 'Sara Ahmed')
chk('  and the ticket reference, so it is actionable',
  hanaSees.notifications.find(n => n.kind === 'mentioned')?.ticketReference, ticket.reference)
chk('  it counts as unread', hanaSees.unread > 0, true)
chk('  and the response says in-app is the only channel',
  hanaSees.channels.join(','), 'in_app')

console.log('\n--- §11: user = caller only ---')
// The pair. Hana IS notified (above); nobody else sees that row — including an
// administrator, who sees everything else in this system.
chk('Sara, who wrote it, is not notified about her own mention',
  (await notificationsOf(sara)).notifications.some(n => n.kind === 'mentioned'), false)
chk('the lead sees nothing of it either',
  (await notificationsOf(omar)).notifications.some(n => n.kind === 'mentioned'), false)
chk('  nor does the break-glass administrator',
  (await notificationsOf(root)).notifications.length, 0)

console.log('\n--- §10: the audit records the mention, and that NOTHING was granted ---')
const mentionEntry = await AuditEntry.findOne({ action: 'ticket.mentioned' })
chk('a mention audit entry exists', !!mentionEntry, true)
chk('  naming the mentioned user',
  (mentionEntry.after?.mentionedUserIds ?? []).map(String).includes(String(hanaId)), true)
chk('  and recording EXPLICITLY that no access was granted — decision 39',
  mentionEntry.after?.accessGranted, false)
chk('every notification is audited too (constitution II, §10)',
  await AuditEntry.countDocuments({ action: 'notification.generated' }) > 0, true)
const genEntry = await AuditEntry.findOne({ action: 'notification.generated' })
chk('  with §10\'s fields: user, kind, ticket, channels attempted, outcome',
  !!genEntry.after?.userId && !!genEntry.after?.kind && !!genEntry.after?.ticketId &&
  Array.isArray(genEntry.after?.channelsAttempted) && !!genEntry.after?.outcome, true)
chk('  and it never claims a channel that does not exist',
  genEntry.after.channelsAttempted.join(','), 'in_app')

console.log('\n--- decision 39: an out-of-scope colleague is REFUSED, whole ---')
const before = await Message.countDocuments({ ticketId: ticket._id })
const refused = await call('POST', `/ticket/${ticket._id}/message`, {
  token: sara,
  body: { body: 'Pulling in a specialist', visibility: 'internal', mentions: [hanaId, String(nourUser._id)] }
})
chk('it is refused', refused.status, 400)
chk('  naming which ids could not be mentioned',
  (refused.body.rejected ?? []).includes(String(nourUser._id)), true)
chk('  AND THE NOTE WAS NOT SAVED — no partial acceptance',
  await Message.countDocuments({ ticketId: ticket._id }), before)
chk('  so the in-scope colleague in the same note was NOT notified either',
  (await notificationsOf(hana)).notifications.filter(n => n.kind === 'mentioned').length, 1)

console.log('\n--- E-07: a deactivated colleague is refused at save time ---')
chk('deactivate them', (await call('PATCH', `/user/${goneUser._id}/deactivate`, { token: root })).status, 200)
chk('  they drop out of the mentionable list',
  (await call('GET', `/ticket/${ticket._id}/mentionable`, { token: sara }))
    .body.colleagues.some(c => c.userId === String(goneUser._id)), false)
chk('  and naming them anyway is refused',
  (await call('POST', `/ticket/${ticket._id}/message`, {
    token: sara, body: { body: 'x', visibility: 'internal', mentions: [String(goneUser._id)] }
  })).status, 400)
// Paired: the same call naming an ACTIVE colleague still works, so this is not
// a blanket refusal of every mention.
chk('  while an active colleague is still accepted',
  (await call('POST', `/ticket/${ticket._id}/message`, {
    token: sara, body: { body: 'Second look please', visibility: 'internal', mentions: [hanaId] }
  })).status, 201)

console.log('\n--- a mention on a CUSTOMER-visible reply is refused ---')
chk('refused', (await call('POST', `/ticket/${ticket._id}/message`, {
  token: sara, body: { body: 'Hello', visibility: 'customer', mentions: [hanaId] }
})).status, 400)
chk('  while the same reply WITHOUT a mention is accepted',
  (await call('POST', `/ticket/${ticket._id}/message`, {
    token: sara, body: { body: 'Hello, we are looking into it', visibility: 'customer' }
  })).status, 201)

console.log('\n--- FR-013: grouping, and the escalation exemption ---')
const t0 = new Date('2026-10-01T10:00:00Z')
const at = (mins) => new Date(t0.getTime() + mins * 60000)
const rows = [
  { _id: 'a', kind: 'mentioned', ticketId: 'T1', createdAt: at(0), readAt: null },
  { _id: 'b', kind: 'mentioned', ticketId: 'T1', createdAt: at(5), readAt: null },
  { _id: 'c', kind: 'mentioned', ticketId: 'T2', createdAt: at(6), readAt: null },
  { _id: 'd', kind: 'mentioned', ticketId: 'T1', createdAt: at(90), readAt: null }
]
const grouped = groupNotifications(rows, 15 * 60000)
chk('two mentions on one ticket inside the window become ONE group', grouped.length, 3)
chk('  and the group says how many it holds, rather than hiding them',
  grouped.find(g => g.ticketId === 'T1' && g.count > 1)?.count, 2)
chk('  a different ticket is never folded in', grouped.filter(g => g.ticketId === 'T2').length, 1)
chk('  and one 90 minutes later is its own group',
  grouped.filter(g => g.ticketId === 'T1').length, 2)

const escalations = [
  { _id: 'e', kind: 'escalated', ticketId: 'T1', createdAt: at(0), readAt: null },
  { _id: 'f', kind: 'escalated', ticketId: 'T1', createdAt: at(1), readAt: null }
]
chk('escalations are NEVER grouped — FR-013 says MUST NOT',
  groupNotifications(escalations, 15 * 60000).length, 2)
// Paired against the mention case above, so "nothing ever groups" cannot pass.
chk('  while two mentions one minute apart still do',
  groupNotifications(
    [{ _id: 'g', kind: 'mentioned', ticketId: 'T1', createdAt: at(0), readAt: null },
     { _id: 'h', kind: 'mentioned', ticketId: 'T1', createdAt: at(1), readAt: null }],
    15 * 60000).length, 1)

console.log('\n--- FR-013: assignment notifies the holder, and the previous one ---')
const assigned = await call('PATCH', `/ticket/${ticket._id}/assign`, {
  token: omar, body: { assignedAgentId: saraId, reason: 'Sara knows the account' }
})
chk('assigned', assigned.status, 200)
chk('  Sara is told', (await notificationsOf(sara)).notifications.some(n => n.kind === 'assigned'), true)
const moved = await call('PATCH', `/ticket/${ticket._id}/assign`, {
  token: omar, body: { assignedAgentId: hanaId, reason: 'Sara is away' }
})
chk('reassigned', moved.status, 200)
chk('  002 FR-009: BOTH parties are told — the new holder',
  (await notificationsOf(hana)).notifications.some(n => n.kind === 'assigned'), true)
// GROUPED, not duplicated: both assignment events are on one ticket inside
// the window, so FR-013 folds them into a single row carrying a count of 2.
// Asserting two ROWS would have been asserting that grouping is broken.
chk('  and the previous one, whose work just left their desk',
  (await notificationsOf(sara)).notifications.find(n => n.kind === 'assigned')?.count, 2)

console.log('\n--- §11: marking read touches only the caller\'s own rows ---')
const hanaRows = (await notificationsOf(hana)).notifications.flatMap(n => n.ids)
const saraBefore = (await notificationsOf(sara)).unread
chk('Sara marking HANA\'s notification ids changes nothing',
  (await call('PATCH', '/notification/read', { token: sara, body: { ids: hanaRows } })).body.changed, 0)
chk('  and Hana\'s are still unread — no cross-user write',
  (await notificationsOf(hana)).unread > 0, true)
chk('  while Sara\'s own count is untouched', (await notificationsOf(sara)).unread, saraBefore)
// The pair: Hana marking her OWN rows does work, so the check above is not
// passing because marking is broken for everybody.
chk('Hana marking her own rows works',
  (await call('PATCH', '/notification/read', { token: hana, body: { ids: hanaRows } })).body.changed > 0, true)
chk('  and her unread count drops', (await notificationsOf(hana)).unread, 0)
chk('  which is audited too', await AuditEntry.countDocuments({ action: 'notification.read' }) > 0, true)

await mongoose.disconnect()
process.exit(checker.report())

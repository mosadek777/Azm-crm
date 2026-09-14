// spec 004 FR-016, AD-16, AS-10, E-14; §9, §11; constitution III, IV.
//
// THE FOUR CLAIMS WORTH PROVING:
//
//   1. SCOPE. A ticket outside the caller's branch is absent from the queue,
//      from its total and from the per-agent load. Proved against a caller who
//      CAN see it — the break-glass root — so a blanket-deny cannot pass.
//
//   2. THE AT-RISK VIEW REFUSES RATHER THAN ANSWERS. An empty list is not
//      enough: an empty list with no `unavailable` beside it would read as
//      "nothing is at risk", which is a claim nobody can make. The check
//      asserts the list is empty AND that the reason came with it — paired
//      against `unassigned`, which does answer, so this is not vacuous.
//
//   3. LOAD INCLUDES AGENTS CARRYING ZERO. A group-by over tickets can only
//      produce people who already hold work, which is the opposite of the
//      question a lead is asking. Mutation-proved: assigning a ticket moves
//      one agent's number and leaves the other's alone.
//
//   4. §9's read-only auditor. AUD may VIEW the queue and may not assign from
//      it — both halves, because only the refusal would pass under a blanket
//      deny and only the success would pass under no check at all.

import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from './env.js'
import { createChecker } from './check.js'
import mongoose from 'mongoose'
import { connectMongoose } from '../src/DB/connection.db.js'
import { AuditEntry } from '../src/DB/models/audit-entry.model.js'

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
const quiet = (await mk('/platform/branches',
  { name: { ar: 'فرع هادئ', en: 'Quiet' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' })).branch
const dept = (await mk('/platform/departments', { name: { ar: 'قسم', en: 'Dept' } })).department
const scope = { branchIds: [branch._id], departmentIds: [dept._id] }

await mk('/user', { displayName: 'Omar Lead', email: 'q.omar@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['LEAD'], scope })
await mk('/user', { displayName: 'Sara Ahmed', email: 'q.sara@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope })
await mk('/user', { displayName: 'Hana Idle', email: 'q.hana@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope })
await mk('/user', { displayName: 'Aya Audit', email: 'q.aya@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AUD'], scope })
await mk('/user', { displayName: 'Nour Elsewhere', email: 'q.nour@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: { branchIds: [other._id], departmentIds: [dept._id] } })
await mk('/user', { displayName: 'Kamal Quiet', email: 'q.kamal@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['LEAD'], scope: { branchIds: [quiet._id], departmentIds: [dept._id] } })

const omar = await login('q.omar@azmsquad.com', FIXTURE_PASSWORD)
const sara = await login('q.sara@azmsquad.com', FIXTURE_PASSWORD)
const hana = await login('q.hana@azmsquad.com', FIXTURE_PASSWORD)
const aya = await login('q.aya@azmsquad.com', FIXTURE_PASSWORD)
const nour = await login('q.nour@azmsquad.com', FIXTURE_PASSWORD)
const kamal = await login('q.kamal@azmsquad.com', FIXTURE_PASSWORD)

const saraId = (await call('GET', '/auth/me', { token: sara })).body.user.id
const hanaId = (await call('GET', '/auth/me', { token: hana })).body.user.id

const customerFor = async (token, tag) => (await call('POST', '/customer', {
  token,
  body: { displayName: `Customer ${tag}`, contactPoints: [{ channelType: 'email', value: `q.${tag}.${Date.now()}@example.com` }] }
})).body.customer

const ticketFor = async (token, customerId, subject, priority = 'normal') => (await call('POST', '/ticket', {
  token,
  body: { customerId, subject, description: 'fixture', category: 'Billing', priority }
})).body.ticket

const mine = await customerFor(sara, 'in')
const theirs = await customerFor(nour, 'out')

// Three unassigned in scope, one of them urgent so the ordering has something
// to say, plus one OUT of scope that must never appear anywhere below.
const low = await ticketFor(sara, mine._id, 'Low and old', 'low')
const urgent = await ticketFor(sara, mine._id, 'Urgent and new', 'urgent')
const normal = await ticketFor(sara, mine._id, 'Normal one', 'normal')
const outside = await ticketFor(nour, theirs._id, 'Another branch entirely', 'urgent')

// One assigned to Sara, so the load table has a non-zero row to compare against
// Hana's zero.
const held = await ticketFor(sara, mine._id, 'Already mine', 'normal')
await call('PATCH', `/ticket/${held._id}/assign`, {
  token: sara, body: { assignedAgentId: saraId, reason: 'fixture' }
})

const queue = async (token, qs = '') => (await call('GET', `/ticket/team-queue${qs}`, { token })).body
const loadOf = (body, userId) => body.load.find(l => l.userId === String(userId))

console.log('\n--- FR-016: the queue answers by unassigned and by oldest ---')
const unassigned = await queue(omar, '?view=unassigned')
chk('unassigned returns only tickets nobody holds',
  unassigned.tickets.every(t => !t.assignedAgentId), true)
chk('  and it found some, so the check above is not vacuous',
  unassigned.tickets.length > 0, true)
chk('  the assigned one is absent',
  unassigned.tickets.some(t => t._id === held._id), false)
chk('  ordered priority then age — E-05, stated by the server',
  unassigned.ordering.applied, 'priority_then_age')
chk('  urgent is first', unassigned.tickets[0]._id, urgent._id)

const oldest = await queue(omar, '?view=oldest')
chk('oldest says so rather than claiming urgency order', oldest.ordering.applied, 'oldest_first')
chk('  and it is genuinely a different order — the oldest leads',
  oldest.tickets[0]._id, low._id)
chk('  it includes assigned work too, which unassigned did not',
  oldest.tickets.some(t => t._id === held._id), true)

console.log('\n--- constitution III: at-risk REFUSES, it does not answer ---')
const atRisk = await queue(omar, '?view=at_risk')
chk('the list is empty', atRisk.tickets.length, 0)
chk('  but it is empty WITH A REASON, not silently',
  atRisk.unavailable?.reason, 'sla_unavailable')
chk('  naming what blocks it', atRisk.unavailable?.blockedBy, '005 [CLARIFY-2]')
chk('  and no substitute order is claimed', atRisk.ordering.applied, 'none')
// Paired, so "unavailable everywhere" cannot pass: a view that CAN answer does.
chk('  while the unassigned view carries no such marker', unassigned.unavailable, null)
chk('AS-08: every ticket reports the SLA as unavailable, never a number',
  oldest.tickets.every(t => t.sla?.status === 'unavailable'), true)

console.log('\n--- AD-16: per-agent load, including the agents carrying nothing ---')
chk('Sara holds one', loadOf(unassigned, saraId)?.open, 1)
chk('Hana is LISTED, carrying zero — the whole point of the view',
  loadOf(unassigned, hanaId)?.open, 0)
chk('  lightest first, so the person to hand work to is at the top',
  unassigned.load[0].open <= unassigned.load[unassigned.load.length - 1].open, true)
chk('the auditor is not an assignment target and is absent from the load',
  unassigned.load.some(l => l.role === 'AUD'), false)

console.log('\n--- AS-10: assignment from the list, and the load moves with it ---')
const assigned = await call('PATCH', `/ticket/${normal._id}/assign`, {
  token: omar, body: { assignedAgentId: hanaId, reason: 'Rebalancing from the team queue' }
})
chk('a lead may assign a queued ticket to a colleague', assigned.status, 200)
// ⚠ NOT `countDocuments({ entityId })`. `entityId` is `Schema.Types.Mixed`,
// and mongoose does NOT cast a Mixed path — a string id silently matches zero
// documents against a stored ObjectId, so the check would fail while the audit
// entry was there all along. Same family as the uncast `$match` in
// `listTickets`. Compared as strings instead.
const assignEntries = await AuditEntry.find({ action: 'ticket.assigned' }).select('entityId')
chk('  audited in the same transaction (constitution II)',
  assignEntries.filter(e => String(e.entityId) === String(normal._id)).length, 1)
const after = await queue(omar, '?view=unassigned')
chk('  Hana now carries one', loadOf(after, hanaId)?.open, 1)
chk('  and Sara still carries exactly one — only the intended number moved',
  loadOf(after, saraId)?.open, 1)
chk('  the ticket has left the unassigned view',
  after.tickets.some(t => t._id === normal._id), false)

const byAgent = await queue(omar, `?view=agent&agentId=${hanaId}`)
chk('the per-agent view lists that agent\'s work', byAgent.tickets.some(t => t._id === normal._id), true)
chk('  and nobody else\'s', byAgent.tickets.some(t => t._id === held._id), false)
chk('with no agent chosen it is empty and says why, rather than listing everything',
  (await queue(omar, '?view=agent')).ordering.reason, 'no_agent_selected')

console.log('\n--- constitution IV: scope, proved against a caller who CAN see it ---')
chk('the out-of-scope ticket is absent from the lead\'s queue',
  oldest.tickets.some(t => t._id === outside._id), false)
chk('  absent from the total too — AS-01 covers counts, not just rows',
  oldest.total, oldest.tickets.length)
chk('  and absent from every load row',
  unassigned.load.reduce((n, l) => n + l.open, 0) < 5, true)
// THE PAIR. Without this the check above passes on a queue that returns nothing
// to anybody — the blanket-deny that looks like a working scope predicate.
const rootSees = await queue(root, '?view=oldest')
chk('the SAME ticket IS visible to the unrestricted root',
  rootSees.tickets.some(t => t._id === outside._id), true)
chk('  and Nour, scoped to that other branch, sees it as well',
  (await queue(nour, '?view=oldest')).tickets.some(t => t._id === outside._id), true)
chk('  while Nour cannot see this branch\'s work — the mirror image',
  (await queue(nour, '?view=oldest')).tickets.some(t => t._id === held._id), false)
chk('the payload says the team dimension is missing rather than implying it applied',
  unassigned.scope.teamDimension, false)

console.log('\n--- E-14: a lead with nothing in scope gets an empty queue, not an error ---')
const empty = await queue(kamal, '?view=oldest')
chk('it answers 200 with an empty list',
  (await call('GET', '/ticket/team-queue?view=oldest', { token: kamal })).status, 200)
chk('  no tickets', empty.tickets.length, 0)
chk('  and no load rows invented for people they cannot see',
  empty.load.some(l => l.userId === String(saraId)), false)

console.log('\n--- §9: the auditor reads the queue and changes nothing ---')
const audView = await call('GET', '/ticket/team-queue?view=unassigned', { token: aya })
chk('AUD may VIEW the team queue — §9 says read only, not no access', audView.status, 200)
chk('  and genuinely sees rows', audView.body.tickets.length > 0, true)
const audAssign = await call('PATCH', `/ticket/${low._id}/assign`, {
  token: aya, body: { assignedAgentId: hanaId, reason: 'should be refused' }
})
chk('  but may not assign from it', audAssign.status, 403)
// The pair: the same call from a lead succeeds, so this is not a broken route.
chk('  while the same call from the lead is accepted',
  (await call('PATCH', `/ticket/${low._id}/assign`, {
    token: omar, body: { assignedAgentId: hanaId, reason: 'the pair for the refusal above' }
  })).status, 200)

console.log('\n--- an out-of-scope agentId cannot be used to probe another branch ---')
const nourId = (await call('GET', '/auth/me', { token: nour })).body.user.id
const probe = await queue(omar, `?view=agent&agentId=${nourId}`)
chk('asking for a colleague in another branch returns nothing, not their work',
  probe.tickets.length, 0)

await mongoose.disconnect()
process.exit(checker.report())

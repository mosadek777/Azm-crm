// spec 004 — FR-001 (queue order), FR-002 (counters), FR-019/E-05 (the SLA
// fallback), and 009 E-19 (a period is evaluated in the branch's timezone).
//
// WHAT THIS SUITE IS FOR. The workspace's two claims are both falsifiable and
// neither is obvious from reading the screen:
//
//   1. The queue is ordered by PRIORITY THEN AGE and SAYS SO. E-05 requires
//      exactly that fallback while the SLA clock is unavailable, and requires
//      the screen to state it has fallen back. If the server did not really
//      apply that order, the screen would be telling the agent something
//      untrue about the list in front of them.
//
//   2. A counter AGREES EXACTLY with the list it opens (FR-002). The only way
//      to guarantee that is for both to be the same query, so the checks below
//      compare the counter against the rows rather than against a second
//      calculation that could drift.
//
// Every check fails if its behaviour is removed. The ordering checks in
// particular are written so that the DEFAULT ordering would fail them.

import mongoose from 'mongoose'
import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from './env.js'
import { createChecker } from './check.js'
import { connectMongoose } from '../src/DB/connection.db.js'
import { Ticket } from '../src/DB/models/ticket.model.js'
import { startOfDayIn } from '../src/utils/day-boundary.js'

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
  { name: { ar: 'القاهرة', en: 'Cairo' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' })).branch
const other = (await mk('/platform/branches',
  { name: { ar: 'طوكيو', en: 'Tokyo' }, timezone: 'Asia/Tokyo', defaultLocale: 'en' })).branch
const dept = (await mk('/platform/departments', { name: { ar: 'الدعم', en: 'Support' } })).department

await mk('/user', {
  displayName: 'Sara Ahmed', email: 'ws.sara@azmsquad.com', password: FIXTURE_PASSWORD,
  defaultLanguage: 'en', roles: ['AGT'],
  scope: { branchIds: [branch._id], departmentIds: [dept._id] }
})
await mk('/user', {
  displayName: 'Nour Elsewhere', email: 'ws.nour@azmsquad.com', password: FIXTURE_PASSWORD,
  defaultLanguage: 'en', roles: ['AGT'],
  scope: { branchIds: [other._id], departmentIds: [dept._id] }
})
const sara = await login('ws.sara@azmsquad.com', FIXTURE_PASSWORD)
const nour = await login('ws.nour@azmsquad.com', FIXTURE_PASSWORD)

const cust = (await call('POST', '/customer', {
  token: sara, body: { displayName: 'Queue Fixture', contactPoints: [{ channelType: 'phone', value: '+201005550001' }] }
})).body.customer

const newTicket = async (token, priority, subject) => (await call('POST', '/ticket', {
  token, body: { customerId: cust._id, subject, description: 'fixture', category: 'General', priority }
})).body.ticket

// --- fixtures: four priorities, and two of one priority at different ages ---
const low = await newTicket(sara, 'low', 'Low priority, oldest of all')
const normalOld = await newTicket(sara, 'normal', 'Normal priority, older')
const normalNew = await newTicket(sara, 'normal', 'Normal priority, newer')
const high = await newTicket(sara, 'high', 'High priority')
const urgent = await newTicket(sara, 'urgent', 'Urgent priority')

// Age them through the RAW DRIVER: createdAt is set by mongoose timestamps and
// is not writable through the model. Ordering by age cannot be tested against
// five tickets created in the same second.
const age = async (id, daysAgo) => {
  await Ticket.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(String(id)) },
    { $set: { createdAt: new Date(Date.now() - daysAgo * 86400000) } }
  )
}
await age(low._id, 9)          // oldest overall, lowest priority
await age(normalOld._id, 5)
await age(normalNew._id, 1)
await age(high._id, 3)
await age(urgent._id, 2)

console.log('\n--- 004 E-05: the queue falls back to PRIORITY THEN AGE ---')
const urgencyList = await call('GET', '/ticket?sort=urgency&limit=100', { token: sara })
const order = urgencyList.body.tickets.map(t => t.subject)
console.log('      ' + order.map((s, i) => `${i + 1}. ${s}`).join('\n      '))

chk('urgent comes first', order[0], 'Urgent priority')
chk('then high', order[1], 'High priority')
chk('then the OLDER of the two normals', order[2], 'Normal priority, older')
chk('then the newer normal', order[3], 'Normal priority, newer')
chk('and low last, despite being the oldest ticket of all', order[4], 'Low priority, oldest of all')

// THE MUTATION CHECK. If `sort=urgency` were ignored, the default ordering
// would answer — and the default is newest-first, which puts the newest normal
// first and would fail every line above. Asserting the two orders DIFFER is
// what stops this suite passing against a server that dropped the parameter.
const defaultList = await call('GET', '/ticket?limit=100', { token: sara })
const defaultOrder = defaultList.body.tickets.map(t => t.subject)
chk('the default ordering is genuinely different', JSON.stringify(order) === JSON.stringify(defaultOrder), false)
chk('  and the default is newest first', defaultOrder[0], 'Normal priority, newer')

console.log('\n--- E-05: the server SAYS which order it applied ---')
// The screen must state that it fell back. It can only say so truthfully if
// the server tells it, so this is where the statement comes from.
chk('the urgency query reports the fallback', urgencyList.body.ordering?.applied, 'priority_then_age')
chk('  and names why it fell back', urgencyList.body.ordering?.reason, 'sla_unavailable')
chk('the default query does NOT claim a fallback', defaultList.body.ordering?.applied, 'newest_first')
chk('  and claims no reason', defaultList.body.ordering?.reason, null)

console.log('\n--- FR-019 / constitution III: still no duration is computed ---')
chk('every row carries the SLA envelope, not a number',
  urgencyList.body.tickets.every(t => t.sla?.status === 'unavailable'), true)
chk('  and no row carries a minutes value',
  urgencyList.body.tickets.some(t => typeof t.sla?.minutes === 'number'), false)

console.log('\n--- 004 FR-002: "resolved today" ---')
// Resolve two, then REOPEN one of them. The reopened ticket must drop out:
// "resolved today" answers "how many did I finish today", and one that is open
// again has not been finished.
const resolve = async (t) => call('PATCH', `/ticket/${t._id}/status`, {
  token: sara, body: { status: 'in_progress', reason: 'working' }
}).then(() => call('PATCH', `/ticket/${t._id}/status`, {
  token: sara, body: { status: 'resolved', reason: 'done' }
}))
await resolve(urgent)
await resolve(high)
chk('two tickets are now resolved',
  (await call('GET', '/ticket?status=resolved&limit=100', { token: sara })).body.total, 2)

await call('PATCH', `/ticket/${high._id}/status`, { token: sara, body: { status: 'in_progress', reason: 'reopened' } })

const today = await call('GET', '/ticket?resolvedToday=true&limit=100', { token: sara })
chk('only the one still resolved counts', today.body.total, 1)
chk('  and it is the right one', today.body.tickets[0]?.subject, 'Urgent priority')
chk('the reopened ticket is absent',
  today.body.tickets.some(t => t._id === high._id), false)

// FR-002: "each MUST be openable as its own list and MUST agree exactly with
// that list". Both come from this one query, so they cannot drift — and this
// is the check that would catch it if a second calculation were ever added.
chk('the COUNTER equals the number of rows it opens',
  today.body.total, today.body.tickets.length)

console.log('\n--- 009 E-19: the period is evaluated in the BRANCH timezone ---')
chk('the response names the timezone it used',
  JSON.stringify(today.body.timezonesUsed), '["Africa/Cairo"]')
chk('  which is the branch\'s own, not the server\'s',
  today.body.timezonesUsed.includes(branch.timezone), true)
// Not vacuous: the two branches in this suite are in genuinely different zones,
// so a server-timezone implementation would be visible here.
chk('  and the other branch is in a DIFFERENT zone, so this is a real answer',
  other.timezone !== branch.timezone, true)

// A ticket resolved BEFORE today must not count. Aged directly, for the same
// reason createdAt was: the audit entry's occurredAt is server-assigned.
const { AuditEntry } = await import('../src/DB/models/audit-entry.model.js')
await AuditEntry.collection.updateMany(
  { entityId: new mongoose.Types.ObjectId(String(urgent._id)), 'after.status': 'resolved' },
  { $set: { occurredAt: new Date(startOfDayIn('Africa/Cairo').getTime() - 3600_000) } }
)
const afterAgeing = await call('GET', '/ticket?resolvedToday=true&limit=100', { token: sara })
chk('a ticket resolved YESTERDAY drops out of the count', afterAgeing.body.total, 0)
chk('  while it is still resolved, so the filter is about WHEN, not status',
  (await call('GET', '/ticket?status=resolved&limit=100', { token: sara })).body.total, 1)

console.log('\n--- constitution IV: scope still bounds all of it ---')
// The other agent is in another branch. Every count above must be invisible to
// them — AS-01: an out-of-scope ticket appears in "no list, search, count or
// aggregate". Compared against a caller who CAN see them, never against a
// second restricted caller.
const mine = await call('GET', '/ticket?sort=urgency&limit=100', { token: sara })
const theirs = await call('GET', '/ticket?sort=urgency&limit=100', { token: nour })
chk('the in-scope agent sees the fixtures', mine.body.total >= 5, true)
chk('the out-of-scope agent sees none of them', theirs.body.total, 0)
chk('  and their resolved-today count is zero too',
  (await call('GET', '/ticket?resolvedToday=true&limit=100', { token: nour })).body.total, 0)
chk('  with no timezone leaked from a branch they cannot see',
  JSON.stringify((await call('GET', '/ticket?resolvedToday=true&limit=100', { token: nour })).body.timezonesUsed),
  '[]')

await mongoose.disconnect()
process.exit(checker.report())

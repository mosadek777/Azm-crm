// spec 004 FR-004, FR-005 (task half), E-09, AS-05; §9, §10, §11.
//
// THE TWO CLAIMS WORTH PROVING, because both are easy to get subtly wrong:
//
//   1. E-09 — a PAST due date is ACCEPTED, not refused. A validator added
//      later "for safety" would break the normal case of recording a follow-up
//      you already owe, and nothing else would notice.
//
//   2. AS-05's TWO BOUNDARIES. "A task due tomorrow at 10:00 with a 2-hour
//      reminder ... when 08:00 arrives, the agent is notified ... AND THE TASK
//      APPEARS IN THE OVERDUE COUNT ONLY AFTER 10:00." A task between those
//      two moments is due-soon, NOT late — and an implementation that collapses
//      them passes any check that only asks whether a reminder appeared.
//
// The reminder evaluation is exercised as a PURE FUNCTION as well as over HTTP,
// because that purity is the thing that lets the SLA engine's scheduler call it
// later without this module changing.

import mongoose from 'mongoose'
import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from './env.js'
import { createChecker } from './check.js'
import { connectMongoose } from '../src/DB/connection.db.js'
import { Task } from '../src/DB/models/task.model.js'
import { AuditEntry } from '../src/DB/models/audit-entry.model.js'
import { dueReminders } from '../src/modules/task/task.service.js'
import { TASK_POLICY } from '../src/config/task-policy.js'

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

await mk('/user', { displayName: 'Sara Ahmed', email: 't.sara@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope })
await mk('/user', { displayName: 'Hana Agent', email: 't.hana@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope })
await mk('/user', { displayName: 'Omar Lead', email: 't.omar@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['LEAD'], scope })
await mk('/user', { displayName: 'Nour Elsewhere', email: 't.nour@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: { branchIds: [other._id], departmentIds: [dept._id] } })
await mk('/user', { displayName: 'Aya Audit', email: 't.aya@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AUD'], scope })

const sara = await login('t.sara@azmsquad.com', FIXTURE_PASSWORD)
const hana = await login('t.hana@azmsquad.com', FIXTURE_PASSWORD)
const omar = await login('t.omar@azmsquad.com', FIXTURE_PASSWORD)
const nour = await login('t.nour@azmsquad.com', FIXTURE_PASSWORD)
const aya = await login('t.aya@azmsquad.com', FIXTURE_PASSWORD)

const saraId = (await call('GET', '/auth/me', { token: sara })).body.user.id
const hanaId = (await call('GET', '/auth/me', { token: hana })).body.user.id

const customer = (await call('POST', '/customer', {
  token: sara,
  body: { displayName: 'Layla Mansour', contactPoints: [{ channelType: 'email', value: `task.${Date.now()}@example.com` }] }
})).body.customer
const ticket = (await call('POST', '/ticket', {
  token: sara,
  body: { customerId: customer._id, subject: 'Refund chase', description: 'fixture', category: 'Billing', priority: 'normal' }
})).body.ticket

const HOUR = 3600_000

console.log('\n--- FR-004: create a task with a due date and body ---')
const made = await call('POST', `/ticket/${ticket._id}/task`, {
  token: sara,
  body: { body: 'Ring the customer back about the refund', dueAt: new Date(Date.now() + 24 * HOUR) }
})
chk('it is created', made.status, 201)
chk('  attached to the ticket — §3, a task never floats free',
  String(made.body.task.ticketId), String(ticket._id))
chk('  owned by the caller when no owner is named', String(made.body.task.ownerId), String(saraId))
chk('  and open', made.body.task.state, 'open')
chk('  the body is stored as written, single language (§8)',
  made.body.task.body, 'Ring the customer back about the refund')
chk('an audit entry was written in the same transaction (constitution II)',
  await AuditEntry.countDocuments({ action: 'task.created' }), 1)
const entry = await AuditEntry.findOne({ action: 'task.created' })
chk('  §10: it carries ticket, owner, due at and outcome',
  !!entry.after?.ticketId && !!entry.after?.ownerId && !!entry.after?.dueAt && !!entry.after?.outcome, true)

console.log('\n--- FR-004: body and dueAt are both required ---')
chk('no body is refused',
  (await call('POST', `/ticket/${ticket._id}/task`, { token: sara, body: { dueAt: new Date() } })).status, 400)
chk('no dueAt is refused',
  (await call('POST', `/ticket/${ticket._id}/task`, { token: sara, body: { body: 'x' } })).status, 400)
chk('a nonsense date is refused',
  (await call('POST', `/ticket/${ticket._id}/task`, { token: sara, body: { body: 'x', dueAt: 'tomorrowish' } })).status, 400)

console.log('\n--- E-09: a PAST due date is ACCEPTED, not refused ---')
// The check that stops somebody adding a "helpful" validator later.
const past = await call('POST', `/ticket/${ticket._id}/task`, {
  token: sara,
  body: { body: 'Follow-up I already owe', dueAt: new Date(Date.now() - 48 * HOUR) }
})
chk('it is accepted', past.status, 201)
chk('  and it is immediately overdue',
  (await call('GET', '/task/mine', { token: sara })).body.reminders.some(r => r._id === past.body.task._id && r.overdue), true)

console.log('\n--- AS-05: the TWO boundaries, as a pure function ---')
// Built as plain objects, so this is about the rule and not about the database.
const at10 = new Date('2026-10-01T10:00:00Z')
const task10 = { state: 'open', dueAt: at10, remindBeforeMinutes: 120 }

const sevenFiftyNine = new Date('2026-10-01T07:59:00Z')
const eight = new Date('2026-10-01T08:00:00Z')
const nine = new Date('2026-10-01T09:00:00Z')
const exactlyTen = new Date('2026-10-01T10:00:00Z')
const tenOhOne = new Date('2026-10-01T10:01:00Z')

chk('at 07:59 — nothing yet, the reminder has not opened', dueReminders([task10], sevenFiftyNine).length, 0)
chk('at 08:00 — the reminder opens, exactly as AS-05 says',
  dueReminders([task10], eight).length, 1)
chk('  and it is REMINDING, not overdue', dueReminders([task10], eight)[0].overdue, false)
chk('at 09:00 — still reminding, still not late', dueReminders([task10], nine)[0].overdue, false)
// THE BOUNDARY THAT CATCHES A COLLAPSED IMPLEMENTATION.
chk('at exactly 10:00 — STILL not overdue; AS-05 says "only AFTER 10:00"',
  dueReminders([task10], exactlyTen)[0].overdue, false)
chk('at 10:01 — now overdue', dueReminders([task10], tenOhOne)[0].overdue, true)

console.log('\n--- the default lead time, where §3 has no user preference to read ---')
const noLead = { state: 'open', dueAt: at10, remindBeforeMinutes: null }
const defaultMins = TASK_POLICY.defaultRemindBeforeMinutes.value
chk('the default is configured, not hard-coded', defaultMins, 120)
chk('  and marked unratified, like every other number no requirement fixes',
  TASK_POLICY.defaultRemindBeforeMinutes.ratified, false)
chk('a task with no lead time uses it',
  dueReminders([noLead], new Date(at10.getTime() - defaultMins * 60000)).length, 1)
chk('  and not a minute sooner',
  dueReminders([noLead], new Date(at10.getTime() - (defaultMins + 1) * 60000)).length, 0)

console.log('\n--- a CLOSED task is never a reminder ---')
chk('done tasks are ignored', dueReminders([{ ...task10, state: 'done' }], tenOhOne).length, 0)
chk('cancelled tasks are ignored', dueReminders([{ ...task10, state: 'cancelled' }], tenOhOne).length, 0)
// Paired, so the filter is not simply rejecting everything.
chk('  while the open one is still returned', dueReminders([task10], tenOhOne).length, 1)

console.log('\n--- §9: creating a task FOR A COLLEAGUE needs a lead ---')
chk('an AGENT is refused',
  (await call('POST', `/ticket/${ticket._id}/task`, {
    token: sara, body: { body: 'yours now', dueAt: new Date(Date.now() + HOUR), ownerId: hanaId }
  })).status, 403)
const byLead = await call('POST', `/ticket/${ticket._id}/task`, {
  token: omar, body: { body: 'Please chase this', dueAt: new Date(Date.now() + HOUR), ownerId: hanaId }
})
chk('a LEAD is allowed', byLead.status, 201)
chk('  and the task belongs to the colleague, not the lead',
  String(byLead.body.task.ownerId), String(hanaId))
chk('  while recording who created it', String(byLead.body.task.createdBy) !== String(hanaId), true)
// Paired: the agent is not blocked from tasks altogether.
chk('  and the same AGENT may still create their OWN',
  (await call('POST', `/ticket/${ticket._id}/task`, {
    token: sara, body: { body: 'mine', dueAt: new Date(Date.now() + HOUR) }
  })).status, 201)
chk('an unknown owner is refused',
  (await call('POST', `/ticket/${ticket._id}/task`, {
    token: omar, body: { body: 'x', dueAt: new Date(), ownerId: new mongoose.Types.ObjectId().toString() }
  })).status, 400)

console.log('\n--- /task/mine is MINE, and scope still bounds it ---')
const mineSara = (await call('GET', '/task/mine', { token: sara })).body
const mineHana = (await call('GET', '/task/mine', { token: hana })).body
chk('Sara sees her own', mineSara.tasks.every(t => String(t.ownerId) === String(saraId)), true)
chk('  and not the one the lead gave Hana',
  mineSara.tasks.some(t => t._id === byLead.body.task._id), false)
chk('Hana sees the task made FOR her',
  mineHana.tasks.some(t => t._id === byLead.body.task._id), true)
chk('the out-of-scope agent sees none of it',
  (await call('GET', '/task/mine', { token: nour })).body.tasks.length, 0)
chk('  and cannot create one on that ticket — 404, not 403',
  (await call('POST', `/ticket/${ticket._id}/task`, {
    token: nour, body: { body: 'x', dueAt: new Date() }
  })).status, 404)
chk('an AUDITOR gets no task routes at all — 002 §9, change-nothing',
  (await call('GET', '/task/mine', { token: aya })).status, 403)
chk('  but can still READ the ticket\'s tasks, being able to read the ticket',
  (await call('GET', `/ticket/${ticket._id}/task`, { token: aya })).status, 200)

console.log('\n--- the response SAYS reminders are evaluated on request ---')
// Nothing runs when nobody is looking, and the API says so as plainly as the
// screen does — an integrator reading this gets the same warning the agent does.
chk('the evaluation mode is declared', mineSara.evaluation, 'on_request')
chk('  with the instant it was computed', typeof mineSara.evaluatedAt, 'string')

console.log('\n--- FR-004: complete and cancel ---')
const mineId = made.body.task._id
const done = await call('PATCH', `/task/${mineId}/complete`, { token: sara })
chk('completing works', done.status, 200)
chk('  the state moved', done.body.task.state, 'done')
chk('  and closedAt was set', !!done.body.task.closedAt, true)
chk('  §10 recorded the outcome',
  (await AuditEntry.findOne({ action: 'task.completed' }))?.after?.outcome, 'done')
chk('completing it twice is refused, not silently repeated',
  (await call('PATCH', `/task/${mineId}/complete`, { token: sara })).status, 409)
chk('  and it leaves /task/mine, being closed',
  (await call('GET', '/task/mine', { token: sara })).body.tasks.some(t => t._id === mineId), false)

const toCancel = (await call('POST', `/ticket/${ticket._id}/task`, {
  token: sara, body: { body: 'Not needed after all', dueAt: new Date(Date.now() + HOUR) }
})).body.task
chk('cancelling works', (await call('PATCH', `/task/${toCancel._id}/cancel`, { token: sara })).status, 200)
chk('  and is audited as its own event',
  await AuditEntry.countDocuments({ action: 'task.cancelled' }), 1)
chk('  the record still EXISTS — closed, not deleted',
  await Task.countDocuments({ _id: toCancel._id }), 1)

console.log('\n--- a colleague\'s task is not yours to close ---')
chk('an AGENT cannot complete a task owned by somebody else',
  (await call('PATCH', `/task/${byLead.body.task._id}/complete`, { token: sara })).status, 403)
chk('  the OWNER can', (await call('PATCH', `/task/${byLead.body.task._id}/complete`, { token: hana })).status, 200)

await mongoose.disconnect()
process.exit(checker.report())

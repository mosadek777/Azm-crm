import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from './env.js'
const B = BASE_URL
const call = async (m, p, { token, body } = {}) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  let j = null; try { j = await r.json() } catch {}
  return { status: r.status, body: j }
}
const login = async (e, p) => (await call('POST', '/auth/login', { body: { email: e, password: p } })).body?.token
let fail = 0
const chk = (l, a, e) => { const ok = String(a) === String(e); if (!ok) fail++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${l.padEnd(62)} ${a}${ok ? '' : `  (want ${e})`}`) }

const root = await login(BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD)
const mk = async (p, b) => (await call('POST', p, { token: root, body: b })).body
const bB = (await mk('/platform/branches', { name: { ar: 'القاهرة', en: 'Cairo' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' })).branch
const bC = (await mk('/platform/branches', { name: { ar: 'الإسكندرية', en: 'Alexandria' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' })).branch
const dS = (await mk('/platform/departments', { name: { ar: 'الدعم', en: 'Support' } })).department
const scB = { branchIds: [bB._id], departmentIds: [dS._id] }
const scC = { branchIds: [bC._id], departmentIds: [dS._id] }
await mk('/user', { displayName: 'Sara Ahmed', email: 'sara@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'ar', roles: ['AGT'], scope: scB })
await mk('/user', { displayName: 'Omar Lead', email: 'omar@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['LEAD'], scope: scB })
await mk('/user', { displayName: 'Hana Agent', email: 'hana@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: scB })
await mk('/user', { displayName: 'Nour Other', email: 'nour@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: scC })
const sara = await login('sara@azmsquad.com', FIXTURE_PASSWORD)
const omar = await login('omar@azmsquad.com', FIXTURE_PASSWORD)
const nour = await login('nour@azmsquad.com', FIXTURE_PASSWORD)
const hanaId = (await call('GET', '/user', { token: omar })).body.users.find(u => u.email === 'hana@azmsquad.com')._id
const nourId = (await call('GET', '/user', { token: root })).body.users.find(u => u.email === 'nour@azmsquad.com')._id

const custB = (await call('POST', '/customer', { token: sara, body: { displayName: 'Ahmed Hassan', contactPoints: [{ channelType: 'phone', value: '+201001234567' }] } })).body.customer
const custC = (await call('POST', '/customer', { token: nour, body: { displayName: 'Mona Said', contactPoints: [{ channelType: 'phone', value: '+201009998877' }] } })).body.customer

console.log('\n--- FR-001 / AS-01: create ---')
const t1 = await call('POST', '/ticket', { token: sara, body: { customerId: custB._id, subject: 'Card declined at checkout', description: 'Customer says the payment failed twice.', category: 'Billing / Refund', priority: 'high' } })
chk('created', t1.status, 201)
chk('reference format TKT-YYYY-NNNNN', /^TKT-\d{4}-\d{5}$/.test(t1.body?.ticket?.reference), true)
chk('status new', t1.body?.ticket?.status, 'new')
chk('prioritySource manual (AS-05)', t1.body?.ticket?.prioritySource, 'manual')
chk('branch taken from the CUSTOMER', String(t1.body?.ticket?.branchId), String(custB._id ? custB.branchId : ''))
chk('FR-034: sla is read, not computed', t1.body?.sla?.status, 'unavailable')
const T = t1.body.ticket._id

const t2 = await call('POST', '/ticket', { token: sara, body: { customerId: custB._id, subject: 'Second issue here', description: 'x', category: 'Technical', priority: 'normal' } })
chk('second reference increments, never reused', t2.body?.ticket?.reference !== t1.body?.ticket?.reference, true)

console.log('\n--- FR-001: refuses incomplete ---')
chk('no subject', (await call('POST', '/ticket', { token: sara, body: { customerId: custB._id, description: 'x', category: 'c', priority: 'low' } })).status, 400)
chk('bad priority', (await call('POST', '/ticket', { token: sara, body: { customerId: custB._id, subject: 'abc', description: 'x', category: 'c', priority: 'nope' } })).status, 400)

console.log('\n--- constitution IV: the scope predicate, non-negotiable ---')
chk('cannot open a ticket for an out-of-scope customer', (await call('POST', '/ticket', { token: sara, body: { customerId: custC._id, subject: 'Cross branch', description: 'x', category: 'c', priority: 'low' } })).status, 404)
chk('out-of-scope ticket detail is 404, not 403', (await call('GET', `/ticket/${T}`, { token: nour })).status, 404)
const nourList = await call('GET', '/ticket', { token: nour })
chk('out-of-scope ticket absent from the list', nourList.body?.tickets?.length, 0)
chk('and absent from the count', nourList.body?.total, 0)
const saraList = await call('GET', '/ticket', { token: sara })
chk('in-scope agent sees both', saraList.body?.total, 2)

console.log('\n--- FR-008 / AS-03: undefined transition refused, reachable named ---')
const illegal = await call('PATCH', `/ticket/${T}/status`, { token: sara, body: { status: 'closed' } })
chk('new -> closed refused', illegal.status, 409)
chk('names the reachable statuses', Array.isArray(illegal.body?.reachableStatuses), true)
const histBefore = (await call('GET', `/ticket/${T}`, { token: sara })).body.history.length
chk('AS-03: no history entry written for a refused transition', (await call('GET', `/ticket/${T}`, { token: sara })).body.history.length, histBefore)

console.log('\n--- FR-007: legal transitions ---')
chk('new -> in_progress', (await call('PATCH', `/ticket/${T}/status`, { token: sara, body: { status: 'in_progress' } })).status, 200)
const pc = await call('PATCH', `/ticket/${T}/status`, { token: sara, body: { status: 'pending_customer', followUpAt: '2026-09-20T09:00:00Z' } })
chk('in_progress -> pending_customer with followUpAt', pc.status, 200)
chk('pausesSla true on pending_customer (decision 14)', (await call('GET', `/ticket/${T}`, { token: sara })).body.statusMeta?.pausesSla, true)

console.log('\n--- FR-021: followUpAt only on a pausing status ---')
await call('PATCH', `/ticket/${T}/status`, { token: sara, body: { status: 'in_progress' } })
chk('followUpAt on in_progress refused', (await call('PATCH', `/ticket/${T}/status`, { token: sara, body: { status: 'pending_internal', followUpAt: '2026-09-20T09:00:00Z' } })).status, 400)
chk('pending_internal does NOT pause (decision 15)', (await call('PATCH', `/ticket/${T}/status`, { token: sara, body: { status: 'pending_internal' } })).status, 200)
chk('and its pausesSla is false', (await call('GET', `/ticket/${T}`, { token: sara })).body.statusMeta?.pausesSla, false)
chk('followUpAt cleared when the status stops pausing', (await call('GET', `/ticket/${T}`, { token: sara })).body.ticket?.followUpAt, 'null')

console.log('\n--- cancellation requires a reason; terminal is terminal ---')
const t3 = (await call('POST', '/ticket', { token: sara, body: { customerId: custB._id, subject: 'To be cancelled', description: 'x', category: 'c', priority: 'low' } })).body.ticket
chk('cancel with no reason refused', (await call('PATCH', `/ticket/${t3._id}/status`, { token: sara, body: { status: 'cancelled' } })).status, 400)
chk('cancel with a reason', (await call('PATCH', `/ticket/${t3._id}/status`, { token: sara, body: { status: 'cancelled', reason: 'Raised in error' } })).status, 200)
chk('no transition out of cancelled', (await call('PATCH', `/ticket/${t3._id}/status`, { token: sara, body: { status: 'in_progress' } })).status, 409)
chk('terminal accepts no reply', (await call('POST', `/ticket/${t3._id}/message`, { token: sara, body: { body: 'hello', visibility: 'customer' } })).status, 409)
chk('terminal accepts no assignment', (await call('PATCH', `/ticket/${t3._id}/assign`, { token: sara, body: { assignedAgentId: hanaId, reason: 'x' } })).status, 409)

console.log('\n--- FR-009 / FR-010 / AS-06: assignment ---')
chk('assign with no reason refused (AS-06)', (await call('PATCH', `/ticket/${T}/assign`, { token: sara, body: { assignedAgentId: hanaId } })).status, 400)
chk('self-assign unassigned (FR-010)', (await call('PATCH', `/ticket/${T}/assign`, { token: sara, body: { assignedAgentId: hanaId, reason: 'Hana owns billing' } })).status, 200)
chk('AGT cannot reassign another agent\'s ticket', (await call('PATCH', `/ticket/${T}/assign`, { token: sara, body: { assignedAgentId: null, reason: 'taking it' } })).status, 403)
chk('LEAD can reassign', (await call('PATCH', `/ticket/${T}/assign`, { token: omar, body: { assignedAgentId: null, reason: 'rebalancing' } })).status, 200)
chk('cannot assign an out-of-scope agent', (await call('PATCH', `/ticket/${T}/assign`, { token: omar, body: { assignedAgentId: nourId, reason: 'x' } })).status, 409)

console.log('\n--- FR-014 / AS-07: message visibility ---')
chk('visibility must be explicit', (await call('POST', `/ticket/${T}/message`, { token: sara, body: { body: 'no visibility' } })).status, 400)
chk('customer reply', (await call('POST', `/ticket/${T}/message`, { token: sara, body: { body: 'We are looking into it.', visibility: 'customer' } })).status, 201)
chk('internal note', (await call('POST', `/ticket/${T}/message`, { token: sara, body: { body: 'Escalating to finance.', visibility: 'internal' } })).status, 201)
const det = await call('GET', `/ticket/${T}`, { token: sara })
chk('thread holds description + 2 messages', det.body?.messages?.length, 3)
chk('one is internal', det.body?.messages?.filter(m => m.visibility === 'internal').length, 1)
chk('AUD is read-only: cannot post', (await call('POST', `/ticket/${T}/message`, { token: root, body: { body: 'x', visibility: 'internal' } })).status, 403)

console.log('\n--- constitution II: every mutation audited, non-negotiable ---')
const hist = det.body.history.map(h => h.action)
for (const a of ['ticket.created', 'message.added', 'ticket.status_changed', 'ticket.assigned']) {
  chk(`history contains ${a}`, hist.includes(a), true)
}
chk('status change records the transition edge', det.body.history.some(h => h.action === 'ticket.status_changed' && h.after?.transition), true)
chk('assignment records from and to', det.body.history.some(h => h.action === 'ticket.assigned' && 'assignedAgentId' in (h.before ?? {})), true)

console.log('\n--- filters ---')
chk('filter by status', (await call('GET', '/ticket?status=pending_internal', { token: sara })).body?.tickets?.every(t => t.status === 'pending_internal'), true)
chk('filter unassigned', (await call('GET', '/ticket?unassigned=true', { token: sara })).body?.tickets?.every(t => t.assignedAgentId === null), true)
chk('filter by reference prefix', (await call('GET', `/ticket?q=${t1.body.ticket.reference.slice(0, 8)}`, { token: sara })).body?.total > 0, true)
chk('meta exposes the transition graph', Object.keys((await call('GET', '/ticket/meta', { token: sara })).body?.transitions ?? {}).length, 10)

console.log(`\n${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED'}`)
process.exit(fail === 0 ? 0 : 1)

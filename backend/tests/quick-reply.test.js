// spec 004 FR-006, FR-007; decision 41. Quick replies.
//
// WHAT MAKES THIS WORTH A SUITE. FR-006's hard clause is "MUST REFUSE rather
// than insert an unresolved placeholder", and a refusal is exactly the kind of
// behaviour that passes by accident: a resolver that silently left `{{x}}` in
// the text would satisfy any check that only asked whether a body came back.
// So every refusal below is paired with a success on the same path, and the
// substitution checks assert the token is GONE as well as the value present.

import mongoose from 'mongoose'
import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from './env.js'
import { createChecker } from './check.js'
import { connectMongoose } from '../src/DB/connection.db.js'
import { QuickReply } from '../src/DB/models/quick-reply.model.js'
import { AuditEntry } from '../src/DB/models/audit-entry.model.js'
import { PLACEHOLDER_TOKENS, resolvePlaceholders } from '../src/config/placeholders.js'

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
  { name: { ar: 'فرع القاهرة', en: 'Cairo branch' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' })).branch
const otherBranch = (await mk('/platform/branches',
  { name: { ar: 'فرع بعيد', en: 'Far branch' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' })).branch
const dept = (await mk('/platform/departments', { name: { ar: 'قسم الدعم', en: 'Support desk' } })).department

const scope = { branchIds: [branch._id], departmentIds: [dept._id] }
await mk('/user', { displayName: 'Sara Ahmed', email: 'qr.sara@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'ar', roles: ['AGT'], scope })
await mk('/user', { displayName: 'Omar Lead', email: 'qr.omar@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['LEAD'], scope })
await mk('/user', { displayName: 'Hana Agent', email: 'qr.hana@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope })
await mk('/user', { displayName: 'Nour Elsewhere', email: 'qr.nour@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: { branchIds: [otherBranch._id], departmentIds: [dept._id] } })

const sara = await login('qr.sara@azmsquad.com', FIXTURE_PASSWORD)
const omar = await login('qr.omar@azmsquad.com', FIXTURE_PASSWORD)
const hana = await login('qr.hana@azmsquad.com', FIXTURE_PASSWORD)
const nour = await login('qr.nour@azmsquad.com', FIXTURE_PASSWORD)

// An ENGLISH-preferring customer, deliberately: the agent Sara reads Arabic, so
// the language check below is about the CUSTOMER's preference and not hers.
const customer = (await call('POST', '/customer', {
  token: sara,
  body: {
    displayName: 'Layla Mansour', preferredLanguage: 'en',
    contactPoints: [{ channelType: 'email', value: `qr.${Date.now()}@example.com` }]
  }
})).body.customer

const ticket = (await call('POST', '/ticket', {
  token: sara,
  body: {
    customerId: customer._id, subject: 'Refund not received',
    description: 'fixture', category: 'Billing', priority: 'high'
  }
})).body.ticket

console.log('\n--- decision 41: the vocabulary is served, not copied ---')
const vocab = await call('GET', '/quick-reply/placeholders', { token: sara })
chk('the endpoint answers', vocab.status, 200)
chk('it lists exactly the six tokens of decision 41',
  JSON.stringify(vocab.body.placeholders.map(p => p.token).sort()),
  JSON.stringify(['agent.name', 'branch.name', 'customer.name', 'department.name', 'ticket.reference', 'ticket.subject']))
chk('  which is the same list the resolver uses',
  JSON.stringify(vocab.body.placeholders.map(p => p.token).sort()),
  JSON.stringify([...PLACEHOLDER_TOKENS].sort()))
chk('each token carries both languages for an editor to show',
  vocab.body.placeholders.every(p => p.label?.ar && p.label?.en), true)
chk('the syntax is published too', vocab.body.syntax, '{{token}}')
// Decision 41's shaping rule, asserted rather than trusted: nothing here can
// resolve to "unavailable".
chk('NOTHING in the vocabulary is a blocked value',
  vocab.body.placeholders.some(p => /sla|entitlement|segment|tier/i.test(p.token)), false)

console.log('\n--- constitution I: both languages, or no record ---')
const oneLang = await call('POST', '/quick-reply', {
  token: sara,
  body: { name: { ar: 'ترحيب', en: 'Greeting' }, body: { en: 'Hello' }, scope: 'personal' }
})
chk('a body with only English is refused', oneLang.status, 400)
chk('  and the refusal names the field', JSON.stringify(oneLang.body?.fields), '["body"]')
chk('  in both languages',
  typeof oneLang.body?.message?.ar === 'string' && typeof oneLang.body?.message?.en === 'string', true)

console.log('\n--- FR-006: an unknown placeholder is refused AT AUTHORING TIME ---')
// Better than discovering it when somebody tries to use the template.
const bad = await call('POST', '/quick-reply', {
  token: sara,
  body: {
    name: { ar: 'خطأ', en: 'Bad' },
    body: { ar: 'مرحبا {{customer.tier}}', en: 'Hello {{customer.tier}} and {{nonsense}}' },
    scope: 'personal'
  }
})
chk('a template with unknown tokens is refused', bad.status, 400)
chk('  and the refusal NAMES each bad token, not just that one exists',
  JSON.stringify(bad.body?.unknownPlaceholders?.sort()), '["customer.tier","nonsense"]')
chk('  and offers the allowed list to fix it with',
  Array.isArray(bad.body?.allowedPlaceholders) && bad.body.allowedPlaceholders.length === 6, true)
chk('  nothing was stored', await QuickReply.countDocuments({ 'name.en': 'Bad' }), 0)

console.log('\n--- FR-006: a good template saves, and is audited (constitution II) ---')
const before = await AuditEntry.countDocuments({ action: 'quick_reply.created' })
const good = await call('POST', '/quick-reply', {
  token: sara,
  body: {
    name: { ar: 'رد الاسترداد', en: 'Refund reply' },
    body: {
      ar: 'مرحبا {{customer.name}}، بخصوص {{ticket.reference}} — {{agent.name}} من {{branch.name}}.',
      en: 'Hello {{customer.name}}, about {{ticket.reference}} — {{agent.name}} of {{branch.name}}.'
    },
    scope: 'personal'
  }
})
chk('it is created', good.status, 201)
chk('  with both languages stored',
  !!good.body?.quickReply?.body?.ar && !!good.body?.quickReply?.body?.en, true)
chk('  owned by its author', String(good.body?.quickReply?.ownerId), String((await call('GET', '/auth/me', { token: sara })).body.user.id))
chk('  and an audit entry was written in the same transaction',
  await AuditEntry.countDocuments({ action: 'quick_reply.created' }), before + 1)

console.log('\n--- FR-006: insertion selects by the CUSTOMER\'s language ---')
const rendered = await call('POST', `/quick-reply/${good.body.quickReply._id}/render`, {
  token: sara, body: { ticketId: ticket._id }
})
chk('it renders', rendered.status, 200)
// Sara's own defaultLanguage is 'ar'. The customer's is 'en'. The customer wins.
chk('the ENGLISH body was chosen, because the CUSTOMER prefers English', rendered.body.language, 'en')
chk('  and it says that is why', rendered.body.languageFrom, 'customer_preference')
chk('  the agent\'s own language did not decide it',
  (await call('GET', '/auth/me', { token: sara })).body.user.defaultLanguage, 'ar')

console.log('\n--- FR-006: every placeholder is actually substituted ---')
chk('the customer name is in the text', rendered.body.body.includes('Layla Mansour'), true)
chk('the ticket reference is in the text', rendered.body.body.includes(ticket.reference), true)
chk('the SENDING agent is named — decision 41, not the assignee',
  rendered.body.body.includes('Sara Ahmed'), true)
chk('the branch name is in the READER\'s language', rendered.body.body.includes('Cairo branch'), true)
// The check that catches a resolver which returns the template untouched.
chk('and NO token survives in the output', /\{\{/.test(rendered.body.body), false)

console.log('\n--- decision 41: agent.name is the SENDER, not the assignee ---')
// Assign the ticket to Hana, then have Sara render it. Sara is sending.
await call('PATCH', `/ticket/${ticket._id}/assign`, {
  token: omar,
  body: { assignedAgentId: (await call('GET', '/user', { token: omar })).body.users.find(u => u.email === 'qr.hana@azmsquad.com')._id, reason: 'for the test' }
})
const bySara = await call('POST', `/quick-reply/${good.body.quickReply._id}/render`, {
  token: sara, body: { ticketId: ticket._id }
})
chk('the ticket is assigned to Hana',
  (await call('GET', `/ticket/${ticket._id}`, { token: omar })).body.assignedAgent?.displayName, 'Hana Agent')
chk('but Sara rendering it gets SARA\'s name', bySara.body.body.includes('Sara Ahmed'), true)
chk('  and not the assignee\'s', bySara.body.body.includes('Hana Agent'), false)

console.log('\n--- FR-006: THE REFUSAL. A body is never partly substituted ---')
// A placeholder that cannot resolve. Forced by removing the value it reads
// rather than by inventing a token, so this exercises the `no_value` branch
// that a real missing record would take.
const unresolved = resolvePlaceholders('Hello {{customer.name}} about {{ticket.reference}}', {
  customer: null,
  ticket: { reference: 'TKT-2026-00001' }
})
chk('the resolver refuses', unresolved.ok, false)
chk('  and names WHICH token failed', unresolved.failures[0].token, 'customer.name')
chk('  and why', unresolved.failures[0].reason, 'no_value')
chk('  it names ONLY the one that failed', unresolved.failures.length, 1)
// THE POINT: no half-substituted body is produced, not even internally.
chk('  and NO body comes back at all', 'body' in unresolved, false)

// Paired with the success, so a resolver that refused everything would fail here.
const fine = resolvePlaceholders('Hello {{customer.name}}', { customer: { displayName: 'Layla' } })
chk('the same resolver DOES resolve when the value is there', fine.ok, true)
chk('  substituting it', fine.body, 'Hello Layla')

console.log('\n--- FR-007: a global reply is a lead\'s to make ---')
const agentGlobal = await call('POST', '/quick-reply', {
  token: sara,
  body: { name: { ar: 'عام', en: 'Global' }, body: { ar: 'نص', en: 'text' }, scope: 'global' }
})
chk('an AGENT is refused a global quick reply', agentGlobal.status, 403)
const leadGlobal = await call('POST', '/quick-reply', {
  token: omar,
  body: { name: { ar: 'رد عام', en: 'Shared reply' }, body: { ar: 'نص عام', en: 'shared text' }, scope: 'global' }
})
chk('a LEAD is allowed one', leadGlobal.status, 201)
chk('  and it has no owner', leadGlobal.body.quickReply.ownerId, null)
chk('  and is audited at high severity, because everyone sees it',
  await AuditEntry.countDocuments({ action: 'quick_reply.created', severity: 'high' }) > 0, true)

console.log('\n--- FR-007: a personal reply is nobody else\'s ---')
const saraList = (await call('GET', '/quick-reply', { token: sara })).body.quickReplies
const hanaList = (await call('GET', '/quick-reply', { token: hana })).body.quickReplies
chk('Sara sees her own', saraList.some(r => r.name.en === 'Refund reply'), true)
chk('Hana does NOT see Sara\'s', hanaList.some(r => r.name.en === 'Refund reply'), false)
// Paired: Hana is not simply seeing nothing.
chk('  but Hana DOES see the global one', hanaList.some(r => r.name.en === 'Shared reply'), true)
chk('and Sara sees the global one too', saraList.some(r => r.name.en === 'Shared reply'), true)
chk('Hana cannot deactivate Sara\'s — 404, not 403',
  (await call('PATCH', `/quick-reply/${good.body.quickReply._id}/active`, { token: hana, body: { active: false } })).status, 404)

console.log('\n--- constitution IV: rendering cannot reach a ticket out of scope ---')
// Nour is in another branch. The global template is visible to them; the
// TICKET is not, and that is where the predicate bites.
chk('Nour can see the global template',
  (await call('GET', '/quick-reply', { token: nour })).body.quickReplies.some(r => r.name.en === 'Shared reply'), true)
chk('but rendering it against an out-of-scope ticket is 404, not 403',
  (await call('POST', `/quick-reply/${leadGlobal.body.quickReply._id}/render`, {
    token: nour, body: { ticketId: ticket._id }
  })).status, 404)
chk('  byte-identical to a ticket that does not exist',
  JSON.stringify((await call('POST', `/quick-reply/${leadGlobal.body.quickReply._id}/render`, {
    token: nour, body: { ticketId: ticket._id }
  })).body),
  JSON.stringify((await call('POST', `/quick-reply/${leadGlobal.body.quickReply._id}/render`, {
    token: nour, body: { ticketId: new mongoose.Types.ObjectId().toString() }
  })).body))
// Paired with a success: Sara, who IS in scope, renders the same template.
chk('  while an in-scope caller renders the same template fine',
  (await call('POST', `/quick-reply/${leadGlobal.body.quickReply._id}/render`, {
    token: sara, body: { ticketId: ticket._id }
  })).status, 200)

console.log('\n--- deactivate, never delete ---')
chk('there is no delete route',
  (await call('DELETE', `/quick-reply/${good.body.quickReply._id}`, { token: sara })).status, 404)
const off = await call('PATCH', `/quick-reply/${good.body.quickReply._id}/active`, { token: sara, body: { active: false } })
chk('the owner may deactivate it', off.status, 200)
chk('  the record still exists', await QuickReply.countDocuments({ _id: good.body.quickReply._id }), 1)
chk('  it leaves the picker', (await call('GET', '/quick-reply', { token: sara })).body.quickReplies.some(r => r.name.en === 'Refund reply'), false)
chk('  and it can no longer be rendered',
  (await call('POST', `/quick-reply/${good.body.quickReply._id}/render`, { token: sara, body: { ticketId: ticket._id } })).status, 404)
chk('  the change was audited',
  await AuditEntry.countDocuments({ action: 'quick_reply.active_changed' }) > 0, true)

await mongoose.disconnect()
process.exit(checker.report())

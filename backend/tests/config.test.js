// spec 010 FR-011; spec 002 §8; constitution I, II.
//
// THE FOUR CLAIMS WORTH PROVING:
//
//   1. FR-011's OWN CLAUSE: "Any change to a user-visible label MUST be refused
//      unless both language values are supplied." Refused BOTH WAYS round —
//      Arabic alone and English alone — and paired with a save that supplies
//      both, so a blanket refusal cannot pass.
//
//   2. REFUSED, NOT MERGED. Sending only English must not keep the stored
//      Arabic and call it a change: the two would then describe different
//      things, which is the failure the clause exists to prevent.
//
//   3. `pausesSla` IS AUDITED AS NON-RETROACTIVE. Decision 14 ratified these
//      values and spec 005's pause ledger is append-only, so the entry records
//      `retroactive: false` rather than leaving an auditor to assume it.
//
//   4. §9: an administrator writes, everybody else reads. Paired — the refusal
//      AND the success — because only the refusal would pass under a deny-all.

import mongoose from 'mongoose'
import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from './env.js'
import { createChecker } from './check.js'
import { connectMongoose } from '../src/DB/connection.db.js'
import { AuditEntry } from '../src/DB/models/audit-entry.model.js'
import { TicketLabel } from '../src/DB/models/ticket-label.model.js'

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
const dept = (await mk('/platform/departments', { name: { ar: 'قسم', en: 'Dept' } })).department
const scope = { branchIds: [branch._id], departmentIds: [dept._id] }

await mk('/user', { displayName: 'Dalia Admin', email: 'c.dalia@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['ADM'], scope })
await mk('/user', { displayName: 'Sara Agent', email: 'c.sara@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope })
await mk('/user', { displayName: 'Omar Lead', email: 'c.omar@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['LEAD'], scope })

const dalia = await login('c.dalia@azmsquad.com', FIXTURE_PASSWORD)
const sara = await login('c.sara@azmsquad.com', FIXTURE_PASSWORD)
const omar = await login('c.omar@azmsquad.com', FIXTURE_PASSWORD)

console.log('\n--- seeding: the ratified keys arrive with bilingual defaults ---')
const first = await call('GET', '/config/labels', { token: sara })
chk('an AGENT may READ the labels — every screen renders them', first.status, 200)
chk('  all ten ratified statuses are there (decision 15)', first.body.statuses.length, 10)
chk('  and all four priorities (002 §3)', first.body.priorities.length, 4)
chk('  every one carries BOTH languages — constitution I',
  [...first.body.statuses, ...first.body.priorities].every(l => !!l.label?.ar && !!l.label?.en), true)
chk('  the payload says the key set is NOT editable', first.body.keysEditable, false)
chk('  and names which of FR-011\'s surfaces this is',
  first.body.covers.join(','), 'status_labels,priority_labels,status_pauses_sla')

// Idempotent: a second read must not duplicate or reset anything.
await call('GET', '/config/labels', { token: sara })
chk('seeding twice creates nothing new', await TicketLabel.countDocuments({}), 14)

console.log('\n--- FR-011: a single-language label is REFUSED, both ways round ---')
const englishOnly = await call('PATCH', '/config/labels/status/pending_customer', {
  token: dalia, body: { label: { en: 'Waiting on them' } }
})
chk('English alone is refused', englishOnly.status, 400)
chk('  naming the missing field', (englishOnly.body.fields ?? []).join(','), 'label.ar')
const arabicOnly = await call('PATCH', '/config/labels/status/pending_customer', {
  token: dalia, body: { label: { ar: 'بانتظارهم' } }
})
chk('Arabic alone is refused too — not an English-first rule', arabicOnly.status, 400)
chk('  naming the missing field', (arabicOnly.body.fields ?? []).join(','), 'label.en')
chk('an empty string counts as missing, not as a value',
  (await call('PATCH', '/config/labels/status/pending_customer', {
    token: dalia, body: { label: { ar: '   ', en: 'Waiting' } }
  })).status, 400)

console.log('\n--- REFUSED, NOT MERGED: the stored Arabic is untouched ---')
const stored = await TicketLabel.findOne({ kind: 'status', key: 'pending_customer' })
chk('the label is exactly what it was seeded as', stored.label.en, 'Waiting on the customer')
chk('  and its Arabic too', stored.label.ar, 'بانتظار العميل')

console.log('\n--- both languages: accepted, and audited (constitution II) ---')
const ok = await call('PATCH', '/config/labels/status/pending_customer', {
  token: dalia, body: { label: { ar: 'بانتظار رد العميل', en: 'Waiting on their reply' } }
})
chk('accepted', ok.status, 200)
chk('  and it says what changed', (ok.body.changed ?? []).join(','), 'label')
chk('  the new label is stored',
  (await TicketLabel.findOne({ kind: 'status', key: 'pending_customer' })).label.en, 'Waiting on their reply')
const entry = await AuditEntry.findOne({ action: 'config.label_changed' })
chk('an audit entry was written — FR-008 names configuration change', !!entry, true)
chk('  carrying BEFORE', entry.before?.label?.en, 'Waiting on the customer')
chk('  and AFTER', entry.after?.label?.en, 'Waiting on their reply')

console.log('\n--- the label reaches the screens, not just the database ---')
const meta = await call('GET', '/ticket/meta', { token: sara })
chk('/ticket/meta carries the administrator\'s wording',
  meta.body.statuses.find(s => s.key === 'pending_customer')?.label?.en, 'Waiting on their reply')
chk('  and the key is unchanged beside it — §8 keeps them separate',
  meta.body.statuses.find(s => s.key === 'pending_customer')?.key, 'pending_customer')
chk('  priorities carry labels too',
  meta.body.priorities.find(p => p.key === 'urgent')?.label?.ar, 'عاجلة')

console.log('\n--- pausesSla: editable, and recorded as NOT retroactive ---')
const paused = await call('PATCH', '/config/labels/status/pending_internal', {
  token: dalia, body: { pausesSla: true }
})
chk('a non-terminal status accepts the change', paused.status, 200)
chk('  and it says so', (paused.body.changed ?? []).join(','), 'pausesSla')
const pauseEntry = await AuditEntry.findOne({ action: 'config.label_changed', 'after.changed': 'pausesSla' })
chk('  the audit entry records retroactive: false EXPLICITLY',
  pauseEntry.after?.retroactive, false)
chk('  with the previous value, so the change has a start point',
  pauseEntry.before?.pausesSla, false)
chk('a TERMINAL status is refused — decision 14 stores null, there is no clock',
  (await call('PATCH', '/config/labels/status/closed', { token: dalia, body: { pausesSla: true } })).status, 400)
chk('  and a PRIORITY is refused, the field being a status concept',
  (await call('PATCH', '/config/labels/priority/high', { token: dalia, body: { pausesSla: true } })).status, 400)

console.log('\n--- the key set is fixed ---')
chk('an unknown key is 404, not created',
  (await call('PATCH', '/config/labels/status/on_hold', {
    token: dalia, body: { label: { ar: 'معلقة', en: 'On hold' } }
  })).status, 404)
chk('  and an unknown KIND likewise',
  (await call('PATCH', '/config/labels/colour/red', {
    token: dalia, body: { label: { ar: 'أحمر', en: 'Red' } }
  })).status, 404)

console.log('\n--- §9: ADM writes; everybody reads ---')
chk('an AGENT is refused the write',
  (await call('PATCH', '/config/labels/priority/high', {
    token: sara, body: { label: { ar: 'عالية', en: 'High priority' } }
  })).status, 403)
chk('  and so is a LEAD — 010 FR-001 puts configuration at ADM',
  (await call('PATCH', '/config/labels/priority/high', {
    token: omar, body: { label: { ar: 'عالية', en: 'High priority' } }
  })).status, 403)
// The pair. Without this the two refusals above would pass on a broken route.
chk('  while the ADMINISTRATOR is allowed the same call',
  (await call('PATCH', '/config/labels/priority/high', {
    token: dalia, body: { label: { ar: 'عالية', en: 'High priority' } }
  })).status, 200)
chk('a LEAD may still READ them', (await call('GET', '/config/labels', { token: omar })).status, 200)
chk('  and an anonymous caller may not',
  (await call('GET', '/config/labels')).status, 401)

console.log('\n--- an unchanged save is not a change ---')
const again = await call('PATCH', '/config/labels/priority/high', {
  token: dalia, body: { label: { ar: 'عالية', en: 'High priority' } }
})
chk('sending the same values reports nothing changed', (again.body.changed ?? []).join(','), '')
chk('  and writes no second audit entry',
  await AuditEntry.countDocuments({ action: 'config.label_changed', 'after.key': 'high' }), 1)

await mongoose.disconnect()
process.exit(checker.report())

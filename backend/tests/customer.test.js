import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from './env.js'
const B = BASE_URL
const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, body: json }
}
const login = async (e, p) => (await call('POST', '/auth/login', { body: { email: e, password: p } })).body?.token

let fail = 0
const chk = (label, actual, expected) => {
  const ok = String(actual) === String(expected)
  if (!ok) fail++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(60)} ${actual}${ok ? '' : `  (expected ${expected})`}`)
}

const root = await login(BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD)
const mk = async (p, b) => (await call('POST', p, { token: root, body: b })).body

// scaffolding: two branches, one department, a scoped agent
const bB = (await mk('/platform/branches', { name: { ar: 'فرع القاهرة', en: 'Cairo' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' })).branch
const bC = (await mk('/platform/branches', { name: { ar: 'فرع الإسكندرية', en: 'Alexandria' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' })).branch
const dS = (await mk('/platform/departments', { name: { ar: 'الدعم', en: 'Support' } })).department
await mk('/user', { displayName: 'Sara Ahmed', email: 'sara@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'ar', roles: ['AGT'], scope: { branchIds: [bB._id], departmentIds: [dS._id] } })
await mk('/user', { displayName: 'Nour Ali', email: 'nour@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: { branchIds: [bC._id], departmentIds: [dS._id] } })
const sara = await login('sara@azmsquad.com', FIXTURE_PASSWORD)
const nour = await login('nour@azmsquad.com', FIXTURE_PASSWORD)

console.log('\n--- FR-001: display name + one contact point, nothing else required ---')
const min = await call('POST', '/customer', { token: sara, body: { displayName: 'Ahmed Hassan', contactPoints: [{ channelType: 'phone', value: '+201001234567' }] } })
chk('minimal create', min.status, 201)
chk('scope written from the caller, not the body', String(min.body?.customer?.branchId), String(bB._id))
chk('preferredLanguage defaulted from the agent (AS-01)', min.body?.customer?.preferredLanguage, 'ar')
chk('type defaults to person', min.body?.customer?.type, 'person')

console.log('\n--- FR-001: refuses when either is missing ---')
chk('no contact point', (await call('POST', '/customer', { token: sara, body: { displayName: 'X Y' } })).status, 400)
chk('no display name', (await call('POST', '/customer', { token: sara, body: { contactPoints: [{ channelType: 'phone', value: '+201009999999' }] } })).status, 400)

console.log('\n--- FR-002 / AS-02: local and international forms normalise alike ---')
const forms = ['01001234567', '0100 123 4567', '00201001234567', '+20 100 123 4567']
for (const f of forms) {
  const r = await call('POST', '/customer', { token: sara, body: { displayName: 'Probe ' + f, contactPoints: [{ channelType: 'phone', value: f }] } })
  chk(`"${f}" collides with the existing +201001234567`, r.status, 409)
}

console.log('\n--- FR-010 / AS-04: surfaced, named, and NOT blocked ---')
const dup = await call('POST', '/customer', { token: sara, body: { displayName: 'Ahmed Hassan Again', contactPoints: [{ channelType: 'phone', value: '01001234567' }] } })
chk('collision returns 409 with the match named', dup.body?.matches?.[0]?.displayName, 'Ahmed Hassan')
chk('and names what it matched on', dup.body?.matches?.[0]?.matchedOn, 'contact_point:phone')
const confirmed = await call('POST', '/customer', { token: sara, body: { displayName: 'Ahmed Hassan Again', contactPoints: [{ channelType: 'phone', value: '01001234567' }], confirmCollision: true } })
chk('confirmCollision creates the second record (decision 16)', confirmed.status, 201)
chk('the override is recorded on the contact point', Boolean(confirmed.body?.contactPoints?.[0]?.collisionConfirmedAt), true)

console.log('\n--- §11: an out-of-scope collision is counted, never named ---')
const cross = await call('POST', '/customer', { token: nour, body: { displayName: 'Cross Branch', contactPoints: [{ channelType: 'phone', value: '+201001234567' }] } })
chk('branch-C agent sees a collision', cross.status, 409)
chk('but NO named match', cross.body?.matches?.length, 0)
chk('reported as an unnamed count instead', cross.body?.outOfScopeMatches > 0, true)

console.log('\n--- E-06: an unparseable phone is stored, flagged, not refused ---')
const bad = await call('POST', '/customer', { token: sara, body: { displayName: 'Odd Number', contactPoints: [{ channelType: 'phone', value: 'ring the shop' }] } })
chk('created, not refused', bad.status, 201)
chk('normalised = false', bad.body?.contactPoints?.[0]?.normalised, false)
chk('value stored as entered', bad.body?.contactPoints?.[0]?.value, 'ring the shop')
chk('surfaced to the caller', bad.body?.unnormalised?.length, 1)

console.log('\n--- §3: at most one primary per channel type ---')
chk('two primary phones refused', (await call('POST', '/customer', { token: sara, body: { displayName: 'Two Primaries', contactPoints: [{ channelType: 'phone', value: '+201110000001', isPrimary: true }, { channelType: 'phone', value: '+201110000002', isPrimary: true }] } })).status, 400)

console.log('\n--- §3: the organisation-target type check ---')
const org = await call('POST', '/customer', { token: sara, body: { type: 'organisation', displayName: 'Azm Holding', contactPoints: [{ channelType: 'email', value: 'INFO@Azm.example' }] } })
chk('organisation created', org.status, 201)
chk('email lowercased', org.body?.contactPoints?.[0]?.normalisedValue, 'info@azm.example')
const person = await call('POST', '/customer', { token: sara, body: { displayName: 'Member One', organisationId: org.body.customer._id, contactPoints: [{ channelType: 'phone', value: '+201220000001' }] } })
chk('person may join an organisation', person.status, 201)
const wrongTarget = await call('POST', '/customer', { token: sara, body: { displayName: 'Member Two', organisationId: min.body.customer._id, contactPoints: [{ channelType: 'phone', value: '+201220000002' }] } })
chk('target that is a person is refused', wrongTarget.status, 400)
const orgInOrg = await call('POST', '/customer', { token: sara, body: { type: 'organisation', displayName: 'Sub Co', organisationId: org.body.customer._id, contactPoints: [{ channelType: 'email', value: 'sub@azm.example' }] } })
chk('organisation inside an organisation refused', orgInOrg.status, 400)
const oosOrg = await call('POST', '/customer', { token: nour, body: { displayName: 'Outsider', organisationId: org.body.customer._id, contactPoints: [{ channelType: 'phone', value: '+201330000001' }] } })
chk('out-of-scope organisation answers 404, not 403 (AS-01)', oosOrg.status, 404)

console.log('\n--- constitution IV: unrestricted caller must state scope ---')
chk('break-glass root with no scope named', (await call('POST', '/customer', { token: root, body: { displayName: 'No Scope', contactPoints: [{ channelType: 'phone', value: '+201440000001' }] } })).status, 400)
chk('root naming a scope succeeds', (await call('POST', '/customer', { token: root, body: { displayName: 'Scoped By Root', contactPoints: [{ channelType: 'phone', value: '+201440000002' }], scope: { branchIds: [bB._id], departmentIds: [dS._id] } } })).status, 201)

console.log('\n--- §9: who may not create ---')
await mk('/user', { displayName: 'Aya Audit', email: 'aya@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AUD'], scope: { branchIds: [bB._id], departmentIds: [dS._id] } })
const aud = await login('aya@azmsquad.com', FIXTURE_PASSWORD)
chk('AUD refused', (await call('POST', '/customer', { token: aud, body: { displayName: 'By Auditor', contactPoints: [{ channelType: 'phone', value: '+201550000001' }] } })).status, 403)
chk('no token refused', (await call('POST', '/customer', { body: { displayName: 'Anon', contactPoints: [{ channelType: 'phone', value: '+201550000002' }] } })).status, 401)

console.log(`\n${fail === 0 ? 'ALL CHECKS PASSED' : fail + ' CHECK(S) FAILED'}`)
process.exit(fail === 0 ? 0 : 1)

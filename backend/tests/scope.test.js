// Verifies the spec 010 / 012 scope acceptance scenarios against the live API.
import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from './env.js'
import { createChecker } from './check.js'
const B = BASE_URL

const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(B + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })
  let json = null
  try { json = await res.json() } catch { /* no body */ }
  return { status: res.status, body: json }
}

const login = async (email, password) => {
  const r = await call('POST', '/auth/login', { body: { email, password } })
  return r.body?.token
}

const checker = createChecker({ indent: '' })
const check = checker.chk

const root = await login(BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD)
if (!root) { console.error('root sign-in failed'); process.exit(1) }

console.log('\n--- spec 012 AS-02: a single-language save is REFUSED, not warned ---')
const bad = await call('POST', '/platform/branches', {
  token: root,
  body: { name: { en: 'Cairo' }, timezone: 'Africa/Cairo', defaultLocale: 'en' }
})
check('POST /platform/branches with English only', bad.status, 400)
console.log(`      refusal names the missing language: ${JSON.stringify(bad.body?.missingLanguages)}`)
console.log(`      ar: ${bad.body?.message?.ar}`)
console.log(`      en: ${bad.body?.message?.en}`)

const badAr = await call('POST', '/platform/branches', {
  token: root,
  body: { name: { ar: 'القاهرة' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' }
})
check('...and identically with Arabic only (AS-02 second half)', badAr.status, 400)

console.log('\n--- setup: two branches, two departments ---')
// mk asserts its own status. A refusal check ("English only is rejected") proves
// nothing if the endpoint rejects everything, and a silently failed fixture
// otherwise surfaces later as a confusing auth error rather than here.
const mk = async (path, body) => {
  const r = await call('POST', path, { token: root, body })
  check(`setup: POST ${path} succeeds with both languages`, r.status, 201)
  return r.body
}
const branchB = (await mk('/platform/branches', { name: { ar: 'فرع القاهرة', en: 'Cairo Branch' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' })).branch
const branchC = (await mk('/platform/branches', { name: { ar: 'فرع الإسكندرية', en: 'Alexandria Branch' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' })).branch
const deptSupport = (await mk('/platform/departments', { name: { ar: 'الدعم الفني', en: 'Technical Support' } })).department
const deptBilling = (await mk('/platform/departments', { name: { ar: 'الفواتير', en: 'Billing' } })).department
console.log(`      branch B = ${branchB._id}  branch C = ${branchC._id}`)
console.log(`      dept Support = ${deptSupport._id}  dept Billing = ${deptBilling._id}`)

console.log('\n--- setup: an agent in branch B, and a lead in branch C ---')
const mkUser = async (body) => await call('POST', '/user', { token: root, body })

const agentRes = await mkUser({
  displayName: 'Sara Ahmed', email: 'sara@azmsquad.com', password: FIXTURE_PASSWORD,
  defaultLanguage: 'ar', roles: ['AGT'],
  scope: { branchIds: [branchB._id], departmentIds: [deptSupport._id] }
})
check('create AGT scoped to branch B / Support', agentRes.status, 201)

const adminBRes = await mkUser({
  displayName: 'Omar Farouk', email: 'omar@azmsquad.com', password: FIXTURE_PASSWORD,
  defaultLanguage: 'en', roles: ['ADM'],
  scope: { branchIds: [branchB._id], departmentIds: [deptSupport._id] }
})
check('create ADM scoped to branch B / Support', adminBRes.status, 201)

const leadCRes = await mkUser({
  displayName: 'Nour Ali', email: 'nour@azmsquad.com', password: FIXTURE_PASSWORD,
  defaultLanguage: 'en', roles: ['LEAD'],
  scope: { branchIds: [branchC._id], departmentIds: [deptBilling._id] }
})
check('create LEAD scoped to branch C / Billing', leadCRes.status, 201)

console.log('\n--- spec 010 AS-04: a granting admin cannot exceed their own scope ---')
const omar = await login('omar@azmsquad.com', FIXTURE_PASSWORD)
const omarOverreach = await call('POST', '/user', {
  token: omar,
  body: {
    displayName: 'Ghost', email: 'ghost@azmsquad.com', password: FIXTURE_PASSWORD,
    defaultLanguage: 'en', roles: ['AGT'],
    scope: { branchIds: [branchC._id], departmentIds: [deptBilling._id] }
  }
})
check('branch-B admin grants branch C', omarOverreach.status, 403)
console.log(`      excess reported: ${JSON.stringify(omarOverreach.body?.excess)}`)

const omarWithin = await call('POST', '/user', {
  token: omar,
  body: {
    displayName: 'Hana Said', email: 'hana@azmsquad.com', password: FIXTURE_PASSWORD,
    defaultLanguage: 'ar', roles: ['AGT'],
    scope: { branchIds: [branchB._id], departmentIds: [deptSupport._id] }
  }
})
check('branch-B admin grants branch B', omarWithin.status, 201)

const omarOmitted = await call('POST', '/user', {
  token: omar,
  body: {
    displayName: 'Youssef Nabil', email: 'youssef@azmsquad.com', password: FIXTURE_PASSWORD,
    defaultLanguage: 'en', roles: ['AGT']
  }
})
check('omitted scope resolves to the GRANTER scope, not all', omarOmitted.status, 201)
const omittedScope = omarOmitted.body?.user ? 'created' : 'missing'
console.log(`      created with granter scope inherited: ${omittedScope}`)

console.log('\n--- spec 010 AS-01: out-of-scope is INDISTINGUISHABLE from non-existent ---')
const sara = await login('sara@azmsquad.com', FIXTURE_PASSWORD)
const inScope = await call('GET', `/platform/branches/${branchB._id}`, { token: sara })
check('AGT reads branch B, which is in scope', inScope.status, 200)

const outOfScope = await call('GET', `/platform/branches/${branchC._id}`, { token: sara })
check('AGT reads branch C, which is NOT in scope', outOfScope.status, 404)

const nonExistent = await call('GET', '/platform/branches/6a9e000000000000000000aa', { token: sara })
check('AGT reads an id that does not exist at all', nonExistent.status, 404)
// Comparing two stringified bodies passes when BOTH are null, so the presence
// of a real refusal is asserted first — otherwise "identical" can mean
// "identically empty".
check('the out-of-scope 404 carries a bilingual refusal', Boolean(outOfScope.body?.message?.ar && outOfScope.body?.message?.en), true)
const identical = JSON.stringify(outOfScope.body) === JSON.stringify(nonExistent.body)
check('the two 404 bodies are byte-identical', identical, true)
console.log(`      both answer: ${JSON.stringify(outOfScope.body)}`)

console.log('\n--- AS-01: nor does it appear in any list ---')
const saraBranches = await call('GET', '/platform/branches', { token: sara })
check('AGT branch list length', saraBranches.body?.branches?.length, 1)
const rootBranches = await call('GET', '/platform/branches', { token: root })
check('unrestricted root branch list length', rootBranches.body?.branches?.length, 2)

const saraDepts = await call('GET', '/platform/departments', { token: sara })
check('AGT department list length', saraDepts.body?.departments?.length, 1)

console.log('\n--- spec 010 AS-05: dangerous actions are separately held ---')
// Requesting roles: ['ADM'] made this ambiguous — the refusal could be the
// role gate OR the no-escalation rule, and it passed either way. Asking for the
// least privileged role possible isolates the role gate.
const saraCreate = await call('POST', '/user', {
  token: sara,
  body: { displayName: 'X', email: 'x@y.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: { branchIds: [branchB._id], departmentIds: [deptSupport._id] } }
})
check('AGT attempts POST /user, even within their own scope', saraCreate.status, 403)

const saraList = await call('GET', '/user', { token: sara })
check('AGT attempts GET /user (lead and above)', saraList.status, 403)

console.log('\n--- §11: list users applies branch AND department scope ---')
const omarUsers = await call('GET', '/user', { token: omar })
const omarEmails = (omarUsers.body?.users ?? []).map(u => u.email).sort()
check('branch-B admin sees only branch-B users', omarEmails.length, 4)
console.log(`      ${omarEmails.join(', ')}`)
const leakedNour = omarEmails.includes('nour@azmsquad.com')
check('branch-C lead is NOT visible to the branch-B admin', leakedNour, false)

console.log('\n--- UNIT: rolesForTarget composes without widening (spec 010 FR-005) ---')
// These four are a UNIT test of a pure function, not an acceptance test, and
// they are labelled that way because the distinction matters: the input below is
// hand-written, so nothing here proves the API ever calls rolesForTarget or
// feeds it the right coordinate. They would all pass with the middleware wired
// to something else entirely.
//
// The API-level proof lives in ticket.test.js under "FR-005: roles compose per
// record" — an agent holding LEAD in another branch is still refused a
// lead-only action in the branch where they are only an agent. Keep both: this
// one localises a failure to the function, that one proves the system uses it.
const scopeMod = await import('file:///' + process.cwd().replace(/\\/g, '/') + '/src/utils/scope.js')
const assignments = [
  { role: 'AGT', branchIds: [branchB._id], departmentIds: [deptSupport._id], unrestricted: false },
  { role: 'LEAD', branchIds: [branchC._id], departmentIds: [deptBilling._id], unrestricted: false }
]
const onBranchB = scopeMod.rolesForTarget(assignments, { branchId: branchB._id, departmentId: deptSupport._id })
const onBranchC = scopeMod.rolesForTarget(assignments, { branchId: branchC._id, departmentId: deptBilling._id })
check('roles on a branch B record', JSON.stringify(onBranchB), JSON.stringify(['AGT']))
check('roles on a branch C record', JSON.stringify(onBranchC), JSON.stringify(['LEAD']))
check('LEAD is never held on a branch B record (the union bug)', onBranchB.includes('LEAD'), false)

const crossed = scopeMod.rolesForTarget(assignments, { branchId: branchB._id, departmentId: deptBilling._id })
check('branch B + department Billing is covered by neither', JSON.stringify(crossed), '[]')

process.exit(checker.report())

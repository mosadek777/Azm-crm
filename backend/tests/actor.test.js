// Proves utils/actor.js answers for every actor an audit entry can name.
//
// WHY A SUITE FOR WHAT LOOKS LIKE A DISPLAY HELPER. The audit trail is
// append-only and immutable, so it outlives the records it points at. The
// interesting cases are therefore exactly the ones with no data sitting in the
// database to produce them by accident: a deactivated account, an actor that is
// not a user at all, an id that resolves to nothing. Reading the ticket history
// on the demo data exercises one branch out of four and would have passed while
// the other three returned an object id.
//
// Each check below fails if its branch is removed.

import mongoose from 'mongoose'
import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from './env.js'
import { createChecker } from './check.js'
import { connectMongoose } from '../src/DB/connection.db.js'
import { resolveActors, withActors } from '../src/utils/actor.js'

const call = async (method, path, { body, token } = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
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

const checker = createChecker({ indent: '' })
const check = checker.chk

await connectMongoose()

const root = (await call('POST', '/auth/login', {
  body: { email: BREAKGLASS_EMAIL, password: BREAKGLASS_PASSWORD }
})).body.token

// A branch and a department, so the user has a scope to be granted.
const branch = (await call('POST', '/platform/branches', {
  token: root,
  body: { name: { ar: 'فرع الفاعل', en: 'Actor branch' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' }
})).body.branch
const department = (await call('POST', '/platform/departments', {
  token: root, body: { name: { ar: 'قسم الفاعل', en: 'Actor dept' } }
})).body.department

console.log('\n--- a staff actor resolves to their name ---')
const email = `actor.probe.${Date.now()}@azmsquad.com`
const created = (await call('POST', '/user', {
  token: root,
  body: {
    displayName: 'Actor Probe', email, password: FIXTURE_PASSWORD,
    defaultLanguage: 'en', roles: ['AGT'],
    scope: { branchIds: [branch._id], departmentIds: [department._id] }
  }
})).body.user
const userRef = String(created._id ?? created.id)

let actors = await resolveActors([{ actorRef: userRef }])
check('the kind is user', actors.get(userRef)?.kind, 'user')
check('the display name is the person, not the id', actors.get(userRef)?.displayName, 'Actor Probe')
check('and the id is never returned as a name', actors.get(userRef)?.displayName === userRef, false)
check('an active account is marked active', actors.get(userRef)?.state, 'active')

console.log('\n--- THE POINT: a deactivated account still resolves ---')
// Deactivation is not deletion (010 FR-001), so the name is still there. The
// entry must not degrade to an unreadable id because the person has left.
const deact = await call('PATCH', `/user/${userRef}/deactivate`, { token: root })
check('the account was deactivated', deact.status, 200)
actors = await resolveActors([{ actorRef: userRef }])
check('the name still resolves after deactivation', actors.get(userRef)?.displayName, 'Actor Probe')
check('and the entry says the account is deactivated', actors.get(userRef)?.state, 'deactivated')
check('the kind is still user', actors.get(userRef)?.kind, 'user')

console.log('\n--- a system actor ---')
// Nothing writes this yet. 010 §3 names `system` as a permitted actor, so the
// SLA engine and retention rules will, and an unhandled one would surface as an
// unreadable value on a screen nobody is watching.
const sys = await resolveActors([{ actorRef: 'system' }])
check('the kind is system', sys.get('system')?.kind, 'system')
check('it carries no name to render', sys.get('system')?.displayName, null)

console.log('\n--- a customer actor ---')
// The `customer:` prefix is what makes a customer action impossible to confuse
// with a staff one (008 FR-020). An erased customer leaves the prefix behind.
const ghostCustomer = 'customer:' + new mongoose.Types.ObjectId().toString()
const cust = await resolveActors([{ actorRef: ghostCustomer }])
check('the kind is customer even when the record is gone', cust.get(ghostCustomer)?.kind, 'customer')
check('and no name is invented for it', cust.get(ghostCustomer)?.displayName, null)

console.log('\n--- an actor that resolves to nothing ---')
const ghost = new mongoose.Types.ObjectId().toString()
const unknown = await resolveActors([{ actorRef: ghost }])
check('the kind is unknown', unknown.get(ghost)?.kind, 'unknown')
check('no name is invented', unknown.get(ghost)?.displayName, null)
check('and the raw ref is still the map key, so the trail is followable',
  unknown.has(ghost), true)

console.log('\n--- withActors keeps every field it was given ---')
// The first version spread mongoose documents directly. A mongoose document's
// fields live behind getters, not as own properties, so `{ ...doc }` copied
// NOTHING and the response carried an `actor` and no `action`, `actorRef` or
// `occurredAt`. It was caught by reading the response rather than assuming it.
const { AuditEntry } = await import('../src/DB/models/audit-entry.model.js')
const real = await AuditEntry.find({ action: 'user.created' }).limit(1)
check('there is a real entry to test against', real.length, 1)
const [decorated] = await withActors(real)
check('action survives', decorated.action, 'user.created')
check('actorRef survives', typeof decorated.actorRef, 'string')
check('occurredAt survives', decorated.occurredAt instanceof Date, true)
check('and the actor was attached', typeof decorated.actor?.kind, 'string')

console.log('\n--- an empty history is not an error ---')
check('no entries resolves to an empty map', (await resolveActors([])).size, 0)
check('and withActors returns an empty list', (await withActors([])).length, 0)
check('a null list is tolerated', (await withActors(null)).length, 0)

await mongoose.disconnect()
process.exit(checker.report())

// Direct database access for test setup ONLY.
//
// Tests should build their fixtures through the API, so that setup exercises
// the same scope predicate and audit writer as production. This file exists
// for the one case where the API affords no route at all: granting an
// ADDITIONAL role assignment to a user who already exists.
//
// POST /user creates a user with their assignments; there is no endpoint to add
// a second assignment afterwards, and none to revoke one. That is a real gap
// (an administrator cannot promote an agent to lead without deleting and
// recreating them) and it is recorded in docs/next-steps.md rather than worked
// around silently here.
//
// Nothing in this file may be used to ASSERT anything. Every assertion goes
// through the API — a test that both writes and reads the database proves only
// that mongoose works.

import mongoose from 'mongoose'
import { DB_NAME } from '../src/DB/connection.db.js'
import { User } from '../src/DB/models/user.model.js'
import { RoleAssignment } from '../src/DB/models/role-assignment.model.js'

let connected = false

const connect = async () => {
  if (connected) return
  await mongoose.connect(process.env.MONGO_URI, { dbName: DB_NAME })
  connected = true
}

export const closeDb = async () => {
  if (!connected) return
  await mongoose.disconnect()
  connected = false
}

// Adds a role assignment to an existing user, alongside whatever they hold
// already. Used to build the FR-005 composition case: one person holding
// different roles in different branches.
export const grantExtraRole = async (email, { role, branchIds, departmentIds }) => {
  await connect()
  const user = await User.findOne({ email })
  if (!user) throw new Error(`grantExtraRole: no user ${email}`)
  await RoleAssignment.create([{
    userId: user._id,
    role,
    branchIds,
    departmentIds,
    grantedBy: user._id
  }])
  return String(user._id)
}

// Creates a portal identity for an existing customer. Setup only.
//
// Direct because no spec gives staff a provisioning endpoint: 008 §3 defines the
// entity, E-02 mentions registration only as something [CLARIFY-1] would decide,
// and no requirement provides a route. Inventing one to make a test tidier would
// be filling a gap the specs left open.
export const createPortalIdentity = async ({ customerId, password, locale = 'en' }) => {
  await connect()
  const { PortalIdentity } = await import('../src/DB/models/portal-identity.model.js')
  const { ContactPoint } = await import('../src/DB/models/contact-point.model.js')
  const bcrypt = (await import('bcrypt')).default

  const point = await ContactPoint.findOne({ customerId, channelType: 'email' })
  if (!point) throw new Error('createPortalIdentity: customer has no email contact point')

  const [identity] = await PortalIdentity.create([{
    customerId,
    authMethod: 'password',
    verifiedContactPointId: point._id,
    passwordHash: await bcrypt.hash(password, Number(process.env.SALT_ROUNDS) || 10),
    locale,
    organisationVisibility: 'none',
    state: 'active'
  }])
  return String(identity._id)
}

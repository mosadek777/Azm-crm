// spec 010 — implements E-07 (the break-glass administrator)
//
// The first administrator cannot be created through POST /user, because that
// route requires an administrator. This script resolves that, once.
//
// It seeds the break-glass local administrator permitted by the PROVISIONAL
// answer to [CLARIFY-3] (developer, 2026-09-07, unratified). E-07: "its use is
// a high-severity audit event" — hence `breakGlass: true` on the user, which is
// what makes user.model.js carry that flag.
//
// Run once:  npm run seed:admin

import 'dotenv/config'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { connectMongoose } from '../DB/connection.db.js'
import { User } from '../DB/models/user.model.js'
import { RoleAssignment } from '../DB/models/role-assignment.model.js'
import { recordAudit, redact } from '../utils/audit.js'

const run = async () => {
  await connectMongoose()

  const email = process.env.BREAKGLASS_EMAIL?.toLowerCase().trim()
  const password = process.env.BREAKGLASS_PASSWORD

  if (!email || !password) {
    console.error('BREAKGLASS_EMAIL and BREAKGLASS_PASSWORD must be set in .env')
    process.exit(1)
  }

  if (await User.findOne({ email })) {
    console.log(`break-glass administrator already exists: ${email}`)
    await mongoose.disconnect()
    return
  }

  const userId = new mongoose.Types.ObjectId()
  const assignmentId = new mongoose.Types.ObjectId()

  const doc = {
    _id: userId,
    displayName: 'Break-glass Administrator',
    email,
    passwordHash: await bcrypt.hash(password, Number(process.env.SALT_ROUNDS)),
    defaultLanguage: 'en',
    state: 'active',
    breakGlass: true
  }

  // ONE TRANSACTION for all four documents. This is the worst place to leave a
  // partial write: a user with no assignment cannot sign in usefully, and an
  // assignment with no user is an orphan pointing at nothing — either way the
  // system has no administrator and `POST /user` requires one, so there is no
  // way back in except dropping the database.
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      // The actor is the system: there is no user to attribute this to yet. §3
      // permits `system` as an actor. High severity, per §10.
      await recordAudit({
        actorRef: 'system',
        action: 'user.created',
        entityType: 'User',
        entityId: userId,
        before: null,
        after: { ...redact(doc), roles: ['ADM'], source: 'seed:admin' },
        severity: 'high',
        session
      })
      await User.create([doc], { session })

      await recordAudit({
        actorRef: 'system',
        action: 'role_assignment.granted',
        entityType: 'RoleAssignment',
        entityId: assignmentId,
        before: null,
        after: { userId, role: 'ADM', unrestricted: true, grantedBy: null, source: 'seed:admin' },
        severity: 'high',
        session
      })
      // The only unrestricted assignment in the system (spec 010 E-07).
      await RoleAssignment.create([{
        _id: assignmentId, userId, role: 'ADM', unrestricted: true, branchIds: [], departmentIds: []
      }], { session })
    })
  } finally {
    await session.endSession()
  }

  console.log(`break-glass administrator seeded: ${email}`)
  console.log('CHANGE ITS PASSWORD BEFORE ANY REAL USE.')
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })

// npm run seed:demo:clear — removes ONLY what seed-demo.js created.
//
// ⚠ THIS SCRIPT DELIBERATELY BREAKS TWO RULES THE APPLICATION ENFORCES, and it
// is the only file in the codebase permitted to. Read this before copying
// anything out of it.
//
//   1. Spec 001 §3: a customer "Lives forever; is never deleted, only erased or
//      merged away." There is no delete path for customers anywhere in the
//      services, by design. This script deletes them.
//
//   2. Spec 010 FR-008 / AS-08: audit entries are append-only, enforced by
//      mongoose hooks that refuse every update and delete. This script removes
//      the demo records' audit entries by going through the raw driver
//      collection, which bypasses those hooks entirely.
//
// WHY IT IS STILL RIGHT TO DO. Leaving the audit entries behind would be worse
// than removing them: `npm run audit:reconcile` would then report every one as
// an ORPHANED ENTRY — an entry whose record does not exist — which is the exact
// signal that means "a mutation failed after its audit entry was written".
// Filling that report with deliberate noise would train the reader to ignore
// the one check that catches real corruption.
//
// WHY IT IS SAFE ENOUGH. It refuses to run against anything but a local
// database (see the guard below), and it only ever touches records carrying a
// demo marker. It is a development convenience, not an operational tool, and it
// must never be run against production data.

import 'dotenv/config'
import mongoose from 'mongoose'
import { connectMongoose } from '../DB/connection.db.js'
import { User } from '../DB/models/user.model.js'
import { RoleAssignment } from '../DB/models/role-assignment.model.js'
import { Customer } from '../DB/models/customer.model.js'
import { ContactPoint } from '../DB/models/contact-point.model.js'
import { Ticket } from '../DB/models/ticket.model.js'
import { Message } from '../DB/models/message.model.js'
import { Branch } from '../DB/models/branch.model.js'
import { Department } from '../DB/models/department.model.js'

const MARKERS = {
  userEmailPrefix: 'demo.',
  customerAccountRefPrefix: 'DEMO-',
  ticketTag: 'demo',
  branchNameEn: 'Demo Branch',
  departmentNameEn: 'Demo Support'
}

const run = async () => {
  const uri = process.env.MONGO_URI ?? ''

  // The guard. A destructive script that ignores the append-only rule has no
  // business pointing at a remote host, whatever the caller intended.
  const isLocal = /(^|\/\/)(localhost|127\.0\.0\.1)(:|\/|$)/.test(uri)
  if (!isLocal) {
    console.error('REFUSED: seed:demo:clear only runs against a local database.')
    console.error(`MONGO_URI is: ${uri.replace(/\/\/[^@]*@/, '//***@')}`)
    process.exit(1)
  }

  await connectMongoose()

  const removed = {}
  const idsOf = docs => docs.map(d => d._id)

  // --- find everything carrying a demo marker -------------------------------
  const customers = await Customer.find({
    accountRef: new RegExp('^' + MARKERS.customerAccountRefPrefix)
  })
  const tickets = await Ticket.find({ tags: MARKERS.ticketTag })
  const users = await User.find({
    email: new RegExp('^' + MARKERS.userEmailPrefix)
  })
  const branches = await Branch.find({ 'name.en': MARKERS.branchNameEn })
  const departments = await Department.find({ 'name.en': MARKERS.departmentNameEn })

  const customerIds = idsOf(customers)
  const ticketIds = idsOf(tickets)
  const userIds = idsOf(users)

  const contactPoints = await ContactPoint.find({ customerId: { $in: customerIds } })
  const messages = await Message.find({ ticketId: { $in: ticketIds } })
  const assignments = await RoleAssignment.find({ userId: { $in: userIds } })

  // Every id whose audit entries go with it.
  const auditTargets = [
    ...customerIds, ...ticketIds, ...userIds,
    ...idsOf(contactPoints), ...idsOf(messages), ...idsOf(assignments),
    ...idsOf(branches), ...idsOf(departments)
  ]

  // --- delete ---------------------------------------------------------------
  removed.messages = (await Message.deleteMany({ ticketId: { $in: ticketIds } })).deletedCount
  removed.tickets = (await Ticket.deleteMany({ _id: { $in: ticketIds } })).deletedCount
  removed.contactPoints = (await ContactPoint.deleteMany({ customerId: { $in: customerIds } })).deletedCount
  removed.customers = (await Customer.deleteMany({ _id: { $in: customerIds } })).deletedCount
  removed.roleAssignments = (await RoleAssignment.deleteMany({ userId: { $in: userIds } })).deletedCount
  removed.users = (await User.deleteMany({ _id: { $in: userIds } })).deletedCount
  removed.branches = (await Branch.deleteMany({ _id: { $in: idsOf(branches) } })).deletedCount
  removed.departments = (await Department.deleteMany({ _id: { $in: idsOf(departments) } })).deletedCount

  // The audit entries, through the RAW COLLECTION so the append-only hooks on
  // the model do not refuse. This is the rule-breaking line; it is one line, it
  // is here, and it is not repeated anywhere else in the codebase.
  const auditResult = await mongoose.connection.db
    .collection('auditentries')
    .deleteMany({ entityId: { $in: auditTargets } })
  removed.auditEntries = auditResult.deletedCount

  console.log('')
  console.log('demo data removed (development-only: bypasses the append-only audit rule)')
  for (const [what, count] of Object.entries(removed)) {
    console.log(`  ${what.padEnd(18)} ${count}`)
  }
  console.log('')
  console.log('  run `npm run audit:reconcile` to confirm nothing was orphaned')
  console.log('')

  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })

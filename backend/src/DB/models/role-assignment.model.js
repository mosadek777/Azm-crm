// spec 010 — implements SEC-02, FR-002 (the Role assignment entity of §3)
//
// FR-002: permissions are assigned through roles only. There are no per-user
// permission overrides, and none may be added — the §13 success metric for this
// spec is "per-user permission overrides in existence: 0".
//
// The role list is the PROVISIONAL answer to [CLARIFY-3] (developer,
// 2026-09-07, unratified): the five roles every §9 matrix in all thirteen specs
// already uses. See docs/decisions-pending.md §1.
//
// SCOPE — two of the three dimensions §3 names.
//
// `branch_ids` and `department_ids` are here, unblocked by the provisional
// answers to spec 012 [CLARIFY-6] (isolated entities dropped) and [CLARIFY-3]
// (departments flat) on 2026-09-07.
//
// `team_ids` IS ABSENT. Team is referenced as a scope dimension by §3 and
// FR-004, and is defined as an entity by no spec in this repository. Reported
// to the developer 2026-09-07; not invented. When Team is defined it is added
// here and in src/utils/scope.js, and nowhere else.
//
// §3: "Empty set means 'all within the granting admin's own scope', never 'all
// globally'." That resolution happens at GRANT time in
// src/utils/scope.js#resolveGrantedScope and the concrete list is stored, so an
// assignment cannot widen later just because its granter's scope widened.
// An empty array reaching the database is therefore a bug, not a wildcard.

import { Schema, model } from 'mongoose'

export const ROLES = ['AGT', 'LEAD', 'MGR', 'ADM', 'AUD']

const roleAssignmentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ROLES, required: true },

  // The break-glass root (spec 010 E-07) has no enclosing scope to inherit, so
  // it is the one assignment permitted to carry none. Explicit flag rather than
  // "empty means everything", because an empty array that means "all" is the
  // classic scoping bug: a truncated list silently becomes global access.
  unrestricted: { type: Boolean, default: false },

  // Never empty unless unrestricted — see the note above. Concrete lists,
  // resolved at grant time.
  branchIds: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
    required: true,
    validate: {
      validator: function (v) { return this.unrestricted || v.length > 0 },
      message: 'branchIds may not be empty (spec 010 §3)'
    }
  },
  departmentIds: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
    required: true,
    validate: {
      validator: function (v) { return this.unrestricted || v.length > 0 },
      message: 'departmentIds may not be empty (spec 010 §3)'
    }
  },

  // §3: immutable. A grant is a historical fact.
  grantedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, immutable: true },
  grantedAt: { type: Date, default: Date.now, required: true, immutable: true }
})

// §3: "A user may hold several assignments." Several roles, yes — the same role
// twice, no.
roleAssignmentSchema.index({ userId: 1, role: 1 }, { unique: true })

export const RoleAssignment = model('RoleAssignment', roleAssignmentSchema)

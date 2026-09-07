// spec 012 — implements PLT-07, FR-007, FR-015
//
// A department: the functional scope dimension.
//
// FLAT — NO NESTING. §3 has `parent_department_id` "optional; one level of
// nesting only, per [CLARIFY-3]". That marker is answered provisionally
// (developer, 2026-09-07, unratified): departments are flat, no ancestor walk.
// So the field is absent rather than present-and-unused. If the client reverses
// it, this gains a materialised ancestor path and `department ∈ scope` in
// src/utils/scope.js becomes a closure — one function, by design.
//
// `default_team_id` IS ABSENT, and this is a reported spec defect, not an
// omission. §3 marks it Required and types it `ref` — but no spec in this
// repository defines a Team entity. Team is referenced as a scope dimension in
// spec 010 §3 and FR-004, and as `owning_team_id` in spec 002 §3, and is
// defined nowhere. Raised with the developer 2026-09-07; not invented here.
//
// DEACTIVATION, NEVER DELETION (FR-015).

import { Schema, model } from 'mongoose'
import { localizedTextSchema } from './localized-text.schema.js'

const departmentSchema = new Schema({
  name: { type: localizedTextSchema, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true })

// A department IS a scope co-ordinate, in the department dimension only.
departmentSchema.methods.scopeCoordinate = function () {
  return { departmentId: this._id }
}

export const Department = model('Department', departmentSchema)

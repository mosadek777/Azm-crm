// spec 012 — implements PLT-08, FR-008, FR-015
//
// A branch: the geographic scope dimension. One of the two dimensions the
// spec 010 FR-004 predicate is evaluated over.
//
// DEACTIVATION, NEVER DELETION (FR-015, spec 010 E-05). There is no remove()
// for branches anywhere in this codebase and there must not be one — historical
// records keep their reference (spec 009 FR-023).
//
// business_calendar_id and holiday_set_id are §3-required but NULLABLE here,
// because the business calendar is spec 005 and blocked by 005 [CLARIFY-2]
// (working hours and holidays per branch). That is not a shortcut: spec 012
// E-09 requires exactly this — "Branch has no calendar configured — dependent
// features refuse configuration rather than defaulting to 24/7". A branch with
// no calendar is a legal state whose dependent features must refuse.

import { Schema, model } from 'mongoose'
import { localizedTextSchema } from './localized-text.schema.js'

const branchSchema = new Schema({
  // Both languages required at save; a single-language save answers 400.
  name: { type: localizedTextSchema, required: true },

  // §3: required; drives period boundaries in spec 009 E-19.
  timezone: { type: String, required: true },

  // §3: required. Null until spec 005 unblocks — see the note above.
  businessCalendarId: { type: Schema.Types.ObjectId, default: null },
  holidaySetId: { type: Schema.Types.ObjectId, default: null },

  // §3: drives defaults for records created here. Not a "primary language" —
  // Arabic and English are peers (constitution I); this is only a default.
  defaultLocale: { type: String, enum: ['ar', 'en'], required: true },

  active: { type: Boolean, default: true }
}, { timestamps: true })

// A branch IS a scope co-ordinate, in the branch dimension only. Read by
// src/utils/scope.js#assignmentCovers, so the predicate never has to infer a
// document's dimensions from its field names.
branchSchema.methods.scopeCoordinate = function () {
  return { branchId: this._id }
}

export const Branch = model('Branch', branchSchema)

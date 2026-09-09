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

  // ⚠ DANGLING REFERENCES — NEITHER BusinessCalendar NOR HolidaySet EXISTS.
  // Both are plain ObjectIds with no `ref:` at all, so nothing can populate
  // them and nothing reports that they point nowhere. `012 FR-008` (MUST)
  // requires every branch to own a timezone, a business calendar and a holiday
  // set: the timezone above is real, these two are placeholders keeping the
  // shape stable.
  //
  // They are also a hard dependency of the service-level engine — a clock
  // cannot pause correctly overnight, at a weekend or on a public holiday
  // without them — which is why they read as "waiting on spec 005". That is
  // half true and was misleading: the RECORD SHAPES are not blocked on 005 or
  // on anything else. Only the working hours and holiday dates inside them are
  // a client answer.
  //
  // Tracked as `entity-business-calendar` and `entity-holiday-set` under the
  // `missing-entities` card. Add `ref:` when the models exist.
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

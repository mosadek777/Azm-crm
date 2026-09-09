// spec 001 — implements CM-01, CM-04, CM-13, CM-16; the §3 Customer entity
// Step 4, review point 1. Model only — no controller, service or routes.
//
// THE BILINGUAL SPLIT, applied (constitution I, spec 012 §8):
//   `displayName` is USER-AUTHORED and single-language. It is NOT a localised
//   subdocument. Spec 001 §8: names are "Stored as entered; no transliteration"
//   and "Latin and Arabic names must render correctly in one list". Direction is
//   detected per value at render time, never stored.
//   `segments` reference admin-authored labels, which DO carry { ar, en } — that
//   lives on the Segment model, not here.
//
// SCOPE: `branchId` and `departmentId` are required, per §3 — "the scope
// predicate for constitution IV". Team is omitted; no spec defines the entity
// (see docs/decisions-pending.md §7).

import { Schema, model } from 'mongoose'

export const CUSTOMER_TYPES = ['person', 'organisation']
export const CUSTOMER_STATES = ['active', 'merged', 'erased']
export const LANGUAGES = ['ar', 'en']
export const CHANNEL_TYPES = ['phone', 'email', 'whatsapp']

const customerSchema = new Schema({
  // §3: required, immutable after creation. The immutability is why E-04
  // (circular organisation membership) is impossible by construction — see the
  // note on organisationId below.
  type: { type: String, enum: CUSTOMER_TYPES, required: true, immutable: true },

  // User-authored. Single language, free script. Not localised.
  displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },

  // §3: "Optional, unique when present". NOT relaxed by decision 16 — that
  // decision amended FR-004, which governs contact points only. So these two
  // keep a real uniqueness constraint, enforced by the partial indexes below.
  nationalId: { type: String, default: null, trim: true },

  // The ERP join key. Optional, per decision 6: the CRM is the system of record
  // and a customer may exist with no ERP link at all (spec 011 E-03).
  accountRef: { type: String, default: null, trim: true },

  // §3: required. AS-01 has the service default it to the creating agent's
  // interface language, so there is no schema default — an omission is an error,
  // not a silent 'en'.
  preferredLanguage: { type: String, enum: LANGUAGES, required: true },
  preferredChannel: { type: String, enum: CHANNEL_TYPES, default: null },

  // §3: "Only when `type = person`; target must be `type = organisation`".
  // The type check on the TARGET needs a second document read, so it is
  // service-layer (review point 2). What is enforceable here is that an
  // organisation may not hold one at all.
  //
  // E-04 (circular membership, A→B and B→A) is IMPOSSIBLE BY CONSTRUCTION
  // rather than by a guard: a cycle needs both records to be `person` (to hold
  // the reference) and both to be `organisation` (to be a valid target), and
  // `type` is immutable. No hook is needed, and adding one would imply the
  // constraint is weaker than it is.
  organisationId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },

  // ⚠ DANGLING REFERENCE — THE Segment MODEL DOES NOT EXIST.
  // `ref: 'Segment'` names a model nothing registers, so a populate on this
  // path resolves to nothing. It does not throw: mongoose only complains when
  // the populate actually runs, and nothing populates segments today. That is
  // why it survived unnoticed until the board audit of 2026-09-09.
  //
  // Segment IS specified — `001 §3` defines it alongside Contact point, and
  // `001 FR-003` (MUST) requires the customer view to show a customer's
  // segments, which it currently cannot. Its labels are admin-authored and
  // therefore bilingual, so the model carries { ar, en } when it is built.
  //
  // Tracked as `entity-segment` under the `missing-entities` card. Do not
  // build a Segment model to satisfy this line alone — read that card first,
  // because `001 FR-013` also makes segments selectable as conditions in the
  // automation rules of spec `005`, which changes the shape.
  segments: { type: [{ type: Schema.Types.ObjectId, ref: 'Segment' }], default: [] },

  // FR-016: visible on every surface where the name appears to staff.
  sensitiveFlag: { type: Boolean, default: false },

  // §3: "the scope predicate for constitution IV". Required — a customer with
  // no scope would be readable by everyone or no one, and both are wrong.
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },

  // §3: system-managed. §3 also states the record "Lives forever; is never
  // deleted, only erased or merged away" — so there is no delete path anywhere
  // for customers, and none may be added.
  status: { type: String, enum: CUSTOMER_STATES, default: 'active', required: true },
  mergedInto: { type: Schema.Types.ObjectId, ref: 'Customer', default: null }
}, { timestamps: true })

// --- Uniqueness -------------------------------------------------------------
//
// Partial, not sparse. A sparse unique index would enforce uniqueness across
// merged and erased records too, so a merged customer's national ID would block
// a new active customer from using it. Filtering on `status: 'active'` matches
// FR-004's own phrasing, "across active customers".
//
// INFERENCE, flagged: §3 says only "unique when present" for these two fields
// without naming a population. Restricting to active records is read across
// from FR-004; the spec does not say it in so many words.
customerSchema.index(
  { nationalId: 1 },
  { unique: true, partialFilterExpression: { nationalId: { $type: 'string' }, status: 'active' } }
)
customerSchema.index(
  { accountRef: 1 },
  { unique: true, partialFilterExpression: { accountRef: { $type: 'string' }, status: 'active' } }
)

// --- Search support (FR-002) ------------------------------------------------
// Plain indexes only. The ranked match list is review point 3; these exist so
// that work has something to read.
customerSchema.index({ branchId: 1, departmentId: 1, status: 1 })
customerSchema.index({ displayName: 1 })
customerSchema.index({ organisationId: 1 })

// --- Scope co-ordinate ------------------------------------------------------
// Declared, never inferred. src/utils/scope.js matches only the dimensions a
// target declares; a model that guesses from field names is how the branch-read
// bug in step 3 happened.
customerSchema.methods.scopeCoordinate = function () {
  return { branchId: this.branchId, departmentId: this.departmentId }
}

export const Customer = model('Customer', customerSchema)

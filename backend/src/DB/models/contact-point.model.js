// spec 001 — implements CM-04; the §3 Contact point entity
// Step 4, review point 1. Model only.
//
// FR-004 AS AMENDED BY DECISION 16 — unique per channel type BY DEFAULT,
// overridable with an explicit recorded confirmation.
//
// ┌──────────────────────────────────────────────────────────────────────────┐
// │ DO NOT ADD A UNIQUE INDEX ON `value`. It looks like the obvious           │
// │ optimisation — let the database enforce it instead of the service — and   │
// │ it would silently undo decision 16.                                      │
// │                                                                          │
// │ A unique index cannot be overridden per write. FR-004 as amended requires │
// │ a collision to be SURFACED and then overridable with a recorded           │
// │ confirmation, which an index cannot express. Adding one would make a      │
// │ household sharing a phone number unrepresentable again — the exact defect │
// │ decision 16 fixed. And relaxing a unique index after data exists is a     │
// │ migration, not an edit.                                                  │
// │                                                                          │
// │ Uniqueness is enforced in customer.service.js: probe, surface, require    │
// │ confirmation, record the override. The index below is non-unique and      │
// │ exists for that probe.                                                   │
// └──────────────────────────────────────────────────────────────────────────┘
//
// SCOPE IS INHERITED, NOT CARRIED. §3 gives this entity only `customer_id`,
// `channel_type`, `value`, `is_primary` and `verified_at` — while explicitly
// giving `branch_id` and `department_id` to the other sub-entities in the same
// section ("Custom field definition, Segment, Attachment, Internal note,
// Field-history entry ... each carries `branch_id` and `department_id`"). The
// omission is the spec's, and §11 confirms it: "add / remove contact point —
// inherits customer scope". See scopeCoordinate() below.

import { Schema, model } from 'mongoose'
import { CHANNEL_TYPES } from './customer.model.js'

const contactPointSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, immutable: true },
  channelType: { type: String, enum: CHANNEL_TYPES, required: true, immutable: true },

  // §3: "Required; normalised (E.164 for phone and WhatsApp, lowercased for
  // email)". Split into two fields because of E-06: a phone in an unrecognised
  // format is "Stored as entered, flagged unnormalised, excluded from
  // normalised matching, surfaced in a data-quality list". One field cannot be
  // both as-entered and normalised.
  value: { type: String, required: true, trim: true },

  // Null when normalisation failed. FR-002's "local and international forms
  // match the same record" matches on THIS field, so a null here is what
  // "excluded from normalised matching" means in practice.
  normalisedValue: { type: String, default: null, trim: true },

  // E-06's flag, stored rather than derived from `normalisedValue === null`, so
  // the data-quality list is a query rather than a scan.
  normalised: { type: Boolean, default: false },

  isPrimary: { type: Boolean, default: false },
  verifiedAt: { type: Date, default: null },

  // The record of a decision-16 override. Set only when this contact point was
  // created despite a collision with another active customer (E-05). Immutable:
  // the confirmation is a historical fact about the moment of creation.
  //
  // ┌────────────────────────────────────────────────────────────────────────┐
  // │ DO NOT ADD AN `isShared` FLAG. It looks like the obvious optimisation — │
  // │ one boolean instead of a count query on every send — and it is a       │
  // │ consent leak waiting to happen.                                       │
  // │                                                                       │
  // │ These two fields record that a collision WAS confirmed at creation.    │
  // │ They do not say whether the value is shared NOW. That is DERIVED at    │
  // │ query time, by counting active holders of the same (normalisedValue,   │
  // │ channelType).                                                         │
  // │                                                                       │
  // │ A stored flag goes stale the moment a sibling customer is merged or    │
  // │ erased. Stale in the "shared" direction is a harmless refusal; stale   │
  // │ in the "not shared" direction sends a message to several customers     │
  // │ having checked one customer's consent — which is exactly what E-15     │
  // │ exists to prevent, and E-15 must fail closed. A derived count cannot   │
  // │ go stale.                                                             │
  // └────────────────────────────────────────────────────────────────────────┘
  collisionConfirmedAt: { type: Date, default: null, immutable: true },
  collisionConfirmedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, immutable: true }
}, { timestamps: true })

// --- Indexes ----------------------------------------------------------------

// NON-unique, deliberately. This is the collision probe for FR-004/FR-010, the
// ranked-match lookup for FR-002, and the shared-holder count for E-15.
contactPointSchema.index({ normalisedValue: 1, channelType: 1 })
contactPointSchema.index({ value: 1, channelType: 1 })

// Plain lookup: every contact point of one customer. Deliberately on
// `customerId` alone — see the naming note below.
contactPointSchema.index({ customerId: 1 })

// §3: "At most one true per (customer_id, channel_type)". This one IS a hard
// constraint — decision 16 relaxed uniqueness of the VALUE across customers,
// not the count of primaries within one customer. Partial, so the many
// non-primary rows do not collide with each other.
//
// EXPLICITLY NAMED, and this matters. An earlier revision also declared a plain
// index on the same { customerId, channelType } keys. Two indexes on identical
// keys get the same auto-generated name, and MongoDB then rejects the second —
// mongoose's own warning is that it "will not create the duplicate index and
// options on the duplicate definition (such as ... unique) will not be
// applied". The uniqueness would have silently not existed, and nothing would
// have failed until two primaries were saved. The plain index was dropped and
// this one carries its own name.
contactPointSchema.index(
  { customerId: 1, channelType: 1 },
  { unique: true, partialFilterExpression: { isPrimary: true }, name: 'one_primary_per_channel_type' }
)

// --- Scope co-ordinate ------------------------------------------------------
//
// A contact point has NO scope co-ordinate of its own, and returning an empty
// one is the correct answer rather than a gap: src/utils/scope.js#assignmentCovers
// fails closed on a target with no dimensions, so a contact point can never be
// authorised by itself. That is the intended behaviour — §11 says this entity
// "inherits customer scope", so the guard must load the CUSTOMER and check that.
//
// `inheritsScopeFrom` names the field to follow, so a future service reads the
// rule off the model instead of knowing it by habit.
contactPointSchema.methods.scopeCoordinate = function () {
  return {}
}

contactPointSchema.statics.inheritsScopeFrom = 'customerId'

export const ContactPoint = model('ContactPoint', contactPointSchema)

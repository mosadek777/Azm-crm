// spec 008 §3 "Portal identity" — a customer's authenticated session, bound to
// exactly one customer record from spec 001.
//
// The entity is built to the spec's shape even where the demo does not yet use
// every field, because a field added later is a migration and a field present
// and unpopulated is not. Two are shaped by ratified deviations:
//
//   authMethod            — spec 008 [CLARIFY-1] resolved to one-time code only
//                           (decision 26). Decision 31 permits `password` for
//                           the management demo. The enum is the spec's, so
//                           reversing 31 is a value change, not a schema change.
//   verifiedContactPointId — REQUIRED by §3, and it is required here. Decision
//                           32 shortcuts the VERIFICATION, not the binding: the
//                           reference points at a real contact point whose
//                           `verifiedAt` is still null. That keeps the shape
//                           correct and makes piece P1 a smaller change.
//
// `organisationVisibility` defaults to `none` because FR-006 (SHOULD) says it
// "MUST default to none and MUST be grantable only by staff" — nothing in the
// portal may raise it.

import { Schema, model } from 'mongoose'

export const PORTAL_AUTH_METHODS = ['otp_email', 'otp_phone', 'password', 'sso']
export const PORTAL_STATES = ['active', 'locked', 'disabled']
export const ORGANISATION_VISIBILITY = ['none', 'own_org']

const portalIdentitySchema = new Schema({
  // §3: "Required, exactly one". Immutable — an identity that could be
  // repointed at another customer would silently hand one person another
  // person's history, which is the single thing AS-02 exists to prevent.
  customerId: {
    type: Schema.Types.ObjectId, ref: 'Customer', required: true, immutable: true, index: true
  },

  authMethod: { type: String, enum: PORTAL_AUTH_METHODS, required: true },

  // §3: Required. See the note above on decision 32.
  verifiedContactPointId: {
    type: Schema.Types.ObjectId, ref: 'ContactPoint', required: true
  },

  // Present only while authMethod is `password` (decision 31). `select: false`
  // for the same reason User.passwordHash is: a hash that arrives in a response
  // body by accident is a hash somebody can attack offline.
  passwordHash: { type: String, default: null, select: false },

  // §3: "Defaults from the customer's preferred_language".
  locale: { type: String, enum: ['ar', 'en'], required: true },

  // §3, and FR-006: granted by staff only, never by the portal.
  organisationVisibility: {
    type: String, enum: ORGANISATION_VISIBILITY, default: 'none', required: true
  },

  // §3: "Lockout per spec 010 FR-007". Nothing sets `locked` yet — decision 33
  // defers rate limiting and lockout for the demo — but sign-in already refuses
  // any state other than `active`, so enabling lockout later is a writer, not a
  // new check.

  // spec 010 FR-007 — failed-attempt lockout. See utils/lockout.js.
  // The counter resets on a successful sign-in and when a lock is applied;
  // `lockedUntil` in the future means sign-in is refused, with the SAME body
  // as every other refusal (§8 discloses nothing).
  failedSignInCount: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },

  state: { type: String, enum: PORTAL_STATES, default: 'active', required: true }
}, { timestamps: true })

export const PortalIdentity = model('PortalIdentity', portalIdentitySchema)

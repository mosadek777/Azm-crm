// spec 010 — implements the session half of FR-007
//
// WHY A SESSION RECORD EXISTS AT ALL. Three of FR-007's five controls cannot be
// built on a bare JWT:
//
//   - idle timeout          needs last-seen, which a signed token cannot carry
//   - concurrent limit      needs to know what else is open
//   - revocation            a JWT is valid until it expires, by design
//
// So the token carries a session id (`sid`) and the session record is the
// authority. The token remains the proof of WHO; the record decides whether
// that proof is still live. FR-001's "deactivation MUST terminate sessions"
// becomes a real termination rather than a wait for expiry.
//
// This does NOT reintroduce roles into the token — E-04 still requires
// permissions to be re-read per request, and they are. The session carries no
// permission data of any kind.
//
// ONE MODEL FOR BOTH AUDIENCES. Staff and portal customers are different
// identity types with different models, but a session is the same object for
// both, so `audience` distinguishes them. Keeping them in one collection means
// the idle and absolute rules cannot drift apart between the two, which they
// would if this were copied.

import { Schema, model } from 'mongoose'

export const SESSION_AUDIENCES = ['staff', 'portal']
export const REVOCATION_REASONS = [
  'signed_out',           // the holder ended it
  'concurrent_limit',     // evicted to make room for a newer session
  'identity_deactivated', // the account was deactivated or locked
  'password_changed',     // the credential behind it changed
  'administrative'        // ended by an administrator
]

const sessionSchema = new Schema({
  // Which identity this belongs to. Not a `ref`, because the target collection
  // depends on `audience` — mongoose cannot express a conditional ref, and a
  // wrong `ref` is worse than none (see the Segment comment in customer.model).
  subjectId: { type: Schema.Types.ObjectId, required: true, immutable: true, index: true },
  audience: { type: String, enum: SESSION_AUDIENCES, required: true, immutable: true },

  issuedAt: { type: Date, required: true, immutable: true },
  // The only mutable field on the record, bumped by the auth middleware.
  lastSeenAt: { type: Date, required: true },
  // Computed at issue from the absolute-lifetime policy, then fixed. Storing it
  // rather than recomputing means a later change to the policy cannot silently
  // extend sessions that are already open.
  absoluteExpiresAt: { type: Date, required: true, immutable: true },

  revokedAt: { type: Date, default: null },
  revokedReason: { type: String, enum: REVOCATION_REASONS, default: null },

  // §3 requires these for user-initiated actions; useful here for showing a
  // holder their own open sessions, which FR-007's concurrent limit implies.
  ip: { type: String, default: null, immutable: true },
  userAgent: { type: String, default: null, immutable: true }
}, { timestamps: true })

// The lookup the auth middleware performs on every single request.
sessionSchema.index({ subjectId: 1, audience: 1, revokedAt: 1 })

// Expired sessions are swept by MongoDB itself rather than by a job we would
// have to write, monitor and remember. The sweep is on ABSOLUTE expiry only:
// an idle-expired session is still refused by the middleware, and keeping the
// record until its absolute expiry preserves the audit question "was this
// session ever used again after it went idle".
sessionSchema.index({ absoluteExpiresAt: 1 }, { expireAfterSeconds: 0 })

export const Session = model('Session', sessionSchema)

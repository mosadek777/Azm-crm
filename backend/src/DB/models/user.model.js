// spec 010 — implements SEC-01, part of FR-001 (the User entity of §3)
//
// A staff identity. Distinct from a portal identity, which is spec 008.
//
// NOT IMPLEMENTED HERE, deliberately:
//   - FR-001's "return assigned tickets to the team queue" clause on
//     deactivation. Tickets are step 5; there is nothing to reassign yet.
//     Recorded as an open gap in docs/trace.md.
//   - branch / department / team scope. That lives on RoleAssignment and is
//     blocked: spec 012 [CLARIFY-6] blocks FR-004 by name, and [CLARIFY-3]
//     decides whether `department ∈ scope` is flat or an ancestor walk.

import { Schema, model } from 'mongoose'

export const USER_STATES = ['active', 'deactivated']
export const LANGUAGES = ['ar', 'en']

const userSchema = new Schema({
  displayName: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },

  // Not in spec 010 §3, which assumes SSO. This field exists only because of
  // the provisional answer to [CLARIFY-2] (no SSO in phase one, local
  // password). If the client confirms SSO is mandatory, this field goes.
  passwordHash: { type: String, required: true, select: false },

  // §3: deactivation is reversible; deletion is not offered. There is no
  // remove() anywhere in this codebase for users.
  state: { type: String, enum: USER_STATES, default: 'active', required: true },

  // §3: drives interface and notification language.
  defaultLanguage: { type: String, enum: LANGUAGES, required: true },

  // §3: the SSO subject, where SSO is in use. Unused in phase one.
  identityRef: { type: String, default: null },

  // §3: read by spec 005 FR-009 (eligible-agent selection). Stored, not read
  // by anything yet.
  skills: { type: [String], default: [] },
  languages: { type: [String], default: [] },
  capacity: { type: Number, default: null },

  mfaEnrolled: { type: Boolean, default: false },

  // spec 010 E-07: the configured break-glass administrator, permitted by the
  // provisional answer to [CLARIFY-3]. Its sign-in is a high-severity audit
  // event, which is the only reason this flag exists.
  breakGlass: { type: Boolean, default: false }
}, { timestamps: true })

export const User = model('User', userSchema)

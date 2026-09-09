// spec 010 — implements the failed-attempt lockout of FR-007, and the `locked`
// state that `008 §3` gives a portal identity ("Lockout per spec 010 FR-007")
//
// Shared by the staff and portal sign-in paths so the two cannot drift.
//
// ⚠ THE REFUSAL NEVER CHANGES. A locked account returns exactly the same body
// as a wrong password, an unknown address and a deactivated account. spec 010
// §8 requires a refusal to disclose nothing about whether an account exists,
// and "this account is locked" discloses that it does — which also hands an
// attacker confirmation that they found a real address and a way to measure
// their own progress. The lockout is recorded in the audit trail, where the
// people entitled to see it can, and nowhere else.

import mongoose from 'mongoose'
import { SECURITY_POLICY as P } from '../config/security-policy.js'
import { recordAudit } from './audit.js'

export const isLockedOut = (identity) =>
  Boolean(identity?.lockedUntil && identity.lockedUntil > new Date())

// Records one failed attempt and locks the identity if that reaches the
// threshold. Runs in its own transaction: a failed sign-in mutates the identity
// now, so it is no longer the standalone entry it used to be.
export const registerFailure = async (Model, identity, { actorRef, req }) => {
  if (!identity) return { locked: false }

  const next = (identity.failedSignInCount ?? 0) + 1
  const threshold = P.lockoutThreshold.value
  const willLock = threshold > 0 && next >= threshold
  const lockedUntil = willLock
    ? new Date(Date.now() + P.lockoutMinutes.value * 60 * 1000)
    : identity.lockedUntil ?? null

  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      if (willLock) {
        // §10 treats access-control events as worth seeing. A lockout is the
        // system refusing a real identity, which is either an attack or a user
        // in trouble; both are worth a high-severity entry.
        await recordAudit({
          actorId: identity._id,
          actorRef,
          action: 'auth.locked_out',
          entityType: Model.modelName,
          entityId: identity._id,
          before: { failedSignInCount: identity.failedSignInCount ?? 0, lockedUntil: identity.lockedUntil ?? null },
          after: { failedSignInCount: next, lockedUntil, threshold, minutes: P.lockoutMinutes.value },
          severity: 'high',
          req,
          session
        })
      }
      await Model.updateOne(
        { _id: identity._id },
        { $set: { failedSignInCount: willLock ? 0 : next, lockedUntil } },
        { session }
      )
    })
  } finally {
    await session.endSession()
  }

  // The counter resets when the lock is applied, so the next lock needs a fresh
  // run of failures rather than one more attempt after the lock expires.
  return { locked: willLock, lockedUntil }
}

// Clears the counter after a successful sign-in. Not audited: a counter
// returning to zero on a successful sign-in is implied by the sign-in entry
// beside it, and auditing it would double every sign-in in the trail.
export const clearFailures = async (Model, identity) => {
  if (!identity?.failedSignInCount && !identity?.lockedUntil) return
  await Model.updateOne(
    { _id: identity._id },
    { $set: { failedSignInCount: 0, lockedUntil: null } }
  )
}

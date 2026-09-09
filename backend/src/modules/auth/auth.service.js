// spec 010 — implements SEC-06, FR-006 (local path), FR-008, E-07
//
// Local email + password sign-in. This exists on the PROVISIONAL answer to
// [CLARIFY-2] (developer, 2026-09-07, unratified): no SSO in phase one.
// FR-006 says that where SSO is mandatory, local password sign-in MUST be
// REFUSED — so if the client confirms SSO is mandatory, this file is deleted,
// not extended. See docs/decisions-pending.md §1.
//
// ⚠ THIS FILE IS NOW TRANSACTIONAL. The previous version of this comment said
// it deliberately was not, and ended: "If a future change adds a database write
// to this file — a lockout counter under FR-007, a session record — it MUST
// open a session and pass it to both." FR-007 added both, on 2026-09-09.
//
// A sign-in used to write nothing: it issued a JWT, which is a signature
// computed in memory. It now opens a session record and, on failure, moves a
// lockout counter. Constitution II therefore applies in full — the audit entry
// and the write it describes commit together or neither commits — and E-11 no
// longer rests on ordering alone.
//
// The refusal is IDENTICAL for every failure: unknown address, wrong password,
// deactivated account, locked account. spec 010 §8. A distinct "your account is
// locked" would confirm the address exists and let an attacker measure their
// own progress.

import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { User } from '../../DB/models/user.model.js'
import { recordAudit } from '../../utils/audit.js'
import { openSession } from '../../utils/session.js'
import { isLockedOut, registerFailure, clearFailures } from '../../utils/lockout.js'
import { policyReport } from '../../config/security-policy.js'

// spec 010 §8 and spec 012 §8: refusal messages carry both languages. Field
// names stay English (spec 011 §8) — it is the human-readable text that is
// bilingual, per constitution I.
const REFUSED = {
  ar: 'بيانات الدخول غير صحيحة',
  en: 'Invalid sign-in credentials'
}

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}

    if (!email || !password) {
      return res.status(400).json({
        message: {
          ar: 'البريد الإلكتروني وكلمة المرور مطلوبان',
          en: 'Email and password are both required'
        }
      })
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() })
      .select('+passwordHash')

    // One refusal for every failure — wrong email, wrong password, deactivated
    // account. spec 010 §8: a refusal must not disclose whether the account
    // exists. Same status, same body, in all three cases.
    // The lock is checked BEFORE the password is compared, so a locked account
    // cannot be probed for whether the password happened to be right.
    const locked = isLockedOut(user)

    const ok = user
      && user.state === 'active'
      && !locked
      && await bcrypt.compare(password, user.passwordHash)

    if (!ok) {
      // §10: "Sign-in failed | actor or attempted identity, timestamp, IP,
      // user agent, method". The attempted identity is recorded even though no
      // user is known.
      await recordAudit({
        actorId: user?._id ?? null,
        actorRef: String(email),
        action: 'auth.signin_failed',
        entityType: 'User',
        entityId: user?._id ?? null,
        after: { reason: !user ? 'unknown_identity' : user.state !== 'active' ? 'deactivated' : locked ? 'locked_out' : 'bad_password' },
        severity: locked ? 'high' : 'normal',
        req,
        // Still stands alone. The entry records the ATTEMPT; the counter it
        // moves is a separate mutation with its own transaction below, because
        // an attempt against an unknown address moves no counter at all.
        session: null
      })

      // Only a real, active identity has a counter to move. An unknown address
      // must not create one — that would turn the lockout table into a list of
      // addresses somebody has guessed at.
      if (user && user.state === 'active' && !locked) {
        await registerFailure(User, user, { actorRef: user._id.toString(), req })
      }

      return res.status(401).json({ message: REFUSED })
    }

    await clearFailures(User, user)

    // The sign-in entry and the session record commit together. If either
    // fails, neither lands and no token is issued — E-11, now by atomicity
    // rather than by ordering.
    let sessionId
    const txn = await mongoose.startSession()
    try {
      await txn.withTransaction(async () => {
        await recordAudit({
          actorId: user._id,
          actorRef: user._id.toString(),
          action: 'auth.signin_succeeded',
          entityType: 'User',
          entityId: user._id,
          after: { method: 'local_password', breakGlass: user.breakGlass },
          // §10: "Break-glass sign-in used — high severity".
          severity: user.breakGlass ? 'high' : 'normal',
          req,
          session: txn
        })
        sessionId = await openSession({
          subjectId: user._id,
          audience: 'staff',
          actorRef: user._id.toString(),
          req,
          session: txn
        })
      })
    } finally {
      await txn.endSession()
    }

    // The token carries the subject and nothing else. No role, no permissions.
    // E-04 requires a permission change to take effect on the NEXT REQUEST, not
    // at next sign-in — so roles are read from the database per request by the
    // auth middleware. A role baked into an 8-hour token would be stale for up
    // to 8 hours.
    // `sid` names the session record. The token still carries no role and no
    // permission — E-04 requires those to be re-read per request, and they are.
    const token = jwt.sign(
      { sub: user._id.toString(), sid: sessionId.toString() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    return res.json({
      token,
      user: {
        id: user._id,
        displayName: user.displayName,
        email: user.email,
        defaultLanguage: user.defaultLanguage
      }
    })
  } catch (err) {
    return next(err)
  }
}

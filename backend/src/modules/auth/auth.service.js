// spec 010 — implements SEC-06, FR-006 (local path), FR-008, E-07
//
// Local email + password sign-in. This exists on the PROVISIONAL answer to
// [CLARIFY-2] (developer, 2026-09-07, unratified): no SSO in phase one.
// FR-006 says that where SSO is mandatory, local password sign-in MUST be
// REFUSED — so if the client confirms SSO is mandatory, this file is deleted,
// not extended. See docs/decisions-pending.md §1.
//
// NO TRANSACTION SESSION HERE, and that is a decision, not an omission.
//
// Both audit entries in this file stand alone: a sign-in writes no record. The
// success path issues a JWT, which is a signature computed in memory, not a
// database write. So there is nothing for a transaction to make atomic — a
// single-document insert is already atomic in MongoDB, and wrapping one in a
// transaction buys nothing but two extra round-trips.
//
// E-11 still holds by ORDERING: the audit entry is written before the token is
// issued, so if the entry cannot be written, recordAudit throws, the handler
// answers 500, and no token reaches the caller.
//
// If a future change adds a database write to this file — a lockout counter
// under FR-007, a session record — it MUST open a session and pass it to both.
//
// NOT IMPLEMENTED, and not blocked — simply not in step 2's scope: FR-007's
// failed-attempt lockout, session timeout, absolute session lifetime and
// concurrent-session limit. FR-007's lockout counter is exactly the change that
// would make this file transactional.

import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { User } from '../../DB/models/user.model.js'
import { recordAudit } from '../../utils/audit.js'

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
    const ok = user
      && user.state === 'active'
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
        after: { reason: !user ? 'unknown_identity' : user.state !== 'active' ? 'deactivated' : 'bad_password' },
        severity: 'normal',
        req,
        // Stands alone: a failed sign-in mutates nothing.
        session: null
      })
      return res.status(401).json({ message: REFUSED })
    }

    // Audit BEFORE issuing the token: if the entry cannot be written, no token
    // is issued and the sign-in is refused (E-11). See utils/audit.js.
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
      // Stands alone: issuing a JWT is a signature, not a database write.
      session: null
    })

    // The token carries the subject and nothing else. No role, no permissions.
    // E-04 requires a permission change to take effect on the NEXT REQUEST, not
    // at next sign-in — so roles are read from the database per request by the
    // auth middleware. A role baked into an 8-hour token would be stale for up
    // to 8 hours.
    const token = jwt.sign(
      { sub: user._id.toString() },
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

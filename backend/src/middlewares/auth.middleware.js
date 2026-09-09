// spec 010 — implements FR-008, E-04; constitution IV
//
// Establishes WHO the request is from. Verifies the bearer token, then loads
// the user and their role assignments FROM THE DATABASE on every request.
//
// Why not read the role from the token, which would be faster? E-04: "Permission
// removed from a role mid-session — takes effect on the next request, not at
// next sign-in." A role carried in an 8-hour JWT would stay valid for up to 8
// hours after being revoked. The database read is the requirement, not an
// oversight.
//
// It also re-checks `state`, so FR-001's "deactivation MUST terminate sessions"
// holds immediately rather than within NFR-003's 60 seconds.

// FR-007 ADDED A SECOND CHECK. The token proves WHO; the session record decides
// whether that proof is still live — idle timeout, absolute lifetime, and
// revocation, none of which a signed token can express on its own. The refusal
// body is the same in every case, deliberately: "your session went idle" and
// "your session was revoked" tell a caller whether somebody else ended it.

import jwt from 'jsonwebtoken'
import { User } from '../DB/models/user.model.js'
import { RoleAssignment } from '../DB/models/role-assignment.model.js'
import { touchSession } from '../utils/session.js'

const UNAUTHENTICATED = {
  ar: 'الجلسة غير صالحة أو منتهية',
  en: 'Session is invalid or expired'
}

export const authenticate = async (req, res, next) => {
  try {
    const header = req.get('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null

    if (!token) return res.status(401).json({ message: UNAUTHENTICATED })

    let payload
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch {
      return res.status(401).json({ message: UNAUTHENTICATED })
    }

    const user = await User.findById(payload.sub)

    // A deactivated user's token stops working on the next request.
    if (!user || user.state !== 'active') {
      return res.status(401).json({ message: UNAUTHENTICATED })
    }

    const live = await touchSession(payload.sid, user._id, 'staff')
    if (!live.ok) return res.status(401).json({ message: UNAUTHENTICATED })

    const assignments = await RoleAssignment.find({ userId: user._id })

    req.user = user
    req.session = live.session

    // The ASSIGNMENTS, not a flattened role list. A flattened list loses which
    // scope each role was held in, and the scope is the point (FR-005, AS-03).
    req.assignments = assignments

    return next()
  } catch (err) {
    return next(err)
  }
}

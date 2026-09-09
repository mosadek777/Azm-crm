// spec 008 §11 — the portal's scope predicate, and the middleware that resolves
// the identity it is built from.
//
// §11 states the rule and its importance in one sentence:
//
//   "Every operation applies `customer = session identity`, widened only by a
//    granted `own_org`. This is the single most important predicate in the
//    spec."
//
// It is implemented HERE, once, and every portal read calls `portalScope(req)`
// rather than assembling a filter of its own — the same reasoning that keeps the
// staff predicate in `utils/scope.js`. A controller that builds its own filter
// is a controller that can forget a clause.
//
// This is a SECOND predicate, not a widening of the staff one. A customer holds
// no branch, no department and no role, so `scopeFilter` does not apply to them
// and was not modified. Constitution IV is satisfied by both independently.

import jwt from 'jsonwebtoken'
import { Customer } from '../DB/models/customer.model.js'
import { touchSession } from '../utils/session.js'
import { PortalIdentity } from '../DB/models/portal-identity.model.js'
import { PORTAL_AUDIENCE } from '../modules/portal/portal.service.js'

const UNAUTHENTICATED = {
  ar: 'يلزم تسجيل الدخول',
  en: 'Sign-in required'
}

export const authenticatePortal = async (req, res, next) => {
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

    // A staff token carries no audience, so it cannot reach a portal route even
    // though it is signed with the same secret.
    if (payload.aud !== PORTAL_AUDIENCE) {
      return res.status(401).json({ message: UNAUTHENTICATED })
    }

    // Re-read on every request, exactly as the staff middleware re-reads roles:
    // §3's `state` is the portal's equivalent of deactivation, and an identity
    // disabled mid-session must stop working on its next call, not when its
    // token happens to expire (E-05: "Session is terminated").
    const identity = await PortalIdentity.findById(payload.sub)
    if (!identity || identity.state !== 'active') {
      return res.status(401).json({ message: UNAUTHENTICATED })
    }

    // FR-007: the token proves who; the session record decides whether that
    // proof is still live — idle timeout, absolute lifetime, revocation. Same
    // check and same policy values as the staff middleware, from the same
    // helper, so the two audiences cannot drift apart.
    const live = await touchSession(payload.sid, identity._id, 'portal')
    if (!live.ok) return res.status(401).json({ message: UNAUTHENTICATED })

    const customer = await Customer.findById(identity.customerId)
    if (!customer) return res.status(401).json({ message: UNAUTHENTICATED })

    req.portalSession = live.session
    req.portalIdentity = identity
    req.customer = customer
    return next()
  } catch (err) { return next(err) }
}

// The predicate itself. Returns a filter fragment to spread into any query for
// a record belonging to a customer.
//
// There is ONE form and it is async, because the `own_org` widening needs a
// member lookup. A synchronous variant alongside it would be a second way to
// build the same filter, and the second one is the one somebody forgets to
// update — the same argument that keeps `elapsed-time.js` the only duration
// source and `rolesForTarget` the only role resolver.
//
// `own_org` is honoured because §11 names it as the single permitted widening,
// and AS-03 requires it to be granted rather than assumed. It can only be set
// by staff (FR-006), never from the portal, so reading it here cannot widen
// anything the portal itself decided.
export const portalScope = async (req) => {
  const identity = req.portalIdentity

  if (identity.organisationVisibility !== 'own_org' || !req.customer.organisationId) {
    return { customerId: req.customer._id }
  }

  // E-12: "Organisation visibility is bounded by the granting staff member's
  // scope; cross-branch visibility requires an explicit grant." The grant is
  // not built (FR-006 is a SHOULD and no endpoint sets it), so this path is
  // unreachable today — it is written because leaving `own_org` in the enum
  // with no handling is how a stored value later widens a read by surprise.
  const members = await Customer
    .find({ organisationId: req.customer.organisationId })
    .select('_id')

  return {
    customerId: {
      $in: [
        req.customer._id,
        req.customer.organisationId,
        ...members.map(m => m._id)
      ]
    }
  }
}

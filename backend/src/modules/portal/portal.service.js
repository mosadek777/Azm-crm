// spec 008 — the customer portal. Sign-in (FR-001).
//
// SEPARATE FROM THE STAFF MODULE ON PURPOSE. A customer is not a User: they hold
// no branch, no department and no role, so none of `authenticate`,
// `authorize()` or `scopeFilter` applies to them. Reusing the staff path would
// have meant loosening it, and the staff scope predicate is the one thing this
// project has refused to loosen. This module gets its own middleware, its own
// predicate (§11 `customer = session`) and its own reads.
//
// WHAT DECISION 31 DID AND DID NOT SHORTCUT. It replaced the one-time code with
// a password for the demo. It did NOT touch identity binding: AS-01's rule that
// a sign-in binds to exactly one customer, and that an address matching two
// customers is refused neutrally rather than offering a choice, is implemented
// here in full. That rule is the part with a disclosure consequence.

import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { ContactPoint } from '../../DB/models/contact-point.model.js'
import { Customer } from '../../DB/models/customer.model.js'
import { PortalIdentity } from '../../DB/models/portal-identity.model.js'
import { recordAudit } from '../../utils/audit.js'

// §6 E-02: "Never a message revealing whether the address is known." Every
// failure below returns THIS body — unknown address, known address with no
// portal identity, wrong password, disabled identity, and an address shared by
// two customers all answer identically. A caller cannot use the refusal to
// learn whether an address is a customer of ours.
const REFUSED = {
  ar: 'تعذر تسجيل الدخول. تحقق من البيانات المدخلة أو تواصل معنا.',
  en: 'Could not sign in. Check the details entered, or contact us.'
}

// The audience claim keeps the two token populations apart. A staff token has
// no `aud`, so it cannot satisfy the portal middleware; a portal token's `sub`
// is a PortalIdentity id, which `User.findById` will not match. Neither
// direction works even by accident.
export const PORTAL_AUDIENCE = 'portal'

// `actorRef` is a printable string on every audit entry, and for a customer it
// carries this prefix. That is what satisfies FR-020's "attributed to the
// customer, DISTINGUISHABLE from a staff action" — a staff entry's actorRef is
// a bare user id, so the two can never be confused by a reader or a query.
export const customerActorRef = (customerId) => `customer:${customerId}`

export const signIn = async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {}

    if (!email || !password) {
      return res.status(400).json({
        message: {
          ar: 'البريد الإلكتروني وكلمة المرور مطلوبان',
          en: 'Email and password are required'
        },
        fields: [!email && 'email', !password && 'password'].filter(Boolean)
      })
    }

    const attempted = String(email).trim().toLowerCase()

    // AS-01 binds on a CONTACT POINT, not on a login field of its own: §2 —
    // "Verified contact point … Required to authenticate".
    const points = await ContactPoint.find({
      channelType: 'email',
      normalisedValue: attempted
    })

    const customerIds = [...new Set(points.map(p => String(p.customerId)))]

    // §6 E-01 / AS-01: "given the same number is a contact point of two
    // customers, sign-in is refused with a neutral message and the ambiguity is
    // raised to staff — the customer is never asked to choose."
    //
    // High severity because it is exactly the shape of a cross-customer access
    // attempt (§10), and because a shared address is a data problem staff have
    // to resolve — nobody finds out unless the log says so.
    if (customerIds.length > 1) {
      await recordAudit({
        actorRef: `portal:${attempted}`,
        action: 'portal.signin_refused_ambiguous',
        entityType: 'ContactPoint',
        after: { attempted, matchedCustomers: customerIds.length, customerIds },
        severity: 'high',
        req,
        session: null
      })
      return res.status(401).json({ message: REFUSED })
    }

    // A helper so every failure path records an attempt and answers identically.
    // §10 requires "Sign-in attempted / succeeded / failed / refused-ambiguous"
    // with the contact point, method, timestamp, IP and outcome.
    const refuse = async (reason) => {
      await recordAudit({
        actorRef: `portal:${attempted}`,
        action: 'portal.signin_failed',
        entityType: 'PortalIdentity',
        after: { attempted, method: 'password', outcome: reason },
        severity: 'normal',
        req,
        session: null
      })
      return res.status(401).json({ message: REFUSED })
    }

    if (customerIds.length === 0) return await refuse('no_matching_contact_point')

    const identity = await PortalIdentity
      .findOne({ customerId: customerIds[0] })
      .select('+passwordHash')

    if (!identity) return await refuse('no_portal_identity')
    if (identity.state !== 'active') return await refuse(`identity_${identity.state}`)
    if (!identity.passwordHash) return await refuse('no_credential')

    const ok = await bcrypt.compare(String(password), identity.passwordHash)
    if (!ok) return await refuse('bad_password')

    const customer = await Customer.findById(identity.customerId)
    if (!customer) return await refuse('customer_missing')

    // §10: "Session created … identity, timestamp, cause".
    await recordAudit({
      actorRef: customerActorRef(identity.customerId),
      action: 'portal.signin_succeeded',
      entityType: 'PortalIdentity',
      entityId: identity._id,
      after: { method: identity.authMethod, customerId: String(identity.customerId) },
      severity: 'normal',
      req,
      session: null
    })

    const token = jwt.sign(
      { sub: identity._id.toString(), aud: PORTAL_AUDIENCE },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    return res.json({
      token,
      customer: {
        _id: customer._id,
        displayName: customer.displayName,
        preferredLanguage: customer.preferredLanguage
      },
      locale: identity.locale
    })
  } catch (err) { return next(err) }
}

// The signed-in customer's own record. Every portal screen needs it, and it is
// the smallest possible check that a session is live.
export const me = async (req, res, next) => {
  try {
    return res.json({
      customer: {
        _id: req.customer._id,
        displayName: req.customer.displayName,
        preferredLanguage: req.customer.preferredLanguage,
        accountRef: req.customer.accountRef
      },
      locale: req.portalIdentity.locale,
      // §3 and FR-006. Sent so the client can render, never so it can decide —
      // the widening it permits is applied server-side in the read predicate.
      organisationVisibility: req.portalIdentity.organisationVisibility
    })
  } catch (err) { return next(err) }
}

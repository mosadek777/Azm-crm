// spec 010 — implements SEC-02, SEC-03, SEC-04, SEC-05, FR-002, FR-003,
//            FR-004, FR-005, FR-008, AS-01, AS-03; constitution IV
//
// Establishes WHETHER the caller may perform this action on this record.
// The Angular route guard hides screens as a courtesy; this is the control.
//
// TWO GATES, and the difference matters:
//
//   authorize(...roles)          — role only, for actions with no target record
//                                  (creating a branch, listing your own scope)
//   authorizeOnTarget(...roles)  — role AS HELD ON THIS RECORD (FR-005, AS-03)
//
// The second is the one the constitution is about. A user who is AGT in branch
// B and LEAD in branch C must not hold LEAD on a branch B record, so the roles
// are resolved against the target, never unioned. See src/utils/scope.js.
//
// AS-01: an out-of-scope record is INDISTINGUISHABLE FROM NON-EXISTENT. Not
// 403 — 404. A 403 confirms the record exists, which is itself a disclosure,
// and spec 010 §8 requires refusals "must not disclose the existence of
// out-of-scope records".
//
// STILL TWO OF THREE DIMENSIONS: branch and department. Team is undefined in
// every spec — see src/utils/scope.js.
//
// NO TRANSACTION SESSION HERE, and that is a decision, not an omission.
//
// Every audit entry this file writes records something that was REFUSED, so by
// definition no mutation accompanies it — the request never reached a service.
// A single-document insert is already atomic, so a transaction would add
// round-trips and no safety.
//
// There is also a reason it must NOT join a caller's transaction even later:
// this middleware runs before the service, and a refusal must be recorded
// whether or not anything downstream would have committed. An entry that rolled
// back with a failed request would lose exactly the security events §10 calls
// out — "out-of-scope access attempted" is evidence, and evidence that
// disappears when the attempt fails is worthless.

import { recordAudit } from '../utils/audit.js'
import { rolesForTarget } from '../utils/scope.js'

const FORBIDDEN = {
  ar: 'غير مصرح لك بتنفيذ هذا الإجراء',
  en: 'You are not permitted to perform this action'
}

const NOT_FOUND = {
  ar: 'غير موجود',
  en: 'Not found'
}

// Role only. No target record involved.
export const authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const held = (req.assignments ?? []).map(a => a.role)
      if (held.some(role => allowedRoles.includes(role))) return next()

      await recordAudit({
        actorId: req.user?._id ?? null,
        actorRef: req.user?._id?.toString() ?? 'anonymous',
        action: 'permission.refused',
        after: {
          attempted: `${req.method} ${req.originalUrl}`,
          rolesHeld: held,
          rolesRequired: allowedRoles
        },
        req,
        // Stands alone, and must: a refusal is evidence, and evidence may not
        // roll back with the request it refused.
        session: null
      })

      return res.status(403).json({ message: FORBIDDEN })
    } catch (err) {
      return next(err)
    }
  }
}

// Role AS HELD ON THE TARGET RECORD. `load` fetches the record and returns it,
// or null. It must return the record WITHOUT applying scope — this gate decides
// scope, and a loader that pre-filtered would make an out-of-scope record
// indistinguishable from a genuinely missing one *in the log*, losing the
// security event AS-01 requires.
export const authorizeOnTarget = (load, ...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const target = await load(req)

      if (!target) return res.status(404).json({ message: NOT_FOUND })

      // The model states its own co-ordinate. An earlier version inferred it
      // with `target.departmentId ?? target._id`, which tested a Branch's own
      // id against the caller's DEPARTMENT list and refused in-scope reads.
      // Guessing a record's scope dimensions from its field names is how a
      // scoping bug gets written.
      const coordinate = typeof target.scopeCoordinate === 'function'
        ? target.scopeCoordinate()
        : { branchId: target.branchId, departmentId: target.departmentId }

      const held = rolesForTarget(req.assignments ?? [], coordinate)

      if (!held.length) {
        // §10: "Out-of-scope access attempted | actor, target type and
        // identifier, timestamp, IP — SECURITY EVENT". High severity, and the
        // caller is told only "not found" (AS-01).
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action: 'scope.out_of_scope_access_attempted',
          entityType: target.constructor?.modelName ?? null,
          entityId: target._id,
          after: { attempted: `${req.method} ${req.originalUrl}` },
          severity: 'high',
          req,
          session: null
        })
        return res.status(404).json({ message: NOT_FOUND })
      }

      if (!held.some(role => allowedRoles.includes(role))) {
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action: 'permission.refused',
          entityType: target.constructor?.modelName ?? null,
          entityId: target._id,
          after: {
            attempted: `${req.method} ${req.originalUrl}`,
            rolesHeldOnTarget: held,
            rolesRequired: allowedRoles
          },
          req,
          session: null
        })
        return res.status(403).json({ message: FORBIDDEN })
      }

      req.target = target
      req.rolesOnTarget = held
      return next()
    } catch (err) {
      return next(err)
    }
  }
}

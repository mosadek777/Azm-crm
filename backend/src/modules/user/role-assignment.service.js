// spec 010 — implements §10's "Role assignment granted / revoked" and §11's
// "grant / revoke role assignment"; FR-002, FR-021, AS-04, E-01;
// decision 43; constitution II, IV.
//
// ── WHY THIS DID NOT EXIST UNTIL NOW ────────────────────────────────────────
//
// `§10` and `§11` both name revocation as a first-class action with its audit
// shape and its authorisation rule already decided. **No `FR-*` requires it** —
// the same category as the `Team` entity and the shared-contact-point defect,
// where the spec assumes behaviour it never demands, so the clarification gate
// could not see the gap.
//
// It was blocked on ONE question: what happens to a user left holding zero
// roles. Answered by the project owner 2026-09-14 — **refuse the last
// revocation** — and recorded as decision 43 (`decisions-pending.md` §25).
//
// Until now, changing somebody's role meant deleting the account and recreating
// it, which changes their id and orphans every audit entry and ticket that
// names them.
//
// ── FOUR REFUSALS, AND WHERE EACH COMES FROM ────────────────────────────────
//
//   1. THE LAST ROLE            decision 43. A user always holds at least one
//                               assignment; an account that authenticates and
//                               can reach nothing is worse than a refusal.
//
//   2. THE LAST ADMINISTRATOR   `E-01`, extended from deactivation to
//                               revocation. Without this the rule could be
//                               walked around with a different verb, which is
//                               `E-01` in another shape rather than a new
//                               decision.
//
//   3. YOUR OWN ASSIGNMENTS     by analogy to `E-02` (you may not deactivate
//                               yourself). An administrator who revoked their
//                               own `ADM` is the only person who cannot undo
//                               it. Developer's reading, recorded in §25.
//
//   4. SCOPE                    `FR-021` / `AS-04`. The granted scope cannot
//                               exceed the granter's, and the TARGET must be
//                               reachable by the granter — 404, never 403.
//
// ── WHAT IS NOT REFUSED, AND IS REPORTED INSTEAD ────────────────────────────
//
// A revocation can leave somebody holding tickets their remaining scope no
// longer covers. `002 E-12` covers the DEACTIVATION case and says nothing about
// a role change. Refusing would block legitimate reorganisation; doing it
// silently would strand work nobody can see. So the response carries
// `strandedTickets` — a COUNT, never the records, because the caller may not be
// scoped to them — and nothing is moved. Moving them would be inventing
// `E-12`'s behaviour for a case it does not cover.

import mongoose from 'mongoose'
import { User } from '../../DB/models/user.model.js'
import { RoleAssignment, ROLES } from '../../DB/models/role-assignment.model.js'
import { Ticket } from '../../DB/models/ticket.model.js'
import { recordAudit, redact } from '../../utils/audit.js'
import { reachableScope, resolveGrantedScope, assignmentCovers } from '../../utils/scope.js'

const bilingual = (ar, en) => ({ ar, en })
const NOT_FOUND = bilingual('المستخدم غير موجود', 'User not found')

const bad = (res, ar, en, fields) =>
  res.status(400).json({ message: { ar, en }, ...(fields ? { fields } : {}) })

const refuse = (res, ar, en) => res.status(409).json({ message: bilingual(ar, en) })

/**
 * The target, loaded through the SAME overlap predicate `listUsers` uses.
 *
 * An administrator sees a user when at least one branch and one department are
 * shared. Anyone outside that is absent from the list and 404 here — the same
 * record, the same answer, so this endpoint cannot be used to discover that a
 * user exists in a branch the caller cannot see (AS-01, constitution IV).
 */
const targetInScope = async (req, id) => {
  if (!mongoose.isValidObjectId(id)) return null
  const user = await User.findById(id).catch(() => null)
  if (!user) return null

  const scope = reachableScope(req.assignments)
  if (scope.unrestricted) return user

  const theirs = await RoleAssignment.find({ userId: user._id })
  const overlaps = theirs.some(a =>
    a.branchIds.some(b => scope.branchIds.includes(String(b))) &&
    a.departmentIds.some(d => scope.departmentIds.includes(String(d))))

  return overlaps ? user : null
}

/**
 * How many tickets this user holds that their assignments no longer cover.
 *
 * Evaluated AFTER the change, against what they are left with. A count, never
 * the records: the caller may be scoped to some of those tickets and not
 * others, and returning them would leak across the predicate.
 */
const strandedFor = async (userId) => {
  const remaining = await RoleAssignment.find({ userId })
  const held = await Ticket.find({ assignedAgentId: userId }).select('branchId departmentId')
  return held.filter(t => !remaining.some(a =>
    a.unrestricted || assignmentCovers(a, { branchId: t.branchId, departmentId: t.departmentId }))).length
}

/**
 * Is this user the last active administrator? `E-01`'s population.
 *
 * ⚠ THE BREAK-GLASS ROOT DOES NOT COUNT, and leaving it in made `E-01` VACUOUS.
 *
 * `E-01`: "Last administrator is deactivated — refused. At least one active
 * administrator must remain." The root (`010 E-07`) holds an `ADM` assignment
 * and is active, so counting it means the population is never smaller than one
 * *before* the target is considered — and the refusal never fires in any real
 * deployment, because the root always exists. The rule read as enforced and
 * was not. No test caught it because no test asserted the refusal, only the
 * paths around it.
 *
 * Excluding it is what `E-01` means: the root is the account of last resort,
 * kept for the case where nobody else can get in. "At least one administrator
 * must remain" is a statement about the people who run the system day to day.
 * If they are all gone, the break-glass identity is exactly the thing you are
 * now forced to use — which is the situation `E-01` exists to prevent, not the
 * reason it need not fire.
 *
 * Shared with `deactivateUser`, so the deactivation path and the revocation
 * path cannot drift on who counts.
 */
export const isLastActiveAdmin = async (userId) => {
  const adminAssignments = await RoleAssignment.find({ role: 'ADM' })
  const adminIds = adminAssignments
    .filter(a => !a.unrestricted)
    .map(a => String(a.userId))

  if (!adminIds.includes(String(userId))) return false

  const activeAdmins = await User.countDocuments({
    _id: { $in: adminIds }, state: 'active'
  })
  return activeAdmins <= 1
}

// ---------------------------------------------------------------------------
// §11 — grant
// ---------------------------------------------------------------------------
export const grantRole = async (req, res, next) => {
  const session = await mongoose.startSession()
  try {
    const target = await targetInScope(req, req.params.id)
    if (!target) return res.status(404).json({ message: NOT_FOUND })

    // Refusal 3. Stated before anything else is checked, so the message is
    // about what you did rather than about a scope you were not thinking about.
    if (String(target._id) === String(req.user._id)) {
      return refuse(res,
        'مرفوض: لا يمكنك تعديل أدوارك بنفسك — اطلب ذلك من مسؤول نظام آخر',
        'Refused: you cannot change your own roles — another administrator must do it')
    }

    const { role, scope } = req.body ?? {}
    if (!ROLES.includes(role)) {
      return bad(res, 'دور غير صحيح', `role must be one of: ${ROLES.join(', ')}`, ['role'])
    }

    // §3's unique index is (userId, role): several roles yes, the same role
    // twice no. Answered as a 409 rather than letting the index throw a 500.
    const already = await RoleAssignment.findOne({ userId: target._id, role })
    if (already) {
      return refuse(res,
        'الموظف يحمل هذا الدور بالفعل',
        'That user already holds this role')
    }

    // FR-021 / AS-04. ONE implementation, the same one user creation calls: a
    // granter may not exceed their own scope, and an EMPTY request resolves to
    // the granter's scope, never to all.
    const granted = resolveGrantedScope({
      granterAssignments: req.assignments,
      requested: { branchIds: scope?.branchIds, departmentIds: scope?.departmentIds }
    })
    if (!granted.ok) {
      if (granted.reason === 'explicit_scope_required') {
        return bad(res,
          'يجب تحديد الفروع والأقسام صراحةً',
          'An unrestricted granter must name the branches and departments explicitly',
          ['scope'])
      }
      return res.status(403).json({
        message: bilingual(
          'مرفوض: لا يمكن منح نطاق يتجاوز نطاقك',
          'Refused: a grant may not exceed your own scope'),
        excessBranches: granted.excessBranches,
        excessDepartments: granted.excessDepartments
      })
    }

    const assignmentId = new mongoose.Types.ObjectId()
    await session.withTransaction(async () => {
      // §10: "Role assignment granted / revoked | actor, subject, role, scope
      // granted, timestamp". Written before the assignment, inside the same
      // transaction — E-11.
      await recordAudit({
        actorId: req.user._id,
        actorRef: req.user._id.toString(),
        action: 'role_assignment.granted',
        entityType: 'RoleAssignment',
        entityId: assignmentId,
        before: null,
        after: {
          userId: String(target._id),
          role,
          grantedBy: String(req.user._id),
          branchIds: granted.branchIds,
          departmentIds: granted.departmentIds
        },
        req,
        session
      })
      await RoleAssignment.create([{
        _id: assignmentId,
        userId: target._id,
        role,
        grantedBy: req.user._id,
        branchIds: granted.branchIds,
        departmentIds: granted.departmentIds
      }], { session })
    })

    const roles = (await RoleAssignment.find({ userId: target._id })).map(a => a.role)
    return res.status(201).json({
      user: { ...redact(target), roles },
      granted: { role, branchIds: granted.branchIds, departmentIds: granted.departmentIds }
    })
  } catch (err) {
    return next(err)
  } finally {
    await session.endSession()
  }
}

// ---------------------------------------------------------------------------
// §11 — revoke
// ---------------------------------------------------------------------------
export const revokeRole = async (req, res, next) => {
  const session = await mongoose.startSession()
  try {
    const target = await targetInScope(req, req.params.id)
    if (!target) return res.status(404).json({ message: NOT_FOUND })

    if (String(target._id) === String(req.user._id)) {
      return refuse(res,
        'مرفوض: لا يمكنك تعديل أدوارك بنفسك — اطلب ذلك من مسؤول نظام آخر',
        'Refused: you cannot change your own roles — another administrator must do it')
    }

    const { role } = req.params
    const assignment = await RoleAssignment.findOne({ userId: target._id, role })
    // Absent role and absent user answer the same 404. A caller who may reach
    // this user learns nothing from the difference, and it keeps one shape.
    if (!assignment) return res.status(404).json({ message: NOT_FOUND })

    const held = await RoleAssignment.countDocuments({ userId: target._id })

    // REFUSAL 1 — decision 43, the project owner's answer. Checked before the
    // administrator rule, because it is the broader statement: an account with
    // no roles authenticates and can reach nothing.
    if (held <= 1) {
      return refuse(res,
        'مرفوض: لا يمكن ترك المستخدم بدون أي دور. امنحه دورًا آخر أولًا، أو عطّل الحساب.',
        'Refused: a user cannot be left with no role at all. Grant another role first, or deactivate the account.')
    }

    // REFUSAL 2 — E-01, extended from deactivation to revocation.
    if (role === 'ADM' && await isLastActiveAdmin(target._id)) {
      return refuse(res,
        'مرفوض: يجب أن يبقى مدير نظام واحد نشط على الأقل',
        'Refused: at least one active administrator must remain')
    }

    await session.withTransaction(async () => {
      // §10 again. `before` carries the assignment as it stood, because a
      // revocation's whole content is what was taken away.
      await recordAudit({
        actorId: req.user._id,
        actorRef: req.user._id.toString(),
        action: 'role_assignment.revoked',
        entityType: 'RoleAssignment',
        entityId: assignment._id,
        before: {
          userId: String(target._id),
          role: assignment.role,
          branchIds: assignment.branchIds.map(String),
          departmentIds: assignment.departmentIds.map(String),
          grantedBy: assignment.grantedBy ? String(assignment.grantedBy) : null,
          grantedAt: assignment.grantedAt
        },
        after: null,
        req,
        session
      })
      await RoleAssignment.deleteOne({ _id: assignment._id }, { session })
    })

    const roles = (await RoleAssignment.find({ userId: target._id })).map(a => a.role)
    return res.json({
      user: { ...redact(target), roles },
      revoked: role,
      // See the header: reported, never refused, and never moved. A count, not
      // the records.
      strandedTickets: await strandedFor(target._id)
    })
  } catch (err) {
    return next(err)
  } finally {
    await session.endSession()
  }
}

// spec 010 — implements SEC-01, FR-001, FR-008; constitution II
//
// Administrator-only user lifecycle. There is no self-registration: FR-001
// makes creation an administrator action, and E-08 forbids automatic account
// creation outright.
//
// DELETION IS NOT OFFERED, per FR-001 — deactivate and reactivate only. There
// is no deleteUser function in this file and there must not be one.
//
// OPEN GAP, recorded in docs/trace.md: FR-001 also requires deactivation to
// "return assigned tickets to the team queue" (spec 002 E-12). Tickets are
// step 5. Deactivation is therefore ~90% of FR-001, not all of it.

import bcrypt from 'bcrypt'
import { checkPassword, passwordRefusal } from '../../utils/password-policy.js'
import mongoose from 'mongoose'
import { User, LANGUAGES } from '../../DB/models/user.model.js'
import { RoleAssignment, ROLES } from '../../DB/models/role-assignment.model.js'
import { recordAudit, redact } from '../../utils/audit.js'
import { resolveGrantedScope, reachableScope } from '../../utils/scope.js'
import { RoleAssignment as RA } from '../../DB/models/role-assignment.model.js'

export const createUser = async (req, res, next) => {
  try {
    const { displayName, email, password, defaultLanguage, roles, scope } = req.body ?? {}

    const missing = []
    if (!displayName) missing.push('displayName')
    if (!email) missing.push('email')
    if (!password) missing.push('password')
    if (!defaultLanguage) missing.push('defaultLanguage')
    if (!Array.isArray(roles) || roles.length === 0) missing.push('roles')

    if (missing.length) {
      return res.status(400).json({
        message: {
          ar: `حقول مطلوبة ناقصة: ${missing.join('، ')}`,
          en: `Required fields are missing: ${missing.join(', ')}`
        },
        fields: missing
      })
    }

    // spec 010 FR-007 — the password policy, enforced where a password is set.
    // Never at sign-in: applying it there would lock out every account whose
    // password predates the policy. Values are unratified, see
    // config/security-policy.js.
    const policy = checkPassword(password)
    if (!policy.ok) return res.status(400).json(passwordRefusal(policy.failures))

    if (!LANGUAGES.includes(defaultLanguage)) {
      return res.status(400).json({
        message: {
          ar: `اللغة الافتراضية يجب أن تكون إحدى: ${LANGUAGES.join('، ')}`,
          en: `defaultLanguage must be one of: ${LANGUAGES.join(', ')}`
        },
        fields: ['defaultLanguage']
      })
    }

    const unknownRoles = roles.filter(r => !ROLES.includes(r))
    if (unknownRoles.length) {
      return res.status(400).json({
        message: {
          ar: `أدوار غير معروفة: ${unknownRoles.join('، ')}`,
          en: `Unknown roles: ${unknownRoles.join(', ')}`
        },
        fields: ['roles']
      })
    }

    const normalisedEmail = String(email).toLowerCase().trim()
    if (await User.findOne({ email: normalisedEmail })) {
      return res.status(409).json({
        message: {
          ar: 'هذا البريد الإلكتروني مستخدم بالفعل',
          en: 'That email address is already in use'
        },
        fields: ['email']
      })
    }

    // FR-021 / AS-04: the granted scope may not exceed the granter's own, and
    // an omitted scope resolves to the GRANTER'S scope — never to "all".
    // Resolved to a concrete list here and stored concrete, so the assignment
    // cannot widen later just because the granter's scope widened.
    const granted = resolveGrantedScope({
      granterAssignments: req.assignments,
      requested: scope
    })

    if (!granted.ok) {
      if (granted.reason === 'explicit_scope_required') {
        return res.status(400).json({
          message: {
            ar: 'يجب تحديد الفروع والأقسام صراحةً عند المنح من نطاق غير مقيد',
            en: 'An unrestricted granter must name branches and departments explicitly'
          },
          fields: ['scope']
        })
      }
      // AS-04: "an attempt to grant branch C is refused".
      await recordAudit({
        actorId: req.user._id,
        actorRef: req.user._id.toString(),
        action: 'permission.refused',
        after: {
          attempted: 'grant scope exceeding own',
          excessBranches: granted.excessBranches,
          excessDepartments: granted.excessDepartments,
          granterScope: reachableScope(req.assignments)
        },
        severity: 'high',
        req,
        // Stands alone: the grant was refused, so nothing was written.
        session: null
      })
      return res.status(403).json({
        message: {
          ar: 'مرفوض: لا يمكنك منح نطاق أوسع من نطاقك',
          en: 'Refused: you cannot grant a scope wider than your own'
        },
        excess: { branches: granted.excessBranches, departments: granted.excessDepartments }
      })
    }

    // Hashing happens OUTSIDE the transaction on purpose. withTransaction may
    // re-run its callback on a transient error, and bcrypt at 12 rounds is
    // deliberately slow — no reason to pay for it twice.
    const passwordHash = await bcrypt.hash(password, Number(process.env.SALT_ROUNDS))

    // The entry names the record before the record exists, so the id is ours
    // to generate. See utils/audit.js.
    const userId = new mongoose.Types.ObjectId()

    const doc = {
      _id: userId,
      displayName,
      email: normalisedEmail,
      passwordHash,
      defaultLanguage,
      state: 'active'
    }

    // ONE TRANSACTION covering the user, every role assignment, and every
    // audit entry for both. Before this, a failure partway through the role
    // loop left a user holding some of their roles and an audit log claiming
    // all of them — a user with fewer rights than the log says were granted,
    // which is the worst direction for that error to go.
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        // §10: "User created | actor, subject, timestamp, before, after".
        // If this throws the transaction aborts and no user is inserted (E-11).
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action: 'user.created',
          entityType: 'User',
          entityId: userId,
          before: null,
          after: { ...redact(doc), roles, scope: { branchIds: granted.branchIds, departmentIds: granted.departmentIds } },
          req,
          session
        })

        // Array form: mongoose requires it whenever options are passed.
        await User.create([doc], { session })

        // §10: "Role assignment granted | actor, subject, role, scope granted,
        // timestamp".
        for (const role of roles) {
          const assignmentId = new mongoose.Types.ObjectId()
          await recordAudit({
            actorId: req.user._id,
            actorRef: req.user._id.toString(),
            action: 'role_assignment.granted',
            entityType: 'RoleAssignment',
            entityId: assignmentId,
            before: null,
            after: {
              userId,
              role,
              grantedBy: req.user._id,
              branchIds: granted.branchIds,
              departmentIds: granted.departmentIds
            },
            req,
            session
          })
          await RoleAssignment.create([{
            _id: assignmentId,
            userId,
            role,
            grantedBy: req.user._id,
            branchIds: granted.branchIds,
            departmentIds: granted.departmentIds
          }], { session })
        }
      })
    } finally {
      // Always ended, committed or aborted. A leaked session holds a server
      // resource until it times out.
      await session.endSession()
    }

    // Read AFTER the transaction closed, so this sees committed state and needs
    // no session of its own.
    const created = await User.findById(userId)
    return res.status(201).json({ user: { ...redact(created), roles } })
  } catch (err) {
    return next(err)
  }
}

const setState = (nextState, action) => async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id)

    if (!target) {
      return res.status(404).json({
        message: { ar: 'المستخدم غير موجود', en: 'User not found' }
      })
    }

    if (target.state === nextState) {
      return res.status(409).json({
        message: {
          ar: `المستخدم بالفعل في حالة "${nextState}"`,
          en: `User is already in state "${nextState}"`
        }
      })
    }

    // E-01: "Last administrator is deactivated — refused. At least one active
    // administrator must remain."
    if (nextState === 'deactivated') {
      const adminIds = (await RoleAssignment.find({ role: 'ADM' })).map(a => a.userId)
      const activeAdmins = await User.countDocuments({ _id: { $in: adminIds }, state: 'active' })
      const targetIsAdmin = adminIds.some(id => id.equals(target._id))

      if (targetIsAdmin && activeAdmins <= 1) {
        return res.status(409).json({
          message: {
            ar: 'مرفوض: يجب أن يبقى مدير نظام واحد نشط على الأقل',
            en: 'Refused: at least one active administrator must remain'
          }
        })
      }

      // E-02: "Administrator removes their own administration permission —
      // refused." Deactivating your own account is the same act.
      if (target._id.equals(req.user._id)) {
        return res.status(409).json({
          message: {
            ar: 'مرفوض: لا يمكنك تعطيل حسابك الخاص',
            en: 'Refused: you cannot deactivate your own account'
          }
        })
      }
    }

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action,
          entityType: 'User',
          entityId: target._id,
          before: { state: target.state },
          after: {
            state: nextState,
            // FR-001's ticket-reassignment clause lands in step 5. Recorded as
            // absent rather than reported as zero, so the log does not imply a
            // reassignment ran.
            ticketsReassigned: null
          },
          req,
          session
        })

        target.state = nextState
        await target.save({ session })
      })
    } finally {
      await session.endSession()
    }

    return res.json({ user: redact(target) })
  } catch (err) {
    return next(err)
  }
}

export const deactivateUser = setState('deactivated', 'user.deactivated')
export const reactivateUser = setState('active', 'user.reactivated')

// spec 010 — implements FR-004, AS-01; §11 "list / get users — branch ∈ scope
// AND department ∈ scope"
//
// A user carries no branch or department of their own; their scope lives on
// their assignments. So "users in my scope" means users holding an assignment
// that overlaps mine. An unrestricted caller sees everyone.
export const listUsers = async (req, res, next) => {
  try {
    const scope = reachableScope(req.assignments)

    let userIds = null
    if (!scope.unrestricted) {
      const overlapping = await RA.find({
        branchIds: { $in: scope.branchIds },
        departmentIds: { $in: scope.departmentIds }
      })
      userIds = [...new Set(overlapping.map(a => String(a.userId)))]
    }

    const users = await User.find(userIds ? { _id: { $in: userIds } } : {})

    // Out-of-scope users are absent from the list, not marked as hidden —
    // AS-01: "none appears in any list, search, count or aggregate".
    return res.json({ users: users.map(u => redact(u)) })
  } catch (err) {
    return next(err)
  }
}

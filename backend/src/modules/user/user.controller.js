// spec 010 — implements FR-001, FR-002
// Every route is administrator-only. The gate is server-side (constitution IV).

import * as userservice from './user.service.js'
import * as roles from './role-assignment.service.js'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/permission.middleware.js'
import { Router } from 'express'

const router = Router()

/**
 * @swagger
 * /user:
 *   get:
 *     summary: List users within the caller's scope (spec 010 FR-004, AS-01)
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Users overlapping the caller's branch and department scope. Out-of-scope users are absent, not marked hidden.
 *       403: { description: 'Requires LEAD, MGR, ADM or AUD' }
 */
// §9: leads and above may view users in their own scope.
router.get("/", authenticate, authorize('LEAD', 'MGR', 'ADM', 'AUD'), userservice.listUsers)

/**
 * @swagger
 * /user:
 *   post:
 *     summary: Create a staff user (spec 010 FR-001). Administrator-only — there is no self-registration (E-08).
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [displayName, email, password, defaultLanguage, roles]
 *             properties:
 *               displayName: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *               defaultLanguage: { type: string, enum: [ar, en] }
 *               roles: { type: array, items: { type: string, enum: [AGT, LEAD, MGR, ADM, AUD] } }
 *               scope:
 *                 type: object
 *                 description: Omitted resolves to the granter's own scope, never to "all" (FR-021, AS-04)
 *                 properties:
 *                   branchIds: { type: array, items: { type: string } }
 *                   departmentIds: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Missing or invalid fields, content: { application/json: { schema: { $ref: '#/components/schemas/Refusal' } } } }
 *       403: { description: 'Refused: role is not ADM, or the requested scope exceeds the granter''s own (FR-021)' }
 */
router.post("/", authenticate, authorize('ADM'), userservice.createUser)

/**
 * @swagger
 * /user/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a user (spec 010 FR-001, E-01, E-02)
 *     tags: [User]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Deactivated }
 *       404: { description: User not found }
 *       409: { description: Refused — last administrator (E-01) or self-deactivation (E-02) }
 */
router.patch("/:id/deactivate", authenticate, authorize('ADM'), userservice.deactivateUser)

/**
 * @swagger
 * /user/{id}/reactivate:
 *   patch:
 *     summary: Reactivate a deactivated user (spec 010 FR-001)
 *     tags: [User]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Reactivated }
 *       404: { description: User not found }
 */
router.patch("/:id/reactivate", authenticate, authorize('ADM'), userservice.reactivateUser)

/**
 * spec 010 §10 and §11 — grant and revoke a role assignment.
 *
 * ADM only: §9's "Assign a role, within own scope | ADM ✓", and the row under
 * it, "Assign a role beyond own scope | **never**", which `resolveGrantedScope`
 * enforces rather than this route.
 *
 * @swagger
 * /user/{id}/role:
 *   post:
 *     summary: Grant a role to an existing user (spec 010 §11, FR-021, AS-04)
 *     tags: [User]
 *     description: >
 *       The granted scope may not exceed the granter's, and an empty scope set
 *       resolves to the granter's own scope — never to all (FR-021, AS-04).
 *       An administrator may not change their own roles (by analogy to E-02,
 *       decision 43's write-up). A user outside the caller's scope answers 404,
 *       never 403.
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [AGT, LEAD, MGR, ADM, AUD] }
 *               scope:
 *                 type: object
 *                 properties:
 *                   branchIds: { type: array, items: { type: string } }
 *                   departmentIds: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Granted }
 *       403: { description: The grant exceeds the granter's scope (FR-021) }
 *       404: { description: User not found or out of scope — byte-identical }
 *       409: { description: Already holds that role, or you named yourself }
 */
router.post("/:id/role", authenticate, authorize('ADM'), roles.grantRole)

/**
 * @swagger
 * /user/{id}/role/{role}:
 *   delete:
 *     summary: Revoke a role assignment (spec 010 §11; decision 43)
 *     tags: [User]
 *     description: >
 *       DECISION 43: a user may not be left holding zero roles — the last
 *       revocation is refused, because an account that authenticates and can
 *       reach nothing is worse than a refusal that says why. E-01 is extended
 *       from deactivation to revocation, so the last active administrator's ADM
 *       role cannot be taken either.
 *
 *       The response carries `strandedTickets`: how many tickets the user still
 *       holds that their remaining scope no longer covers. A COUNT, never the
 *       records. Nothing is moved — 002 E-12 covers deactivation, not a role
 *       change, and moving them would invent its behaviour for a case it does
 *       not cover.
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *       - { name: role, in: path, required: true, schema: { type: string, enum: [AGT, LEAD, MGR, ADM, AUD] } }
 *     responses:
 *       200: { description: Revoked — `strandedTickets` counts what fell out of reach }
 *       404: { description: User not found, out of scope, or does not hold that role }
 *       409: { description: The last role (decision 43), the last administrator (E-01), or yourself }
 */
router.delete("/:id/role/:role", authenticate, authorize('ADM'), roles.revokeRole)

export default router

// spec 010 — implements FR-001, FR-002
// Every route is administrator-only. The gate is server-side (constitution IV).

import * as userservice from './user.service.js'
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
 *       403: { description: Requires LEAD, MGR, ADM or AUD }
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

export default router

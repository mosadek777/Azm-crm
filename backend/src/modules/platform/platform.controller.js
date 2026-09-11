// spec 012 — implements FR-007, FR-008; §11 contracts
//
// §11 scope predicates, as written in the spec:
//   list branches / list departments  — branch ∈ scope AND department ∈ scope
//   manage branch / manage department — admin; within own scope
//
// There is no DELETE route. FR-015: branches and departments are deactivatable
// but never deletable while any record references them, and historical records
// retain their reference (spec 009 FR-023). Deactivation lands with FR-015.

import * as platformservice from './platform.service.js'
import { Branch } from '../../DB/models/branch.model.js'
import { Department } from '../../DB/models/department.model.js'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize, authorizeOnTarget } from '../../middlewares/permission.middleware.js'
import { Router } from 'express'

const router = Router()

/**
 * @swagger
 * /platform/branches:
 *   get:
 *     summary: List branches in the caller's scope (spec 012 FR-008)
 *     tags: [Platform]
 *     responses: { 200: { description: OK } }
 *   post:
 *     summary: Create a branch (spec 012 FR-008, FR-004 bilingual name)
 *     tags: [Platform]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, timezone, defaultLocale]
 *             properties:
 *               name: { $ref: '#/components/schemas/LocalizedText' }
 *               timezone: { type: string, example: Africa/Cairo }
 *               defaultLocale: { type: string, enum: [ar, en] }
 *     responses:
 *       201: { description: Created }
 *       400: { description: 'A single-language name is refused, not warned (spec 012 AS-02)', content: { application/json: { schema: { $ref: '#/components/schemas/Refusal' } } } }
 */
// Every role may see the branches and departments in its own scope
// (spec 012 §9, "View departments and branches in scope").
router.get("/branches", authenticate, platformservice.listBranches)

/**
 * @swagger
 * /platform/departments:
 *   get:
 *     summary: List departments in the caller's scope (spec 012 FR-007)
 *     tags: [Platform]
 *     responses: { 200: { description: OK } }
 *   post:
 *     summary: Create a department (spec 012 FR-007). Flat — no nesting (decision 2).
 *     tags: [Platform]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties: { name: { $ref: '#/components/schemas/LocalizedText' } }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Single-language name refused, content: { application/json: { schema: { $ref: '#/components/schemas/Refusal' } } } }
 */
router.get("/departments", authenticate, platformservice.listDepartments)

/**
 * @swagger
 * /platform/branches/{id}:
 *   get:
 *     summary: Get one branch (spec 010 AS-01 — out of scope is 404, never 403)
 *     tags: [Platform]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: OK }
 *       404: { description: 'Not found — identical body whether out of scope or genuinely absent' }
 */
// Fetching one by id is where AS-01 is proven: an out-of-scope id answers 404,
// identical to a non-existent one, and records a high-severity security event.
router.get(
  "/branches/:id",
  authenticate,
  authorizeOnTarget(req => Branch.findById(req.params.id).catch(() => null), 'AGT', 'LEAD', 'MGR', 'ADM', 'AUD'),
  platformservice.getBranch
)

router.post("/branches", authenticate, authorize('ADM'), platformservice.createBranch)
router.post("/departments", authenticate, authorize('ADM'), platformservice.createDepartment)

/**
 * @openapi
 * /platform/branches/{id}/active:
 *   patch:
 *     tags: [Platform]
 *     summary: Deactivate or reactivate a branch (spec 012 FR-015)
 *     description: >
 *       There is no delete, by design. A branch is referenced by every record
 *       created in it and throughout the audit trail, so deletion would strand
 *       those records and break the trail. Deactivation is the only disposal and
 *       it is reversible. Out-of-scope ids answer 404, identical to absent ones.
 *     responses:
 *       200: { description: 'Updated. `changed` is false when it already held that state.' }
 *       400: { description: 'active missing or not a boolean' }
 *       404: { description: 'Not found — identical body whether out of scope or genuinely absent' }
 */
// ADM only, AND scoped: authorizeOnTarget answers 404 for a branch outside the
// caller's scope before the handler runs, so an administrator of one branch
// cannot deactivate another's.
router.patch(
  "/branches/:id/active",
  authenticate,
  authorizeOnTarget(req => Branch.findById(req.params.id).catch(() => null), 'ADM'),
  platformservice.setBranchActive
)

/**
 * @openapi
 * /platform/departments/{id}/active:
 *   patch:
 *     tags: [Platform]
 *     summary: Deactivate or reactivate a department (spec 012 FR-015)
 *     responses:
 *       200: { description: 'Updated. `changed` is false when it already held that state.' }
 *       400: { description: 'active missing or not a boolean' }
 *       404: { description: 'Not found — identical body whether out of scope or genuinely absent' }
 */
router.patch(
  "/departments/:id/active",
  authenticate,
  authorizeOnTarget(req => Department.findById(req.params.id).catch(() => null), 'ADM'),
  platformservice.setDepartmentActive
)

export default router

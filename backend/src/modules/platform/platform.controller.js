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

export default router

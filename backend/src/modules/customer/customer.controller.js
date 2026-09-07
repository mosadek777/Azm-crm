// spec 001 — implements FR-001, FR-002, FR-003, FR-020, FR-023; §11 contracts
//
// §11 scope predicates, as the spec states them:
//   search customers  — caller branch ∈ scope AND department ∈ scope
//   get customer      — same; out-of-scope returns not-found
//   create customer   — writes caller's branch and department
//   update customer   — same, plus per-field permission
//
// §9: create and edit are AGT+. Read is AGT+ (KBA and CUST excluded).

import * as customerservice from './customer.service.js'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/permission.middleware.js'
import { Router } from 'express'

const router = Router()
const STAFF = ['AGT', 'LEAD', 'MGR', 'ADM', 'AUD']
const WRITERS = ['AGT', 'LEAD', 'MGR', 'ADM']

/**
 * @swagger
 * /customer:
 *   get:
 *     summary: Ranked-match customer search (spec 001 FR-002; the single-identity-key question was closed as malformed — see decisions-pending §0 decision 7)
 *     tags: [Customer]
 *     parameters:
 *       - { name: q, in: query, required: true, schema: { type: string }, description: 'Minimum 3 characters (E-13) — matched against phone, email, national ID, account reference and display name, in that rank order' }
 *     responses:
 *       200: { description: 'Results scope-filtered; below 3 characters returns an empty, non-error result (E-13)' }
 *   post:
 *     summary: Create a customer from a display name and one contact point (spec 001 FR-001, AS-01)
 *     tags: [Customer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [displayName, contactPoints]
 *             properties:
 *               displayName: { type: string, description: 'User-authored, single language — not a localised value' }
 *               type: { type: string, enum: [person, organisation], default: person }
 *               nationalId: { type: string, nullable: true }
 *               accountRef: { type: string, nullable: true, description: The ERP join key. Optional — the CRM is the system of record (decision 6). }
 *               preferredLanguage: { type: string, enum: [ar, en] }
 *               organisationId: { type: string, nullable: true }
 *               contactPoints:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [channelType, value]
 *                   properties:
 *                     channelType: { type: string, enum: [phone, email, whatsapp] }
 *                     value: { type: string }
 *                     isPrimary: { type: boolean }
 *               confirmCollision: { type: boolean, description: 'Repeat the request with this set to true to proceed past a 409 collision (decision 16 — FR-004 unique-by-default, overridable)' }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Missing or invalid fields, content: { application/json: { schema: { $ref: '#/components/schemas/Refusal' } } } }
 *       404: { description: organisationId does not resolve to a visible organisation }
 *       409:
 *         description: A matching customer already exists (FR-010, AS-04). Not blocked — resend with confirmCollision true.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 matches: { type: array, description: 'In-scope matches, named' }
 *                 outOfScopeMatches: { type: integer, description: 'Out-of-scope collisions, counted but never named (spec 010 §8)' }
 */
router.get("/", authenticate, authorize(...STAFF), customerservice.searchCustomers)
router.post("/", authenticate, authorize(...WRITERS), customerservice.createCustomer)

/**
 * @swagger
 * /customer/{id}:
 *   get:
 *     summary: Get one customer (spec 001 FR-003, AS-03 — out of scope is 404, never 403)
 *     tags: [Customer]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found — identical whether out of scope or genuinely absent }
 *   patch:
 *     summary: Edit customer fields (spec 001 FR-020 — one audit entry per changed field)
 *     tags: [Customer]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName: { type: string }
 *               nationalId: { type: string }
 *               accountRef: { type: string }
 *               preferredLanguage: { type: string, enum: [ar, en] }
 *               preferredChannel: { type: string, enum: [phone, email, whatsapp] }
 *               sensitiveFlag: { type: boolean }
 *     responses:
 *       200: { description: Updated }
 *       400: { description: No changes supplied }
 *       404: { description: Not found }
 */
router.get("/:id", authenticate, authorize(...STAFF), customerservice.getCustomer)
router.patch("/:id", authenticate, authorize(...WRITERS), customerservice.updateCustomer)

export default router

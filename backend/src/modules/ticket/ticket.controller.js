// spec 002 — implements FR-001, FR-009, FR-010, FR-014, FR-033; §11 contracts
//
// §11 scope predicates, as the spec states them:
//   create ticket       — writes caller or customer branch and department
//   get ticket          — branch ∈ scope AND department ∈ scope
//   list / filter       — same
//   transition status   — validates against defined transitions and permission
//   assign ticket       — reassigning another agent's ticket requires lead
//   add message         — internal notes never on a customer contract
//
// §9: AUD is read-only. Cancel is LEAD+. Everything else is AGT+.

import * as ticketservice from './ticket.service.js'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/permission.middleware.js'
import { Router } from 'express'

const router = Router()
const STAFF = ['AGT', 'LEAD', 'MGR', 'ADM', 'AUD']
const WRITERS = ['AGT', 'LEAD', 'MGR', 'ADM']

/**
 * @swagger
 * /ticket/meta:
 *   get:
 *     summary: The ratified status set and transition graph (spec 002 FR-008; decisions 14, 15, 22). Clients read this rather than holding their own copy.
 *     tags: [Ticket]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statuses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties: { key: { type: string }, pausesSla: { type: boolean, nullable: true }, terminal: { type: boolean } }
 *                 priorities: { type: array, items: { type: string } }
 *                 transitions: { type: object, description: 'status key -> array of reachable status keys' }
 */
router.get("/meta", authenticate, authorize(...STAFF), ticketservice.getTicketMeta)

/**
 * @swagger
 * /ticket:
 *   get:
 *     summary: List tickets, scope-filtered (spec 002 FR-033, AS-01)
 *     tags: [Ticket]
 *     parameters:
 *       - { name: status, in: query, schema: { type: string }, description: Comma-separated status keys }
 *       - { name: priority, in: query, schema: { type: string } }
 *       - { name: assignedAgentId, in: query, schema: { type: string } }
 *       - { name: unassigned, in: query, schema: { type: boolean } }
 *       - { name: customerId, in: query, schema: { type: string } }
 *       - { name: category, in: query, schema: { type: string }, description: 'Exact match — category is a flat string, not a tree (decision 21)' }
 *       - { name: tag, in: query, schema: { type: string } }
 *       - { name: q, in: query, schema: { type: string }, description: 'Subject or reference prefix, minimum 3 characters' }
 *       - { name: page, in: query, schema: { type: integer, default: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, default: 25, maximum: 100 } }
 *     responses:
 *       200: { description: 'Out-of-scope tickets are absent from the list AND the count (AS-01)' }
 *   post:
 *     summary: Create a ticket (spec 002 FR-001, AS-01)
 *     tags: [Ticket]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, subject, description, category, priority]
 *             properties:
 *               customerId: { type: string }
 *               subject: { type: string, minLength: 3, maxLength: 300 }
 *               description: { type: string, description: Becomes the first customer-visible message on the thread — there is no separate description field in storage (§3). }
 *               category: { type: string, description: 'Flat string, leaf-only in spirit but not enforced as a tree (decision 21, deviates from FR-004 MUST)' }
 *               priority: { type: string, enum: [low, normal, high, urgent] }
 *               tags: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Created. Reference format TKT-YYYY-NNNNN (decision 11), status "new", prioritySource "manual".
 *       400: { description: Missing or invalid fields, content: { application/json: { schema: { $ref: '#/components/schemas/Refusal' } } } }
 *       404: { description: Customer not found or out of scope }
 */
router.get("/", authenticate, authorize(...STAFF), ticketservice.listTickets)
router.post("/", authenticate, authorize(...WRITERS), ticketservice.createTicket)

/**
 * @swagger
 * /ticket/{id}:
 *   get:
 *     summary: Ticket detail — thread, history, reachable transitions (spec 002 FR-013, AS-15; constitution II)
 *     tags: [Ticket]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ticket: { type: object }
 *                 messages: { type: array, description: 'Both visibilities — every caller here is staff (FR-014)' }
 *                 history: { type: array, description: 'Read from the append-only audit log, not rebuilt' }
 *                 reachableStatuses: { type: array, items: { type: string } }
 *                 sla: { type: object, description: "constitution III — { status: 'unavailable' } until spec 005 unblocks" }
 *       404: { description: Not found — identical whether out of scope or genuinely absent (AS-01) }
 */
router.get("/:id", authenticate, authorize(...STAFF), ticketservice.getTicket)

/**
 * @swagger
 * /ticket/{id}/assign:
 *   patch:
 *     summary: Assign, reassign or unassign (spec 002 FR-009, FR-010, AS-06). Team is dropped — assignment is directly to an agent (decision 20).
 *     tags: [Ticket]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               assignedAgentId: { type: string, nullable: true, description: Omit or null to unassign }
 *               reason: { type: string, description: 'Required for every assignment and reassignment (AS-06) — never defaulted' }
 *     responses:
 *       200: { description: Assigned }
 *       400: { description: Reason missing }
 *       403: { description: 'Reassigning another agent''s ticket requires LEAD or above (§9)' }
 *       404: { description: Ticket or target agent not found }
 *       409: { description: 'Terminal ticket accepts no assignment, or the target agent is not scoped to this ticket' }
 */
router.patch("/:id/assign", authenticate, authorize(...WRITERS), ticketservice.assignTicket)

/**
 * @swagger
 * /ticket/{id}/status:
 *   patch:
 *     summary: Transition status (spec 002 FR-007, FR-008, AS-03). Undefined transitions are refused with the reachable set named, and write no history entry.
 *     tags: [Ticket]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [new, assigned, in_progress, pending_customer, pending_supplier, pending_internal, resolved, closed, merged, cancelled] }
 *               reason: { type: string, description: Required when transitioning to cancelled }
 *               followUpAt: { type: string, format: date-time, description: 'Only valid on a status whose pausesSla is true (FR-021)' }
 *     responses:
 *       200: { description: Transitioned }
 *       400: { description: 'Unknown status, or followUpAt on a non-pausing status' }
 *       404: { description: Not found }
 *       409:
 *         description: Already in that status, or the transition is not defined (AS-03)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { $ref: '#/components/schemas/LocalizedText' }
 *                 reachableStatuses: { type: array, items: { type: string } }
 */
router.patch("/:id/status", authenticate, authorize(...WRITERS), ticketservice.changeStatus)

/**
 * @swagger
 * /ticket/{id}/message:
 *   post:
 *     summary: Add a reply or internal note (spec 002 FR-014, AS-07). AUD is read-only; visibility has no default.
 *     tags: [Ticket]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body, visibility]
 *             properties:
 *               body: { type: string }
 *               visibility: { type: string, enum: [customer, internal], description: 'No default — a defaulted value is how an internal note becomes a customer reply by accident' }
 *     responses:
 *       201: { description: Added }
 *       400: { description: Body or visibility missing }
 *       403: { description: 'Requires a writing role. AUD is read-only and is refused here.' }
 *       404: { description: Not found }
 *       409: { description: Terminal ticket accepts no reply }
 */
// WRITERS, like every other write route on this controller. This line used to
// spell the roles out as 'AGT', 'LEAD', 'MGR' — omitting ADM, and so refusing
// an administrator a reply on a ticket they could open and read. No spec asks
// for that: FR-014 governs a message's VISIBILITY, not who may author one, and
// an administrator writes everywhere else in the product (creates tickets,
// assigns them, moves their status, edits customers).
//
// The bug was not the missing role so much as the hand-written list: the
// constant existed and this one line did not use it, so it could drift from
// the other six without anything noticing. Excluding AUD is deliberate and
// still holds — WRITERS omits it, which is exactly why the constant exists.
router.post("/:id/message", authenticate, authorize(...WRITERS), ticketservice.addMessage)

export default router

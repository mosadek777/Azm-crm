// spec 008 — the customer portal's routes.
//
// Mounted at /portal, entirely separate from the staff routes. Note what is
// absent: there is no `authorize(...)` on any route here, because roles are a
// staff concept — a customer holds none. Authorisation on this surface is the
// §11 predicate `customer = session identity`, applied inside every read.
//
// §9's permission matrix for this surface has only two columns, Anonymous and
// Signed-in customer, and the rows that matter are the refusals:
//
//   See internal notes, AI output, automation log | — | **never**
//   See any other customer's data                 | — | **never**
//
// Both are enforced in portal-ticket.service.js rather than here: the first by
// querying only `visibility: 'customer'`, the second by the scope predicate.

import { Router } from 'express'
import * as portalservice from './portal.service.js'
import * as portalticketservice from './portal-ticket.service.js'
import { authenticatePortal } from '../../middlewares/portal-auth.middleware.js'

const router = Router()

/**
 * @swagger
 * /portal/auth/signin:
 *   post:
 *     summary: Customer sign-in (spec 008 FR-001, AS-01). DEMO SHORTCUT — password, not a one-time code (decision 31).
 *     tags: [Portal]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, description: 'An email contact point of exactly one customer (AS-01)' }
 *               password: { type: string }
 *     responses:
 *       200: { description: 'Signed in. Returns a portal token, not a staff token — the two are not interchangeable' }
 *       400: { description: Email or password missing }
 *       401: { description: 'Refused. The body is IDENTICAL for an unknown address, a known address with no portal identity, a wrong password, a disabled identity, and an address shared by two customers (E-01, E-02) — the refusal discloses nothing about whether an address is known to us' }
 */
router.post('/auth/signin', portalservice.signIn)

/**
 * @swagger
 * /portal/me:
 *   get:
 *     summary: The signed-in customer's own record (spec 008 FR-013 read half)
 *     tags: [Portal]
 *     responses:
 *       200: { description: OK }
 *       401: { description: Sign-in required }
 */
router.get('/me', authenticatePortal, portalservice.me)

/**
 * @swagger
 * /portal/ticket:
 *   get:
 *     summary: The customer's own tickets, open and closed (spec 008 FR-005)
 *     tags: [Portal]
 *     parameters:
 *       - { name: status, in: query, schema: { type: string }, description: 'Comma-separated status keys' }
 *       - { name: page, in: query, schema: { type: integer, default: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, default: 25, maximum: 100 } }
 *     responses:
 *       200: { description: 'Only the caller''s own tickets (§11). Another customer''s ticket is absent from the list and the count (AS-02)' }
 *       401: { description: Sign-in required }
 */
router.get('/ticket', authenticatePortal, portalticketservice.listMyTickets)

/**
 * @swagger
 * /portal/ticket/{id}:
 *   get:
 *     summary: One of the customer's own tickets, with its customer-visible thread (spec 008 FR-003, AS-06)
 *     tags: [Portal]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: 'Customer-visible messages ONLY. Internal notes are excluded by the query, not filtered from the response (FR-019). No agent identity is included — 002 [CLARIFY-6], decision 29' }
 *       401: { description: Sign-in required }
 *       404: { description: 'Not found, or belongs to another customer — the two are indistinguishable (AS-02), and the attempt is recorded as a security event' }
 */
router.get('/ticket/:id', authenticatePortal, portalticketservice.getMyTicket)

/**
 * @swagger
 * /portal/ticket:
 *   post:
 *     summary: Submit a request (spec 008 FR-002, AS-04)
 *     tags: [Portal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, description, category]
 *             additionalProperties: false
 *             properties:
 *               subject: { type: string, minLength: 3, maxLength: 300 }
 *               description: { type: string, description: 'Becomes the first message on the thread, authored by the customer' }
 *               category: { type: string }
 *     responses:
 *       201: { description: 'Created with source `portal` (AS-04), status `new`, priority `normal`, unassigned, in the customer''s own branch and department' }
 *       400: { description: 'A required field is missing, OR the body carried a field a customer may not set — priority, status, assignment, owning team, customerId and anything else are REFUSED BY NAME rather than ignored (002 §9)' }
 *       401: { description: Sign-in required }
 */
router.post('/ticket', authenticatePortal, portalticketservice.submitTicket)

/**
 * @swagger
 * /portal/ticket/{id}/message:
 *   post:
 *     summary: Reply on your own request (spec 008 FR-004, AS-07)
 *     tags: [Portal]
 *     parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             additionalProperties: false
 *             properties:
 *               body: { type: string }
 *     responses:
 *       201: { description: 'Appended to the same thread — no new ticket (AS-07, constitution VI). Always visibility `customer`: there is no parameter for it, so this route cannot produce an internal note' }
 *       400: { description: 'Body missing, or the request carried a field a customer may not set — `visibility` included' }
 *       401: { description: Sign-in required }
 *       404: { description: 'Not found, or belongs to another customer (AS-02) — recorded as a security event' }
 *       409: { description: 'Terminal ticket accepts no reply (002 §3). Reopen-on-reply (008 E-08) and reply-to-cancelled (E-07) are NOT built — piece F3 — so this refuses rather than guessing' }
 */
router.post('/ticket/:id/message', authenticatePortal, portalticketservice.replyToTicket)

export default router

// spec 004 — FR-006, FR-007. Quick replies.
//
// Every route is staff-only and authenticated. The finer rules are decided in
// the service, because they depend on the RECORD rather than the route:
// managing a global reply needs LEAD or above, a personal reply belongs to its
// owner, and rendering reads a ticket through the scope predicate.
//
// An auditor is deliberately absent from WRITERS: 002 §9 makes AUD
// read-everything, change-nothing.

import * as quickreplyservice from './quick-reply.service.js'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/permission.middleware.js'
import { Router } from 'express'

const router = Router()

const STAFF = ['AGT', 'LEAD', 'MGR', 'ADM', 'AUD']
const WRITERS = ['AGT', 'LEAD', 'MGR', 'ADM']

/**
 * @swagger
 * /quick-reply/placeholders:
 *   get:
 *     summary: The placeholder vocabulary (spec 004 FR-006, decision 41)
 *     tags: [QuickReply]
 *     description: >
 *       The ONE definition, read by the interface rather than copied into it.
 *       Two lists drift, and the drift surfaces as a refusal nobody can explain.
 *     responses:
 *       200: { description: 'Tokens with bilingual labels, plus the syntax' }
 */
router.get('/placeholders', authenticate, authorize(...STAFF), quickreplyservice.listPlaceholders)

/**
 * @swagger
 * /quick-reply:
 *   get:
 *     summary: The caller's own quick replies plus every global one (FR-007)
 *     tags: [QuickReply]
 *     responses:
 *       200: { description: 'Personal replies belonging to somebody else are absent, not marked hidden' }
 *   post:
 *     summary: Create a quick reply (FR-006, FR-007)
 *     tags: [QuickReply]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, body, scope]
 *             properties:
 *               name: { type: object, description: 'Both ar and en required (constitution I)' }
 *               body: { type: object, description: 'Both ar and en required (FR-006)' }
 *               scope: { type: string, enum: [personal, global] }
 *     responses:
 *       201: { description: Created }
 *       400: { description: 'Missing fields, or a placeholder this vocabulary does not define — the refusal names each one' }
 *       403: { description: 'A global quick reply is managed by a lead or above (FR-007)' }
 */
router.get('/', authenticate, authorize(...STAFF), quickreplyservice.listQuickReplies)
router.post('/', authenticate, authorize(...WRITERS), quickreplyservice.createQuickReply)

/**
 * @swagger
 * /quick-reply/{id}/active:
 *   patch:
 *     summary: Deactivate or reactivate a quick reply
 *     tags: [QuickReply]
 *     description: >
 *       Deletion is not offered. A retired template's wording may be quoted in
 *       tickets already sent.
 *     responses:
 *       200: { description: 'Updated. `changed` is false when it already held that state.' }
 *       403: { description: 'A global quick reply is managed by a lead or above' }
 *       404: { description: "Not found — identical whether absent or somebody else's personal reply" }
 */
router.patch('/:id/active', authenticate, authorize(...WRITERS), quickreplyservice.setQuickReplyActive)

/**
 * @swagger
 * /quick-reply/{id}/render:
 *   post:
 *     summary: Substitute the placeholders against one ticket (FR-006)
 *     tags: [QuickReply]
 *     description: >
 *       The body is chosen by the CUSTOMER's preferred language, not the
 *       agent's. All-or-nothing: a body is never partly substituted.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ticketId]
 *             properties:
 *               ticketId: { type: string }
 *     responses:
 *       200: { description: 'The resolved body, and which language was used and why' }
 *       404: { description: 'Ticket out of scope or absent — the same answer either way' }
 *       422: { description: 'REFUSED rather than partly inserted. Names which placeholders failed and why (FR-006).' }
 */
router.post('/:id/render', authenticate, authorize(...WRITERS), quickreplyservice.renderQuickReply)

export default router

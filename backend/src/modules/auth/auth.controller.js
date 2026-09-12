// spec 010 — scaffold only; implements no requirement yet (step 1)
// Routes for FR-006 (local sign-in) land here in step 2.

import * as authservice from './auth.service.js'
import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware.js'

const router = Router()

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Local sign-in (spec 010 FR-006, on the provisional local-password path)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Signed in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string, description: JWT bearer token }
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     displayName: { type: string }
 *                     email: { type: string }
 *                     defaultLanguage: { type: string, enum: [ar, en] }
 *       400:
 *         description: Missing email or password
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Refusal' } } }
 *       401:
 *         description: Invalid credentials — the same body for a wrong password, an unknown email, or a deactivated account (spec 010 §8 discloses nothing)
 *         content: { application/json: { schema: { $ref: '#/components/schemas/Refusal' } } }
 */
router.post("/login", authservice.login)

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: The caller's own identity, and rendering hints for the interface
 *     description: >
 *       A RENDERING HINT, not a permission check. `show.administration` says the
 *       caller holds an administrator role somewhere; it names no branch,
 *       department or record, so it cannot authorise anything. Every route
 *       re-reads permissions per request regardless (E-04), and a forged copy of
 *       this response grants nothing. See the handler for the full reasoning.
 *     responses:
 *       200: { description: OK }
 *       401: { description: 'No session, or it is no longer valid' }
 */
// authenticate only: this tells the caller about themselves, which they are
// entitled to know. It deliberately carries no scope detail — the screens that
// need scope ask the scoped list endpoints, which already answer correctly.
router.get("/me", authenticate, authservice.me)

export default router

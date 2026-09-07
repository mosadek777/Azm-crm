// spec 010 — scaffold only; implements no requirement yet (step 1)
// Routes for FR-006 (local sign-in) land here in step 2.

import * as authservice from './auth.service.js'
import { Router } from 'express'

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

export default router

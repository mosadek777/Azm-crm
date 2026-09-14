// spec 010 FR-011 — the administration configuration surface.
//
// §9: creating and changing platform configuration is ADM. Reading it is not —
// every screen in the product renders status and priority labels, so an agent
// who could not read them would see raw keys. The split is on the verb, not on
// the route.

import { Router } from 'express'
import * as labels from './label.service.js'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/permission.middleware.js'

const router = Router()
const STAFF = ['AGT', 'LEAD', 'MGR', 'ADM', 'AUD']

/**
 * @swagger
 * /config/labels:
 *   get:
 *     tags: [Configuration]
 *     summary: Status and priority labels, bilingual (010 FR-011, 002 §8)
 *     responses:
 *       200:
 *         description: >
 *           Every staff role. `covers` names which of FR-011's fourteen
 *           configuration surfaces this endpoint is — two of them — and
 *           `keysEditable` is false: the key set is ratified (decision 15 for
 *           statuses, 002 §3 for priorities) and a key is written onto every
 *           ticket and audit entry.
 */
router.get('/labels', authenticate, authorize(...STAFF), labels.listLabels)

/**
 * @swagger
 * /config/labels/{kind}/{key}:
 *   patch:
 *     tags: [Configuration]
 *     summary: Change a label, or a status's pausesSla (010 FR-011)
 *     description: >
 *       ADM only. A label change is REFUSED unless both `label.ar` and
 *       `label.en` are supplied — constitution I and FR-011's own clause, and
 *       refused rather than merged with what is stored, because a merge leaves
 *       the two languages describing different things.
 *
 *       `pausesSla` is accepted for a non-terminal status and is NOT applied
 *       retroactively: spec 005's pause ledger is append-only, so time already
 *       accounted under the old flag stays accounted that way. The audit entry
 *       records `retroactive: false` explicitly.
 *     responses:
 *       200: { description: Changed — `changed` names which fields moved }
 *       400: { description: A single-language label, or pausesSla on a terminal status }
 *       403: { description: Not an administrator }
 *       404: { description: No such kind or key }
 */
router.patch('/labels/:kind/:key', authenticate, authorize('ADM'), labels.updateLabel)

export default router

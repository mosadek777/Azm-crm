// spec 004 FR-013, AD-13; §9, §11.
//
// §9: "Configure own notification preferences | AGT ✓ | LEAD ✓ | MGR ✓ | ADM ✓
// | AUD ✓" — an auditor is the one role that is read-only everywhere else and
// is explicitly included here, because their own notifications are their own.
// So every staff role reaches these routes.
//
// §11: "list / mark notifications | Notification centre | user = caller only."
// There is no route that takes a user id, deliberately. Adding one would make
// the predicate a parameter, and a parameter can be wrong.

import { Router } from 'express'
import * as notifications from './notification.service.js'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/permission.middleware.js'

const router = Router()
const STAFF = ['AGT', 'LEAD', 'MGR', 'ADM', 'AUD']

/**
 * @swagger
 * /notification:
 *   get:
 *     tags: [Notifications]
 *     summary: The caller's own notifications, grouped per FR-013 (004 FR-013)
 *     responses:
 *       200:
 *         description: >
 *           Groups newest first, each with its member ids and count. `channels`
 *           is always `["in_app"]` — email and push need spec 003.
 *           `reachable: false` means the ticket is no longer in the caller's
 *           scope; the notification stays, the ticket is not disclosed.
 */
router.get('/', authenticate, authorize(...STAFF), notifications.listNotifications)

/**
 * @swagger
 * /notification/unread:
 *   get:
 *     tags: [Notifications]
 *     summary: Unread count only — what the navigation badge reads
 */
router.get('/unread', authenticate, authorize(...STAFF), notifications.unreadCount)

/**
 * @swagger
 * /notification/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark every unread notification of the caller as read
 */
// ⚠ BEFORE `/:id/read`, or "read-all" is read as an id.
router.patch('/read-all', authenticate, authorize(...STAFF), notifications.markAllRead)

/**
 * @swagger
 * /notification/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a GROUP of notifications read (004 FR-013 grouping)
 *     description: >
 *       Takes `{ ids: [...] }` — the centre shows groups, and marking the
 *       visible group while leaving its members unread would leave a badge
 *       counting rows the reader cannot see. An id belonging to somebody else
 *       simply matches nothing: the filter always carries `userId = caller`.
 */
router.patch('/read', authenticate, authorize(...STAFF), notifications.markRead)

export default router

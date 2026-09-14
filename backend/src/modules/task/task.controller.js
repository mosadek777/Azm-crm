// spec 004 — FR-004, FR-005 (task half). Tasks.
//
// TWO MOUNTS, because a task is asked about in two different ways:
//
//   /ticket/:ticketId/task   what is outstanding ON THIS TICKET. Nested,
//                            because §3 says "a task never floats free" and the
//                            ticket is what the scope predicate evaluates.
//   /task                    MY tasks across everything, and the reminders the
//                            workspace shows. Scope still applies — through
//                            the tickets those tasks hang from.
//
// AUD is absent from WRITERS throughout: 002 §9 is read-everything,
// change-nothing, and §9 here gives the auditor no task row at all.

import * as taskservice from './task.service.js'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/permission.middleware.js'
import { Router } from 'express'

const STAFF = ['AGT', 'LEAD', 'MGR', 'ADM', 'AUD']
const WRITERS = ['AGT', 'LEAD', 'MGR', 'ADM']

/**
 * @swagger
 * /ticket/{ticketId}/task:
 *   get:
 *     summary: The tasks on one ticket (spec 004 FR-004)
 *     tags: [Task]
 *     description: >
 *       Everyone who can see the ticket sees its tasks — hiding a colleague's
 *       follow-up would mean two people promising the customer the same thing.
 *       Writing is bounded separately (§11).
 *     responses:
 *       200: { description: Tasks with their owner's name }
 *       404: { description: Ticket out of scope or absent — the same answer either way }
 *   post:
 *     summary: Create a task against this ticket (FR-004, E-09)
 *     tags: [Task]
 *     description: >
 *       A PAST due date is ACCEPTED and immediately overdue (E-09), never
 *       refused. `ownerId` defaults to the caller; naming somebody else
 *       requires LEAD or above (§9).
 *     responses:
 *       201: { description: Created }
 *       400: { description: Missing body or dueAt, an invalid date, or an unknown owner }
 *       403: { description: 'Creating a task for a colleague requires a lead or above (§9)' }
 */
export const ticketTaskRouter = Router({ mergeParams: true })
ticketTaskRouter.get('/', authenticate, authorize(...STAFF), taskservice.listTicketTasks)
ticketTaskRouter.post('/', authenticate, authorize(...WRITERS), taskservice.createTask)

const router = Router()

/**
 * @swagger
 * /task/mine:
 *   get:
 *     summary: My open tasks, and which are due or overdue (FR-005, AS-05)
 *     tags: [Task]
 *     description: >
 *       ⚠ REMINDERS ARE EVALUATED ON THIS REQUEST. This system has no
 *       scheduler, so nothing fires while nobody has the product open. The
 *       response carries `evaluation: "on_request"` so an integrator reading
 *       the API gets the same warning the agent gets on screen.
 *       AS-05 fixes the boundaries: a reminder opens at dueAt − remindBefore,
 *       and a task counts as overdue only strictly AFTER dueAt.
 *     responses:
 *       200: { description: 'tasks, reminders, overdueCount, and when it was evaluated' }
 */
router.get('/mine', authenticate, authorize(...WRITERS), taskservice.myTasks)

/**
 * @swagger
 * /task/{id}/complete:
 *   patch:
 *     summary: Complete a task (FR-004)
 *     tags: [Task]
 *     responses:
 *       200: { description: Completed }
 *       403: { description: "A colleague's task needs a lead or above" }
 *       404: { description: 'Absent, or its ticket is out of scope' }
 *       409: { description: Already closed }
 * /task/{id}/cancel:
 *   patch:
 *     summary: Cancel a task (FR-004)
 *     tags: [Task]
 *     responses:
 *       200: { description: Cancelled }
 *       409: { description: Already closed }
 */
router.patch('/:id/complete', authenticate, authorize(...WRITERS), taskservice.completeTask)
router.patch('/:id/cancel', authenticate, authorize(...WRITERS), taskservice.cancelTask)

export default router

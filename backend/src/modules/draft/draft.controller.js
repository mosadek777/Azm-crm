// spec 004 — FR-015, E-02, E-12. Draft preservation.
//
// Mounted under /ticket/:ticketId/draft, because a draft has no meaning apart
// from its ticket and the ticket is what the scope predicate is evaluated
// against (§11: "user = caller AND ticket scope").
//
// WRITERS only, not STAFF: an auditor is read-everything, change-nothing
// (002 §9), and has no reply to lose.

import * as draftservice from './draft.service.js'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/permission.middleware.js'
import { Router } from 'express'

const router = Router({ mergeParams: true })

const WRITERS = ['AGT', 'LEAD', 'MGR', 'ADM']

/**
 * @swagger
 * /ticket/{ticketId}/draft:
 *   get:
 *     summary: The CALLER'S OWN draft for this ticket (spec 004 FR-015, §11)
 *     tags: [Draft]
 *     description: >
 *       Keyed on `user = caller`, so this never returns another agent's draft —
 *       which is why a draft stays with its author when a ticket is reassigned.
 *       Answers `expired` when the retention period has passed (E-12) and
 *       `stale` when the thread moved since it was written (AS-09), and names
 *       the new owner when the ticket has been reassigned away (E-02).
 *     responses:
 *       200: { description: 'draft may be null; stale, expired and reassignedTo describe why' }
 *       404: { description: 'Ticket out of scope or absent — the same answer either way' }
 *   put:
 *     summary: Save the caller's draft (autosave, NFR-004 ≤10s and on blur)
 *     tags: [Draft]
 *     description: >
 *       An empty body DELETES the draft rather than storing an empty string.
 *       Not audited — an autosave is not a mutation of record, and one entry
 *       per keystroke would bury the trail. §10 asks for the DISCARD event only.
 *     responses:
 *       200: { description: Saved, or discarded when the body was emptied }
 *       404: { description: Ticket out of scope or absent }
 *   delete:
 *     summary: Discard the caller's draft (spec 004 §10)
 *     tags: [Draft]
 *     description: >
 *       Writes the one draft event §10 specifies — "Draft discarded | user,
 *       ticket, cause" — in the same transaction as the deletion. The TEXT is
 *       never copied into the entry.
 *     responses:
 *       200: { description: 'discarded is false when there was nothing to discard' }
 */
router.get('/', authenticate, authorize(...WRITERS), draftservice.getDraft)
router.put('/', authenticate, authorize(...WRITERS), draftservice.saveDraft)
router.delete('/', authenticate, authorize(...WRITERS), draftservice.discardDraft)

export default router

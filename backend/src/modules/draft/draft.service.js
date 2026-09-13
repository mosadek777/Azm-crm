// spec 004 — implements FR-015, E-02, E-03, E-12, AS-09; §11's predicate.
//
// ── §11 IS THE WHOLE ACCESS MODEL ───────────────────────────────────────────
//
//   | save / fetch draft | Loss prevention | user = caller AND ticket scope |
//
// Both halves are applied on every route here, and neither is optional:
//
//   user = caller   every query is keyed on req.user._id. No parameter widens
//                   it. So a draft stays with its AUTHOR on reassignment and
//                   the new assignee never sees it — specified, not preferred.
//   ticket scope    the ticket is loaded through scopeFilter first, so a draft
//                   cannot be used to learn that an out-of-scope ticket exists.
//                   Out of scope answers 404, identical to absent.
//
// ── DRAFT TEXT IS NOT A MESSAGE ─────────────────────────────────────────────
//
// It is what somebody was about to say and thought better of. It is never
// written to `Message`, which is what the portal reads, and the portal's own
// session audience cannot reach these routes anyway. decisions-pending §18.
//
// ── NO AUDIT ENTRY FOR SAVING, ONE FOR DISCARDING ───────────────────────────
//
// Constitution II binds MUTATIONS OF RECORD to an audit entry. An autosave is
// not one: NFR-004 puts it at every ≤10 seconds of typing, so auditing it would
// bury the trail this project depends on under keystrokes — the same reasoning
// that leaves `touchSession` unaudited. §10 asks for exactly one draft event,
// "Draft discarded | user, ticket, cause (sent / expired / abandoned)", and
// that one IS written, in a transaction with the deletion.

import mongoose from 'mongoose'
import { Draft } from '../../DB/models/draft.model.js'
import { Ticket } from '../../DB/models/ticket.model.js'
import { Message } from '../../DB/models/message.model.js'
import { User } from '../../DB/models/user.model.js'
import { recordAudit, redact } from '../../utils/audit.js'
import { scopeFilter } from '../../utils/scope.js'
import { DRAFT_POLICY, draftExpiryCutoff } from '../../config/draft-policy.js'

const bilingual = (ar, en) => ({ ar, en })
const NOT_FOUND = bilingual('التذكرة غير موجودة', 'Ticket not found')

/** The ticket, through the scope predicate. 404 covers absent and out-of-scope alike. */
const ticketInScope = async (req, id) =>
  Ticket.findOne({ _id: id, ...scopeFilter(req.assignments) }).catch(() => null)

/** What the thread looks like right now, for the staleness comparison. */
const threadState = async (ticketId) => {
  const [count, last] = await Promise.all([
    Message.countDocuments({ ticketId }),
    Message.findOne({ ticketId }).sort({ sentAt: -1 }).select('_id')
  ])
  return { threadMessageCount: count, threadLastMessageId: last?._id ?? null }
}

// ---------------------------------------------------------------------------
// FR-015 — save (upsert). NFR-004 calls this every ≤10s of typing and on blur.
// ---------------------------------------------------------------------------
export const saveDraft = async (req, res, next) => {
  try {
    const { body, visibility } = req.body ?? {}

    const ticket = await ticketInScope(req, req.params.ticketId)
    if (!ticket) return res.status(404).json({ message: NOT_FOUND })

    if (typeof body !== 'string') {
      return res.status(400).json({
        message: bilingual('نص المسودة مطلوب', 'A draft body is required'),
        fields: ['body']
      })
    }

    // An emptied draft is a DELETED draft, not a stored empty string. Otherwise
    // clearing the box would leave a record that restores nothing and still
    // counts as something to expire.
    if (body.trim() === '') {
      await Draft.deleteOne({ ticketId: ticket._id, userId: req.user._id })
      return res.json({ draft: null, discarded: true })
    }

    const state = await threadState(ticket._id)

    // Keyed on BOTH ids, so this can only ever touch the caller's own draft.
    const draft = await Draft.findOneAndUpdate(
      { ticketId: ticket._id, userId: req.user._id },
      {
        $set: {
          body,
          visibility: typeof visibility === 'string' ? visibility : '',
          ...state
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return res.json({ draft: redact(draft) })
  } catch (err) { return next(err) }
}

// ---------------------------------------------------------------------------
// FR-015 / AS-09 / E-02 / E-12 — fetch
// ---------------------------------------------------------------------------
export const getDraft = async (req, res, next) => {
  try {
    const ticket = await ticketInScope(req, req.params.ticketId)
    if (!ticket) return res.status(404).json({ message: NOT_FOUND })

    const draft = await Draft.findOne({ ticketId: ticket._id, userId: req.user._id })
    // NFR-004's cadence travels WITH the answer. The client asks for the
    // draft exactly when it needs the interval, and reading it from here
    // means there is no second copy of the number to drift — the same
    // reasoning as the placeholder vocabulary being served, not copied.
    const autosaveSeconds = DRAFT_POLICY.autosaveSeconds.value

    if (!draft) return res.json({ draft: null, stale: false, expired: false, autosaveSeconds })

    // E-12: "Draft retained longer than the retention period → discarded; the
    // agent is TOLD on return rather than shown stale text."
    //
    // Observed on the request rather than swept by a TTL index, deliberately: a
    // TTL deletes silently and leaves nothing to tell anybody about, and being
    // told is the half of E-12 that matters to the person.
    if (draft.updatedAt < draftExpiryCutoff()) {
      const session = await mongoose.startSession()
      try {
        await session.withTransaction(async () => {
          // §10: "Draft discarded | user, ticket, cause".
          await recordAudit({
            actorId: req.user._id,
            actorRef: req.user._id.toString(),
            action: 'draft.discarded',
            entityType: 'Draft',
            entityId: draft._id,
            before: { ticketId: ticket._id, hadBody: true },
            // The TEXT IS NOT RECORDED. An audit entry is immutable and readable
            // by every auditor; copying unsent text into it would outlive the
            // draft it was meant to retire and reach further than the draft ever
            // could. The cause is what §10 asks for, and the cause is enough.
            after: { cause: 'expired' },
            req,
            session
          })
          await Draft.deleteOne({ _id: draft._id }, { session })
        })
      } finally { await session.endSession() }

      return res.json({
        draft: null,
        stale: false,
        expired: true,
        retentionDays: DRAFT_POLICY.retentionDays.value,
        autosaveSeconds
      })
    }

    // AS-09: "if the customer replied meanwhile, the draft is restored AND
    // FLAGGED as possibly stale." Compared by identity — the message count and
    // the last message's id — not by clock. The draft is still returned: the
    // agent decides whether their words still fit, which is why it is a flag
    // and not a deletion.
    const now = await threadState(ticket._id)
    const stale = now.threadMessageCount !== draft.threadMessageCount ||
      String(now.threadLastMessageId) !== String(draft.threadLastMessageId)

    // E-02: "Ticket is reassigned away while the agent is composing → the draft
    // is preserved and the agent is TOLD they no longer own it; sending is
    // refused with the new owner named."
    //
    // The draft is preserved because it was never the ticket's to begin with —
    // §11 keys it to `user = caller`. What is added here is the telling, and
    // the new owner's NAME, which the agent needs in order to hand over.
    const stillMine = String(ticket.assignedAgentId ?? '') === String(req.user._id)
    let reassignedTo = null
    if (!stillMine && ticket.assignedAgentId) {
      const owner = await User.findById(ticket.assignedAgentId).select('displayName')
      reassignedTo = owner?.displayName ?? null
    }

    return res.json({
      draft: redact(draft),
      stale,
      expired: false,
      // Null when the ticket is unassigned: nobody else owns it, so there is
      // nothing to tell and nobody to name.
      reassignedTo,
      autosaveSeconds
    })
  } catch (err) { return next(err) }
}

// ---------------------------------------------------------------------------
// Discard — used when a reply is sent, and when an agent abandons one.
// ---------------------------------------------------------------------------
export const discardDraft = async (req, res, next) => {
  try {
    const ticket = await ticketInScope(req, req.params.ticketId)
    if (!ticket) return res.status(404).json({ message: NOT_FOUND })

    const cause = ['sent', 'abandoned'].includes(req.body?.cause) ? req.body.cause : 'abandoned'

    const draft = await Draft.findOne({ ticketId: ticket._id, userId: req.user._id })
    if (!draft) return res.json({ discarded: false })

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action: 'draft.discarded',
          entityType: 'Draft',
          entityId: draft._id,
          before: { ticketId: ticket._id, hadBody: true },
          after: { cause },
          req,
          session
        })
        await Draft.deleteOne({ _id: draft._id }, { session })
      })
    } finally { await session.endSession() }

    return res.json({ discarded: true, cause })
  } catch (err) { return next(err) }
}

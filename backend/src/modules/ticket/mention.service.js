// spec 004 — implements FR-009, AD-09, AS-06, E-07; decision 39; §9, §10, §11.
//
// FR-009 (MUST): "An agent MUST be able to mention a colleague in an internal
// note; the mention MUST notify them and MUST grant them access to that ticket
// only, recorded in history."
//
// ── THE GRANTING CLAUSE IS DECLINED. DECISION 39, RATIFIED. ─────────────────
//
// `010 FR-002` (MUST): "Permissions MUST be assigned through roles only.
// PER-USER PERMISSION OVERRIDES MUST NOT EXIST." A grant to one named person
// over one named record is a per-user permission override on any reading, so
// FR-009's granting clause and FR-002 cannot both be honoured. `010 §3` gives
// no shape for one either — `RoleAssignment` carries branch, department and
// team ids and has no record-level dimension.
//
// Decision 39 resolves it by RESTRICTING WHO MAY BE MENTIONED: only a colleague
// who already holds scope on the ticket. Both MUSTs then hold, the scope
// predicate is untouched, and the feature keeps the part that matters — a
// colleague who can already see the ticket is told their attention is wanted.
//
// ⚠ CONSEQUENCE FOR `E-08`. "Mentioned colleague is outside the branch scope →
// PERMITTED — the mention is an explicit, audited grant for one ticket." That
// edge case is DECLINED with the clause it depends on: there is no grant, so
// there is nothing to permit, and a mention of somebody outside scope is
// refused naming them. Recorded in decisions-pending §13 and decision 39, not
// silently dropped. If the client says cross-scope mentions are a real need,
// decision 39 is what reopens — into a record-level grant, with the predicate
// change costed properly rather than smuggled in behind a notification feature.
//
// ── WHY THE CANDIDATE LIST IS ITS OWN ENDPOINT ──────────────────────────────
//
// §9 gives EVERY staff role "Mention a colleague", but `010 §9` puts `GET /user`
// at LEAD and above — so an agent cannot list staff at all and would have
// nobody to pick from. `mentionable` answers a narrower question than the staff
// directory: "who can already see THIS ticket". That discloses strictly less
// than the directory (no roles, no scope, no email) and only about people who
// share the ticket the caller is already reading.

import { User } from '../../DB/models/user.model.js'
import { RoleAssignment } from '../../DB/models/role-assignment.model.js'
import { Ticket } from '../../DB/models/ticket.model.js'
import { assignmentCovers, scopeFilter } from '../../utils/scope.js'

const bilingual = (ar, en) => ({ ar, en })

/**
 * The user ids that hold scope on this ticket and are active.
 *
 * AUD IS INCLUDED. §9 has no row excluding an auditor from being mentioned, and
 * "read only" means they change nothing — not that nobody may draw their
 * attention to a record. §11's internal-thread contract gives them read access
 * to the thread the mention lives in.
 */
export const mentionableFor = async (ticket) => {
  const coordinate = ticket.scopeCoordinate()
  const assignments = await RoleAssignment.find({})

  // ⚠ THE BREAK-GLASS IDENTITY IS EXCLUDED, and this is the one place in the
  // codebase where `unrestricted` is refused rather than honoured.
  //
  // Only the break-glass root carries it (010 E-07). It is a bootstrap and
  // emergency identity, not a colleague: nobody is signed in as it during
  // ordinary work, so a mention would notify an account no one is watching
  // while the author believes they have asked for help.
  //
  // Excluded BY USER, not by assignment. Filtering the unrestricted assignment
  // alone is not enough — it holds an ordinary scoped assignment as well, so
  // the root reappeared through that one and the check caught it. Excluding the
  // user is what "the root is not a colleague" actually means.
  //
  // This only ever NARROWS the list; it cannot make an out-of-scope user
  // mentionable, and the server re-checks the same rule at save time.
  const unrestrictedUsers = new Set(
    assignments.filter(a => a.unrestricted).map(a => String(a.userId)))

  const ids = [...new Set(assignments
    .filter(a => !unrestrictedUsers.has(String(a.userId)) && assignmentCovers(a, coordinate))
    .map(a => String(a.userId)))]

  // E-07's other half: a deactivated colleague is not offered in the first
  // place, so the refusal below is a backstop for a stale page rather than the
  // normal path.
  return User.find({ _id: { $in: ids }, state: 'active' }).select('_id displayName')
}

/**
 * GET /ticket/:id/mentionable — who may be named in an internal note here.
 *
 * The ticket is loaded THROUGH the scope predicate first, so this cannot be
 * used to learn that an out-of-scope ticket exists: 404, byte-identical to
 * absent (constitution IV).
 */
export const listMentionable = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, ...scopeFilter(req.assignments) }).catch(() => null)
    if (!ticket) return res.status(404).json({ message: bilingual('التذكرة غير موجودة', 'Ticket not found') })

    const users = await mentionableFor(ticket)
    return res.json({
      // Name and id only. NOT the role, NOT the scope, NOT the email — a
      // mention needs a name to render and an id to address, and the staff
      // directory's disclosure rules exist for a reason (see listUsers).
      colleagues: users
        .map(u => ({ userId: String(u._id), displayName: u.displayName }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      // Said in the payload so an integrator sees the same rule as the screen.
      rule: 'scoped_colleagues_only',
      decision: 39
    })
  } catch (err) { return next(err) }
}

/**
 * Validate the mention list against one ticket.
 *
 * Returns `{ ok: true, userIds }` or `{ ok: false, status, message, fields }`.
 * Never partially accepts: a note naming three colleagues of whom one cannot be
 * mentioned is refused whole, because the author's intent was to involve all
 * three and silently dropping one would be worse than refusing.
 */
export const validateMentions = async ({ ticket, mentions }) => {
  const wanted = [...new Set((mentions ?? []).map(String).filter(Boolean))]
  if (!wanted.length) return { ok: true, userIds: [] }

  const allowed = await mentionableFor(ticket)
  const allowedIds = new Set(allowed.map(u => String(u._id)))

  const rejected = wanted.filter(id => !allowedIds.has(id))
  if (rejected.length) {
    // E-07 ("mentioned colleague is deactivated → refused at save time naming
    // them") and decision 39's out-of-scope refusal produce THE SAME message on
    // purpose. Telling the caller which of the two applies would confirm that a
    // user id they supplied belongs to a real, deactivated person — or to
    // somebody in a branch they cannot see. Both are disclosures the caller did
    // not already have, and AS-01's indistinguishability rule is the same
    // principle one level down.
    //
    // The ids ARE named, because the caller supplied them and an author needs
    // to know which name in their note is the problem.
    return {
      ok: false,
      status: 400,
      fields: ['mentions'],
      rejected,
      message: bilingual(
        'تعذر إشعار أحد الزملاء المذكورين: يجب أن يكون الزميل نشطًا وضمن نطاق هذه التذكرة. لم تُحفظ الملاحظة.',
        'One of the colleagues named cannot be mentioned here: they must be active and already scoped to this ticket. The note was not saved.'
      )
    }
  }

  return { ok: true, userIds: wanted }
}

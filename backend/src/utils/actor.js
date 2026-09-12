// Turns an audit entry's `actorRef` into something a person can read.
//
// WHY THIS IS NOT A LOOKUP AND A HOPE. The audit trail is append-only and
// immutable (constitution II), so it OUTLIVES the records it points at. An
// entry written today must still render in five years, when the account that
// caused it may be deactivated, when `actorRef` may hold a value this version
// of the code has never heard of, and when the actor may not have been a user
// at all. Every one of those cases has an answer here, and none of them is
// "print the id and let the reader work it out".
//
// THE FOUR KINDS, and how each is recognised:
//
//   user      `actorRef` is a bare 24-character object id. A staff member.
//             Resolved to their display name. Deactivated accounts still
//             resolve — deactivation is not deletion (010 FR-001), so the name
//             is available, and the entry is flagged `state: 'deactivated'` so
//             a reader is not left wondering why they cannot find the person.
//
//   customer  `actorRef` carries the `customer:` prefix that
//             `customerActorRef` writes. That prefix exists precisely so a
//             customer action can never be mistaken for a staff one
//             (008 FR-020), and it is what makes this branch safe.
//
//   system    `actorRef` is the literal 'system'. Nothing writes this today —
//             every current entry has a human behind it — but 010 §3 names
//             `system` as a permitted actor for rule-driven and scheduled
//             work, so the SLA engine and retention rules will. Handled now
//             rather than discovered later as an id nobody can look up.
//
//   unknown   Anything else, or a lookup that found nothing. The raw ref is
//             passed through so the trail is still followable, and the caller
//             renders an explicit "unknown actor" label — never the bare
//             value dressed up as a name.
//
// WHO MAY SEE THIS. Staff only. `002 §9` gives every staff role a plain ✓ on
// "Read history"; the customer's row is "own, redacted", and its footnote is
// what keeps individual agent identity off the portal (decision 29). This
// function is therefore never called from a portal path, and the portal's own
// history assembly does not import it.

import { User } from '../DB/models/user.model.js'
import { Customer } from '../DB/models/customer.model.js'

const OBJECT_ID = /^[0-9a-f]{24}$/i
const CUSTOMER_PREFIX = 'customer:'

/**
 * @param {Array<{actorRef: string}>} entries
 * @returns {Promise<Map<string, {kind: string, displayName: string|null, state: string|null}>>}
 *          keyed by the raw actorRef, so a caller maps entries without re-parsing.
 */
export const resolveActors = async (entries) => {
  const refs = [...new Set((entries ?? []).map(e => String(e.actorRef ?? '')))]

  const userIds = refs.filter(r => OBJECT_ID.test(r))
  const customerIds = refs
    .filter(r => r.startsWith(CUSTOMER_PREFIX))
    .map(r => r.slice(CUSTOMER_PREFIX.length))
    .filter(id => OBJECT_ID.test(id))

  // Two queries for the whole page of history, not one per row.
  const [users, customers] = await Promise.all([
    userIds.length ? User.find({ _id: { $in: userIds } }).select('displayName state') : [],
    customerIds.length ? Customer.find({ _id: { $in: customerIds } }).select('displayName') : []
  ])

  const userById = new Map(users.map(u => [String(u._id), u]))
  const customerById = new Map(customers.map(c => [String(c._id), c]))

  const out = new Map()
  for (const ref of refs) {
    if (ref === 'system') {
      out.set(ref, { kind: 'system', displayName: null, state: null })
      continue
    }

    if (ref.startsWith(CUSTOMER_PREFIX)) {
      const c = customerById.get(ref.slice(CUSTOMER_PREFIX.length))
      // A customer record that has been erased (001 erasure) leaves entries
      // behind it. `customer` with no name is still more honest than `unknown`:
      // the kind is known even when the identity is gone.
      out.set(ref, { kind: 'customer', displayName: c?.displayName ?? null, state: null })
      continue
    }

    const u = userById.get(ref)
    if (u) {
      out.set(ref, {
        kind: 'user',
        displayName: u.displayName,
        state: u.state
      })
      continue
    }

    out.set(ref, { kind: 'unknown', displayName: null, state: null })
  }

  return out
}

/**
 * Attaches `actor` to each entry, leaving `actorRef` in place for an auditor.
 *
 * `toObject()` is not optional. These arrive as mongoose documents, whose
 * fields live behind getters rather than as own properties — so `{ ...doc }`
 * copies NOTHING and silently yields an object holding only what is added
 * after the spread. The first run of this returned history rows carrying an
 * `actor` and no `action`, `actorRef` or `occurredAt` at all, and the only
 * reason it was caught is that the response was read rather than assumed.
 */
export const withActors = async (entries) => {
  const actors = await resolveActors(entries)
  return (entries ?? []).map(e => {
    const plain = typeof e?.toObject === 'function' ? e.toObject() : { ...e }
    return {
      ...plain,
      actor: actors.get(String(e.actorRef ?? '')) ?? { kind: 'unknown', displayName: null, state: null }
    }
  })
}

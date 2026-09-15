// spec 004 FR-021 — conditional responses, so polling is cheap.
//
// ── WHY POLLING AT ALL, RECORDED HERE BECAUSE THIS FILE IS THE MECHANISM ────
//
// `FR-021` requires an open list or conversation to update without a reload,
// and says the scope predicate MUST be evaluated **per recipient at the moment
// of delivery, never once per event**.
//
// Polling satisfies that by construction and a socket does not. A poll is an
// ordinary request: it goes through `authenticate`, `authorize` and the same
// `scopeFilter` as every other read, so there is no second path that could
// drift. A server-pushed update means deciding server-side who may receive a
// record — a second implementation of the one invariant `utils/scope.js` exists
// to keep in one place. decisions-pending §26 argues it in full.
//
// ── WHAT THIS DOES ─────────────────────────────────────────────────────────
//
// Hashes the response the caller is about to receive, sends it as an `ETag`,
// and answers **304 with no body** when the caller sends back an
// `If-None-Match` that still matches. A quiet minute costs twelve tiny
// round-trips rather than twelve payloads.
//
// ⚠ THE HASH IS OF *THIS CALLER'S* RESPONSE, AND THAT IS THE SECURITY
// PROPERTY, not an implementation detail.
//
// The payload has already been through the scope predicate by the time it
// reaches here, so two callers with different scope hash differently and a 304
// can only ever mean "what YOU last received is still what you would receive".
// It is not a shared cache key, there is no shared cache, and an ETag from one
// caller presented by another simply fails to match and yields a full — and
// still scope-filtered — response. The predicate runs on every single poll;
// nothing is skipped to produce the 304 except serialising the body.
//
// ⚠ AND THE QUERY IS NOT SKIPPED EITHER. A cheaper design exists — a version
// token from `max(updatedAt)` and a count — and it was not used. It would let
// the server answer 304 without running the scoped read, which sounds like the
// point of a conditional request and is exactly where this would go wrong: a
// record leaving the caller's scope changes neither the timestamp nor the count
// of anything they can see, so a stale 304 would leave a ticket on their screen
// after they lost access to it. Doing the work and comparing the result is the
// slower answer and the correct one. With no volume numbers (`013
// [CLARIFY-1]`), correctness is the only defensible tie-break.

import { createHash } from 'node:crypto'

/**
 * Send `payload` with an `ETag`, or `304` if the caller already has it.
 *
 * Returns the express response either way, so callers can `return
 * conditionalJson(req, res, body)` exactly as they would `return res.json(...)`.
 */
export const conditionalJson = (req, res, payload) => {
  const body = JSON.stringify(payload)

  // Weak validator: this is a semantic match on the JSON we would send, not a
  // byte-for-byte guarantee about the transfer encoding.
  const etag = `W/"${createHash('sha1').update(body).digest('base64')}"`
  res.set('ETag', etag)

  // Polling must never be served from an intermediary. The response is
  // per-caller and scope-filtered; a shared cache holding it would be a scope
  // leak with a long lifetime.
  res.set('Cache-Control', 'private, no-cache')

  const seen = req.get('if-none-match')
  if (seen) {
    // A caller may legitimately send several (RFC 7232 allows a list).
    const candidates = seen.split(',').map(s => s.trim())
    if (candidates.includes(etag) || candidates.includes('*')) {
      // 304 carries no body, by definition. `res.end()` rather than `res.json()`
      // so nothing is serialised into a response that must not have one.
      res.status(304)
      return res.end()
    }
  }

  res.set('Content-Type', 'application/json; charset=utf-8')
  return res.status(200).send(body)
}

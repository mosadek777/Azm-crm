// spec 004 — the polling intervals, and where each number comes from.
//
// ⚠ UNUSUALLY FOR THIS PROJECT, THESE ARE NOT DEVELOPER GUESSES. Almost every
// other number in this codebase — draft retention, the reminder lead time, the
// notification grouping window — had to be chosen because no requirement fixed
// it, and each is marked unratified for that reason.
//
// These two are ratified, in spec `004`'s own non-functional table:
//
//   NFR-003   "Notification delivery, in-app — ≤ 5s from the triggering event"
//   NFR-002   "Counter and queue freshness — ≤ 30s, without manual reload"
//
// So the design is held to them rather than to an interval that felt
// reasonable. If five seconds turns out to be expensive, the honest response is
// to make the request cheaper — which is what the server's conditional
// responses do, answering 304 with no body — and NOT to poll less often than
// the requirement permits.
//
// `FR-021` binds the two together: lists get the `NFR-002` interval, and a
// message on an open conversation gets the `NFR-003` one, because an agent
// typing a reply to somebody who has already written again is the case the
// story is about.

export const POLLING = {
  /**
   * `NFR-003` — ≤ 5s. Used for the unread notification count and for an open
   * conversation. Both are cheap: the count is one indexed `countDocuments`,
   * and both answer 304 when nothing changed.
   */
  realtimeMs: 5_000,

  /**
   * `NFR-002` — ≤ 30s. Lists, queues and counters. Deliberately slower: a
   * ticket list that redraws every five seconds under somebody's cursor is
   * worse than one that is thirty seconds old.
   */
  listMs: 30_000
} as const;

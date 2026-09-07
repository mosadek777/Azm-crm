# next-steps.md

Written 2026-09-07 immediately after the first working push; revised
2026-09-08 after the UI pass, the demo seed, the API documentation, the ClickUp
board and GitHub Pages. This is the honest accounting of what the compressed
delivery pass actually leaves behind — not a status report dressed up to look
finished.

Read `docs/state.md` for what's built. Read this for what to do about what
isn't.

---

## 1. Broken or half-done

Nothing is broken in the sense of "fails its own tests" — the 46+31+23
acceptance checks and `audit:reconcile` all pass, and that was true at every
commit today, not just the last one. "Half-done" here means: a requirement is
partially covered and the uncovered half is easy to miss unless it's named.

| What | State | Why it's only half |
|---|---|---|
| `001 FR-001` user creation | Partial | Deactivation doesn't return the user's assigned tickets to a team queue (spec `002` `E-12`) — because there's no `Team` to return them to. The audit entry records `ticketsReassigned: null`, not `0`, specifically so the log doesn't claim a reassignment happened. |
| `002 FR-031` resolved→closed | Partial | The confirmation path works. The automatic grace-period path does not exist — it's blocked on the SLA engine (constitution III forbids computing a business duration outside spec `005`). |
| `010 FR-006` SSO | Uncovered MUST | Only the local-password path is built. `FR-006` requires SAML/OIDC support outright; nothing here satisfies it. Recorded as uncovered, not as "done, SSO optional" — it isn't optional, it's just not built yet. |
| `002 FR-029` / `AS-13` resolution fields | Unenforced | `requiresResolutionFields` is `false` on every status (decision 23). The root-cause and resolution-code lists don't exist, so there's nothing to validate against even if the flag were flipped. |
| Ticket reassignment on deactivation | Missing | Same root cause as row 1 — no `Team`, no queue to return to. |

None of these are silent. Each is called out in `docs/trace.md`'s "Unbuilt
MUSTs" table or in the relevant service file's header comment. The risk isn't
that they're broken — it's that someone reads "customer module: done" in
`state.md` and assumes full `FR-001` coverage.

---

## 2. Blocked on a client decision

These cannot be resolved by more engineering. Someone with authority over the
product has to answer them. Full detail and current markers in
`docs/decisions-pending.md`.

| Decision needed | Blocks | Marker |
|---|---|---|
| Which statuses pause the SLA clock — **confirmed**, not just ratified by the developer | Testing spec `005` at all | `005 [CLARIFY-4]` (resolved provisionally; needs client sign-off) |
| Actual SLA numbers (hours/minutes per priority, per tier) | The entire SLA engine | `005 [CLARIFY-1]` |
| Working hours and holidays per branch | The SLA engine's calendar | `005 [CLARIFY-2]` |
| Which identity provider, whose MFA, mandatory or optional | `010 FR-006` (SSO) | `010 [CLARIFY-2]` |
| Data-protection regime + retention period per record type | `001 FR-021` erasure, `010 FR-015` | `001 [CLARIFY-4]`, `010 [CLARIFY-4]` |
| Does a service reply need consent, or only marketing sends | `001 FR-022`, and whether `E-15`'s refusal is too strict | `001 [CLARIFY-5]` |
| May a customer see which individual agent handled their ticket | `002` §9 customer-facing history redaction | `002 [CLARIFY-6]` |
| Which channels ship in phase one (email/WhatsApp/SMS/chat) | All of spec `003` | `003 [CLARIFY-1]` |
| Portal authentication method; is anonymous submission allowed | All of spec `008` | `008 [CLARIFY-1]` |
| Which ERP, which version, what surface does it expose | The ERP integration itself (ownership is already decided — decision 6) | `011 [CLARIFY-2]` |
| Which AI model, hosted where, data residency | All of spec `007` — cannot even be planned per constitution V | `007 [CLARIFY-1]` |
| Concurrent agents, tickets/month, uptime/RPO/RTO commitments | Every `NFR` table in every spec | `013 [CLARIFY-1]`, `[CLARIFY-2]` |

**The one worth raising first:** the SLA numbers and calendars. Nothing in
reporting, dashboards, or automation can be built or tested until those exist,
and they gate more downstream work than any other open item.

---

## 3. Unbuilt MUSTs

Requirements at level `MUST` that ratified decisions or today's scope created
an obligation for, and that have no code behind them yet. Distinct from
section 2 — these aren't waiting on a client answer, they're waiting on
someone to write them.

| Requirement | Why it's not built | Effort |
|---|---|---|
| `001 E-15` — refuse outbound on a shared contact point, no fallback to any one customer's consent | There's no outbound messaging code at all yet (spec `003` is out of scope) | Trivial once channels exist — the refusal rule is already specified, it just needs a call site |
| `010 FR-006` — SAML/OIDC | Not attempted this pass; local auth was built instead on the strength of `FR-007` | 3–5 days for a single IdP integration, once `010 [CLARIFY-2]` names one |
| `002 FR-029` / `AS-13` — resolution-code enforcement | The two admin-authored bilingual lists (root cause, resolution code) don't exist | 1–2 days: two small CRUD entities plus the enforcement check in `changeStatus` |
| `002` `E-12` — return a deactivated agent's tickets to their team queue | No `Team` to return them to | Blocked on the `Team` entity (see section 4) |
| `010 FR-009` audit search/export | Not attempted — the audit log is written and indexed, but has no read endpoint | 1 day for a basic filtered search; export adds another day for the format and the "export is itself audited" requirement |

---

## 4. Scoped-out modules, with estimates

Order matches the dependency chain in `stories/README.md`, not priority. Each
has one ClickUp task (workspace `90152504892`, list `901525782663`) named after
the `key` below — `node tools/sync-clickup.js` keeps them current.

| Module | `tasks.json` key | Blocked on | Rough estimate once unblocked |
|---|---|---|---|
| `Team` entity | `scope-team` (subtask of `scope`) | Nothing — this is a spec-authoring gap, not a client question. Needs someone to define it. | 2–3 days: entity, `teamIds` on `RoleAssignment`, the third scope dimension in `scope.js`, backfilling every ticket's `owningTeamId`, reversing decision 20 |
| Email channel | `channel-email` | `003 [CLARIFY-1]` — which channels ship first; plus a threading-identity decision (`Message-ID` headers vs. a reference in the subject) | 2–3 weeks if this is the first channel — inbound threading, spec `003`'s correlation rule, is the hard part per constitution VI |
| WhatsApp channel | `channel-whatsapp` | `003 [CLARIFY-1]`, plus a Business API provider account and approved templates | ~1 week after the first channel lands, plus provider onboarding time that is not engineering time |
| SMS channel | `channel-sms` | `003 [CLARIFY-1]`, plus a gateway choice and a registered sender ID | ~1 week after the first channel. Inbound has no threading key but the phone number, which is exactly the `E-15` shared-contact-point case |
| Live chat | `channel-live-chat` | `003 [CLARIFY-1]`, plus an agent-availability model no spec defines | 1.5–2 weeks — the only channel needing a websocket transport, which nothing in the current stack provides |
| SLA & automation engine | `sla-engine` | `005 [CLARIFY-1]`, `[CLARIFY-2]` | 2 weeks: business calendar, pause ledger, clock states, threshold notifications. Auto-assignment and the rules engine are separate and add another 1–2 weeks |
| Knowledge base | `knowledge-base` | `006 [CLARIFY-1]`, and `012 [CLARIFY-1]` | 1.5–2 weeks for articles, review workflow, bilingual content |
| Customer portal | `customer-portal` | `008 [CLARIFY-1]` | 2 weeks for a minimal self-service view (status, reply, confirm) once portal auth is decided |
| Reports & management | `reports` | The SLA engine (every duration figure depends on it, constitution III) | 2–3 weeks, and cannot start meaningfully before `sla-engine` lands |
| ERP integration | `erp-integration` | `011 [CLARIFY-2]` — which ERP | Unknowable until the ERP is named. A modern REST API: 1–2 weeks. A legacy SOAP/flat-file system: could be a month |
| AI features | `ai-features` | `007 [CLARIFY-1]` — entire spec blocked by constitution V | Not estimable — cannot be planned until model/hosting/residency are answered |

These are wall-clock estimates for one developer at roughly today's pace, not
padded for review cycles or client back-and-forth. Treat them as ballpark, not
a quote.

---

## 5. Technical debt from today's compression

Blunt, as asked.

**The `recordAudit` "required session" hardening papers over a real gap, not a solved one.** Making `session` a required parameter stops a caller from *silently* forgetting to make a mutation atomic — but it does nothing to stop a caller from correctly passing `session: null` for a write that actually needed a transaction. The three standalone call sites (`auth.service.js`, `permission.middleware.js`, one line in `user.service.js`) were reasoned through carefully. Ticket and customer service code written under today's time pressure was reasoned through less carefully in the same way — it was tested, not independently reviewed line-by-line for "should this have a session." Worth a dedicated pass before this codebase gets much bigger.

**Category being a flat string is a data-loss trap waiting to happen, not just a spec deviation.** The moment someone builds the real category tree (`FR-004`), every existing ticket's `category` string has to be mapped onto a leaf node by a human or a heuristic, because there's no structural link to infer it from. The longer flat categories are used in production, the worse this migration gets. This is the deviation I'd reverse soonest, before real ticket volume accumulates against it.

**Dropping `Team` wasn't just "simpler" — it deleted a scope dimension from a system whose entire selling point is enforced scoping.** `FR-004` names three dimensions; two are enforced. That's fine for a demo. It is not fine if a client ever asks "can Agent X in Team Y see tickets from Team Z in the same department" and the honest answer is "the system doesn't have teams." This is the single deviation most likely to be visible to an actual end user, not just to someone reading the spec.

**The transition graph (decision 22) is data I invented, not data anyone approved.** It's flagged as such in the code, but "flagged as such in the code" is not the same as "someone with authority over the support workflow has looked at it." If the real workflow doesn't allow `assigned → resolved` directly, or wants `pending_supplier` reachable from `pending_customer`, that graph is wrong today and nothing will fail loudly to reveal it — tickets will simply follow a legal-but-wrong path.

**~~No integration test suite exists~~ — resolved 2026-09-08, but it still does not run in CI.** The 106 acceptance checks now live in `backend/tests/` and run with `npm test`, which drops the database and restarts the server before each suite. They are real and have caught genuine bugs (the index-name collision, the reconcile coverage gap). What is still missing is anything that runs them automatically: nothing stops a commit that breaks them, because there is no CI. The command exists; the discipline is still manual.

**The Postman collection and OpenAPI spec will drift the moment someone adds a route without running `docs:build`/`docs:postman` afterward.** There's no pre-commit hook or CI check enforcing that. It's a two-command discipline problem now; it'll be a "why does the API docs page lie" problem in a month if nobody enforces it.

**`DEFAULT_COUNTRY_CODE=+20` is a real assumption baked into phone normalisation**, not a cosmetic default. If this client's customer base isn't predominantly Egyptian, every unqualified local-format phone number normalises wrong, silently, and duplicate detection (`FR-010`) degrades without any error being thrown.

**Every UI component is now hand-rolled, and nobody has audited them for accessibility.** PrimeNG was installed, found to inject an unremovable licence banner, and removed (decision 24) — the right call, but the consequence is that the table, the select, the collision dialogue and the status control are all bespoke Tailwind markup written quickly. None of it has been checked for keyboard navigation, focus trapping in the dialogue, ARIA roles on the status control, or screen-reader labelling. A component library gives that away for free; hand-rolling means it is simply absent until someone writes it. This is worse than it sounds in an RTL context, because focus order and arrow-key direction are exactly where hand-rolled components get Arabic wrong, and no screenshot will reveal it.

**The frontend has no tests whatsoever.** `npm test` in `frontend/` runs the Angular starter's default spec and nothing else. Every claim about the UI in this repository — that it mirrors correctly in Arabic, that the collision dialogue is wired to the 409 body, that the status control follows `reachableStatuses` — rests on screenshots I took and read by eye. That is evidence, and it is not a regression test. The next change to `styles.css` could silently break the Arabic layout and nothing would catch it.

**`seed:demo:clear` is the only code in this repository that can violate constitution II, and it is guarded by a check rather than made impossible.** It deletes demo audit entries with a raw `deleteMany`, deliberately breaking the append-only rule so the reconcile report is not permanently filled with noise from throwaway data (decision 25). The reasoning holds, but the safeguard is a localhost check inside a script — an environment assertion, not a structural impossibility. Anyone who runs it against a real database with a rewritten guard destroys audit history that by design cannot be reconstructed. It should probably require a second, explicit confirmation flag before it does anything at all.

**One instance of the client duplicating server truth was found and fixed; nobody has swept for the others.** The ticket detail screen hardcoded three statuses as pausing the SLA clock, duplicating a fact the server already returns from `/ticket/meta`. It was caught by accident while reading the code, not by a check, and replaced with a lookup. The same failure mode — a list of statuses, roles, or transitions retyped in the frontend because it was quicker than fetching it — is exactly the kind of thing that stays correct until the server changes and then goes silently wrong. No one has gone looking for the rest.

**The UI renders controls for actions the server may refuse.** The reply box, the assign control and the status dropdown are drawn for anyone who can open a ticket, and the first thing that tells a user they were not permitted is a red refusal after they typed a reply and pressed send. That is how the administrator message bug surfaced: not as a missing button, but as a wall of Arabic refusal text after composing a customer reply. The bug is fixed; the shape of the failure is not. An auditor signed in today still sees a reply box that will always refuse them.

The fix is not to hardcode a role table in the client — that would duplicate server truth, which is the mistake this project keeps catching itself making (the `pausesSla` list, and the message route's hand-written role list that caused the bug in the first place). The server should say what the caller may do with the record it just returned, the way `GET /ticket/:id` already returns `reachableStatuses` for the status control. A `permissions` block on the ticket detail response — may reply, may assign, may transition — lets the client disable or hide controls from server truth, and keeps one authority for the answer. The 403 stays as the enforcement; the UI stops being the place a user discovers it.

Worth doing before more screens copy the current pattern: every screen added from here inherits it.

**The ClickUp board is a snapshot, not a mirror.** `tools/sync-clickup.js` is genuinely idempotent and pushes `tools/tasks.json` faithfully, but nothing pushes reality into `tasks.json`. The board is accurate exactly as long as someone remembers to edit that file and re-run the sync after changing the code. Sync also only ever writes: a task closed by hand in ClickUp is reopened by the next run, and a status changed in ClickUp is silently reverted. Treat the file as the source of truth and the board as its rendering, or the two will diverge without warning.

---

## 6. Recommended order for the next two weeks

Assuming one developer, continuing at today's pace, and assuming the client
decisions in section 2 arrive on no particular schedule (so this order front-
loads what doesn't need them).

**Days 1–2 — close the compression debt before building on top of it.**
Define `Team` properly and reverse decision 20. This is the deviation with the
worst compounding cost (section 5, row 3) and the one every subsequent ticket
feature makes more expensive to fix later. Do it now while ticket volume is
zero.

**Days 3–4 — get a real safety net in place.**
The suites are in the repository now (`npm test`), so what remains is CI: run
`npm test` and `ng build` on push, and add a check that `docs:build` /
`docs:postman` leave no diff — now a meaningful check, because `docs:postman`
is deterministic as of 2026-09-08 and previously could not have been one.
Include at least a smoke test on the frontend, which still has none. Unglamorous,
and the thing that stops every future change from being a manual verification
marathon.

**Day 5 — an accessibility and RTL pass over the hand-rolled components.**
Half a day with a keyboard and a screen reader over the four bespoke controls
(table, select, collision dialogue, status control), in Arabic as well as
English. This is cheap now and expensive once more screens copy their patterns,
and it is the one gap in section 5 that an end user meets directly rather than
a developer.

**Day 6 — resolution-code enforcement (`FR-029`).**
Small, self-contained, no client decision needed, and it closes a currently
unenforced MUST. Good use of a short block before a bigger dependency-bound
piece of work.

**Days 7–8 — take the client decisions in section 2 to whoever owns them,
in parallel with the above.**
Specifically: the SLA numbers and calendars, and the identity-provider
question. These block the two largest pieces of remaining work (the SLA
engine, and closing the SSO gap) and they take the client the longest to
answer, so starting the conversation on day 1 rather than day 9 buys real
calendar time. This isn't "day 7 work" — it's a phone call that should happen
this week, listed here so it isn't forgotten under the engineering tasks.

**Days 9–12 — first channel (spec `003`) or the SLA engine, whichever
unblocks first.**
Both are two-week-plus efforts; starting whichever has an answer keeps
momentum. If neither has an answer by day 9, fall back to the customer portal
groundwork (`008`) or knowledge base (`006`) — both are self-contained enough
to make progress without the SLA engine, though the portal still needs its own
auth-method decision.

**Day 13–14 — buffer, plus a second developer's read-through of this
document's section 5.**
Every item there was written by the same person who wrote the code under time
pressure. A second set of eyes before more is built on top of it is worth more
than two more days of feature work.

**Deliberately not in the first two weeks:** AI features (cannot be planned —
section 4), reports (depends on the SLA engine landing first), ERP integration
(depends on a client answer that has no controllable timeline).

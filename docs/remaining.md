# remaining.md — everything not done, ordered so nothing breaks what works

Written 2026-09-08. Grounded in `specs/` and `stories/`; where nothing covers an
item that is said rather than filled in.

**The column that matters most is `Kind`.**

- **ADD** — new files, new collections, new endpoints. Existing code is not
  edited. If it goes wrong, nothing that works today stops working.
- **CHANGE** — edits code that is working now, or reshapes data that already
  exists. These are the ones that can break what you have, and the ones whose
  cost rises with time.
- **ADD + CHANGE** — mostly new, with a named edit to something existing. The
  edit is named so you can see exactly what is being touched.

Effort is engineering days for one developer at this repository's pace, backend
and frontend separate. Ballpark, not a quote — the same caveat as
`next-steps.md` §4.

The order is a safe build order: **no item breaks an earlier one**, and every
dependency appears above its dependant. It is not a priority order — see §7 for
where to start and where not to.

---

## 1. Reversals — where adding the real version means undoing a shortcut

Flagged first because these are the only items where "add the real thing" also
means "take something out". Each names the decision it reverses.

| # | Item | Spec | Reverses | Kind | Be | Fe |
|---|---|---|---|---|---|---|
| R1 | **Category as a real tree**, leaf-only selection | `002 FR-004` (**MUST**) — *"Categories MUST form a tree; a ticket MUST reference a leaf"*; `002 FR-005` inheritance | **Decision 21** (flat string) | **CHANGE** | 2–3 | 1–2 |
| R2 | **Team entity** — `T1` + `M1` per decision 30 | `002 §3` `owning_team_id` **Required**; `012 §3` `default_team_id`; `010 FR-004` | **Decision 20** (Team scoped out) | **CHANGE** | 2–3 | 1 |
| R3 | **Real customer sign-in** — one-time code to a verified contact point | `008 FR-001` (**MUST**), `AS-01`, `E-03`, `NFR-004`; decision 26 | Whichever demo shortcut is approved | **CHANGE** | 3–4 | 1 |
| R4 | **`requiresResolutionFields` enabled** | `002 FR-029`, `AS-13` | **Decision 23** (gate disabled) | **ADD + CHANGE** — new lists; edits `changeStatus` and the status map | 1.5 | 1 |
| R5 | **Notifications** on status change and reply | `008 FR-010` (**MUST**), `AS-11`; `008 AS-07` | Nothing — never built wrongly | **ADD** | — | — |

**R5 is in this table only to say it is not a reversal.** Nothing was shortcut;
spec `003` does not exist, so nothing can be built. It reverses no decision and
leaves no wrong code behind. Not estimable until a channel exists.

**Why R1 and R2 are the two that get more expensive with time.** Both reshape
data that already exists. `R1` requires mapping every stored `category` string
onto a leaf node — by a human or a heuristic, because a flat string carries no
structural link to infer from. `R2` requires giving every existing ticket an
`owning_team_id`, which `002 §3` marks **Required** and which no ticket has. At
zero real tickets both are a morning's work. At ten thousand they are a
migration project with a judgement call per row.

---

## 2. Pure additions — safe to bolt on

Nothing here edits working code. If one goes wrong, the rest of the product is
unaffected.

| # | Item | Spec | Depends on | Kind | Be | Fe |
|---|---|---|---|---|---|---|
| A1 | **Bilingual status labels in code** | `002 §3` Status: `label_ar`, `label_en` — *"Both required (constitution I)"*; `008 §8` sources the portal's labels from them | — | **ADD** — `ticket-status.js` carries only `pausesSla`, `terminal`, `requiresResolutionFields` today | 1 | 0.5 |
| A2 | **Ticket `source` in the audit entry** | `002 §10`: *"Ticket created \| actor, timestamp, **source** (`ui` / … / `portal`), …"* | — | **ADD** | 0.5 | — |
| A3 | **Role assignment endpoints** — grant and revoke a role on an existing user | **No spec provides these.** `010 FR-001` covers create/deactivate/reactivate only. Recorded as a gap, not filled | Decision on what may be granted | **ADD** | 1–1.5 | 1 |
| A4 | **Audit log search and export** | `010 FR-009` | A decision on who may read it (`next-steps.md` §5) | **ADD** | 1–2 | 1–2 |
| A5 | **Saved and shared views** | `002 FR-026` — *"a shared view MUST still apply the viewer's own scope, never the author's"* | — | **ADD** | 1 | 1 |
| A6 | **Sub-tasks** | `002 FR-019` — assignable to a different team, no SLA, never customer-visible | `R2` (they target a team) | **ADD** | 1.5 | 1 |
| A7 | **Bulk assign / close / retag** | `002 FR-011` — per-ticket permission, per-ticket outcomes, *"MUST NOT abort the batch on one failure"* | — | **ADD** | 1 | 1 |
| A8 | **Attachments** | `002 FR-015`; `008 FR-002`, `FR-004`, `E-09`, `E-10` | Spec `010` scanning | **ADD** | 2–3 | 1–1.5 |
| A9 | **CI** — run `npm test` and `ng build` on push; check `docs:build`/`docs:postman` leave no diff | No spec — a delivery practice (`next-steps.md` §5) | — | **ADD** | 0.5–1 | — |
| A10 | **Frontend tests** | No spec. `next-steps.md` §5: the six screens have none | — | **ADD** | — | 2–3 |

---

## 3. The customer portal

Full breakdown, dependencies and estimates are in `docs/portal-plan.md` §6 and
are not duplicated here. Summarised for ordering only.

| # | Item | Spec | Depends on | Kind | Be | Fe |
|---|---|---|---|---|---|---|
| P1 | Contact point verification (`C1`) | `008 FR-001`, `§2` *"Required to authenticate"* | — | **ADD** — `ContactPoint.verifiedAt` exists and nothing writes it | 1.5–2 | — |
| P2 | Portal identity and sign-in (`C2`) | `008 FR-001`, `§3`; decision 26 | `P1` | **ADD** | 3–4 | — |
| P3 | `customer = session` predicate (`C3`) | `008 §11` — *"the single most important predicate in the spec"*; constitution IV | `P2` | **ADD** | 1.5–2 | — |
| P4 | Portal shell, RTL, mobile (`C4`) | `008 FR-011`, `FR-012` | `P2` | **ADD** | — | 2–3 |
| P5 | Submit a ticket (`D1`) | `008 FR-002`, `AS-04` | `P3`, `A2` | **ADD** | 1–1.5 | 2–3 |
| P6 | List and detail, internal content excluded (`D2`) | `008 FR-003`, `FR-005`, `FR-019`, `AS-06` | `P3`, `A1`, `R2` for the owning team | **ADD** | 2 | 3–4 |
| P7 | Customer reply (`D3`) | `008 FR-004`, `AS-07`; constitution VI | `P6` | **ADD** | 1 | 1–1.5 |
| P8 | Reopen, withdraw, confirm closure | `008 FR-009`, `FR-014`; `002 FR-022`, `FR-031` | `P6` | **ADD** | 1.5 | 1 |
| P9 | Feedback | `008 FR-008`, `AS-08`; `009 FR-005` | `008 [CLARIFY-3]` — **open** | **ADD** | 1.5 | 1 |

`P6` is the one to review hardest: `008 FR-019` is a **MUST** that *"no internal
note, AI output, automation log, assignment detail or agent identity … appear on
any portal surface, export or notification"*. That is a guarantee about every
surface, and it needs a test per surface rather than one check.

---

## 4. Depends on the SLA engine

Nothing here can start until spec `005` exists, and `005` itself is blocked on
`005 [CLARIFY-1]` (SLA numbers) and `[CLARIFY-2]` (calendars).

| # | Item | Spec | Kind | Be | Fe |
|---|---|---|---|---|---|
| S1 | **SLA engine** — calendars, pause ledger, clock states, thresholds | `005`; constitution III makes `elapsed-time.js` the sole source | **ADD + CHANGE** — `elapsed-time.js` currently returns `{status:'unavailable'}` and every caller expects that | 10+ | 2–3 |
| S2 | **Auto-assignment** (`E1`) | `005 FR-008` (**MUST**) — `round_robin`, `least_loaded`, `skill_match`; `FR-009` eligibility | **ADD** | 3–4 | 1–2 |
| S3 | **Escalation** | `002 FR-012`; `005` escalation policies | **ADD** | 2–3 | 1 |
| S4 | **Portal timing display** — reopens `008 [CLARIFY-2]` | `008 FR-003` (**MUST**, currently uncovered), `AS-05` | **CHANGE** — edits `P6`'s view | 0.5 | 0.5 |
| S5 | **Reports** | `009`; every duration figure depends on `S1` | **ADD** | 10+ | 5+ |

**`S2` is additionally blocked on a rule that does not exist.** `002 E-12` says
*"the **team lead** is notified"* and `005 FR-009` says *"the lead MUST be
notified"* — singular and definite — while under `M1` a team may hold zero leads
or several. **No spec states what happens in either case.** Recorded in
decision 30 as an open gap; it needs a stated rule before `S2` can be built.

---

## 5. Whole modules not started

Each is a spec's worth of work. Decomposing them before their blockers clear
would be guesswork, so they are named and sized only.

| # | Module | Spec | Blocked on | Kind | Rough |
|---|---|---|---|---|---|
| M1 | **Agent dashboard** — personal and team queues, counters, tasks, quick replies, mentions | `004` (`FR-001`–`FR-016`) | `R2` for the team queue | **ADD** | 2–3 weeks |
| M2 | **Channels** — email, WhatsApp, SMS, chat | `003` | `003 [CLARIFY-1]`, and provider accounts | **ADD** | 2–3 weeks first channel, ~1 week each after |
| M3 | **Knowledge base** | `006` | `006 [CLARIFY-1]`, `012 [CLARIFY-1]` | **ADD** | 1.5–2 weeks |
| M4 | **SSO** | `010 FR-006` (**MUST**, uncovered) | `010 [CLARIFY-2]` — which IdP | **ADD** | 3–5 days |
| M5 | **ERP integration** | `011` | `011 [CLARIFY-2]` — which ERP | **ADD** | 1 week to a month |
| M6 | **AI features** | `007` | `007 [CLARIFY-1]`; constitution V; and `M2`, since every feature operates on message content | **ADD** | Not estimable |

---

## 6. Debt in what already works

From `next-steps.md` §5. These edit working code by definition.

| # | Item | Kind | Be | Fe |
|---|---|---|---|---|
| D1 | **Accessibility and RTL keyboard pass** over the four hand-rolled controls | **CHANGE** — touches every screen | — | 1–2 |
| D2 | **Sweep for other client-side duplications of server truth** — one was found by accident (`pausesSla`), nobody looked for the rest | **CHANGE** | — | 0.5–1 |
| D3 | **`seed:demo:clear` second confirmation flag** — it is the only code permitted to break constitution II (decision 25) and its guard is an environment check | **CHANGE** | 0.25 | — |
| D4 | **Deactivation returns a user's open tickets** | `002 E-12`, `010 E-06` | **CHANGE** — edits `deactivateUser` | 1 | 0.5 |
| D5 | **Outbound refusal on a shared contact point** | `001 E-15` | **ADD**, blocked on `M2` | 0.5 | — |

---

## 7. Where to start, and where not to

### Start here, because it is cheap now and expensive in a month

**`R2` (Team) and `R1` (category tree).** Both reshape data that exists, and
both are the kind of work whose cost is set by how much data has accumulated
when you do it.

- `R2`: `002 §3` marks `owning_team_id` **Required** and no ticket has one.
  Backfilling ten demo tickets is a loop. Backfilling a year of real tickets
  means deciding, per ticket, which team should have owned it — and there is no
  attribute to derive that from once the categories that would have implied it
  have themselves changed.
- `R1`: `002 FR-004` is a **MUST** that categories form a tree. Every ticket
  currently stores a flat string with no structural link to a future leaf node.
  Decision 21 already records this; the longer flat categories accumulate, the
  worse the mapping gets.

`R2` also unblocks the most downstream work of anything on this list — `A6`,
`S2`, `M1`'s team queue, and `008 FR-003`'s owning-team field in `P6`.

**`A9` (CI) is the cheapest insurance here.** Half a day, pure addition, and it
is what stops `R1` and `R2` — the two riskiest items — from breaking something
silently. If you do `R1` or `R2` without it, you are relying on remembering to
run `npm test`.

### Also worth doing early, for a different reason

**`A1` (status labels) and `A2` (ticket source).** Both pure additions, both
under a day, and both are prerequisites for portal work you will otherwise have
to come back and retrofit. `A2` in particular: `008 §13` measures *"portal share
of ticket intake"*, and a ticket created without a recorded source cannot be
counted retrospectively.

### Do not start yet

**Anything in §4.** `S1`–`S5` all depend on spec `005`, which is blocked on two
client answers. Building against a guessed SLA model would produce exactly the
kind of work that gets thrown away, and constitution III makes the dependency
absolute rather than a matter of taste.

**`S2` specifically**, even after `R2`, until the team-lead rule exists. It
cannot be implemented against an undefined notification recipient.

**`P9` (feedback)** until `008 [CLARIFY-3]` is answered. Inventing a scale makes
satisfaction data incomparable across the change point, and `009 FR-005` reports
it as a mean.

### Fine to leave alone for a long time

**`M3` (knowledge base), `M5` (ERP), `M6` (AI), `S5` (reports).** All four are
pure additions blocked on client answers, none of them changes existing code,
and none gets more expensive by waiting. Leaving them is not accruing debt — it
is the correct response to an unanswered question. `M6` additionally cannot be
planned at all under constitution V.

**`A4` (audit log viewer).** The trail is written, immutable and reconcilable
today; only reading it back is missing, and reading is additive. Nothing
degrades while it waits.

**`D3`** — a real hardening, but the guard is an environment check that has
never failed, and the script is not reachable from the application.

### The one that is easy to misjudge

**`D1` (accessibility and RTL).** It looks like polish and it is not: it is the
only item on this list an end user meets directly rather than a developer, and
it gets worse in a specific way. Every screen added after it copies the current
patterns, so the cost is not fixed — it scales with how many screens exist when
you do it. Doing it before `P4`–`P7` adds four portal screens is materially
cheaper than after. `008 NFR-006` requires **WCAG 2.1 AA with no level-A
failures**, which is a stated target and not a preference.

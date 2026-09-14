# state.md — read this first

The session-start briefing. Read this **instead of** the constitution and all
thirteen specs. Updated at the end of every step.

**Last updated:** 2026-09-14 · **after:** spec `004` closed as far as it goes,
the conversation unified across staff and portal, `010 FR-011`'s first two
configuration surfaces, and role changes in place · **43 ratified decisions** ·
constitution 0.4.0

---

## NEXT ACTION

Four items, in this order. The first is not a feature and is the most valuable.

1. ~~Role changes for an existing user~~ — **BUILT 2026-09-14.** Decision 43
   (project owner): a user may not be left holding zero roles, so the last
   revocation is refused as `E-01` refuses removing the last administrator.
   `decisions-pending.md` §25. ⚠ **It also exposed that `E-01` had never fired:**
   the break-glass root holds an `ADM` assignment and is active, so the
   population it counted was never smaller than one. Fixed in both the
   deactivation and revocation paths, and now asserted.
2. ~~Bring `test-cases/` current~~ — **DONE 2026-09-14.** All thirteen files
   now carry an accurate status per case and a revision date. `004` was the
   worst: it said *"this whole module is unbuilt"* and marked 17 of 18 cases
   not testable, when 11 are built and 3 fully automated.
3. **Live updates** — the list and the thread changing without a reload. No spec
   requires it, so the story and the requirement get written and shown before
   any code, the way `PLT-15` was. The hard part is not the transport: **a push
   must never reach somebody who could not read that record over HTTP**, and the
   predicate has to be evaluated per recipient per push, not once per event.
4. **The category tree** (`002 FR-004`), reversing decision 21. Last, because it
   is the only one carrying a **data migration**: every existing ticket holds a
   flat category string.

---

## What is built

### Backend

Express 5, ES modules, MongoDB `rs0` single-node replica set. Modules under
`src/modules/<name>/{controller,service}.js`.

| Area | Covered |
|---|---|
| Auth | `010 FR-006` local path, `FR-008`, `E-04` (permissions re-read per request), `E-07` break-glass. `GET /auth/me` returns six **rendering hints** — never authorisation |
| Users | `010 FR-001`, `FR-002`, `FR-003`, `E-01`, `E-02`, and **role grant/revoke in place** (§10, §11; decision 43) |
| Scope | `010 FR-004` (**branch + department only**; Team does not exist), `FR-005`, `FR-021`, `AS-01`, `AS-03`, `AS-04` |
| Audit | `010 FR-008`, `AS-08` append-only, `E-11` **atomic via transactions**, `NFR-005` |
| Platform | `012 FR-004`, `FR-007`, `FR-008`, `AS-02` refuses a single-language label |
| Configuration | `010 FR-011` — **status and priority labels, and `pausesSla`**. Two of the requirement's fourteen surfaces; `decisions-pending.md` §24 says why these two and in what order the rest come |
| Customer | `001 FR-001`–`FR-004` (decision 16), `FR-010`, `FR-020`, `AS-01`–`AS-04`, `E-05`, `E-06` |
| Ticket | `002 FR-001`, `FR-002`, `FR-007`–`FR-010`, `FR-013`, `FR-014`, `FR-021`, `FR-033`, `FR-034`, `AS-01`, `AS-03`, `AS-05`–`AS-07`, `E-11`, `E-12`, `E-16` |
| **Agent workspace** | `004` — see the table below. Closed as far as it can go |
| Portal | `008 FR-001` (decision-31 password shortcut), `FR-002`–`FR-005`, `FR-019`/`AS-06` internal content excluded **in the query**, `AS-02` 404 not 403, `FR-020` |
| API docs | `/api-docs` Swagger UI, `docs/openapi.json`, Postman collection with auto-token-save |

### Spec 004 — the honest count

**Eleven of eighteen stories built. Seven not, and none of them on effort.**

| Built | On what |
|---|---|
| `AD-01` personal queue | `E-05`'s stated fallback order — the degraded path IS the requirement while the SLA clock is blocked |
| `AD-02` counters | Each openable as the list it counts. Overdue renders `unavailable`, never `0` |
| `AD-03` customer context | Beside the conversation |
| `AD-04` tasks | `E-09`'s past due date accepted, not refused |
| `AD-05` reminders | Task half only. **Evaluated when you open the workspace**, and the screen says so |
| `AD-06` quick replies | Decision 41's placeholder vocabulary |
| `AD-09` mentions | **Notify only, no grant** — decision 39 |
| `AD-13` notifications | In-app only, grouped per `FR-013`'s window |
| `AD-15` drafts | Decision 42's seven days |
| `AD-16` team queue | Three views answered; **at-risk is offered and refuses** |
| `AD-18` countdown | Renders `unavailable` with its reason |

| Blocked | On what | Card |
|---|---|---|
| `AD-05` SLA half | `005 FR-006`, blocked on `005 [CLARIFY-1]` | `reminder-sla-thresholds` |
| `AD-13` email + push | Spec `003` does not exist | `reminder-channels-email-push` |
| anything timed | **There is no scheduler** — `005 §11` specifies one | `reminder-scheduler` |
| `AD-11`, `AD-14` presence | `004 [CLARIFY-3]` — is chat in phase one? | `presence-and-routing` |
| `AD-17` take-next | `004 [CLARIFY-1]` — "urgency order" is undefined | `take-next-ticket` |
| `AD-10` thread view | Nothing; notes exist on the merged thread | `internal-thread-view` |
| `AD-12` shortcuts | Nothing; a `MAY`, not attempted | `keyboard-shortcuts` |

Full write-up: `decisions-pending.md` §23.

### Frontend

Angular 22, standalone, signals, **Tailwind v4 only** (decision 24), runtime
language switching. **Sixteen routed screens across two interfaces.**

Staff: login · workspace · tickets list/detail/create · team queue · customers
list/detail/create · quick replies · notifications · admin branches /
departments / configuration / users / roles.
Portal: sign-in · my requests · request detail · new request.

**One conversation component serves both interfaces.** Only two things differ,
and neither is a filter applied in the interface: the portal is never *handed*
an internal note (excluded in the query — `008 FR-019`), and it names no
individual agent (decision 29).

---

## Verification — what is actually proven

| | |
|---|---|
| `npm test` (backend) | **15 suites**, exit 0. Counted per file the last time it was measured: scope 28 · customer 35 · ticket 68 · portal 79 · security 45 · actor 23 · config 38 · draft 45 · notification 50 · quick-reply 57 · role-assignment 47 · task 51 · team-queue 41 · workspace 27 · story-002 61 |
| `npm run audit:reconcile` | 0 orphaned, 0 unaudited, 0 unchecked models |
| atomicity proofs | no orphaned audit entry survives an injected fault; rollback verified |
| `ng build` | exit 0 |
| `ng test` (frontend) | **6/6 — app shell and language service only.** No screen has one |
| Browser verification | Ad-hoc CDP scripts per feature, both languages, 1400px **and 390px**. Not committed and not run by CI — see the drift section |

**`npm test` drops the database and restarts the server before each suite.**
Both halves are load-bearing. The suites each create their own
`sara@azmsquad.com`, so a shared database makes the second suite sign in as the
first one's user and fail as though the scope predicate were broken. Dropping
also drops the indexes, which mongoose rebuilds only at model compilation —
hence the restart, or the customer suite would pass while the
one-primary-contact-point-per-channel constraint quietly did not exist.

**After any test run, re-seed before touching the browser:** `npm run seed:demo`
with the API already running.

```bash
# backend/   npm test  ·  npm test -- <name>   (one suite)
# backend/   npm run dev  ·  npm run seed:admin  ·  npm run seed:demo  ·  npm run audit:reconcile
# backend/   npm run docs:build  ·  npm run docs:postman
# frontend/  npm start  ·  npm test  ·  npx ng build
# root/      node tools/sync-clickup.js      (idempotent; tools/tasks.json is the source)
```

---

## What is blocked, and on whom

**Marker state: 67 unresolved `[CLARIFY]` markers.** The gate:

```bash
grep -rEn '^- \[ \] .\[CLARIFY-[0-9]' specs/ | wc -l
```

### Waiting on the client

| Marker | Blocks |
|---|---|
| `005 [CLARIFY-1]` SLA numbers, `[CLARIFY-2]` calendars and holidays | **The single biggest blocker.** Every duration in the product: `elapsed-time.js` answers `unavailable`, the queue falls back to priority-then-age, the overdue counter has no number, the team queue's at-risk view cannot answer, and spec `009`'s reports have no denominators |
| `004 [CLARIFY-1]` what "urgency order" means | `AD-17` take-next; the fallback order is stated in the meantime |
| `004 [CLARIFY-3]` is live chat in phase one | Presence (`AD-11`, `AD-14`) has no consumer without it |
| `004 [CLARIFY-4]` push outside working hours | Half of `FR-013`; an employment question as much as a technical one |
| `001 [CLARIFY-4]` privacy regime, `[CLARIFY-5]` consent scope | `001 FR-021` erasure, `FR-022`; keeps `E-15` refusing |
| `010 [CLARIFY-2]` which IdP | `010 FR-006` SSO is an **uncovered MUST** |
| `013 [CLARIFY-1]` volumes | Every `NFR` threshold is unquantified — including the one that would decide polling vs sockets |
| `011 [CLARIFY-2]` which ERP | Spec `011` |
| `003 [CLARIFY-1]` which channels ship first | Spec `003`, and with it email, push, inbound reply and `002 FR-022` reopen |

### Blocked on us, not on an answer

| Item | Note |
|---|---|
| **`Team` does not exist** | Decision 30 defined the entity; nothing is built. `002 §3` still makes `owning_team_id` **Required**. ⚠ `002 E-12`'s singular *"the team lead"* has no rule for zero or several leads |
| Category tree | Decision 21; reversing it migrates live data |
| Resolution-code and root-cause lists | Decision 23 keeps `002 FR-029` unenforced |
| Attachments | Decision 34 — omitted rather than built without scanning |
| Portal one-time code | Decision 31's password shortcut is **debt the moment one real customer exists** |

---

## Constraints that outrank everything

| | Rule |
|---|---|
| **I** | Bilingual is architecture. Admin-authored labels carry `{ ar, en }`, both required, refuse on missing. **No fallback ever.** User-authored content is single-language. References, phones, emails and durations are always LTR |
| **II** | Every mutation writes an immutable audit entry. `utils/audit.js` is the only writer and `session` is a **required** parameter |
| **III** | `utils/elapsed-time.js` is the sole duration implementation. Nothing else subtracts dates to produce a duration. Returns `{status:'unavailable'}` until `005` unblocks |
| **IV** | Scope is enforced server-side per request, against the target record. Out of scope is **404, never 403**, and byte-identical to absent |
| **V** | No AI feature is to be built |
| **VII** | Unknowns are marked and block the requirement, never guessed |
| **VIII** | Every requirement traces to a story |

**Fixed structure:** backend `modules/<name>/{controller,service}.js`, ES
modules, `.js` on every relative import. No TypeScript on the backend.

**`GET /auth/me` is a rendering hint, never an authorisation check.** Its six
flags decide whether to *offer* a control. The server refuses regardless, and
`security.test.js` proves a forged hint grants nothing. That test pins the exact
flag list, so adding a flag fails it on purpose — every addition has to be
looked at, because the property that matters is that each one is a bare boolean
with no scope inside it.

---

## Skills — read before touching code

- **`.claude/skills/frontend-design/SKILL.md`** — tokens, RTL absolutes, the
  shells, and how to verify a screen. Derived from this codebase.
- **`.claude/skills/testing/SKILL.md`** — how to write a check that can fail,
  and the faults that have already cost a passing suite that proved nothing.

The design authority underneath the skill is `frontend/src/styles.css`:

| Concern | Where |
|---|---|
| Colour | `@theme` — violet `--color-primary-*`, warm stone `--color-surface-*` |
| Type | `--text-xs` … `--text-3xl` |
| Typeface | Cairo, one stack for both languages, self-hosted, unicode-range split |
| Cards | `rounded-xl`, `border-surface-200` — copy an existing screen |
| Direction | Logical properties only. The **only** sanctioned `[dir="rtl"]` rule is the toast keyframe, because CSS keyframes have no logical form |

---

## Ratified decisions — the short list

Full text and evidence in `decisions-pending.md` §0. **42 decisions.** The ones
that shape the code you will read first:

| # | Decision |
|---|---|
| 14 | `pauses_sla` ratified for all ten statuses — **now editable, and non-retroactive by construction** (§24) |
| 15 | `pending_third_party` split → `pending_supplier` (pauses) / `pending_internal` (does not) |
| 20 | **`Team` scoped out** — tickets assign directly to an agent. The defect is stepped around, not resolved |
| 21 | **Category is a flat string**, deviating from `002 FR-004`'s **MUST** |
| 22 | A default status-transition graph was authored (`FR-008` supplies none) |
| 23 | `requiresResolutionFields` false everywhere — `002 FR-029` unenforced |
| 24 | Tailwind only, no component library |
| 29 | A customer sees the owning team and **no agent identity at all**, including the author of a reply they can read |
| 30 | `Team` belongs to spec `012`, to one Department, independent of Branch; membership rides on `RoleAssignment` |
| 31 | Portal sign-in uses a shared demo password, not a one-time code |
| 39 | **A mention may only name a colleague who already holds scope.** It notifies; it grants nothing. `004 FR-009`'s granting clause is declined, because `010 FR-002` forbids per-user permission overrides |
| 41 | The quick-reply placeholder vocabulary — six tokens, `{{dotted.path}}`, fixed for phase one |
| 42 | Draft retention: **7 days** |

**Decisions 1, 6, 9, 10 and 11 are the developer's own judgement**, not readings
of the sources, and are annotated as such in the specs. **And a caveat over all
of them:** the source document *Customer Support CRM · Core Features* is **not
in this repository**, so no decision here traces to the client's own words —
only to derived material the README itself calls *"Nothing here is
client-approved."*

---

## Where the documents have drifted

Recorded because a register that is quietly wrong is worse than one that is
visibly incomplete.

| Document | Drift |
|---|---|
| `test-cases/` | **Current as of 2026-09-14.** Every file carries a revision date; the ones revised that day say what changed |
| `docs/trace.md`, `docs/story-coverage.md` | Not re-derived since spec `004` was built |
| Browser verification scripts | Written per feature into the scratchpad and thrown away. Nothing in the repository runs them, so a regression on any screen is invisible to CI. Board card `mobile-overflow-guard` covers the 390px half of this |
| `tools/tasks.json` | Current — 66 cards, nine added 2026-09-14. Run `node tools/sync-clickup.js` to project it onto the board |

---

## Known defects, distinct from open markers

Nobody wrote a `[CLARIFY]` for these, so the gate cannot see them.

| Defect | Status |
|---|---|
| **`Team` undefined** while `002`/`012` make required references to it | **OPEN**, stepped around by decision 20. `decisions-pending.md` §7 |
| `002 FR-004` category tree deviation | **KNOWN and accepted** (decision 21). Reversing it is item 4 in NEXT ACTION |
| `004 §9` and `002 §9` disagree on who may assign an unassigned ticket | **RESOLVED by recording, not by code** — §21. The team queue's "self only" for an agent is **presentation, not enforcement**: `002 FR-010` is a MUST that an agent may self-assign any unassigned ticket in scope, so the endpoint answers to `002` |
| `004 FR-007` vs `004 §9` on shared quick replies | **RESOLVED** — tightened to MGR+, §19 |
| `001 FR-004`'s shared-contact-point conflict | **RESOLVED** by decision 16, §11 |

---

## Do not trust these numbers yet

`009`'s **reopen rate**, and any metric whose denominator is *tickets closed*,
is degenerate while decision 9 (no auto-close) stands. See `trace.md`.

---

## Environment

- **Break-glass credentials** are in `backend/.env` (`BREAKGLASS_EMAIL`,
  `BREAKGLASS_PASSWORD`), gitignored. Demo accounts share `DEMO_PASSWORD` from
  the same file. **No credential belongs in a tracked file** — once committed it
  survives in history even after removal.
- **Published documentation:** https://mosadek777.github.io/Azm-crm/ — GitHub
  Pages serving `docs/index.html` over `docs/openapi.json`, from `main`/`docs`.
  Regenerate with `npm run docs:build` and commit; there is no build step on the
  Pages side.
- **⚠ Nothing may listen on port 3000 when `npm test` runs.** The runner starts
  its own server per suite; a hand-started `node index.js` already on the port
  silently serves every suite instead, running whatever the source said when it
  was launched. It cost forty minutes once. Kill it first.

# state.md — read this first

The session-start briefing. Read this instead of the constitution and all
thirteen specs. Updated at the end of every step.

**Last updated:** 2026-09-08 · **after:** the eight-phase build pass — design
system (Tailwind only, PrimeNG removed), customer and ticket screens, demo
seed, API documentation, ClickUp board restructured into a tree, GitHub Pages
— 30 ratified decisions, constitution 0.4.0

---

## ⚠ Any verification claim made before 2026-09-08 needs re-running

`MONGO_URI` names no database in its path, and `src/DB/connection.db.js`
overrides it with `dbName: 'azmCrm'`. A verification script that connects with
the URI alone therefore talks to `test` — an empty database the application
never touches — while the app reads and writes `azmCrm`.

That mistake was made during the 2026-09-08 audit: a drop-and-reseed hit `test`,
the suites then ran against a dirty `azmCrm` carrying leftovers from earlier
sessions, and the first result was a failure that did not exist. **A clean run
against the wrong database is worse than a failing run** — it reports success
for work it never examined.

The audit's own results were re-run against a correctly dropped `azmCrm` and are
sound. What cannot be established retrospectively is which database earlier
sessions used. So:

- **Treat every "verified", "passing" or "clean" claim in this repository dated
  before 2026-09-08 as unconfirmed** until re-run. That includes the check
  counts quoted in earlier revisions of this file and of `next-steps.md`.
- Re-running is now one command: `npm test` in `backend/`.
- The name is exported as `DB_NAME` from `connection.db.js` and the test runner
  imports it, so the runner cannot drift from the application again.

---

## NEXT ACTION

**Step 4 shipped today under an explicit delivery-compression instruction —
"working software on GitHub today."** Two simplifications were authorised and
are deviations, not resolved questions:

- **`Team` scoped out** (decision 20) — tickets assign directly to an agent.
  The `Team` defect (§7) is **NOT resolved**, it is stepped around.
- **Category is a flat string** (decision 21), deviating from `FR-004`'s
  **MUST** that categories form a tree.

**What was NOT compromised, on explicit instruction:** the scope predicate
applies to every ticket and customer read and write, and every mutation writes
an audit entry through `utils/audit.js` inside a transaction. Both proven by
test, not asserted.

**Next candidates, not started, no obligation yet:**

1. Define `Team` properly and reverse decision 20 before any ticket-heavy work grows on top of it
2. Root-cause / resolution-code lists, to enable `FR-029` (currently unenforced — decision 23)
3. Convert the flat category string to the real tree (decision 21) if the client confirms the category list is stable enough to model
4. Everything in the "Scoped out today" table below

**Unbuilt MUST created today:** `001 E-15` (outbound-on-shared-contact-point
refusal) is specified but there is no outbound code to enforce it against yet —
see `trace.md`.

---

## Scoped out today, by instruction — one task each in ClickUp

Not blocked by a marker; simply not attempted in this pass. Each has one
top-level ClickUp task under list `901525782663`, workspace `90152504892`,
tagged `backend`/`frontend`, carrying a **Blocked by** line naming what would
have to be answered first.

**The board is a projection of `tools/tasks.json`, re-derived 2026-09-08 from
this file and `roadmap.md`** — 34 top-level tasks, 50 subtasks, **63 COMPLETE ·
21 TO DO · 0 IN PROGRESS**. Two rules make it readable by someone outside the
project, which it has to be because the list is publicly shared:

- **A parent is COMPLETE when its delivered scope works.** Unfinished children
  are not left in place dragging the parent down — they are lifted out into
  their own top-level TO DO card. Seven were (SSO, deactivation handling, team
  scope, the audit viewer, the outbound refusal, resolution codes, elapsed
  time), plus five split out of the portal (one-time-code sign-in, verified
  contact points, notifications, attachments, feedback).
- **Descriptions carry no requirement ids, spec numbers, decision numbers or
  section marks.** A reader without the specs open gets the whole meaning.

⚠ **A subtask cannot be promoted back to a top-level task.** `PUT /task` with
`parent: null` — and with `parent: ""` — answers 200 and leaves the parent
unchanged; verified against throwaway tasks on the live list. Moving a child out
therefore means deleting it and creating a new task, so `tasks.json` carries a
`retiredIds` list that the sync deletes and then empties.

Run `node tools/sync-clickup.js` after changing that file: it is idempotent (a
second run creates zero), handles rate limiting, and finishes by **reading the
board back from ClickUp** and counting it — counting the file it just wrote
would only prove the file agrees with itself. It only ever writes, so a status
changed by hand in ClickUp is reverted on the next run — the file is the source
of truth, the board is its rendering.

| Module | Blocked on |
|---|---|
| Email / WhatsApp / SMS / chat (spec 003) | `003 [CLARIFY-1]` — which channels ship in phase one |
| SLA & automation engine (spec 005) | `005 [CLARIFY-1]` SLA numbers, `[CLARIFY-2]` calendars |
| Knowledge base (spec 006) | `006 [CLARIFY-1]`, and `012 [CLARIFY-1]` |
| Customer portal (spec 008) | `008 [CLARIFY-1]` **RESOLVED 2026-09-08** (decisions 26, 27): one-time code, accounts only. Now blocked on build effort, not a decision — see `portal-plan.md` |
| Reports & management (spec 009) | The SLA engine, for every duration figure |
| ERP integration (spec 011) | Ownership resolved (decision 6); `011 [CLARIFY-2]` — which ERP |
| AI features (spec 007) | `007 [CLARIFY-1]` blocks the whole spec; constitution V |

## Other blockers, unrelated to today's scope compression

| Blocker | Effect |
|---|---|
| **`Team` — entity now decided, one rule still missing** | Owned by spec `012`; belongs to exactly one Department, independent of Branch; membership rides on `RoleAssignment` (decision 30). `002` §3 still makes `owning_team_id` **Required** and no ticket carries one — backfill is piece `B5`. ⚠ **Still open:** `002 E-12`'s singular *"the team lead"* has no stated rule for zero or several leads, and `005 FR-009` cannot be built against an undefined recipient. Needed before piece `E1`. |
| `001 [CLARIFY-4]` privacy regime / retention | Blocks `FR-021` erasure |
| `001 [CLARIFY-5]` consent scope | Blocks `FR-022`, and keeps `E-15` refusing |
| ~~`002 [CLARIFY-6]`~~ **RESOLVED 2026-09-08** (decision 29) | Team only, no agent identity including the replier. Spec `002` is now **0 open markers** |
| `005 [CLARIFY-1]` SLA numbers, `[CLARIFY-2]` calendars | Spec `005` buildable but untestable. `elapsed-time.js` returns `unavailable` |
| `010 [CLARIFY-2]` which IdP, whose MFA, mandatory? | `FR-006` (SSO) is an **uncovered MUST** |
| `013 [CLARIFY-1]` volumes | Every `NFR` table unacceptable-because-unquantified |

**Marker state: 67 unresolved · 15 resolved · 4 provisional** (from 82). Three more resolved 2026-09-08 — `008 [CLARIFY-1]`, `008 [CLARIFY-2]` (provisional), `002 [CLARIFY-6]` — taking spec `002` to **0 open**. See `decisions-pending.md` §0 decisions 26–30 and `portal-plan.md` §5.

```bash
grep -rEn '^- \[ \] .\[CLARIFY-[0-9]' specs/ | wc -l    # the gate
```

---

## What is built and passing

**Backend** — Express 5, ES modules, MongoDB `rs0` single-node replica set.

| Area | Covered |
|---|---|
| Auth | `010 FR-006` local path, `FR-008`, `E-04`, `E-07` break-glass |
| Users | `FR-001` (minus the ticket-reassign clause), `FR-002`, `FR-003`, `E-01`, `E-02` |
| Scope | `FR-004` (**branch + department only**), `FR-005`, `FR-021`, `AS-01`, `AS-03`, `AS-04` |
| Audit | `FR-008`, `AS-08` append-only, `E-11` **atomic** via transactions, `NFR-005` |
| Platform | `012 FR-004` localised values, `FR-007`, `FR-008`, `AS-02` refuses single-language |
| Bilingual | `012 FR-001`, `FR-002`, `AS-03` no-fallback, `AS-06` Arabic typography (Cairo, self-hosted) |
| Customer | `001 FR-001`, `FR-002`, `FR-003`, `FR-004` (decision 16), `FR-010`, `FR-020`, `AS-01`–`AS-04`, `E-05`, `E-06` |
| Ticket | `002 FR-001`, `FR-002`, `FR-007`–`FR-010`, `FR-013`, `FR-014`, `FR-021`, `FR-033`, `FR-034`, `AS-01`, `AS-03`, `AS-05`–`AS-07`, `E-11`, `E-12`, `E-16` — deviations: no Team (decision 20), flat category (decision 21) |
| API docs | `/api-docs` (Swagger UI), `docs/openapi.json`, Postman collection + environment with auto-token-save on login |
| **Customer portal** | `008 FR-001` (sign-in, via the decision-31 password shortcut), `FR-002` submit, `FR-003`/`FR-005` list and detail, `FR-004` reply, `FR-019`/`AS-06` internal content excluded **in the query**, `AS-02` out-of-scope is 404, `FR-020` every portal action audited as the customer. §11's `customer = session` predicate is real, not stubbed |

**Frontend** — Angular 22, standalone, signals, **Tailwind v4 only** (no
component library — decision 24), runtime language switching. **Ten screens
across two interfaces**: staff — login, customer list/detail/create, ticket
list/detail/create; customer portal — sign-in, my requests, request detail with
the conversation thread, new request. The two shells are told apart by product
name and an area pill and are otherwise identical in treatment. Every component
is hand-rolled and **none has had an accessibility or RTL keyboard audit** —
see `next-steps.md` §5.

**Verification** (all re-run 2026-09-08 against a correctly dropped `azmCrm`):

| | |
|---|---|
| `npm test` (backend) | **210 checks** — scope 28, customer 35, ticket 68, portal 79. Exit 0 |
| `npm run audit:reconcile` | 0 orphaned, 0 unaudited, 0 unchecked models (8 checked) |
| atomicity + transaction proofs | no orphaned entry survives an injected fault; rollback verified |
| `ng build` | exit 0 |
| `ng test` (frontend) | 6/6 — app shell and language service only |
| Screens | login, customer and ticket screens screenshotted in both languages |

`npm test` drops the database and restarts the server **before each suite**.
That is not belt-and-braces: the suites each create their own
`sara@azmsquad.com`, so sharing a database makes the second suite sign in as the
first one's user and fail as though the scope predicate were broken. Dropping
also drops the indexes, which mongoose only rebuilds at model compilation —
hence the server restart too, or the customer suite would pass while the
one-primary-per-channel-type constraint quietly did not exist.

**The frontend still has no meaningful tests.** The 6 that pass cover the app
shell and the language service; none of the six screens has one.

```bash
# backend/          npm test   — drops the DB and runs every acceptance suite
# backend/          npm run seed:admin (once) · npm run dev · npm run audit:reconcile
# backend/          npm run docs:build · npm run docs:postman
# backend/          npm run seed:demo   (needs DEMO_AGENT_PASSWORD) · npm run seed:demo:clear
# frontend/         npm start · npm test · npx ng build
# repo root/        node tools/sync-clickup.js   — idempotent, see tools/tasks.json
```

**Published documentation:** https://mosadek777.github.io/Azm-crm/ — GitHub
Pages serving `docs/index.html` (Swagger UI) over `docs/openapi.json`, from
`main` / `docs`. Regenerate with `npm run docs:build` and commit; there is no
build step on the Pages side.

Break-glass administrator credentials are in `backend/.env`
(`BREAKGLASS_EMAIL`, `BREAKGLASS_PASSWORD`), which is gitignored. **No
credential belongs in a tracked file** — once committed it survives in history
even after removal.

---

## Ratified decisions — the short list

Full text and evidence in `decisions-pending.md` §0.

| # | Decision |
|---|---|
| 1 | Isolated entities **not supported** (`012 FR-011` dropped) |
| 2 | Departments **flat**, no nesting |
| 3 | Reference: unique, immutable, never reused |
| 4 | Category tree **multi-level, depth unbounded**, leaf-only selection. The earlier "fixed depth 3" was withdrawn as invented |
| 5 | **SSO required as a capability**; local password permitted alongside |
| 6 | **CRM is the system of record**; ERP read-only. No CRM→ERP writes |
| 7 | **No single identity key** — a ranked match list instead |
| 8 | Status list: **ten** statuses, admin-editable — the spec's original nine, with `pending_third_party` split by decision 15 |
| 9 | **No auto-close** — customer confirmation only, until `005` unblocks |
| 10 | Reopen window **14 calendar days, from `closed`** |
| 11 | Reference format **`TKT-YYYY-NNNNN`** |
| 12 | *Duplicate of 4 — same decision (unbounded category depth). Number retained rather than renumbered, because `decisions-pending.md` §0 and the spec annotations cite these numbers.* |
| 13 | `stories/001` corrected — blocks `FR-014`/`FR-019` |
| 14 | `pauses_sla` ratified for all ten statuses |
| 15 | `pending_third_party` **split** → `pending_supplier` (pauses) / `pending_internal` (does not) |
| 16 | **Shared contact points permitted** — `FR-004` unique-by-default, overridable |
| 17 | **Outbound on a shared contact point refused** (`001 E-15`) — specified, unbuilt (no outbound code exists yet) |
| 18 | `nationalId`/`accountRef` uniqueness scoped to **active** customers only, by analogy to `FR-004`'s own population |
| 19 | `DEFAULT_COUNTRY_CODE=+20`, inferred from `AS-02`'s worked examples |
| 20 | **`Team` SCOPED OUT** — direct agent assignment. Defect NOT resolved, stepped around |
| 21 | **Category is a flat string**, not a tree — deviates from `FR-004` **MUST** |
| 22 | A default status-transition graph was authored (`FR-008` supplies none) |
| 23 | `requiresResolutionFields` false everywhere — `FR-029`/`AS-13` unenforced |

### Which of these are judgement, not readings

**Decisions 1, 6, 9, 10 and 11 are the developer's own choices.** The sources do
not settle them; they were decided on balance and are annotated as such in the
specs.

- **6 — CRM is the system of record.** The evidence review found the sources
  genuinely divided: the entity model reads CRM-native (optional ERP join key,
  unlinked customers a normal state) while the integration spec assumes
  negotiated two-way sync (`INT-06` conflict rules, `E-10` sync loop). Nothing
  resolves it, and the deciding facts — which ERP, what surface it exposes, who
  maintains customers today — are absent. **A1 was a judgement call.**
- **9, 10, 11 — no auto-close, 14 calendar days, `TKT-YYYY-NNNNN`.** Fill
  silences. `14` and the format each appear once, as illustrations inside
  unrelated acceptance scenarios.
- **1 — isolation not supported.** Judgement, but of a *weaker* kind than the
  others: `PLT-11` is `Could` and `FR-011` is `MAY`, and declining to build a
  `MAY` is discretion the spec itself grants. What is missing is the business
  fact that would make it a requirement — whether a subsidiary exists. So the
  decision is authorised by the spec's own level, while the fact behind it is
  unknown.

**Decisions 2, 3, 4, 5, 7, 8, 13, 14, 15, 16 and 17 rest on quoted evidence.**
Decision 2 (flat departments) is the strongest of them: *no story asks for
nesting at all*, so under constitution VIII the capability had no upstream
reason to exist.

**And a caveat over all of them:** the source document *Customer Support CRM ·
Core Features* is **not in this repository**, so no decision here traces to the
client's own words — only to derived material the README itself calls
*"Nothing here is client-approved."*

---

## ⚠ There is no `frontend-design` skill. Stop asking for one.

**Checked 2026-09-09.** The assistant's available skills are `design`,
`dataviz`, `artifact-design`, `artifact-diagramming`, `artifact-capabilities`,
`update-config`, `keybindings-help`, `code-review`, `simplify`,
`fewer-permission-prompts`, `loop`, `schedule`, `claude-api`,
`workflow-authoring`, `run`, `init` and `security-review`. **None of them
covers in-app frontend design.** It was asked for repeatedly across 2026-09-09
and was never there.

`artifact-design` is the near miss and is the wrong tool: it governs published
Artifacts — standalone HTML pages hosted on claude.ai — not an Angular
application. Following it here would import conventions from a different medium.

**What to use instead, which is the better answer anyway:** this application's
own design tokens, in `frontend/src/styles.css`. They are the authority because
they are what the seven existing screens already use.

| Concern | Where it is defined |
|---|---|
| Colour | `@theme` — violet `--color-primary-*`, warm stone `--color-surface-*`. Deliberately not blue-on-white, and the neutrals are warm so the background does not reintroduce it |
| Type | `--text-xs` … `--text-3xl`, a fourth-ish ratio rounded to whole pixels at the small end |
| Typeface | Cairo, one stack for both languages, self-hosted, unicode-range split |
| Card treatment | `rounded-xl`, `border-surface-200`, `shadow-lg` — copy an existing screen rather than inventing a variant |
| Direction | Logical properties only (`ms-`/`me-`/`ps-`/`pe-`/`start`/`end`). The **only** sanctioned `[dir="rtl"]` rule in the codebase is the toast keyframe, because CSS keyframes have no logical-property form |

A new component is judged by whether it looks like it was always there. The test
for that is a screenshot beside an existing screen, in both languages — not a
description.

---

## Constraints that outrank everything

| | Rule |
|---|---|
| **I** | Bilingual is architecture. Admin-authored labels carry `{ ar, en }`, both required, refuse on missing. **No fallback ever.** User-authored content is single-language; references/phones/emails/durations always LTR |
| **II** | Every mutation writes an immutable audit entry. `utils/audit.js` is the only writer, and `session` is a **required** parameter |
| **III** | `utils/elapsed-time.js` is the sole duration implementation. Nothing else subtracts dates. Returns `{status:'unavailable'}` until `005` unblocks |
| **IV** | Scope is enforced server-side per request. Out-of-scope is **404, not 403** |
| **V** | No AI feature is to be built |
| **VII** | Unknowns are marked and block the requirement, never guessed |
| **VIII** | Every requirement traces to a story. `009 FR-025`/`RP-21` traces to a dated amendment and says so |

**Fixed structure, non-negotiable:** backend `modules/<name>/{controller,service}.js`,
ES modules, `.js` on every relative import. No TypeScript on the backend.

---

## Known defects, distinct from open markers

Neither is a `[CLARIFY]` marker — nobody wrote one, so the gate cannot see them.

| Defect | Status |
|---|---|
| **`Team` undefined** while `002`/`012` make required references to it | **OPEN, stepped around by decision 20 today — not resolved.** `decisions-pending.md` §7 |
| **`FR-004` forbade shared contact points** | **RESOLVED** by decision 16. `decisions-pending.md` §11 |
| **`002 FR-004` category tree deviation** | **KNOWN, accepted by instruction today.** Category is a flat string (decision 21). |

## Do not trust these numbers yet

`009`'s **reopen rate** and any metric whose denominator is *tickets closed* is
degenerate while decision 9 (no auto-close) stands. See `trace.md`.

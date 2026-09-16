# Handover

**For: the developer picking this up.** Work stopped on 2026-09-16. This is
what works, what does not, what is waiting on somebody else, and the things
that will cost you a morning if nobody tells you.

Read this once. Then read [`state.md`](state.md) at the start of every session —
it is the shorter, current briefing and it is kept up to date.

---

## The five things that will surprise you

Every one of these cost real time here. None is discoverable from the code.

### 1. Nothing may listen on port 3000 when `npm test` runs

The test runner starts its own server for each suite. If you have a
hand-started `node index.js` already on the port, the runner's cannot bind and
**every suite silently talks to yours** — running whatever the source said when
you launched it.

It cost forty minutes once. A rule kept failing against code that had been fixed
twice, the file on disk was right, the database was right, and the response was
still wrong. The fix was `Stop-Process`, not another edit.

> **If a check disagrees with code you can read on disk, suspect the process
> before you suspect the logic.**

### 2. `npm test` drops the database — and restarts the server too

Both halves are load-bearing, for different reasons:

- **Dropping**, because every suite creates its own `sara@azmsquad.com`. Share a
  database and the second suite signs in as the first one's Sara — who is scoped
  to a different branch — and fails as though the scope predicate were broken.
- **Restarting**, because dropping takes the indexes with it, and mongoose builds
  indexes when a model is compiled, not on demand. Without the restart the
  customer suite passes while the "one primary contact point per channel type"
  constraint quietly does not exist.

**After any test run, re-seed before you open a browser:** `npm run seed:demo`,
with the API already running. Forgetting this produces an empty product and a
confusing ten minutes.

### 3. Mongoose does not cast what it does not type

Two traps, and they fail the same way — **a query that matches nothing looks
like a feature that did nothing**:

- **`aggregate()` does not cast.** `find()` casts query values against the
  schema; `$match` does not. `reachableScope` hands back ids as **strings**, so
  an uncast `$match` compares strings to ObjectIds and matches nothing. The team
  queue came back empty while every other check passed. Use
  `Model.find(filter).cast(Model)` before `$match` — every aggregate in this
  codebase does.
- **`Schema.Types.Mixed` paths are not cast either.** `AuditEntry.entityId` is
  Mixed, so `countDocuments({ entityId: someStringId })` finds zero while the
  entry sits right there. Compare as strings in JS.

In a scope filter the first one fails safe and is still wrong. In a test
assertion it is a false failure that sends you editing working code.

### 4. `010 E-01` read as enforced for months and had never once fired

*"At least one active administrator must remain."* It was in the code from the
start, reviewed, and cited in three documents.

The break-glass root holds an `ADM` assignment and is active, so the population
the rule counted was **never smaller than one**, in any deployment that has a
root — which is all of them. The condition was unreachable.

Nothing caught it because the suites asserted everything *around* the refusal —
creation with a role, deactivation, `E-02`'s self-deactivation refusal, a
non-administrator being refused — and every one of those passes with `E-01`
deleted. Nobody had written the one check where the rule is the only thing
standing between the call and success.

Fixed 2026-09-14: the population now excludes the unrestricted identity, in one
implementation shared by the deactivation and revocation paths, and both are
asserted in `backend/tests/role-assignment.test.js`.

> **The general lesson is in `.claude/skills/testing/SKILL.md`: assert the
> refusal itself, not only the paths around it.** If reaching the state the rule
> guards is awkward, that is a signal the rule may be unreachable in production
> too.

### 5. There is no scheduler, and several features are shaped around that

No cron, no queue, no worker, no timer. Anywhere you expect something to happen
while nobody is looking, it does not:

- **Task reminders are computed when you open the workspace**, and the screen
  says so in as many words.
- **`task_due` notifications deliberately write no row** — a row written when
  somebody opens a screen would carry a timestamp claiming a delivery that never
  happened.
- **Backlog trend snapshots** cannot be recorded, which is one reason the
  reports module is mostly unbuilt.

`005 §11` already specifies a scheduler, so building a second one would pre-empt
a design that spec owns. Board card `reminder-scheduler`.

---

## What works

**Backend** — Express 5, ES modules, MongoDB `rs0` single-node replica set.
**Frontend** — Angular 22, standalone, signals, Tailwind v4 only, runtime
Arabic/English switching. **Sixteen routed screens** across a staff interface
and a customer portal.

| Area | State |
|---|---|
| Auth, sessions, lockout, password policy | Working. Permissions are re-read per request, never baked into the token |
| Users, roles, scope | Working, including **grant and revoke in place** — changing a role no longer means deleting the account |
| Audit | Every mutation writes an immutable entry **in the same transaction**. `utils/audit.js` is the only writer |
| Customers, contact points, duplicates | Working |
| Tickets — create, assign, status, thread, history | Working |
| **Agent workspace (spec 004)** | Eleven of eighteen stories. Queue, counters, customer context, tasks, reminders, quick replies, mentions, notifications, drafts, team queue, countdown |
| Customer portal | Sign-in, submit, list, detail, reply. Internal notes excluded **in the query**; no agent identity anywhere |
| Live updates | Polling on conditional requests. The screen changes without a reload |
| Configuration | Status and priority labels, and whether a status pauses the SLA clock |

**Verification:** 17 backend suites, `npm test`, exit 0. The frontend has
`ng build` and **6 tests covering the app shell and language service only** —
no screen has one. Screens were verified with ad-hoc browser scripts in both
languages at 1400px and 390px; **those scripts were not committed**, so no
screen regression is visible to CI. That is the largest hole in the testing
story and it is carded as `mobile-overflow-guard`.

---

## What does not work, and why

Separated on purpose, because the two need different actions from you.

### Blocked on a client answer — not on work

**67 unresolved `[CLARIFY]` markers.** Sending these is worth more than any
code you could write first.

```bash
grep -rEn '^- \[ \] .\[CLARIFY-[0-9]' specs/ | wc -l
```

| What is waiting | Blocks |
|---|---|
| **`005 [CLARIFY-1]` SLA numbers and `[CLARIFY-2]` the working calendar** | **The single biggest blocker in the project.** Every duration: `elapsed-time.js` answers `unavailable`, the queue falls back to priority-then-age, the overdue counter has no number, the team queue's at-risk view cannot answer, and fourteen of spec `009`'s twenty-five requirements are unbuildable |
| `004 [CLARIFY-1]` what "urgency order" means | The take-next-ticket action |
| `004 [CLARIFY-3]` is live chat in phase one | Presence — it has no consumer without chat |
| `009 [CLARIFY-5]` do agents see their own and each other's figures | The reports permission matrix. An employment question |
| `001 [CLARIFY-4]`/`[CLARIFY-5]` privacy and consent | Erasure, and outbound on a shared contact point |
| `010 [CLARIFY-2]` which identity provider | SSO, which is an **uncovered MUST** |
| `013 [CLARIFY-1]` target volume | Every performance threshold in the project |
| `003 [CLARIFY-1]` which channels ship first | All of spec `003`, and with it email, push and inbound reply |
| **The category tree** | Not a marker — a question already written up for them. See below |

**`docs/category-values.md` is written and ready to send.** It asks the client
to agree the category tree, with the values in use in front of them. The finding
that makes it urgent: one value in use is **`Billing / Refund`** — somebody
wanted a hierarchy, did not have one, and made one out of a slash. A migration
that turned distinct strings into nodes would produce a node called
"Billing / Refund" sitting beside "Billing". Regenerate the list against live
data with `node backend/src/utils/category-values.js --markdown`.

### Blocked on us

| Item | Note |
|---|---|
| **`Team` does not exist** | Decision 30 defined the entity; nothing is built. `002 §3` still makes `owning_team_id` required. ⚠ `002 E-12`'s singular *"the team lead"* has no rule for zero or several leads |
| Reports (spec `009`) | Analysed in full — `decisions-pending.md` §28 — and not built. The buildable quarter is carded as `reports-volume-and-backlog` |
| Category tree | Waiting on the client answer above, then a migration. It must be **additive** — keep the original string |
| Resolution-code and root-cause lists | Decision 23 keeps `002 FR-029` unenforced |
| Attachments | Decision 34 — omitted rather than built without virus scanning |
| Portal one-time code | Decision 31's shared password is **debt the moment one real customer exists** |
| Accessibility | No screen has had a keyboard or screen-reader audit |

**68 board cards** in `tools/tasks.json`; `node tools/sync-clickup.js` projects
them onto the board. That file is the source of truth, the board is its
rendering, and the sync only ever writes — a status changed by hand is reverted.

---

## How this project is meant to be worked

It is **spec-driven**, and that is not decoration. Behaviour is not invented at
the keyboard.

1. **`.specify/memory/constitution.md` outranks everything**, including
   `CLAUDE.md` and any spec. If a spec and the constitution disagree, the
   constitution wins and the disagreement is **recorded**, not resolved quietly.
2. **`specs/001`–`013`** and **`stories/`** are the source of truth. Code cites
   the requirement id it implements. A change with no id behind it is a change
   nobody asked for.
3. **Where a spec is silent, the gap is recorded in
   [`decisions-pending.md`](decisions-pending.md) and attributed** — to the
   client, to a reading of the spec, or to the developer — rather than filled
   from inference. There are 43 ratified decisions and 28 numbered write-ups.
   **When you hit something undecided, add a section. Do not guess.**

### The four rules that are never traded

| | |
|---|---|
| **Scope** | The branch + department predicate is evaluated **server-side against the target record**. Out of scope is **404, never 403**, byte-identical to genuinely absent |
| **Audit** | Every mutation writes an immutable entry **in the same transaction**. `session` is a required parameter, not an optional one |
| **Both languages** | Admin-authored labels carry `{ar, en}`, both required, refuse on missing. **No fallback, ever** — a missing translation renders a visible marker |
| **Durations** | `utils/elapsed-time.js` is the only place a duration is computed. Nothing else subtracts two dates to produce one |

`GET /auth/me` returns rendering hints. **They are never an authorisation
check** — they decide whether to *offer* a control, and the server refuses
regardless. `security.test.js` proves a forged hint grants nothing, and it pins
the exact flag list so adding one fails the suite on purpose.

### Two skills worth reading before you touch anything

- **`.claude/skills/frontend-design/SKILL.md`** — tokens, RTL absolutes, the
  shells, how to verify a screen. Derived from this codebase, not general advice.
- **`.claude/skills/testing/SKILL.md`** — how to write a check that can actually
  fail, and every way this project has already failed to.

---

## Running it

```bash
# backend/
npm run seed:admin        # once — reads BREAKGLASS_* from .env
npm run dev               # API on :3000
npm test                  # ⚠ drops the database. Kill anything on :3000 first
npm test -- <name>        # one suite
npm run seed:demo         # re-seed after a test run, API must be running
npm run audit:reconcile   # 0 orphaned, 0 unaudited, 0 unchecked models
npm run docs:build        # regenerates docs/openapi.json — commit it

# frontend/
npm start                 # :4200
npx ng build
npm test                  # 6 tests, shell and language service only

# root/
node tools/sync-clickup.js
```

**Credentials live in `backend/.env`** (`BREAKGLASS_EMAIL`,
`BREAKGLASS_PASSWORD`, `DEMO_PASSWORD`), which is gitignored. **No credential
belongs in a tracked file** — once committed it survives in history even after
removal.

**Published API documentation:** https://mosadek777.github.io/Azm-crm/ — GitHub
Pages serving `docs/index.html` over `docs/openapi.json` from `main`/`docs`.
Regenerate and commit; there is no build step on the Pages side.

---

## Where the bodies are buried

Things that are correct but look wrong, so you do not "fix" them:

- **`unavailable` is not a bug.** Wherever a duration would go, the product says
  `unavailable` **with a reason**. That is the requirement being met in its
  degraded form — `E-05` wrote the fallback, and the constitution forbids
  computing a substitute. If you make one of these show a number, you have
  broken it.
- **The overdue counter shows `unavailable`, not `0`.** Zero is a claim that
  nothing is overdue, and nobody knows that.
- **The team queue's at-risk view is offered and refuses.** Hiding it would make
  a blocked requirement look like one nobody read; an empty list would assert
  that no ticket is at risk.
- **Mentions notify and grant nothing** (decision 39). `004 FR-009` says a
  mention grants access; `010 FR-002` says per-user permission overrides must
  not exist. Both are MUSTs and cannot both hold, so the resolution restricts
  *who may be named* to colleagues already in scope.
- **The team queue's "self only" for an agent is presentation, not
  enforcement** (`decisions-pending.md` §21). `002 FR-010` is a MUST that an
  agent may self-assign any unassigned ticket in scope, so the endpoint answers
  to spec `002`. Scope and audit are untouched either way.
- **Polling, not sockets** (§26). A poll travels the same path that enforces
  scope; a socket emit would need a second implementation of it. The intervals
  are `NFR-002` and `NFR-003`, which are **ratified** — if 5s proves expensive,
  make the request cheaper rather than polling less often than the requirement
  permits.
- **The ETag hashes the response body on purpose.** The cheaper version-token
  design was rejected: a record leaving your scope changes no timestamp and no
  count you can see, so it would answer `304` to somebody who had just lost
  access.

---

## If you do three things first

1. **Send the clarifications**, starting with `005`'s two. Every duration in the
   product is waiting on them, and no amount of code moves that.
2. **Send `docs/category-values.md`**, regenerated against live data.
3. **Commit a browser regression check.** The screens were verified by scripts
   that were thrown away each time. It is the one gap where the project's own
   standards are not met by its own tooling, and `mobile-overflow-guard` has
   been open for weeks.

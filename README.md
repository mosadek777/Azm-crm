# Azm-CRM

A customer support CRM: bilingual (Arabic/English peer languages), multi-branch,
scope-enforced, fully audited. Built spec-first — see [Spec-driven
development](#spec-driven-development) below for how the specs, the
constitution and the code relate.

**Status:** an early vertical slice. Auth, users, roles, branches/departments,
customers and tickets are built and tested end to end, backend and frontend.
Most of the product (channels, SLA automation, knowledge base, the customer
portal, reports, ERP integration, AI features) is **not built** — see
[docs/roadmap.md](docs/roadmap.md).

## Links

| | |
|---|---|
| **API documentation** (Swagger) | https://mosadek777.github.io/Azm-crm/ — Swagger UI over `docs/openapi.json`, published from `main` / `docs` |
| **API documentation** (Postman, published) | https://documenter.getpostman.com/view/50283616/2sBYAxP9fz — the same routes, rendered by Postman |
| **Project board** (ClickUp, public) | https://sharing.clickup.com/90152504892/b/h/6-901525782663-2/2eb729eabd1a379 — 19 top-level tasks and 41 subtasks, mirroring `tools/tasks.json` |
| **Live API docs** | `http://localhost:3000/api-docs` — **local only**, requires the backend running. There is no hosted environment |
| **Postman, offline** | `docs/azm-crm.postman_collection.json` and `docs/azm-crm.postman_environment.json` — import both by hand (File → Import). Nothing is pushed to Postman's cloud by this repository; the published link above is a separate, manual export |

## Demo accounts

`npm run seed:demo` (from `backend/`) creates three personas for demonstrating
the flow end to end. **All three share one password, read from `DEMO_PASSWORD`
in `backend/.env`** — it is not written here, and it is not in any tracked file.

| Persona | Sign-in | Signs in at | Does what |
|---|---|---|---|
| **Admin** | `demo.admin@azmsquad.com` | `/auth/login` | Assigns tickets. **Cannot** post a customer-visible reply — spec `002` §9 permits an administrator an internal note and not a reply to the customer |
| **Agent** | `demo.sara@azmsquad.com` | `/auth/login` | Replies to the customer and resolves the ticket |
| **Customer** | `demo.customer@azmsquad.com` | `/portal` | Raises a request, replies on it, and follows it to resolution |

The seed prints all three at the end of its run, so the terminal doubles as a
crib sheet. Staff and customer sessions use separate storage, so both can be
held in one browser — a private window is still the cleanest way to demonstrate
both halves side by side.

**Step-by-step rehearsal script, including what to say about the parts that are
not built: [`docs/demo-script.md`](docs/demo-script.md).**

Sharing one password across three accounts is a demo shortcut, recorded as
decision 36 in `docs/decisions-pending.md`, not a pattern to copy.

## Try it

Start to finish, assuming you have never seen this project. Node 20+ and
MongoDB. Roughly ten minutes.

### 1. MongoDB must be a replica set

Not a plain `mongod`. **This is the one prerequisite that will stop you**, and it
is not optional: every mutation writes its audit entry inside the same
transaction as the change (constitution II), and MongoDB only offers
transactions on a replica set.

```bash
mongod --replSet rs0 --dbpath /your/data/path
# then, once, in a mongosh shell:
rs.initiate()
```

**If you skip it,** the backend prints `failed to connect` and exits at startup.
If it somehow starts, the first ticket you create fails with a transaction
error. Neither is subtle. `docs/decisions-pending.md` §3 has the longer version
and how to convert an existing standalone.

### 2. Backend — terminal 1

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in four values: `JWT_SECRET`, `BREAKGLASS_EMAIL`,
`BREAKGLASS_PASSWORD`, and `DEMO_PASSWORD`. For a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Then:

```bash
npm run seed:admin    # ONCE, ever — creates the break-glass administrator
npm run dev           # leave running, http://localhost:3000
```

### 3. Demo data — terminal 2

```bash
cd backend
npm run seed:demo     # needs the backend from step 2 already running
```

It prints the three accounts at the end. **Leave that terminal open** — it is
your crib sheet, and it is the only place the password is shown.

Re-run it any time. It is idempotent, so a second run creates nothing. `npm test`
drops the database, so re-seed afterwards.

### 4. Frontend — terminal 3

```bash
cd frontend
npm install
npm start             # http://localhost:4200
```

### 5. Two front doors

| URL | Who |
|---|---|
| **http://localhost:4200** | **Staff** — administrators and agents |
| **http://localhost:4200/portal** | **Customers** |

They are separate applications sharing one server, with separate sessions. You
can hold both at once in one browser; a private window for the customer is
tidier.

### 6. Walk the flow

All three accounts use the password from `DEMO_PASSWORD`.

1. **Customer raises a request.** Go to `/portal`, sign in as
   `demo.customer@azmsquad.com`, click **New request**, fill in the three
   fields, submit. Note there is no priority and no status control — a customer
   does not set those, and the server refuses them by name if you try.

2. **Admin routes it.** At `http://localhost:4200`, sign in as
   `demo.admin@azmsquad.com`. The new request is in **Tickets**, status `new`,
   unassigned. Open it and assign it to **Sara Ahmed** — a reason is required.

3. **Agent replies.** Sign out, sign in as `demo.sara@azmsquad.com`. Open the
   same ticket. Post a reply with visibility **customer**, then a second message
   with visibility **internal** — something obviously private, like
   *"Finance says the refund was queued but not released."*

4. **Agent resolves it.** Move the status `assigned` → `in_progress` →
   `resolved`.

5. **Customer sees the result.** Back on `/portal`, open the request.

### 7. The thing worth actually checking

**On that last screen, go looking for the internal note. It is not there.**

The customer sees the agent's reply and the status. They do not see the message
you marked internal, they do not see who the agent was, and they do not see an
assignee. That is `008 FR-019` and it is enforced in the database query — the
internal note is never loaded, so it cannot be leaked by a template, a log line
or a future refactor. The staff view of the same ticket shows all of it.

Two more worth a minute:

- **Switch the language** on any screen. The whole interface mirrors
  right-to-left with no reload, and ticket references, phone numbers and email
  addresses stay left-to-right inside the mirrored layout.
- **Try to reply as the admin.** Sign in as `demo.admin@azmsquad.com`, open a
  ticket and attempt a customer-visible reply. It is **refused**. An
  administrator may write an internal note and may not speak to the customer in
  the organisation's voice — spec `002` §9. It looks like a bug until you know
  that, which is exactly why it is worth showing.

Presenting this to someone? `docs/demo-script.md` is the same walk with what to
say at each step.

## Stack

| | |
|---|---|
| Backend | Node.js, Express 5, ES modules only (`.js` imports, no TypeScript) |
| Database | MongoDB, single-node replica set — **required**, not optional (transactions back the audit trail) |
| Auth | JWT, bcrypt, local email/password (SSO is specified, not built — see below) |
| Frontend | Angular 22, standalone components, signals, Tailwind CSS v4 (no component library — see `docs/decisions-pending.md` §24), no `@angular/localize` (runtime language switching instead) |
| Docs | Swagger/OpenAPI + Postman, generated from JSDoc above the routes |

## Setup

Requires Node 20+ and a local MongoDB **replica set** (not a plain standalone —
see `docs/decisions-pending.md` §3 for why, and how to convert one).

```bash
# backend
cd backend
npm install
cp .env.example .env        # fill in JWT_SECRET, BREAKGLASS_PASSWORD, etc.
npm run seed:admin          # once — creates the break-glass administrator
npm run dev                 # http://localhost:3000

# frontend, in a second terminal
cd frontend
npm install
npm start                   # http://localhost:4200
```

> **Never commit `backend/.env`.** It is gitignored and must stay that way —
> `.env.example` is the only one of the pair that belongs in the repository.
> Generate your own `JWT_SECRET` rather than reusing one from anywhere
> (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`),
> and set your own `BREAKGLASS_PASSWORD` and `DEMO_AGENT_PASSWORD`. A secret that
> has ever been committed is public from that commit onward, whether or not the
> file is later removed — rotating it is the only fix, deleting it is not.

Sign in with the email/password from `backend/.env` (`BREAKGLASS_EMAIL` /
`BREAKGLASS_PASSWORD`). That account is the break-glass administrator (spec
`010` `E-07`) — its every sign-in is a high-severity audit event, and its
password should be changed before any real use.

## Commands

```bash
# backend/
npm test                 # every acceptance suite in backend/tests/. Drops the
                          # database and restarts the server before each one —
                          # see tests/run-all.js for why both are necessary
npm run dev              # nodemon
npm run seed:admin       # once, before first use
npm run audit:reconcile  # report-only: finds audit entries with no record,
                          # and records with no audit entry (constitution II)
npm run docs:build       # writes docs/openapi.json from the JSDoc routes
npm run docs:postman     # docs/openapi.json -> Postman collection + environment
npm run seed:demo        # idempotent demo data, driven through the real HTTP
                          # API so it cannot bypass scope or the audit trail.
                          # Needs DEMO_AGENT_PASSWORD in .env
npm run seed:demo:clear  # removes it again — localhost only, and it knowingly
                          # breaks the append-only rule (decision 25)

# frontend/
npm start
npm test

# from the repository root
node tools/sync-clickup.js   # idempotent — syncs the tools/tasks.json tree to
                              # ClickUp, updating existing tasks rather than
                              # duplicating. Needs CLICKUP_TOKEN in backend/.env
```

## API docs

Published: https://mosadek777.github.io/Azm-crm/ (GitHub Pages, served from
`main` / `docs`). Live: `http://localhost:3000/api-docs` (Swagger UI) while the
backend is running — local only. Static: `docs/openapi.json`.

**Postman:** import `docs/azm-crm.postman_collection.json` and
`docs/azm-crm.postman_environment.json`. Requests use `{{baseUrl}}` and
`Authorization: Bearer {{token}}`; running the login request saves the token
into the environment automatically via its test script. Nothing is pushed to
Postman's cloud — both files are plain JSON, imported by hand.

Only routes with a `@swagger` JSDoc block above them appear — a scoped-out
module has no entry rather than a guessed one.

## What's built

| Area | Covered |
|---|---|
| Auth | Local sign-in (bcrypt, JWT), break-glass administrator |
| Users & roles | Create/deactivate/reactivate, five roles (`AGT`/`LEAD`/`MGR`/`ADM`/`AUD`), last-admin and self-demotion guards |
| Scope | Branch + department enforced server-side on every read and write; out-of-scope is 404, never 403 |
| Audit | Every mutation writes an immutable entry, **atomically** with the mutation (MongoDB transactions) — not just logged afterward |
| Platform | Branches, departments, bilingual admin-authored labels (refuses a single-language save) |
| Bilingual UI | Runtime Arabic/English switch, no reload, self-hosted Arabic typeface |
| Customers | Create, ranked-match search, detail, field edit — with a collision-and-confirm flow instead of a hard uniqueness constraint |
| Tickets | Create, list with filters, detail with thread and history, assign/reassign, status transitions against an explicit graph |
| Angular UI | Customer list/detail, ticket list/detail/create |

## Where to look next

- **`docs/state.md`** — read this first in any new session. What's built, what's
  blocked, the next candidate work, in one page.
- **`docs/decisions-pending.md`** — every ratified decision, numbered, each with
  the evidence (or the explicit absence of it) behind it, and every deviation
  from spec with its undo cost.
- **`docs/trace.md`** — spec requirement → code, both directions: what's built
  with no requirement, and what's required with no code yet.
- **`docs/roadmap.md`** — what is not built, and the two deliberate deviations
  from spec (`Team` stepped around, category as a flat string) with the note
  that neither touches scope enforcement or the audit trail. Moved out of this
  README verbatim; nothing retired.
- **`docs/demo-script.md`** — the rehearsal script for demonstrating the ticket
  flow to management: which account to sign in as at each step, what to click,
  what to say, and what to say when asked about the parts that are not built.
- **`docs/remaining.md`** — everything not yet built, ordered as a safe build
  order, each item marked **ADD** (bolt on, cannot break what works) or
  **CHANGE** (edits working code or reshapes existing data), with what it
  depends on and rough backend/frontend effort. Ends with where to start, where
  not to, and which items get more expensive with time.
- **`docs/portal-plan.md`** — the customer-facing flow (customer signs in, opens
  a ticket, exchanges messages, sees it resolved) audited against the specs:
  which steps a requirement covers, which are covered with no code, which have
  no requirement at all, and the remaining work split into pieces to approve one
  at a time with estimates. Read before starting anything customer-facing.
- **`docs/next-steps.md`** — what's broken or half-done, what's blocked on a
  client decision, unbuilt MUSTs, effort estimates for every scoped-out module,
  the technical debt from today's delivery compression, and a recommended
  order for the next two weeks.
- **`docs/methodology.md`** — the original spec-driven-development index: the
  thirteen epics, the eighty-two open questions distilled to thirteen client
  decisions, and the constitution's eight principles. This *was* the root
  README before it was rewritten to describe the build rather than the method.

## Spec-driven development

This repository is built against a constitution (`​.specify/memory/`) and
thirteen numbered specs (`specs/`, `stories/`) describing the full intended
product. Most specs are still in `Draft — clarifying` with open questions
(`[CLARIFY-n]` markers) — the constitution forbids guessing an answer to one of
these; a blocked requirement stays unbuilt until it's answered or a decision is
explicitly ratified and recorded (see `decisions-pending.md`).

```bash
# count what's still genuinely open (resolved markers are kept, not deleted,
# so the decision and its evidence stay attributable)
grep -rEn '^- \[ \] .\[CLARIFY-[0-9]' specs/ | wc -l
```

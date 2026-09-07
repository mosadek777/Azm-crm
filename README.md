# azm-crm

A customer support CRM: bilingual (Arabic/English peer languages), multi-branch,
scope-enforced, fully audited. Built spec-first — see [Spec-driven
development](#spec-driven-development) below for how the specs, the
constitution and the code relate.

**Status:** an early vertical slice. Auth, users, roles, branches/departments,
customers and tickets are built and tested end to end, backend and frontend.
Most of the product (channels, SLA automation, knowledge base, the customer
portal, reports, ERP integration, AI features) is **not built** — see
[What's not built](#whats-not-built).

## Stack

| | |
|---|---|
| Backend | Node.js, Express 5, ES modules only (`.js` imports, no TypeScript) |
| Database | MongoDB, single-node replica set — **required**, not optional (transactions back the audit trail) |
| Auth | JWT, bcrypt, local email/password (SSO is specified, not built — see below) |
| Frontend | Angular 22, standalone components, SCSS, no `@angular/localize` (runtime language switching instead) |
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

Sign in with the email/password from `backend/.env` (`BREAKGLASS_EMAIL` /
`BREAKGLASS_PASSWORD`). That account is the break-glass administrator (spec
`010` `E-07`) — its every sign-in is a high-severity audit event, and its
password should be changed before any real use.

## Commands

```bash
# backend/
npm run dev              # nodemon
npm run seed:admin       # once, before first use
npm run audit:reconcile  # report-only: finds audit entries with no record,
                          # and records with no audit entry (constitution II)
npm run docs:build       # writes docs/openapi.json from the JSDoc routes
npm run docs:postman     # docs/openapi.json -> Postman collection + environment

# frontend/
npm start
npm test

# tools/
node sync-clickup.js     # idempotent — syncs tools/tasks.json to ClickUp,
                          # updating existing tasks rather than duplicating
```

## API docs

Live: `http://localhost:3000/api-docs` (Swagger UI) while the backend is
running. Static: `docs/openapi.json`.

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

## What's not built

**Deliberately scoped out today**, each with an open ClickUp task naming what
blocks it: email/WhatsApp/SMS/chat, the SLA & automation engine, the knowledge
base, the customer portal, reports, the ERP integration, and AI features (the
last one is not merely deferred — see `docs/decisions-pending.md` for why it
cannot be planned yet).

**Two deliberate deviations from spec**, made to ship a working slice today:

- **`Team` is not implemented.** Tickets assign directly to an agent. Two specs
  make a `Team` reference *required*, and no spec defines the entity — this is
  a documented spec defect, not a design choice, and it is *stepped around*
  here, not resolved.
- **Category is a flat string**, not the tree the spec requires (`FR-004`).

Neither compromise touches scope enforcement or the audit trail — both remain
enforced on every read and write, including on tickets and customers.

## Where to look next

- **`docs/state.md`** — read this first in any new session. What's built, what's
  blocked, the next candidate work, in one page.
- **`docs/decisions-pending.md`** — every ratified decision, numbered, each with
  the evidence (or the explicit absence of it) behind it, and every deviation
  from spec with its undo cost.
- **`docs/trace.md`** — spec requirement → code, both directions: what's built
  with no requirement, and what's required with no code yet.

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

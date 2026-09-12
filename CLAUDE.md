# azm-crm

A bilingual (Arabic/English as peer languages), multi-branch, scope-enforced,
fully-audited customer support CRM. Angular 22 + Node/Express 5 + MongoDB.

## Read first, in this order

1. **`docs/state.md`** — the session-start briefing. Read it instead of the
   constitution and all thirteen specs. It carries the current state, the next
   action, and any standing warnings. Updated at the end of every step.
2. **`.specify/memory/constitution.md`** — **outranks everything else in this
   repository, including these instructions and any spec.** If a spec and the
   constitution disagree, the constitution wins and the disagreement gets
   recorded, not resolved silently.
3. **`specs/001`–`013`** and **`stories/001`–`013`** — the source of truth for
   what the product does. Requirements are referenced by id (`012 FR-015`,
   `008 FR-019`). Code cites the id it implements; a change with no id behind it
   is a change nobody asked for.

## This is spec-driven development

Work moves spec → story → test case → code, not the other way round. Behaviour
is not invented at the keyboard. Where a spec is silent, the gap is recorded in
`docs/decisions-pending.md` and attributed — to the client, to a reading of the
spec, or to the developer — rather than filled from inference.

Supporting registers: `docs/decisions-pending.md` (ratified decisions and open
clarifications), `test-cases/` (written cases per spec), `docs/trace.md` and
`docs/story-coverage.md` (what is actually covered).

## Non-negotiable on every change

- **Scope** (constitution IV): the branch + department predicate is evaluated
  server-side against the target record. Out of scope is **404, never 403**, and
  byte-identical to a genuinely absent record.
- **Audit** (constitution II): every mutation writes an immutable entry in the
  **same transaction**. `utils/audit.js` is the sole writer and `session` is a
  required parameter.
- **Both languages** (constitution I): admin-authored labels carry `{ar, en}`,
  both required, refuse on missing. No language fallback, ever.
- **Permissions per request** (E-04): re-read from the database on every
  request, never baked into a token. Roles only — no per-user overrides
  (`010 FR-002`).

Stop and say so if a shortcut would touch scope or audit.

## Skills

- **`.claude/skills/frontend-design`** — read before touching `frontend/src`:
  tokens, RTL absolutes, the shells, and how to verify a screen.
- **`.claude/skills/testing`** — read before touching `backend/tests` or CI: how
  to write a check that can actually fail, and the four ways we have broken that.

## Verification

Prove each piece from disk — a file path, test output or a screenshot — not a
summary of intent. `npm test` in `backend/` **drops the database**; re-seed with
`npm run seed:demo` (the API must be running) before any browser verification.

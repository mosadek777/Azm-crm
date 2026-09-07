# Traceability — spec → code → requirement

Per constitution VIII: a requirement with no code, or code with no requirement,
is a bug. This file is the record of which is which.

**Last updated:** 2026-09-07 · **after:** step 3 + Arabic typography, audit reconciliation, replica set, atomic audit, evidence review, 17 ratified decisions · constitution 0.2.0, per-requirement gate

## Coverage

| Spec | Backend module | Frontend feature | Requirements covered | State |
|---|---|---|---|---|
| `001` Customer Management | — | — | none | **Blocked** — `[CLARIFY-1]` (CRM vs ERP master data) with the client |
| `002` Ticket Management | — | — | none | **Blocked** — `[CLARIFY-1]` (status list) with the client |
| `003` Communication Channels | — | — | none | **Blocked** — not in scope; 6 markers open |
| `004` Agent Dashboard | — | — | none | **Blocked** — not in scope; 5 markers open |
| `005` SLA & Automation | `src/utils/elapsed-time.js` | — | `FR-005` (the `unavailable` branch only) | **Partial by design** — `[CLARIFY-1]` `[CLARIFY-2]` block the engine; the module exists so no caller can compute a duration itself |
| `006` Knowledge Base | — | — | none | **Blocked** — not in scope; 5 markers open |
| `007` AI Features | — | — | none | **Blocked and staying blocked** — `[CLARIFY-1]` blocks the entire spec; constitution V forbids planning it |
| `008` Customer Portal | — | — | none | **Blocked** — not in scope; 6 markers open |
| `009` Reports & Management | — | — | none | **Blocked** — not in scope; 6 markers open. ⚠ **See the metric warning below before anyone reads a reopen rate.** |
| `010` Security & Administration | `src/modules/{auth,user}/`, `src/middlewares/`, `src/utils/{audit,scope,seed-admin}.js`, `src/DB/models/{user,role-assignment,audit-entry}` | `core/auth/`, `core/interceptors/`, `core/models/`, `features/auth/login/`, `layouts/` | `FR-001`†, `FR-002`, `FR-003`, `FR-004`¶, `FR-005`, `FR-006`‡, `FR-008`, `FR-021`, `AS-01`, `AS-03`, `AS-04`, `AS-05`, `AS-08`, `E-01`, `E-02`, `E-04`, `E-07`, `E-11`§, `NFR-003`, `NFR-005` | **Steps 2–3 done.** `FR-004` covers 2 of its 3 dimensions — see ¶ |
| `011` Integrations | — | — | none | **Blocked** — not in scope; 7 markers open |
| `012` Platform | `src/modules/platform/`, `src/DB/models/{localized-text,branch,department}` | `core/i18n/`, `shared/pipes/translate.pipe.ts`, `public/fonts/`, `styles.scss` | `FR-001`, `FR-002`∥, `FR-004`, `FR-007`, `FR-008`, `AS-01`, `AS-02`, `AS-03`, `AS-06`∥ | **Unblocked 2026-09-07** by the provisional answers to `[CLARIFY-1]`, `[CLARIFY-3]`, `[CLARIFY-6]`. `FR-011` dropped as aspiration. `FR-015` (deactivation) not yet built — no DELETE route exists |
| `013` Cross-cutting | — | — | none | **Blocked** — `[CLARIFY-1]` (volumes) makes every NFR unacceptable-because-unquantified |

## Files with no requirement (justified)

Step 1 is scaffold. These files implement no functional requirement and say so
in their header comment. They are not orphan work under constitution VIII —
they are the plan-phase mechanics the first requirement will land in.

| File | Why it exists |
|---|---|
| `backend/index.js` | Entry point |
| `backend/src/app.controller.js` | Bootstrap, middleware, route mounting, 404 |
| `backend/src/DB/connection.db.js` | MongoClient + mongoose against one database |
| `backend/src/modules/auth/{auth.controller,auth.service}.js` | Route stubs; `app.controller.js` imports them |
| `backend/src/modules/user/{user.controller,user.service}.js` | Route stubs; `app.controller.js` imports them |
| `frontend/src/app/app.routes.ts` | The `auth-layout` / `main-layout` split |
| `frontend/src/app/layouts/**` | The two shells |

## Footnotes on step 2 coverage

† `FR-001` is **partial**. Create, deactivate and reactivate are done, with
`E-01` (last administrator) and `E-02` (self-demotion) enforced. Its
"deactivation MUST return assigned tickets to the team queue" clause (spec
`002` `E-12`) is **not** implemented — tickets are step 5. The audit entry
records `ticketsReassigned: null` rather than `0`, so the log does not imply a
reassignment ran.

‡ `FR-006` is an **UNCOVERED MUST**, corrected 2026-09-07. The requirement is
*"The system MUST support SSO via SAML or OIDC"*; no SAML or OIDC path is built,
so `FR-006` is **not** covered and must not be counted as covered. What is built
is local password sign-in, which is legitimate on the authority of `FR-007`
(**MUST** — password policy, lockout, session limits) and `E-07` (break-glass
local administrator) — a first-class part of the spec, not a workaround.
`[CLARIFY-2]` was reopened after its earlier answer was found to contradict
`FR-006`; see decisions-pending §1. If the client answers that SSO is
*mandatory*, `FR-006` requires local sign-in to be refused for ordinary users,
while `E-07`'s break-glass path survives regardless.

§ `E-11` is the **refusal half only**. An unwritable audit entry refuses the
mutation, proven by test. The *alerting* half — "alert at the configured
threshold" — depends on spec `013` `FR-007`, blocked by `013` `[CLARIFY-6]`
(who receives operational alerts). Not built.

¶ `FR-004` covers **branch and department — two of the three dimensions it
names**. `team ∈ scope` is **not** implemented, and this is a reported spec
defect rather than an omission: `Team` is referenced as a scope dimension by
spec `010` §3 (`team_ids`) and `FR-004`, as `Department.default_team_id`
(*Required*) by spec `012` §3, and as `Ticket.owning_team_id ref Team` by spec
`002` §3 — and is **defined as an entity by no spec in this repository**.
Raised with the developer 2026-09-07; not invented. When Team is defined it is
added to `src/utils/scope.js` and `role-assignment.model.js` and nowhere else.
`Department.defaultTeamId` is absent for the same reason.

∥ `012 FR-002` and `AS-06` are both covered. Layout mirroring and
direction-neutral values: `dir` and `lang` on `<html>`, CSS logical properties
only, `dir="ltr"` on the email field. Typography: **Cairo, self-hosted** from
`frontend/public/fonts/` — one variable font per unicode subset, correct Arabic
joining and diacritic positioning, `line-height: 1.7` so diacritics and
descenders do not clip, and a fallback stack led by faces that carry Arabic
glyphs so a failed woff2 does not reproduce the very defect `AS-06` names.
Not a CDN: spec `010 [CLARIFY-7]` (data residency) is open, and a CDN font
request leaks the visitor's IP. Verified by rendering both languages.

## Spec 010 requirements still uncovered

| Requirement | Why |
|---|---|
| `FR-004` team dimension | **Spec defect** — `Team` is defined nowhere. Reported. |
| `FR-007` password and session policy | Not blocked. Lockout, session timeout, absolute lifetime and concurrent-session limit are unbuilt. |
| `FR-009` audit search and export | Not blocked. No read endpoint yet — but `npm run audit:reconcile` reads it for the §13 metric. |
| `FR-006` **SSO via SAML or OIDC** | **UNCOVERED MUST.** Blocked by `[CLARIFY-2]` (which provider, whose MFA, mandatory or optional). The local sign-in that exists does not satisfy it. |
| `FR-010` encryption in transit and at rest | Deployment concern, not application code |
| `FR-011` configuration surface | Not blocked; needs the localized-text schema, which exists. Step 3. |
| `FR-012` notification templates | Not blocked. Later. |
| `FR-013` API credentials | Not blocked. Later. |
| `FR-014` network restriction | `MAY`. Deployment concern. |
| `FR-015` retention and archival | **Blocked** — `[CLARIFY-4]`. Deliberately no TTL index on the audit collection. |
| `FR-016` attachment scanning | Not blocked. Required before any upload surface exists. |
| `FR-017` backup and restore | **Blocked** — `[CLARIFY-5]` |
| `FR-018` sandbox | **Blocked** — `[CLARIFY-7]` |
| `FR-019` impersonation | **Blocked** — `[CLARIFY-6]`. `MAY`. |
| `FR-020` data residency | **Blocked** — `[CLARIFY-7]`. `MAY`. |

## Known constitution-I gap in the verbatim scaffold

`app.controller.js` answers `{ message: "welcome" }` and
`{ message: "invalid routing" }` — single-language strings, from the verbatim
snippet. Every message written since is bilingual (`{ ar, en }`). Left as-is
because the snippet is fixed; recorded so it is not mistaken for the pattern.

## ⚠ Metric warning — spec 009 reopen rate is NOT meaningful yet

Recorded 2026-09-07, on ratifying option C5 (no auto-close).

`009` §2 defines: *"**Reopen rate** | Tickets reopened at least once ÷ tickets
**closed** in the period."*

`002 [CLARIFY-2]` was resolved as **closure on explicit customer confirmation
only, with no automatic close**, because a grace period in working days is a
business duration and constitution III requires those from the spec `005`
engine, which is blocked by `005 [CLARIFY-2]`.

**Consequence: the denominator is degenerate.** Only tickets a customer actively
confirms will ever reach `closed`. In practice most customers do not reply to
confirm, so `tickets closed in the period` will be a small and non-representative
subset, and reopen rate computed over it will be both volatile and biased
upward.

**Do not read, publish, or put in front of the client any reopen-rate figure
until auto-close exists.** The same caution applies to any metric whose
denominator is *tickets closed*: `009`'s satisfaction and first-contact-resolution
figures should be checked against this before they are trusted.

This is a consequence of a deliberate decision, not a defect. It clears when
spec `005` unblocks and the grace-period path of `002 FR-031` is built.

## Unbuilt MUSTs created by ratified decisions

These are requirements that now exist because of a decision, and that no code
satisfies. Listed separately so they are not mistaken for covered.

| Requirement | Created by | Must be implemented in |
|---|---|---|
| `001 E-15` — outbound on a shared contact point MUST be refused, with no fallback to any one customer's consent | Decision #17, the consequence of relaxing `FR-004` (decisions-pending §11) | **Step 4**, when contact points are built. Fails closed by specification; there is no code guard yet because there is no outbound code and no contact-point model. |
| `010 FR-006` — SSO via SAML or OIDC | Not a decision — a pre-existing uncovered **MUST**, made visible when the "no SSO in phase one" answer was withdrawn | Blocked on `010 [CLARIFY-2]` |
| `002 FR-031` grace-period path | Decision #9 (no auto-close) deferred it | When spec `005` unblocks |

## Requirements originating from this review rather than the source

Constitution VIII requires every requirement to trace to a story, and every
story to a numbered need in the source feature list **or to an explicit, dated
amendment**. Anything in this table takes the second route, and says so in its
own text rather than borrowing the appearance of the first.

| Requirement | Origin | Status |
|---|---|---|
| A `pending_customer` abuse report for spec `009` | This review, 2026-09-07. No upstream story. Created by ratifying `pending_customer` as pausing the clock. | **DRAFTED, NOT ADDED** — awaiting review. A story is being written with it, as a dated amendment. See decisions-pending §12. |

# board-audit.md — the board audited against `specs/` and `stories/` directly

**Date:** 2026-09-09 · **Against:** ClickUp list `901525782663` as projected from
`tools/tasks.json` (34 top-level cards, 50 subtasks, 63 COMPLETE / 21 TO DO)

**Why this audit exists.** The board was re-derived on 2026-09-08 from
`docs/state.md` and `docs/roadmap.md`. Both are *derived* documents. Anything
that never reached them cannot reach the board, and there is precedent: the
`Team` defect and the shared-contact-point defect were both real, both
spec-level, and neither carried a `[CLARIFY]` marker — so the marker gate could
not see them, and neither could any summary written from it.

This audit reads `specs/` and `stories/` only. It does not take a coverage claim
from `state.md`, `roadmap.md`, `trace.md` or `remaining.md`.

---

## Method, stated so the result can be checked

**The population.** Every table row in all thirteen `specs/*/spec.md` whose
first cell is a requirement id, extracted mechanically rather than by reading:

| Kind | Count | Notes |
|---|---|---|
| `FR-*` | **278** | The only rows carrying a level: **140 MUST · 105 SHOULD · 33 MAY** |
| `NFR-*` | **79** | Target tables — metric and figure, **no level column at all** |
| `E-*` | **237** | Edge cases — condition and required behaviour, no level |
| **Total** | **594** | |

**"Has code"** means an implementation a test or a read of the module can
demonstrate — not that a comment cites the requirement id, and not that a
neighbouring module exists. Arguable calls are marked *partial* and say why.

**"Has a card"** means a `tools/tasks.json` node, at either level, whose
delivered scope covers the requirement. **A card for a module counts as covering
that module's requirements.** `channel-email` covers every email requirement in
spec `003`, so none of them is "untracked" even though none is built.

**The consequence of that rule, stated plainly.** The six wholly-unbuilt modules
that have cards — channels, SLA, knowledge base, AI, reports, ERP — contribute
**nothing** to sections 1 and 2. They are tracked. Sections 1 and 2 are about
requirements with neither code nor *any* card, which is a smaller and much more
interesting set.

---

## Headline

**Two entire specs are absent from the board.** Not deferred, not blocked, not
represented by an open card naming what blocks them — absent.

| Spec | Reqs | MUSTs | Open markers | Mentions in source | Cards |
|---|---|---|---|---|---|
| **`004` Agent Dashboard** | 26 | **14** | **5** | **0** | **none** |
| **`013` Cross-cutting** | 11 | **7** | **8** | **0** | **none** |

Every other spec has at least one card. These two have none, and neither is
named anywhere in `backend/src` or `frontend/src`. They are the exact shape of
the `Team` gap: real requirements, no marker to surface them, no tracking, and
therefore invisible to every document derived from the tracking — including this
board.

**`004` is the more serious of the two.** It is not a future module like the
knowledge base. It is the *agent's daily workspace* — the queue they open on,
their counters, their quick replies, their notifications, their drafts, the lead
team queue. The product currently has a ticket list standing in for it, and
nothing records that a ticket list is not what the spec asks for.

---

## 1. MUSTs with no code and no card, ordered by risk

**Thirty-one of the 140 MUSTs — 22%.** Ordered by what breaks, or stays broken,
if they continue unnoticed.

> **A correction, recorded rather than quietly fixed.** The first pass of this
> section said *fourteen*. That was wrong in both directions: it filed
> `010 FR-011`, `012 FR-005` and `008 FR-012` as SHOULDs when the level column
> says MUST, it never examined `010 FR-007`, `FR-010` or `FR-017` at all, and it
> listed `001 FR-011` and `002 FR-016`/`FR-017` as MUSTs when they are SHOULDs.
> The count below is taken from the extracted level column for all 140, not from
> reading. The same mistake in the other direction is what this audit exists to
> catch, so the wrong number stays on the record.

### Tier 1 — a shipped surface fails a MUST today, silently

| # | Req | Requirement | Why this tier |
|---|---|---|---|
| 1 | **`002 FR-004`** | *"Categories MUST form a tree; a ticket MUST reference a leaf node; non-leaf nodes MUST NOT be selectable."* | **Category is a flat string in shipped code.** Ratified deviation 21, honestly recorded in `decisions-pending.md` — but **no card anywhere on the board**. A ratified deviation from a MUST with no card is a decision that has quietly become permanent. Every ticket created today carries data the target model cannot represent without a migration. |
| 2 | **`002 FR-005`** | Each category node MUST carry default priority, owning team and SLA policy, inherited by descendants | Unbuildable while `FR-004` is a string, equally untracked. It is *why* the tree matters rather than being cosmetic: the tree is where routing defaults live. |
| 3 | **`001 FR-003`** | The customer view MUST present identity, contact points, organisation, **segments**, **entitlement**, preferred language and tags without navigating away | The screen exists and shows most of it. **`segments` and `entitlement` are absent**, and `Customer.segments` references a `Segment` model **that does not exist** (§3a). A MUST 70% met on a shipped screen is the hardest kind to notice. |
| 4 | **`001 FR-006`** | A **single reverse-chronological interaction history** spanning all channels and all tickets, including logged calls and portal actions | The customer screen lists tickets. That is not this. No unified history exists, no endpoint serves one, no card tracks it. |
| 5 | **`002 FR-022`** | A customer reply within the reopen window MUST transition the ticket out of closure retaining its reference; beyond it, MUST create a new ticket linked `related_to` | **Explicitly unbuilt and explicitly known** — `ticket-status.js:53` and `portal-ticket.service.js:363` both document it as deferred, and `portal.controller.js:137` refuses rather than guessing. Honest code, **no card**. It also depends on `related_to` linking, which is `002 FR-016`, a SHOULD nobody is tracking either. |

### Tier 2 — security and operations MUSTs with nothing behind them

Grouped because they share a cause: they are not features, so no module card
exists to hang them on.

| # | Req | Requirement |
|---|---|---|
| 6 | **`010 FR-010`** | *"Data MUST be encrypted in transit and at rest, including attachments and backups."* Nothing in the codebase configures TLS or at-rest encryption. |
| 7 | **`010 FR-017`** | Backups meeting an agreed RPO and RTO, point-in-time restore, and **a restore drill performed before go-live**. None exists. |
| 8 | **`010 FR-007`** | Configurable password policy, session timeout, absolute session lifetime, **failed-attempt lockout** and concurrent-session limit. Only token expiry exists. Decision 33 notes the missing lockout for the portal; the general requirement has no card. |
| 9 | **`013 FR-007`** | Monitor and alert on error rate, request latency, queue depth, integration failure and channel failure. |
| 10 | **`013 FR-008`** | Zero-downtime releases; migrations reversible **with the reversal verified before release**. |
| 11 | **`013 FR-003`** | The agreed monthly uptime target, and a published status page reflecting current state. |
| 12 | **`013 FR-010`** | *"A privacy policy and terms MUST be published in Arabic and English."* A legal obligation attached to a customer-facing portal that has already been demonstrated. |
| 13 | **`013 FR-011`** | Every latency budget in every spec measured at p95 over a stated window and observable in production. |
| 14 | **`013 FR-001`, `FR-002`** | Per-spec latency budgets met at target volume; the agreed concurrency and monthly volume held with 50% headroom. Both gated by `013 [CLARIFY-1]` (volumes) — genuinely blocked, but blocked *and* untracked. |

### Tier 3 — `010 FR-011`, the largest single omission

| # | Req | Requirement |
|---|---|---|
| 15 | **`010 FR-011`** | Administrators MUST be able to configure **statuses and transitions, categories, ticket types, custom fields, priorities, SLA policies, business calendars and holidays, escalation policies** and more. |

Everything configurable in this product is currently a code constant. This is a
whole administration console, it is a **MUST**, and there is no card of any kind
for it. It is listed alone because it is the single largest piece of unbuilt,
untracked, ungated work found by this audit — nothing blocks it but nobody is
counting it.

### Tier 4 — spec `004`, the agent's workspace

Nine MUSTs, none built, none carded, because the spec has no card at all.

| # | Req | Requirement |
|---|---|---|
| 16 | **`004 FR-013`** | Notifications for assignment, mention, customer reply, escalation, task due, SLA threshold, delivery failure and chat offer, grouped per ticket. **No staff notification system exists.** `portal-notifications` covers customers only. `002 FR-009` (reassignment MUST notify both parties) and `002 FR-012` (escalation MUST notify) both depend on this. |
| 17 | **`004 FR-016`** | A lead's team queue by unassigned, oldest, at-risk and per-agent load, with assignment from the list. The lead's primary working surface. |
| 18 | **`004 FR-002`** | Live counters for open, overdue, pending customer, resolved today — each openable and **agreeing exactly** with its list. The agreement clause is why it is a MUST. |
| 19 | **`004 FR-001`** | The workspace opens on the personal queue ordered by urgency, no filter selection required. Also gated by `004 [CLARIFY-1]` — a marker on a spec with no card, so the marker is invisible too. |
| 20 | **`004 FR-006`** | Quick replies with named placeholders, an Arabic **and** an English body, selection by the customer's preferred language, refusing rather than inserting an unresolved placeholder. Carries a constitution I obligation no other unbuilt feature carries. |
| 21 | **`004 FR-003`** | The ticket view renders customer identity, contact points, segments, entitlement, SLA tier and recent tickets, and **states explicitly when a value is unavailable**. |
| 22 | **`004 FR-004`** | Tasks against a ticket with due date and body, completable and cancellable. No `Task` entity exists. |
| 23 | **`004 FR-005`** | Notify ahead of a task due date and ahead of each SLA threshold. |
| 24 | **`004 FR-009`** | Mention a colleague in an internal note; notify them; **grant them access to that ticket only**. See §5 — this one contradicts constitution IV and cannot be built as written. |

### Tier 5 — attachments, mobile, and the rest

| # | Req | Requirement |
|---|---|---|
| 25 | **`002 FR-015`** | Attachments on a ticket **and on individual messages**, subject to scanning and limits. `portal-attachments` covers the customer side only. |
| 26 | **`001 FR-009`** | Attachments on a **customer**, independently of any ticket. A third attachment surface, also uncarded. |
| 27 | **`010 FR-016`** | Every uploaded file **from every surface** MUST be scanned before storage. The rule that makes rows 25–26 safe to build; currently attached to nothing. |
| 28 | **`012 FR-005`** | Every **agent** task completable on a phone or tablet browser, in both languages, including attachment capture. |
| 29 | **`008 FR-012`** | Every **customer** task completable on a phone browser, including attachment capture. |
| 30 | **`001 FR-019`** | Bulk import validating every row before committing any, with a per-row error report. Adjacent to `erp-integration`, but that card is about reading *from* an ERP, not operator CSV import. Flag if you read it as covered. |
| 31 | **`002 FR-027`** | Search over subject, bodies, tags, reference, customer identity and attachment text, **in Arabic and English including diacritic-insensitive Arabic**. Search exists; diacritic-insensitive Arabic does not. The most borderline row here — included because the Arabic clause is explicit and unmet. |

### MUSTs deliberately **excluded**, so the exclusions can be challenged

- **`012 FR-015`** (branches/departments not deletable while referenced) — my
  first pass called this a silent failure. **That was wrong.**
  `branch.model.js:6` addresses it directly: *"DEACTIVATION, NEVER DELETION
  (FR-015) — there is no remove()"*. No deletion path is offered anywhere, so
  nothing is deletable. There is no guard *if one were added later*, which is
  worth a comment but is not an unmet MUST.
- **`002 FR-003`, `FR-012`** — covered by the `channel-*` and `sla-engine` cards.
- **`002 FR-006`** — `prioritySource` **is** built and stored; only
  rule-derivation is missing, which is `sla-engine`.
- **`002 FR-007`** — built, except the status set is a code constant rather than
  administrator-defined; that half is row 15.
- **`004 FR-008`** (KB search from a ticket) — covered by `knowledge-base`.
- **`004 FR-010`** (internal thread excluded from customer surfaces) — **built**,
  and one of the best-tested things in the codebase.
- **`004 FR-018`, `FR-019`** — covered by `ticket-elapsed`; `FR-019` (compute no
  durations here) is actively honoured by constitution III.
- **`004 FR-020`, `002 FR-033`, `001 FR-023`, `010 FR-004`, `FR-021`** — the
  scope predicate. Built and tested.
- **`008`'s twelve MUSTs** — all built or covered by the five portal split-out
  cards, except `FR-012` (row 29). The 2026-09-08 split did its job.
- **`010 FR-001`, `FR-006`** — carded as `users-deactivation`, `auth-sso`.

---

## 2. SHOULDs with no code and no card

**Thirty-three of the 105**, listed below. Grouped, because six clusters are
more useful than a flat list — and because each cluster is one plausible card.
Two caveats stated rather than buried: `010 FR-009` is partly covered by the
`audit-viewer` card, and `002 FR-029` is fully covered by
`ticket-resolution-codes` and is therefore **excluded** from the count.

| Cluster | Requirements | Note |
|---|---|---|
| **Administrator configuration** | `002 FR-008` (define statuses and transitions), `FR-025` (custom fields per category/type), `FR-032` (ticket types), `001 FR-018` (custom fields), `010 FR-003` (action- and field-level rights), `010 FR-012` (notification templates per event/channel/language) | The SHOULD half of §1 row 15. `010 FR-012` carries a constitution I obligation: templates *per language* with placeholders validated at save time. |
| **Ticket workflow depth** | `002 FR-011` (bulk actions), `FR-016` (linking), `FR-017` (merge), `FR-019` (sub-tasks), `FR-020` (tags as a report dimension), `FR-021` (follow-up date), `FR-024` (composing indicator), `FR-026` (saved shared views), `FR-031` (resolved→closed) | **`FR-026` deserves separate notice:** *"a shared view MUST still apply the viewer's own scope, never the author's"* is a **constitution IV** obligation attached to a SHOULD. If saved views are ever built casually, that is the clause that gets missed. **`FR-016` and `FR-017`** also block `002 FR-022`, a MUST (§1 row 5). |
| **Customer record depth** | `001 FR-005` (outbound defaults to primary), `FR-007` (history filterable), `FR-011` (merge), `FR-012` (organisation view), `FR-013` (define segments), `FR-014` (entitlement/SLA tier), `FR-017` (customer edits own contact points), `FR-021` (erasure), `FR-022` (consent) | `FR-021` and `FR-022` are genuinely gated by `001 [CLARIFY-4]` and `[CLARIFY-5]`. **The other seven are gated by nothing** and simply have no card. `Customer.mergedInto` exists on the model with no merge operation behind it — the same shape as the `Team` gap. |
| **Accessibility** | `012 FR-012` (WCAG 2.1 AA, no level-A failures, full keyboard), plus `012 NFR-003`, `NFR-004`, `008 NFR-006`, `NFR-007` | `state.md` records that no component has had an accessibility or RTL keyboard audit. Ten hand-rolled screens, two customer-facing, zero accessibility tracking. Pairs with MUST rows 28–29. |
| **Agent workspace remainder** | `004 FR-007` (quick-reply scopes), `FR-011` (presence), `FR-015` (server-side draft preservation) | Same root cause as §1 Tier 4: spec `004` has no card. |
| **Operations remainder** | `013 FR-004` (chat/notification latency), `FR-005` (attachment size and storage budget, deduplication), `FR-006` (supported browsers stated; every acceptance scenario exercised in both languages), `010 FR-009` (auditors search and export the log), `010 FR-018` (sandbox mirroring production without production personal data) | `010 FR-009` is partly carded as `audit-viewer`. `013 FR-006` is the trace that justifies the `acceptance-tests` card (§4). |

### Tier 1 — a built surface silently fails a MUST today

| # | Req | What the spec requires | Why this tier |
|---|---|---|---|
| 1 | **`002 FR-004`** | *"Categories MUST form a tree; a ticket MUST reference a leaf node; non-leaf nodes MUST NOT be selectable."* | **Category is a flat string in shipped code.** This is ratified deviation 21 and is honestly recorded in `decisions-pending.md` — but **there is no card for it anywhere on the board**. A ratified deviation from a MUST with no card is a decision that has quietly become permanent. Every ticket created today carries data that the target model cannot represent without a migration. |
| 2 | **`002 FR-005`** | Each category node MUST carry default priority, owning team and SLA policy, inherited by descendants | Unbuildable while `FR-004` is a string, and equally untracked. It is the reason `FR-004` matters rather than being cosmetic: the tree is where routing defaults live. |
| 3 | **`001 FR-003`** | The customer view MUST present identity, contact points, organisation, **segments**, **entitlement**, preferred language and tags without navigating away | The screen exists and presents most of it. **`segments` and `entitlement` are absent**, and `Customer.segments` points at a `Segment` model **that does not exist** (see §3). A MUST that is 70% met on a shipped screen is the hardest kind to notice. |
| 4 | **`012 FR-015`** | Departments and branches MUST be deactivatable but **MUST NOT be deletable while any record references them** | `Branch` and `Department` both carry `active`, so deactivation exists. **No referential guard exists**, and nothing on the board tracks one. The failure is silent and permanent: delete a branch and every customer and ticket in it becomes unreachable through the scope predicate, which resolves out-of-scope as 404. |

### Tier 2 — a whole capability nobody is tracking

| # | Req | What the spec requires | Note |
|---|---|---|---|
| 5 | **`004 FR-013`** | Notifications for assignment, mention, customer reply, escalation, task due, SLA threshold, delivery failure and chat offer, on the user's enabled channels, grouped per ticket | **No notification system exists for staff at all.** `portal-notifications` covers *customers only*. `002 FR-009` (reassignment MUST notify both parties) and `002 FR-012` (escalation MUST notify) both depend on this and are equally unserved. |
| 6 | **`004 FR-016`** | Leads MUST have a team queue by unassigned, oldest, at-risk and per-agent load, with assignment from the list, scoped | The lead's primary working surface. Nothing resembling it is built or tracked. |
| 7 | **`004 FR-002`** | Live counters for open, overdue, pending customer and resolved today; each openable as its own list and **agreeing exactly** with it | The "agreeing exactly" clause is the hard part and the reason it is a MUST — a counter that disagrees with its own list destroys trust in every other number. |
| 8 | **`004 FR-001`** | The workspace MUST open on the agent's personal queue ordered by urgency, with no filter selection required | Also blocked by `004 [CLARIFY-1]` (what "urgency" orders by) — a marker on a spec with no card, so the marker is invisible too. |
| 9 | **`004 FR-006`** | Quick replies with named placeholders, an Arabic **and** an English body, selection by the customer's preferred language, refusing rather than inserting an unresolved placeholder | Carries a constitution I obligation (both languages required) that no other unbuilt feature carries. |
| 10 | **`004 FR-004`** | Agents MUST be able to create tasks against a ticket with due date and body, and complete or cancel them | No `Task` entity exists anywhere. |
| 11 | **`001 FR-011`** | Merge MUST move all tickets, interactions, attachments, notes, consent records and contact points to the survivor; MUST leave the merged record resolvable; MUST be irreversible | `Customer.mergedInto` **exists on the model**; the operation does not, and no card tracks it. A field that implies an operation nobody built is how the `Team` gap started. |
| 12 | **`001 FR-019`** | Bulk import MUST validate every row before committing any, create only valid rows, and return a per-row error report naming row and reason | Partially adjacent to `erp-integration`, but that card is about *reading from an ERP*, not operator CSV import. Treated as untracked; flag if you disagree. |
| 13 | **`002 FR-015`** | Attachments MUST be addable to a ticket **and to individual messages**, subject to spec `010` scanning and limits | `portal-attachments` covers the *customer* side only. The agent side has no card. `001 FR-009` (attachments on a customer independently of a ticket) is a third, also untracked. |
| 14 | **`002 FR-016`, `002 FR-017`** | Ticket linking (`duplicate_of` / `related_to` / `blocks` / `blocked_by`, symmetrical, acyclic) and ticket merge | Listed together as one line because both are `SHOULD` in `002` — **but `002 FR-022` (reopen) is a MUST and depends on `related_to` linking** for the beyond-the-window case. `Ticket.mergedInto` and `parentTicketId` exist on the model with no operation behind them, same pattern as row 11. |

### Also MUST, no code, but **not** listed above — and why

Stated so the exclusions can be challenged rather than assumed:

- **`002 FR-003` (creation from an external channel), `FR-012` (escalation)** — covered by the `channel-*` and `sla-engine` cards.
- **`002 FR-006`** — `prioritySource` **is** built and stored; only rule-derivation is missing, which is `sla-engine`.
- **`002 FR-007`** — built, except that the status set is a code constant rather than administrator-defined; the administrator half is `FR-008`, a SHOULD (§2).
- **`002 FR-027` (search incl. diacritic-insensitive Arabic)** — partially built; Arabic diacritic-insensitivity is **not**, and this is a genuine borderline case. It sits in §2 rather than here only because `tickets` and `customers` both carry search cards.
- **`008` MUSTs** — every one is either built or covered by `portal-otp`, `portal-attachments`, `portal-notifications`, `portal-feedback`, `knowledge-base` or `scope-team`. The portal split-out on 2026-09-08 did its job.
- **`010 FR-006` (SSO), `FR-001` (deactivation)** — carded as `auth-sso`, `users-deactivation`.
- **`013`'s seven MUSTs** — all untracked, but they are §3 material rather than §1: they are not features, they are operating conditions. Listed there.

---

## 2. SHOULDs with no code and no card

Twenty-three. Grouped, because listing 23 rows flat is less useful than showing
that they cluster into five absences.

| Cluster | Requirements | Note |
|---|---|---|
| **Administrator configuration** | `002 FR-008` (define statuses and transitions), `FR-025` (custom fields per category/type), `FR-032` (ticket types), `001 FR-018` (custom fields), `010 FR-011` (configure statuses, categories, priorities, calendars, escalation), `010 FR-003` (action- and field-level rights) | **The largest single gap on the board.** Everything configurable in this product is currently a code constant. `010 FR-011` alone is a whole administration console. There is no card of any kind for administrator configuration. |
| **Accessibility and mobile** | `012 FR-012` (WCAG 2.1 AA, no level-A failures, full keyboard), `012 FR-005` **MUST** (every agent task completable on phone/tablet, both languages), `008 FR-012` **MUST** (every customer task on a phone, incl. attachment capture), `012 NFR-003`, `012 NFR-004`, `008 NFR-006`, `008 NFR-007` | Two of these are **MUSTs**. `state.md` itself records that no component has had an accessibility or RTL keyboard audit. Ten hand-rolled screens, two of them customer-facing, zero accessibility tracking. |
| **Agent workspace remainder** | `004 FR-007` (quick-reply scopes), `FR-011` (presence), `FR-015` (server-side draft preservation) | Same root cause as §1 rows 5–10: spec `004` has no card. |
| **Customer record depth** | `001 FR-007` (history filterable), `FR-012` (organisation view lists members' tickets), `FR-013` (define segments), `FR-014` (entitlement/SLA tier read-only), `FR-017` (customer edits own contact points), `FR-021` (erasure), `FR-022` (consent) | `FR-021` and `FR-022` are blocked by `001 [CLARIFY-4]` and `[CLARIFY-5]` — genuinely gated. The other five are not gated by anything and simply have no card. |
| **Ticket workflow depth** | `002 FR-011` (bulk actions), `FR-019` (sub-tasks), `FR-020` (tags as a report dimension), `FR-021` (follow-up date), `FR-024` (composing indicator), `FR-026` (saved shared views, viewer's scope), `FR-029` (resolution codes — *carded*), `FR-031` (resolved→closed) | `FR-026` deserves separate notice: *"a shared view MUST still apply the viewer's own scope, never the author's"* is a **constitution IV** obligation attached to a SHOULD. If saved views are ever built casually, that clause is the one that gets missed. |

---

## 3. Required by a spec, on the board nowhere — the `Team` gap's siblings

This is the section you asked for, and it is the one that found the most.

### 3a. Entities referenced by built code that do not exist

Exactly the `Team` pattern: a field pointing at something nobody built and
nobody tracked.

| Reference | Where | Status |
|---|---|---|
| **`Segment`** | `customer.model.js:61` — `segments: [{ ref: 'Segment' }]` | **No `segment.model.js` exists.** A populate on this path resolves to nothing. Defined as an entity in `001 §3`; required by `001 FR-003` (MUST) and `FR-013`; `001 FR-013` also makes segments *"selectable as conditions in spec `005` rules"*. **No card.** |
| **`BusinessCalendar`** | `branch.model.js:28` — `businessCalendarId`, an `ObjectId` with **no `ref:` target** | No model, no card. `012 FR-008` (MUST) requires each branch to own a business calendar. Also the thing `005`'s pause semantics need. |
| **`HolidaySet`** | `branch.model.js:29` — `holidaySetId`, same shape | No model, no card. Same requirement. |
| **`Team`** | `002 §3` makes `owning_team_id` **Required**; `Department` in `012 §3` carries `default_team_id` **Required** | Known, decision 30, **carded** as `scope-team`. Listed here only to show the pattern the other three match. The built `department.model.js` carries **no `default_team_id` at all**, so the required reference is absent rather than dangling. |

### 3b. Entities defined in a spec, never built, never tracked

`001 §3` defines seven entities. Two are built.

> *"Custom field definition, Segment, Attachment, Internal note, Field-history
> entry — Standard shapes; each carries `branch_id` and `department_id` for
> scoping"*

| Entity | Built? | Card? |
|---|---|---|
| Customer, Contact point | yes | yes |
| **Consent record** (`001 §3`, `FR-022`) | no | **no** — gated by `001 [CLARIFY-5]`, but a gate is not a card |
| **Custom field definition** | no | **no** |
| **Segment** | no | **no** — and referenced by built code, see 3a |
| **Attachment** | no | **no** for staff surfaces; `portal-attachments` covers the customer side only |
| **Internal note** | yes, as `Message` with `visibility: 'internal'` | yes |
| **Field-history entry** | substantially, as the audit trail | yes |

### 3c. Whole specs with no card

Restating the headline, with what it means operationally:

- **`004` Agent Dashboard** — 26 requirements, 14 MUST, **5 open markers**. The
  agent's daily workspace. Nothing on the board says it is missing.
- **`013` Cross-cutting** — 11 requirements, 7 MUST, **8 open markers**. These
  are not features and that is exactly why they vanished: no module to hang a
  card on. They include **`FR-003`** (uptime target and a published status
  page), **`FR-007`** (monitor and alert on error rate, latency, queue depth,
  integration and channel failure), **`FR-008`** (zero-downtime releases,
  reversible migrations verified before release), **`FR-011`** (every latency
  budget measured at p95 and observable), and **`FR-010`** — *"A privacy policy
  and terms MUST be published in Arabic and English"*. That last one is a legal
  obligation attached to a customer-facing portal that has already been
  demonstrated.

### 3d. The 79 NFRs

**None of the 79 `NFR-*` rows is represented on the board in any form**, and
they are structurally different from everything else: their tables have a metric
and a target figure but **no level column**, so they never appear in a MUST or
SHOULD count and never triggered a card. `013 [CLARIFY-1]` (volumes) leaves most
of the figures unquantified, which is a real gate — but *unquantified* is not
*untracked*, and right now they are both.

---

## 4. On the board with no upstream requirement — constitution VIII

Constitution VIII: *"Every requirement traces to a story."* Four cards do not.
None is waste; the point is whether each is honestly labelled.

| Card | Upstream? | Verdict |
|---|---|---|
| **`ui-design-system`** (+ 3 subtasks) | No spec requires a design system. It is the *means* by which `012 FR-002` (mirrored Arabic rendering) and `FR-004` (localised values) are met | **Legitimate.** Enabling work for a MUST. Worth adding the trace to its description so it is not read as decoration. |
| **`acceptance-tests`** (+ 4 subtasks) | No spec requires a test suite | **Legitimate**, and constitution-mandated in substance: it is the evidence for every "verified" claim, and `013 FR-006` requires *"every acceptance scenario across all specs"* to be exercised. That trace is real and currently unstated. |
| **`demo-environment`** (+ 3 subtasks) | **None.** `decisions-pending.md` decision 36 says so explicitly: *"Nothing in `specs/`. No spec covers demo seeding"* | **Genuinely unsupported**, and correctly recorded as such. It exists because you asked for a demonstrable flow. Keep it; it should not be mistaken for product scope. |
| **`project-setup`** (+ 5 subtasks) | Partly `012` (platform module), mostly infrastructure | **Legitimate.** |

**No card describes work that should not be happening.** The failure mode on
this board is omission, not invention.

---

## 5. Contradictions between specs, not recorded as such

| # | Contradiction | Recorded? |
|---|---|---|
| 1 | **`004 FR-009` punches a hole in constitution IV.** *"An agent MUST be able to mention a colleague in an internal note; the mention MUST notify them and MUST grant them access to that ticket only."* Constitution IV and `010 FR-004` require scope to be evaluated **against the target record** — a per-record grant outside branch and department has no representation in `RoleAssignment`, which scopes by branch and department only. | **NOT RECORDED ANYWHERE.** This is a genuine model-level conflict, not a missing feature: implementing mentions requires either a new grant type or an exception to the predicate that is currently non-negotiable. |
| 2 | **`002 FR-007` vs `002 FR-008` on who owns the status set.** `FR-007` (**MUST**) says a ticket holds a status *"from the administrator-defined set"*; `FR-008`, which actually provides administrator definition, is only a **SHOULD**. A MUST depends on a SHOULD. | **NOT RECORDED.** Shipped code resolves it by making statuses a code constant, which satisfies neither cleanly. |
| 3 | **`001 FR-005` level vs its own wording.** Marked **SHOULD**, but the text reads *"outbound messaging **MUST** default to the primary"*. Several rows do this — a SHOULD level over MUST-worded text. | Partially recorded: decision 16 covers the shared-contact-point half, not the level mismatch. |
| 4 | **`008 FR-003` requires the owning team on a customer-facing surface** while `002 [CLARIFY-6]`'s resolution (decision 29) settled that the portal shows **team only, no agent identity** — consistent — but `Team` does not exist, so the MUST cannot be met at all. | Recorded as decision 35, and carded via `scope-team`. **Adequately handled** — included for completeness. |
| 5 | **`012 FR-011` (isolated entities, MAY) vs decision 1 (not supported).** | Recorded, decision 1. Fine. |

**Items 1 and 2 are the two that need recording.** Item 1 is the more serious:
it is the first requirement found that cannot be built without either changing
the permission model or breaching a rule this project has treated as
non-negotiable.

---

## 6. The verdict you asked for: 67 markers, 21 TO DO cards

**The gap is not fine. It is roughly half fine.**

| Marker group | Open markers | Cards | Assessment |
|---|---|---|---|
| Wholly-unbuilt modules with a card — `003` 6, `005` 6, `006` 5, `007` 7, `009` 6, `011` 6 | **36** | 6 module cards | **Fine.** Many markers behind one card is the correct ratio: one unbuilt module needs one card, not six. Every one of these cards carries a *Blocked by* line naming what must be answered. |
| Partially built specs — `001` 3, `008` 4, `010` 5, `012` 6 | **18** | Several cards each | **Mostly fine.** These markers gate specific requirements (`001 [CLARIFY-4]`/`[CLARIFY-5]` gate erasure and consent; `010 [CLARIFY-2]` gates SSO). The gating is real. What is missing is a card for the *consent record* and *segment* entities regardless of the gate. |
| **`004` 5 markers, `013` 8 markers** | **13** | **zero** | **Not fine.** 13 open markers — 19% of all of them — sit on two specs with no card. Nothing on the board would ever surface them. |
| `002` | 0 | — | Spec `002` is at **zero open markers** — the only spec that is — and has **five untracked MUSTs** (§1 rows 1, 2, 5, 25, 31) plus nine untracked SHOULDs. The marker gate reports it as clean while fourteen requirements go untracked. |

**So the answer is: mostly the first thing, with a real second thing inside it.**
36 of 67 markers genuinely do block requirements nobody is building, and one card
per blocked module is right. But **13 markers block requirements nobody is
building *and nobody is tracking*, and spec `002`'s zero-marker status actively
concealed five untracked MUSTs** — because the marker count measures *questions
nobody has answered*, not *work nobody has scheduled*, and this board was built
from documents that inherited the same blind spot.

**The single most useful thing this audit found is not a count.** It is that
`002` has zero open markers and five untracked MUSTs at the same time. Marker
count is not coverage, and until now nothing in the project distinguished them.

---

## Recommended additions — for your decision, not acted on

No cards have been created and no code written, per instruction. If you want
them, the minimum honest set is:

1. **`004` Agent Dashboard** — one module card, its 5 markers named as blockers,
   with §1 Tier 4 (rows 16–24) as children.
2. **`013` Cross-cutting** — one module card, its 8 markers named, covering §1
   rows 9–14: monitoring, zero-downtime releases, status page, privacy policy
   and the p95 measurement obligation.
3. **Security and operations** (§1 rows 6–8) — encryption in transit and at
   rest, backup and restore drill, password policy and lockout. These are
   `010` MUSTs and the most uncomfortable omission for anything going near
   production.
4. **Administrator configuration console** — `010 FR-011` (MUST) plus the §2
   cluster. The largest ungated piece of untracked work found.
5. **Category tree** (`002 FR-004`/`FR-005`) — the ratified deviation needs a
   card, not only a decision entry.
6. **Attachments** — one card, or three: ticket and message (`002 FR-015`),
   customer (`001 FR-009`), and the scanning rule that gates both
   (`010 FR-016`). `portal-attachments` already exists and should become a
   child of it rather than the only one.
7. **Accessibility and mobile** — `012 FR-005` and `008 FR-012` (both MUST),
   `012 FR-012` and four NFRs.
8. **Missing entities** — `Segment`, `Consent record`, `Custom field
   definition`, `Attachment`, `BusinessCalendar`, `HolidaySet`. `Segment`,
   `BusinessCalendar` and `HolidaySet` are referenced by built code today.
9. **Reopen** (`002 FR-022`, MUST) — currently the most honestly documented
   unbuilt thing in the codebase and still not on the board.
10. **Two contradictions to record** — `004 FR-009` against constitution IV, and
    `002 FR-007` depending on a SHOULD.

**A note on what this list is not.** Ten cards would take the board from 21 TO
DO to roughly 31, and none of them is a small piece of work. That is the honest
shape of the gap, not an argument for building any of it: several are correctly
deferred and two are gated by markers. The value of carding them is that a
deferred thing and an unnoticed thing stop looking identical.

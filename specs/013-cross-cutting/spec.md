# Spec 013 — Cross-cutting requirements

> **المفروض الحاجة دي تشتغل إزاي بالظبط؟**

| | |
|---|---|
| **Number** | `013` |
| **Story** | [`stories/013-cross-cutting/story.md`](../../stories/013-cross-cutting/story.md) |
| **Status** | Draft — **every requirement here is missing its number** |
| **Constitution gates** | VII (testable or not done), II (attributable) |
| **Blocking clarifications** | 8 — one per unagreed number |

---

## 1. Scope

**In scope.** The qualities the source feature list omitted: performance
budgets, capacity, availability, real-time latency, attachment handling, browser
support, observability and alerting, deployment and migration, data-layer
validation, and the legal basis for holding this data.

**Out of scope.**

- Backup, restore, encryption and retention — spec `010` (`FR-010`, `FR-015`, `FR-017`); they are security requirements
- Hosting, cloud vendor and infrastructure topology — a plan-phase decision
- Penetration testing and security certification — project activities, not product requirements
- Disaster-recovery site selection — follows from the RPO and RTO agreed in spec `010` `[CLARIFY-5]`
- Support and maintenance contract terms — commercial
- Per-feature performance budgets — stated in each owning spec's own `NFR` table; this spec sets the system-wide envelope

## 2. Why this spec exists

The other twelve specs each carry an `NFR` table with numbers. Those numbers
were written by us, not agreed by the client. This spec collects the ones that
are *commitments* rather than engineering choices, and marks each as unagreed.

The failure mode this prevents is specific: a page that takes nine seconds gets
reported as a defect even though no stated requirement was missed, because
nobody agreed the number that was being missed. Every `[CLARIFY]` below is a
blank waiting for a number, and every one of them is cheaper to fill now than
during acceptance testing.

## 3. Domain language

| Term | Means exactly |
|---|---|
| **p95** | The 95th percentile of observed values over a stated window. The default measure for every latency budget. |
| **Target volume** | The agreed concurrent agents and monthly ticket count against which every budget is measured. Pending `[CLARIFY-1]`. |
| **Uptime** | The proportion of a calendar month in which the service answers requests correctly, excluding agreed maintenance windows. |
| **Agreed maintenance window** | A pre-announced period excluded from uptime. Exists only if `[CLARIFY-8]` permits one. |
| **Degraded** | Operating with a dependency unavailable but core work still possible. Distinct from down. |
| **Alert lead time** | The interval between our alert and the first customer report of the same problem. Must be positive. |
| **Supported browser** | A browser and minimum version in which every acceptance scenario passes. Anything else is unsupported, not broken. |
| **Zero-downtime release** | A deployment during which no request fails and no session is lost. |
| **Reversible migration** | A schema change that can be undone without data loss, verified before release. |

## 4. Acceptance scenarios

Each scenario is written against a placeholder. It becomes testable when its
clarification is answered.

### AS-01 — Performance holds at target volume
**Given** the system loaded to the agreed target volume `[CLARIFY-1]`
**When** an agent opens their queue, filters it, searches full text and opens a ticket
**Then** each completes within the budget in section 5
**And** the measurement is p95 over a stated window, not a best case

### AS-02 — Capacity has headroom
**Given** the agreed concurrent agent count and monthly volume
**When** load is applied at the agreed figure and again at 150% of it
**Then** budgets hold at 100%
**And** at 150% the system degrades measurably rather than failing, and the degradation is documented

### AS-03 — Uptime is measured and published
**Given** the agreed uptime target `[CLARIFY-2]`
**When** a calendar month completes
**Then** measured uptime is reported against the target
**And** a status page reflects current state, including degraded states
**And** any excluded maintenance window was announced in advance

### AS-04 — Real-time feels live
**Given** an active chat and an in-app notification
**When** a message is sent and an event occurs
**Then** the chat message appears within the budget in spec `003` `NFR-002`
**And** the notification appears within the budget in spec `004` `NFR-003`

### AS-05 — Attachments do not degrade the product
**Given** the agreed maximum attachment size `[CLARIFY-4]`
**When** a file at that size is uploaded and later downloaded
**Then** both complete within their budgets
**And** a ticket with twenty attachments renders within the spec `002` `NFR-003` budget without loading their contents

### AS-06 — Support boundaries are known before they are tested
**Given** the agreed supported browser matrix `[CLARIFY-3]`
**When** every acceptance scenario across all thirteen specs is run on each
**Then** all pass
**And** an unsupported browser presents a clear notice rather than failing obscurely

### AS-07 — We find out first
**Given** an error-rate spike, a growing queue depth and a failing integration
**When** each crosses its configured threshold
**Then** the configured recipients are alerted through the configured channel `[CLARIFY-6]`
**And** the alert precedes the first customer report
**And** each alert names the affected component and the observed value

### AS-08 — Releasing is routine
**Given** a change including a schema migration
**When** it is deployed
**Then** no request fails and no session is lost
**And** the migration is reversible, and the reversal was verified before release
**And** a rollback can be performed without data loss

### AS-09 — Bad data cannot enter
**Given** a required field, a value outside its permitted set, and a malformed identifier
**When** each is submitted through the interface, the API and a bulk import
**Then** each is refused at the data layer by all three paths
**And** the interface is not the only place validation occurs

### AS-10 — The legal basis is documented and shown
**Given** a customer using the portal for the first time
**When** they register or submit a request
**Then** the privacy policy and terms are available in Arabic and English
**And** their consent, where required, is recorded per spec `001` `FR-022` with a timestamp and a source
**And** the recorded text version is identifiable afterwards

## 5. Functional requirements

Every row marked **unagreed** carries a placeholder, not a decision.

| ID | Requirement | Level | Traces | Status |
|---|---|---|---|---|
| `FR-001` | Ticket lists, filters and full-text search MUST return within their per-spec budgets at target volume, measured at p95: list ≤ 2s (spec `002` `NFR-001`), search ≤ 3s (`NFR-002`), customer search ≤ 1s (spec `001` `NFR-001`). | MUST | `NFR-01` | budgets set, **volume unagreed** `[CLARIFY-1]` |
| `FR-002` | The system MUST hold the agreed concurrent agent count and monthly ticket volume with at least 50% headroom, and MUST degrade measurably rather than fail beyond it. | MUST | `NFR-02` | **unagreed** `[CLARIFY-1]` |
| `FR-003` | The system MUST meet the agreed monthly uptime target and MUST publish a status page reflecting current state including degraded operation. | MUST | `NFR-03` | **unagreed** `[CLARIFY-2]` |
| `FR-004` | Chat messages and in-app notifications MUST arrive within the budgets in spec `003` `NFR-002` and spec `004` `NFR-003`. | SHOULD | `NFR-04` | budgets set |
| `FR-005` | Attachments MUST be subject to an agreed maximum size and total storage budget, MUST be deduplicated where identical, and MUST be delivered without blocking ticket render. | SHOULD | `NFR-05` | **unagreed** `[CLARIFY-4]` |
| `FR-006` | The supported browsers and minimum versions MUST be stated; every acceptance scenario across all specs MUST pass on each; an unsupported browser MUST present a clear notice. | SHOULD | `NFR-06` | **unagreed** `[CLARIFY-3]` |
| `FR-007` | The system MUST monitor and alert on error rate, request latency, queue depth, integration failure, channel health (spec `003` `FR-022`), backup failure (spec `010` `E-14`) and audit-write failure (spec `010` `E-11`), to configured recipients on configured channels. | MUST | `NFR-07` | mechanism set, **recipients unagreed** `[CLARIFY-6]` |
| `FR-008` | Releases MUST be zero-downtime; migrations MUST be reversible with the reversal verified before release; rollback MUST be possible without data loss. | MUST | `NFR-08` | **maintenance window unagreed** `[CLARIFY-8]` |
| `FR-009` | Required fields, permitted value sets and referential integrity MUST be enforced at the data layer, applying equally to the interface, the API and bulk import. | SHOULD | `NFR-09` | agreed |
| `FR-010` | A privacy policy and terms MUST be published in Arabic and English; where consent is required it MUST be recorded with timestamp, source and the identifiable version of the text consented to. | MUST | `NFR-10` | **regime unagreed** `[CLARIFY-7]` |
| `FR-011` | Every latency budget in every spec MUST be measured at p95 over a stated window and MUST be observable in production, not only in testing. | MUST | constitution VII | agreed |

## 6. System-wide budget summary

The per-spec budgets, collected so a single load test can verify all of them.
Each remains owned by its spec.

| Surface | Budget (p95) | Owner |
|---|---|---|
| Customer search | 1s | `001` `NFR-001` |
| Customer full view | 2s | `001` `NFR-002` |
| Ticket list with filters | 2s | `002` `NFR-001` |
| Full-text search | 3s | `002` `NFR-002` |
| Ticket detail with thread | 2s | `002` `NFR-003` |
| Inbound message to visible on ticket | 60s | `003` `NFR-001` |
| Chat message delivery | 1s | `003` `NFR-002` |
| Channel failure detection | 5 min | `003` `NFR-003` |
| Workspace first render | 2s | `004` `NFR-001` |
| Counter and queue freshness | 30s | `004` `NFR-002` |
| In-app notification | 5s | `004` `NFR-003` |
| Clock state read | 200ms | `005` `NFR-001` |
| Threshold notification | 60s | `005` `NFR-002` |
| Automatic assignment | 30s | `005` `NFR-003` |
| Knowledge search | 1s | `006` `NFR-001` |
| Composition-time suggestion | 500ms | `006` `NFR-002` |
| AI summary / suggestion | 5s, abandoned at 10s | `007` `NFR-001`, `NFR-002` |
| Chatbot turn | 3s | `007` `NFR-004` |
| Portal page on 4G phone | 3s | `008` `NFR-001` |
| One-time code delivery | 30s | `008` `NFR-004` |
| Standard report, 12 months | 5s | `009` `NFR-001` |
| Report data freshness | 15 min | `009` `NFR-003` |
| Permission evaluation overhead | 50ms | `010` `NFR-001` |
| Audit search, 12 months | 5s | `010` `NFR-002` |
| Session termination after deactivation | 60s | `010` `NFR-003` |
| API single-record read | 500ms | `011` `NFR-001` |
| ERP entitlement lookup | 2s, then unavailable | `011` `NFR-002` |
| Webhook first delivery | 60s | `011` `NFR-003` |
| Language switch | 1s | `012` `NFR-001` |

## 7. Edge cases and failure behaviour

| # | Situation | Required behaviour |
|---|---|---|
| E-01 | Load exceeds target volume | Degrades measurably — queues lengthen, budgets stretch — rather than failing. The degradation is documented and alerted, not discovered. |
| E-02 | A single dependency is unavailable (SLA engine, ERP, AI provider, scanner) | The system is `degraded`, not down. Each owning spec defines its fallback: spec `004` `E-05`, spec `011` `E-01`, spec `007` `E-14`, spec `010` `E-20`. |
| E-03 | Two dependencies fail together | Fallbacks compose; no fallback may substitute a computation forbidden elsewhere, in particular duration arithmetic (constitution III). |
| E-04 | Alert channel itself fails | A secondary channel is configured; alert-delivery failure is itself alerted. |
| E-05 | Alert threshold set so low it fires constantly | Alert fatigue is a defect; thresholds are reviewed on a standing basis using the alert log. |
| E-06 | Migration fails mid-deployment | Automatic rollback; the release is abandoned; no partial schema state persists. |
| E-07 | Migration is irreversible by nature (data destruction) | Refused as a release. Destruction is a separate, audited operation under spec `010` `FR-015`. |
| E-08 | Storage approaches its budget | Alert at the configured threshold. Uploads are refused before storage exhaustion, never after. |
| E-09 | Identical attachment uploaded to 50 tickets | Stored once, referenced fifty times; deletion from one does not remove it from the others. |
| E-10 | Unsupported browser used | Clear notice naming supported browsers. Not a silent partial failure. |
| E-11 | Validation differs between the interface and the API | A defect. `FR-009` requires one enforcement point. |
| E-12 | Privacy policy text is updated | The new version is published; existing consent records remain bound to the version consented to (`FR-010`). |
| E-13 | Consent required but the regime is still unagreed | Consent is captured and stored regardless, so that no interaction is unrecorded pending the legal answer. |
| E-14 | Monitoring itself is unavailable | Treated as a high-severity incident; an external check confirms liveness independently. |

## 8. Bilingual and localisation requirements

| Surface | Arabic | English | Notes |
|---|---|---|---|
| Privacy policy and terms | Required | Required | `FR-010`; client-supplied text |
| Consent capture text | Required | Required | The version consented to must be identifiable per language |
| Status page | Required | Required | Including degraded-state descriptions |
| Unsupported browser notice | Required | Required | Must render before the application loads |
| Maintenance and outage notices | Required | Required | Advance notice in both languages |
| Validation refusals | Required | Required | Per spec `012` section 8 |
| Operational alerts to staff | English acceptable | Required | Internal engineering surface; not customer-facing |

## 9. Permissions

| Action | AGT | LEAD | MGR | ADM | AUD |
|---|---|---|---|---|---|
| View the status page | ✓ | ✓ | ✓ | ✓ | ✓ |
| View performance and error dashboards | — | — | ✓ | ✓ | ✓ |
| Configure alert thresholds and recipients | — | — | — | ✓ | — |
| Acknowledge an alert | — | — | ✓ | ✓ | — |
| Trigger a deployment | — | — | — | ✓ | — |
| Trigger a rollback | — | — | — | ✓ | — |
| Publish a maintenance notice | — | — | ✓ | ✓ | — |
| Publish privacy policy and terms | — | — | — | ✓ | — |
| Read consent records | — | — | ✓ | ✓ | ✓ |
| View the load-test and capacity record | — | — | ✓ | ✓ | ✓ |

## 10. Audit requirements

| Event | Recorded fields |
|---|---|
| Budget breach observed in production | surface, observed value, budget, window, timestamp |
| Availability incident | start, end, components affected, degraded or down, customer impact |
| Maintenance window announced / entered / exited | actor, timestamps, notice given, scope |
| Alert fired / acknowledged / cleared | metric, threshold, observed value, recipients, actor acknowledging |
| Alert delivery failed | metric, channel, fallback used |
| Deployment started / completed / rolled back | actor, version, migrations applied, elapsed, outcome |
| Migration reversal verified | actor, migration, verification result, timestamp |
| Storage threshold crossed | current, budget, timestamp |
| Attachment refused for size or budget | uploader, surface, size, limit |
| Validation refusal at the data layer | path (interface / API / import), entity, field, reason |
| Privacy policy or terms published | actor, timestamp, versions per language |
| Consent recorded | per spec `001` `FR-022`, plus the identifiable text version |
| Load test executed | actor, target volume, results per budget, pass or fail |

## 11. Contracts

| Operation | Purpose | Scope predicate |
|---|---|---|
| `get status` (public) | Status page | unauthenticated; no customer data |
| `get health` (internal) | Liveness and dependency state | monitoring credential only |
| `get metrics` (internal) | Budgets and error rates observed | monitoring credential; manager and above in-product |
| `manage alert configuration` | Thresholds and recipients | admin only |
| `acknowledge alert` | Incident handling | manager and above |
| `deploy` / `rollback` | Release | admin only; audited |
| `publish maintenance notice` | Advance notice | manager and above; both languages required |
| `publish policy documents` | Legal basis | admin only; both languages required |
| `list consent records` | Compliance evidence | manager, admin or auditor |

## 12. Clarifications needed

Every one of these is a number the client must supply. They are not technical
preferences; they are commitments, and several carry commercial weight.

- [ ] `[CLARIFY-1]` **How many agents concurrently, and how many tickets per month — at launch and in three years?** Every budget in section 6 is meaningless without this, because none of them states the load it holds at. — *blocks* `FR-001`, `FR-002`, and the acceptance of every other spec's `NFR` table — *ask* client operations
- [ ] `[CLARIFY-2]` **What monthly uptime are we committing to, and is there a penalty?** The client will quote this number in their own customer commitments, so it must be agreed by someone able to sign for it. — *blocks* `FR-003` — *ask* client executive sponsor
- [ ] `[CLARIFY-3]` Which browsers and minimum versions must be supported? Is there a locked-down corporate build in use? — *blocks* `FR-006` — *ask* client IT
- [ ] `[CLARIFY-4]` What is the maximum attachment size, and the total storage budget? WhatsApp and email each impose their own limits (spec `003` `E-08`), so ours must sit inside the smallest. — *blocks* `FR-005` — *ask* client operations + finance
- [ ] `[CLARIFY-5]` **What are the RPO and RTO?** Owned by spec `010` `[CLARIFY-5]`; repeated here because they are commercial commitments and belong in the same conversation as uptime. — *blocks* spec `010` `FR-017` — *ask* client executive sponsor
- [ ] `[CLARIFY-6]` Who receives operational alerts, on which channel, and who is on call out of hours? — *blocks* `FR-007` — *ask* client IT + operations
- [ ] `[CLARIFY-7]` **Which privacy regime applies, and who supplies the policy and terms text in both languages?** Shared with spec `001` `[CLARIFY-4]` and spec `010` `[CLARIFY-4]`. — *blocks* `FR-010`, and spec `001` `FR-021` — *ask* client legal
- [ ] `[CLARIFY-8]` Is a maintenance window permitted, or is zero-downtime deployment mandatory at all times? — *blocks* `FR-008`, `AS-03` — *ask* client operations

## 13. Success metrics

| Metric | Source | Target |
|---|---|---|
| Budgets met at target volume | Load test before go-live | 100% of section 6 |
| Monthly uptime | Availability measurement | Met every month |
| Alert lead time | Our alert vs. first customer report | Always positive |
| Releases causing downtime | Per release | 0 |
| Migrations without a verified reversal | Release audit | 0 |
| Validation bypassable through any path | Automated cross-path test | 0 |
| Acceptance-test disputes about qualities | At UAT | 0 — because every number here was agreed in advance |
| Interactions without a consent record where required | Compliance audit | 0 |

## 14. Review checklist

- [x] No implementation detail
- [x] Every requirement testable, using MUST / SHOULD / MAY
- [x] No unfailable adjectives — every quality carries a number or a marked placeholder
- [x] Every requirement traces to a story ID or constitution principle
- [x] Every acceptance scenario has a matching requirement, and vice versa
- [x] Edge cases cover overload, dependency failure, migration failure and monitoring failure
- [x] Section 6 collects every per-spec budget so one load test verifies all of them
- [x] Bilingual requirements stated for every customer-facing operational surface
- [x] Permission matrix complete
- [x] Audit entries defined for every operational event
- [ ] **Zero `[NEEDS CLARIFICATION]` markers remaining — 8 open. Unlike the other specs, these are not design questions; they are numbers only the client can supply, and `[CLARIFY-1]` invalidates the acceptance of every other spec's `NFR` table until answered.**
- [x] Constitution gates satisfied and named

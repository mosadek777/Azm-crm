# Spec 011 — Integrations

> **المفروض الحاجة دي تشتغل إزاي بالظبط؟**

| | |
|---|---|
| **Number** | `011` |
| **Story** | [`stories/011-integrations/story.md`](../../stories/011-integrations/story.md) |
| **Status** | Draft — clarifying |
| **Constitution gates** | IV (credentials carry scope), II (attributable), VII (testable contracts) |
| **Blocking clarifications** | 6 open · 1 RESOLVED 2026-09-07 by Mohamed Sadek (developer, acting as decision authority) |

---

## 1. Scope

**In scope.** The public REST API and its authentication, scoping, rate limits
and versioning; webhooks with signing and retry; ERP entitlement and transaction
data on the ticket; customer master-data synchronisation; messaging provider
credentials and delivery receipts; identity provisioning; telephony;
warehouse export; bulk import and export; integration monitoring and replay;
collaboration-tool notifications; and field mapping.

**Out of scope.**

- Channel transports themselves — spec `003`; this spec covers credentials, provider swap and delivery receipts
- Building the warehouse or its reports — `FR-012` delivers data out
- Writing to ERP financial records — `FR-007` requests a transaction, it does not post one
- A public developer portal or partner programme — internal and client integrators only
- iPaaS or middleware selection — a plan-phase decision
- Staff account administration and SSO login — spec `010`

## 2. Domain language

| Term | Means exactly |
|---|---|
| **API client** | A registered non-human consumer holding a credential with an explicit scope and permission set (spec `010` `FR-013`). |
| **Scope of a credential** | The branches, departments and permissions the credential may exercise. Never wider than the administrator who created it. |
| **Webhook subscription** | A registered endpoint receiving named event kinds, with a signing secret. |
| **Signed delivery** | A webhook request carrying a signature over its body and a timestamp, verifiable by the subscriber. |
| **At-least-once delivery** | Every event is delivered one or more times; subscribers must be idempotent. This system does not promise exactly-once. |
| **Master data** | Records whose authoritative source is agreed. Direction pending `[CLARIFY-1]`. |
| **Conflict rule** | The deterministic decision when both systems changed the same field since the last sync. |
| **Entitlement lookup** | A read of contract and service-level facts from the ERP for display on a ticket (spec `001` `FR-014`). |
| **Delivery receipt** | A provider-reported outcome for one outbound message: sent, delivered, read or failed. |
| **Replay** | Re-execution of a recorded failed integration operation, from its stored payload, without re-entering data. |
| **Field mapping** | The administrator-configured correspondence between a CRM field and an external field. |
| **Deprecation window** | The notice period before a removed API version stops responding. |

## 3. Key entities

### API client

| Attribute | Type | Rules |
|---|---|---|
| `name`, `owner_contact` | text | Required — a named human is accountable |
| `credential_ref` | ref | Managed under spec `010` `FR-013` |
| `permissions` | set | ⊆ the creating administrator's own |
| `branch_ids`, `department_ids` | sets | The scope predicate for every request |
| `rate_limit` | rate | Published, per `FR-002` |
| `api_version` | text | Pinned; see `FR-015` |
| `last_used_at` | timestamp | Surfaced for revocation decisions |

### Webhook subscription

| Attribute | Type | Rules |
|---|---|---|
| `api_client_id` | ref | Required — inherits the client's scope |
| `endpoint_url` | text | Required, HTTPS only |
| `event_kinds` | set | From the published list (`FR-003`) |
| `signing_secret_ref` | ref | Rotatable without re-registration |
| `state` | `active` \| `suspended` | Suspended after sustained failure (`E-05`) |

### Integration operation log (append-only)

| Attribute | Type | Rules |
|---|---|---|
| `direction` | `inbound` \| `outbound` | Required |
| `integration` | enum | ERP, provider, warehouse, webhook, import |
| `payload_ref` | ref | Stored for replay, redacted per spec `010` |
| `attempts`, `state` | — | `pending` \| `succeeded` \| `failed` \| `abandoned` \| `replayed` |
| `last_error` | text | Retained |

### Sync state, Field mapping, Delivery receipt, Import job
Standard shapes. Sync state records, per record and per direction, the last
synchronised version and timestamp — the basis of conflict detection.

## 4. Acceptance scenarios

### AS-01 — The API carries scope, not just authentication
**Given** a credential scoped to read tickets in branch B
**When** it reads a branch B ticket, then a branch C ticket, then attempts to write any ticket
**Then** the first succeeds, and the second and third are refused
**And** the branch C read returns not-found, not forbidden
**And** all three are recorded with the credential identity

### AS-02 — Rate limits are published and observable
**Given** a credential with a published rate limit
**When** it exceeds the limit
**Then** requests are refused with a response stating the limit, the window and when to retry
**And** the refusals are recorded
**And** the limit is documented before it is encountered

### AS-03 — Webhooks are signed, ordered-tolerant and retried
**Given** an active subscription to `ticket.status_changed`
**When** a ticket changes status
**Then** a signed request with a timestamp is delivered within the `NFR-003` budget
**And** on a 5xx response it is retried on the configured schedule
**And** on exhaustion it is `abandoned`, the subscription owner is notified, and the payload remains replayable
**And** the subscriber is told in documentation that delivery is at-least-once and may arrive out of order

### AS-04 — Webhook scope matches its credential
**Given** a subscription owned by a credential scoped to branch B
**When** a branch C ticket changes status
**Then** no event is delivered to that subscription
**And** a branch B change is delivered

### AS-05 — Entitlement appears on the ticket, and its absence is honest
**Given** an ERP holding a contract for a customer
**When** an agent opens a ticket for that customer
**Then** contract, service level, and relevant invoice or order facts are displayed
**And** when the ERP does not respond within the `NFR-002` budget, the panel states unavailable
**And** the ticket remains fully workable, and no stale value is shown as current

### AS-06 — Sync conflict is resolved by rule, never by guess
**Given** a customer whose phone number changed in both systems since the last sync
**When** synchronisation runs
**Then** the configured conflict rule decides, per `[CLARIFY-1]`
**And** both values, the rule applied and the outcome are recorded
**And** where the rule is `manual`, the record is queued for a human and neither value is silently discarded

### AS-07 — Provider swap needs no release
**Given** an SMS gateway in use
**When** an administrator configures a second provider and switches
**Then** subsequent messages use the new provider
**And** queued messages complete or re-queue without loss
**And** no code release occurs

### AS-08 — Delivery receipts reach the ticket
**Given** an outbound WhatsApp message
**When** the provider reports delivered, then read
**Then** both states appear on the ticket timeline with their timestamps
**And** a failure state notifies the assigned agent per spec `003` `FR-025`

### AS-09 — Bulk import validates before it commits
**Given** a 5,000-row customer import with 40 invalid rows
**When** the job runs
**Then** it validates all rows first, imports the 4,960 valid ones, and returns a per-row error report
**And** no partial record exists for any rejected row
**And** re-running the same file does not duplicate the already-imported rows

### AS-10 — Every failure is recoverable without re-entry
**Given** a failed ERP write and a failed webhook delivery
**When** an administrator opens integration monitoring
**Then** both appear with their payloads, error messages and attempt counts
**And** each can be replayed from its stored payload
**And** a replay that succeeds is recorded as `replayed`, not as a fresh operation

### AS-11 — API versions do not vanish
**Given** an integration pinned to version 1
**When** version 2 is released
**Then** version 1 continues to respond unchanged
**And** deprecation is announced to the registered owner contact with the agreed notice
**And** removal occurs only after the deprecation window

### AS-12 — Warehouse export is complete and repeatable
**Given** a nightly warehouse export
**When** it runs after an outage that skipped one night
**Then** the missed period is included
**And** no record is duplicated in the destination
**And** the run is recorded with its row counts

## 5. Functional requirements

| ID | Requirement | Level | Traces |
|---|---|---|---|
| `FR-001` | The system MUST expose a REST API covering customers, contact points, tickets, messages, attachments, knowledge articles, users and reference data, with documented request and response shapes and error semantics. | MUST | `INT-01` |
| `FR-002` | API access MUST use OAuth2 or scoped API keys; every credential MUST carry an explicit permission set and branch and department scope; scope MUST be applied server-side on every request; rate limits MUST be published and MUST refuse with a stated limit, window and retry time. | MUST | `INT-02`, constitution IV |
| `FR-003` | The system MUST publish webhooks for at least `ticket.created`, `ticket.updated`, `ticket.status_changed`, `ticket.assigned`, `ticket.message_added`, `ticket.resolved`, `ticket.closed`, `sla.threshold_reached`, `sla.breached` and `customer.updated`. Deliveries MUST be signed over body and timestamp, MUST be retried on failure, and MUST be documented as at-least-once and possibly out of order. A subscription MUST inherit its credential's scope. | MUST | `INT-03`, constitution IV |
| `FR-004` | Interactive API documentation MUST be available, generated from the same definition the API implements, together with a sandbox environment that accepts real calls. | SHOULD | `INT-04` |
| `FR-005` | The ticket view MUST display ERP contract, service-level, invoice and order facts for the customer. Where the ERP is unavailable or slow, the panel MUST state unavailable, MUST NOT show a stale value as current, and MUST NOT prevent the ticket from being worked. | MUST | `INT-05` |
| `FR-006` | Customer master-data synchronisation MUST follow an agreed direction and a deterministic conflict rule per `[CLARIFY-1]`; every sync decision MUST be recorded with both values and the rule applied; a `manual` rule MUST queue the record for a human without discarding either value. | SHOULD | `INT-06` |
| `FR-007` | An agent MAY raise a request for an ERP transaction from a ticket. This spec MUST NOT post financial records directly; it MUST create a request and record its outcome. | MAY | `INT-07` |
| `FR-008` | Administrators MUST be able to configure email, SMS and WhatsApp provider credentials and to switch providers without a release; queued messages MUST complete or re-queue without loss. | SHOULD | `INT-08` |
| `FR-009` | Provider delivery receipts — sent, delivered, read, failed — MUST be reflected on the ticket timeline with their timestamps, and failures MUST notify per spec `003` `FR-025`. | SHOULD | `INT-09` |
| `FR-010` | The system MAY provision and deprovision staff users from the identity provider. Deprovisioning MUST deactivate rather than delete, and MUST follow spec `010` `FR-001` including ticket reassignment. | MAY | `INT-10` |
| `FR-011` | The system MAY integrate with telephony for inbound screen pop, outbound dialling and a link to the call recording, creating or opening the correct ticket. | MAY | `INT-11` |
| `FR-012` | The system SHOULD export ticket, customer, SLA and satisfaction data to a data warehouse on a schedule, resuming missed periods without duplicating records. | SHOULD | `INT-12` |
| `FR-013` | Bulk import MUST validate all rows before committing any, import only valid rows, return a per-row error report, and be idempotent on re-run of the same file. Bulk export MUST honour the caller's scope and MUST be audited per spec `010`. | MUST | `INT-13` |
| `FR-014` | Every integration operation MUST be recorded with direction, payload, attempts, state and last error; failed operations MUST be replayable from the stored payload; a successful replay MUST be recorded as a replay. | SHOULD | `INT-14` |
| `FR-015` | The API MUST be versioned; a released version MUST continue to respond unchanged; deprecation MUST be announced to registered owner contacts with the agreed notice period before removal. | SHOULD | `INT-15` |
| `FR-016` | The system MAY send escalation and breach notifications into a collaboration tool, carrying no more customer data than the recipient is permitted to see. | MAY | `INT-16` |
| `FR-017` | Administrators MAY configure field mappings between CRM and external fields, with type validation at save time. | MAY | `INT-17` |
| `FR-018` | Payloads stored for replay MUST be subject to the redaction and retention rules in spec `010`; an integration log MUST NOT become an unmanaged copy of personal data. | MUST | spec `010` `FR-015` |

## 6. Edge cases and failure behaviour

| # | Situation | Required behaviour |
|---|---|---|
| E-01 | ERP unavailable at ticket open | Panel states unavailable; ticket workable (`FR-005`). |
| E-02 | ERP returns a different customer for the same join key | The mismatch is recorded, the panel states an identity conflict, and no ERP data is displayed. Never displayed against the wrong customer. |
| E-03 | ERP join key absent on the customer | Panel states not linked, and offers linking to a permitted role. |
| E-04 | Webhook endpoint returns 2xx but the subscriber did not process it | Beyond our contract; delivery is at-least-once and subscribers must be idempotent (`FR-003`). Documented, not defended against. |
| E-05 | Webhook endpoint fails continuously | Retries back off; after the configured threshold the subscription is `suspended` and the owner contact notified. Events remain replayable. |
| E-06 | Webhook signing secret rotated mid-flight | Both old and new secrets are accepted for the configured overlap. |
| E-07 | Event generated for a record later merged or deleted | Delivered with the state at generation; subscribers resolve current state by re-reading. |
| E-08 | Credential scope narrowed while a subscription is active | Deliveries immediately reflect the narrower scope; no back-fill of previously delivered events. |
| E-09 | Rate limit exceeded by a critical integration | Refused like any other. Limits are raised by configuration, never bypassed silently. |
| E-10 | Sync loop — CRM writes to ERP, ERP echoes back | **N/A BY CONSTRUCTION (2026-09-07).** `[CLARIFY-1]` was resolved as *CRM is the system of record, ERP read-only*: there are no CRM→ERP writes, so no echo and no loop is reachable. Retained rather than deleted — if the decision is ever revisited, this edge case becomes live again and its original behaviour was: *"Sync state versioning suppresses the echo; a detected loop halts sync and alerts."* |
| E-11 | Sync would overwrite a field a customer just edited in the portal | The conflict rule applies (`FR-006`); a `manual` rule queues it. The customer's edit is never silently discarded. |
| E-12 | Provider switched with messages in flight | In-flight messages complete on the old provider; new messages use the new one; no message is lost or duplicated. |
| E-13 | Delivery receipt arrives for a message on a merged ticket | Recorded on the surviving ticket. |
| E-14 | Delivery receipt arrives out of order (read before delivered) | Both recorded with their provider timestamps; display uses the timestamps, not arrival order. |
| E-15 | Import file re-run after partial success | Idempotent; already-imported rows are skipped and reported as skipped. |
| E-16 | Import file column matches no field and no mapping | Refused before processing, naming the column. |
| E-17 | Warehouse export runs while a schema change is pending | Export uses the current shape and records the version; the destination is told. |
| E-18 | Identity provider deprovisions the last administrator | Refused per spec `010` `E-01`; the provider event is recorded as blocked. |
| E-19 | Replay of an operation whose target no longer exists | Refused, naming the missing target. Never creates a substitute record. |
| E-20 | Collaboration-tool channel is more widely readable than the data warrants | Notification content is limited to the reference and a non-identifying summary; the configuration is refused where it would disclose more. |

## 7. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| `NFR-001` | API response, single-record read | ≤ 500ms at p95 |
| `NFR-002` | ERP entitlement lookup budget | ≤ 2s, then abandoned and reported unavailable |
| `NFR-003` | Webhook first-attempt delivery | ≤ 60s from the event, 99.9% |
| `NFR-004` | Webhook retry schedule | ≥ 6 attempts across ≥ 24 hours |
| `NFR-005` | Sync reconciliation divergence | < 0.5% of records, measured on a scheduled reconciliation |
| `NFR-006` | Import throughput | ≥ 10,000 rows per run with visible progress |
| `NFR-007` | Unrecoverable integration failures | 0 — every failure replayable (`FR-014`) |
| `NFR-008` | Time for a third party to make a first successful call from documentation alone | < 1 day |

## 8. Bilingual and localisation requirements

| Surface | Arabic | English | RTL notes |
|---|---|---|---|
| Integration administration interface | Required | Required | Full mirror |
| Integration monitoring and error messages | Required | Required | Payloads and identifiers stay LTR |
| Import error report | Required | Required | Column order mirrors in Arabic; row numbers stay LTR |
| Field-mapping interface | Required | Required | Mapping arrows mirror direction |
| Delivery-status labels on the timeline | Required | Required | Timestamps stay LTR |
| API and webhook payloads | **English field names only** | English | Machine surfaces are not localised; localisation belongs in the client |
| API documentation | English | English | With an Arabic overview page |
| ERP data displayed on the ticket | As supplied by the ERP | As supplied | Direction detected per value; numbers and currency stay LTR |

Field names in payloads are deliberately not translated: a bilingual wire
format is a defect source, and constitution I governs *user-visible* strings.

## 9. Permissions

| Action | AGT | LEAD | MGR | ADM | AUD | API client |
|---|---|---|---|---|---|---|
| View ERP data on a ticket | ✓ | ✓ | ✓ | ✓ | ✓ | per scope |
| Link a customer to an ERP account | — | ✓ | ✓ | ✓ | — | — |
| Raise an ERP transaction request | ✓ | ✓ | ✓ | — | — | — |
| Use the API | — | — | — | — | — | per credential |
| Register / revoke an API client | — | — | — | ✓ | — | — |
| Create / edit a webhook subscription | — | — | — | ✓ | — | own only |
| Rotate a signing secret | — | — | — | ✓ | — | own only |
| Configure provider credentials | — | — | — | ✓ | — | — |
| Switch provider | — | — | — | ✓ | — | — |
| Configure sync direction and conflict rules | — | — | — | ✓ | — | — |
| Resolve a queued sync conflict | — | ✓ | ✓ | ✓ | — | — |
| Run a bulk import | — | — | — | ✓ | — | per scope |
| Run a bulk export | — | ✓ | ✓ | ✓ | ✓ | per scope |
| View integration monitoring | — | — | ✓ | ✓ | ✓ | — |
| Replay a failed operation | — | — | — | ✓ | — | — |
| Configure warehouse export | — | — | — | ✓ | — | — |
| Configure field mappings | — | — | — | ✓ | — | — |
| Configure collaboration-tool notifications | — | — | ✓ | ✓ | — | — |

## 10. Audit requirements

| Event | Recorded fields |
|---|---|
| API request | credential, timestamp, operation, scope applied, outcome, latency; body recorded for writes only |
| API request refused | credential, operation, reason (`scope` / `permission` / `rate_limit` / `version`), timestamp |
| API client registered / revoked | actor, credential, scope, permissions, timestamp |
| Webhook subscription created / edited / suspended / resumed | actor, endpoint, event kinds, timestamp |
| Signing secret rotated | actor, timestamp, overlap window |
| Webhook delivered / retried / abandoned | subscription, event, attempt count, response code, timestamp |
| ERP lookup performed / timed out / mismatched | ticket, customer, join key, latency, outcome |
| ERP transaction requested | actor, ticket, request type, outcome |
| Sync run | direction, records examined, updated, skipped, conflicted |
| Sync conflict decided | record, field, CRM value, external value, rule applied, outcome, actor where manual |
| Sync loop detected | records involved, sync halted |
| Provider configured / switched | actor, channel, previous provider, new provider, messages in flight |
| Delivery receipt received | message, ticket, state, provider timestamp |
| Import job run | actor, file identity, rows total, imported, rejected, skipped as duplicate |
| Export run | actor or schedule, entity types, row counts, destination |
| Operation replayed | actor, original operation, outcome |
| Field mapping changed | actor, mapping, before, after |
| Payload purged under retention | rule, count, timestamp |

## 11. Contracts

| Operation | Purpose | Scope predicate |
|---|---|---|
| `GET/POST/PATCH customers` | Customer CRUD | credential scope; writes refused without the write permission |
| `GET/POST/PATCH tickets` | Ticket CRUD | credential scope; status changes validated against spec `002` transitions |
| `POST ticket messages` | Reply or note | credential scope; internal notes require the internal permission |
| `GET/POST attachments` | Files | credential scope; scan gate applies (spec `010` `FR-016`) |
| `GET knowledge articles` | Content | visibility ≤ credential's level (spec `006`) |
| `GET reference data` | Statuses, categories, priorities, teams | credential scope |
| `GET sla state` | Durations | credential scope; **read-through to spec `005`, never recomputed** |
| `manage webhook subscription` | Event delivery | admin, or the owning credential |
| `deliver webhook` (outbound) | Event push | signed; scope filtered at generation, not at the subscriber |
| `get erp entitlement` (outbound) | Ticket panel | ticket ∈ caller scope; budgeted per `NFR-002` |
| `request erp transaction` (outbound) | Handoff | agent on the ticket |
| `run sync` (internal) | Master data | configured direction; conflict rule applied |
| `manage provider credentials` | Messaging | admin only |
| `receive delivery receipt` (inbound) | Provider callback | signature verified; matched to a message |
| `run import` / `run export` | Bulk data | admin for import; scope-honouring for export; both audited |
| `list / replay integration operations` | Recovery | manager and auditor read; admin replay |
| `manage field mapping` | Adaptation | admin only |

## 12. Clarifications needed

- [x] `[CLARIFY-1]` **Who owns customer master data — the CRM or the ERP — and what is the conflict rule?** Both cannot be the source of truth. Shared with spec `001` `[CLARIFY-1]`. Without this, `FR-006` cannot be written, let alone tested. — *blocks* `FR-006`, `AS-06`, and spec `001` `FR-019` — *ask* client IT + operations
  - **RESOLVED 2026-09-07 by Mohamed Sadek (developer, acting as decision authority), together with spec `001` `[CLARIFY-1]`.** **The CRM is the system of record. The ERP is read-only reference.** There is no conflict rule because there is no two-way write.
  - **Consequences inside this spec.** `FR-006` (customer and account sync) is **downgraded** from a two-way sync under conflict rules to a scheduled **divergence report** — it detects drift and reports it; it resolves nothing automatically. `E-10` (sync loop) is **N/A by construction**. `FR-005` (read-only ERP display) and `FR-007` (raise a request, post nothing) are unaffected and remain as written.
  - **The upstream story is downgraded with it.** `stories/011 INT-06` (**Should**) is annotated accordingly.
  - **Revisitable without rework** as option A3 — an inbound feed that proposes changes for a human to accept. See [`docs/decisions-pending.md`](../../docs/decisions-pending.md) §0.
  - **Note: `[CLARIFY-2]` is still open and still blocks `FR-005`, `FR-006` and `FR-007`** — which ERP, which version, what surface it exposes. Deciding *ownership* did not make the integration buildable.
- [ ] `[CLARIFY-2]` **Which ERP, which version, and what integration surface does it actually expose today?** An assumed API is the most common cause of slippage on projects of this shape. — *blocks* `FR-005`, `FR-006`, `FR-007` — *ask* client IT
- [ ] `[CLARIFY-3]` **Who on the ERP side owns this work, and what is their availability?** This is a delivery-date question, not a technical one, and it is not ours to answer. — *blocks* the delivery schedule — *ask* client executive sponsor
- [ ] `[CLARIFY-4]` Is ERP data read live on ticket open, or cached with a staleness bound? Live means the ticket panel depends on ERP uptime. — *blocks* `FR-005`, `NFR-002` — *ask* client IT
- [ ] `[CLARIFY-5]` Which key joins a CRM customer to an ERP account? Shared with spec `001` `[CLARIFY-2]`. — *blocks* `FR-005`, `FR-006`, `E-02` — *ask* client operations
- [ ] `[CLARIFY-6]` Is telephony integration in scope at all, and on which platform? — *blocks* `FR-011` — *ask* client IT
- [ ] `[CLARIFY-7]` Which warehouse, at what refresh frequency, and does it sit inside the jurisdiction required by spec `010` `[CLARIFY-7]`? — *blocks* `FR-012` — *ask* client IT + legal

## 13. Success metrics

| Metric | Source | Target |
|---|---|---|
| Tickets where entitlement resolved successfully | ERP lookup log | > 98% |
| Master-data divergence | Scheduled reconciliation | < 0.5% of records |
| Webhook deliveries within 60s | Delivery log | > 99.9% |
| Unrecoverable integration failures | Operation log | 0 |
| Undetected message delivery failures | Provider status vs. ticket state | 0 |
| Third-party time to first successful call | From documentation alone | < 1 day |
| API requests served outside their credential scope | Penetration test | 0 |
| Breaking changes shipped inside a live API version | Version audit | 0 |

## 14. Review checklist

- [x] No implementation detail beyond contract shape
- [x] Every requirement testable, using MUST / SHOULD / MAY
- [x] No unfailable adjectives
- [x] Every requirement traces to a story ID or constitution principle
- [x] Every acceptance scenario has a matching requirement, and vice versa
- [x] Edge cases cover outage, mismatch, loop, out-of-order, re-run and revocation
- [x] Bilingual requirements stated, with the deliberate exception of wire payloads (section 8)
- [x] Permission matrix complete, including the API client as an actor
- [x] Audit entries defined, including refusals and replays
- [x] Constitution IV satisfied — `FR-002` scopes every request; `FR-003` filters events at generation
- [x] Constitution III respected — the API reads SLA state, never recomputes it (section 11)
- [ ] **Zero `[NEEDS CLARIFICATION]` markers remaining — 7 open, `/plan` is blocked. `[CLARIFY-2]` and `[CLARIFY-3]` are the project's highest delivery risk.**
- [x] Constitution gates satisfied and named

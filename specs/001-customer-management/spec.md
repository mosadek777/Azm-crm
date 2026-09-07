# Spec 001 — Customer Management

> **المفروض الحاجة دي تشتغل إزاي بالظبط؟**

| | |
|---|---|
| **Number** | `001` |
| **Story** | [`stories/001-customer-management/story.md`](../../stories/001-customer-management/story.md) |
| **Status** | Draft — clarifying |
| **Constitution gates** | I (bilingual), II (attributable), IV (server-side scope) |
| **Blocking clarifications** | 3 open · 2 RESOLVED 2026-09-07 by Mohamed Sadek (developer, acting as decision authority) |

---

## 1. Scope

**In scope.** The customer record as a durable identity: creation, search,
contact points, consent, segmentation, entitlement display, attachments,
internal notes, the unified interaction history view, duplicate detection and
merge, organisation grouping, custom fields, bulk import, field-level audit, and
lawful erasure.

**Out of scope.**

- Marketing segmentation and campaigns — not this product
- Sales pipeline and opportunities — not in the source feature list
- Ticket behaviour — spec `002`
- Interaction *capture* (how a message becomes history) — spec `003`; this spec defines the *view*
- ERP synchronisation mechanics — spec `011`; this spec defines what a synced field means
- Portal self-service screens — spec `008`; this spec defines what a customer may change

## 2. Domain language

| Term | Means exactly |
|---|---|
| **Customer** | A party we support. Either a `person` or an `organisation`; the type is fixed at creation and may not change. |
| **Contact point** | One addressable channel identity — a phone number, an email address, a WhatsApp number. Belongs to exactly one customer. |
| **Primary contact point** | The one contact point per channel type used by default for outbound. Exactly one per channel type, or none. |
| **Membership** | The link between a `person` and an `organisation`. A person may belong to at most one organisation. |
| **Segment** | An administrator-defined label used by routing and SLA rules. A customer may hold many. |
| **Entitlement** | The service level a customer is owed, derived from their contract. Read-only in this spec; sourced from the ERP per `[CLARIFY-1]` (resolved 2026-09-07 — the ERP is read-only reference) and displayed per spec `011` `FR-005`. |
| **Interaction** | Any recorded contact — a ticket message on any channel, a logged call, a portal action. Owned by spec `003`; displayed here. |
| **Internal note** | Free text on the customer record, never visible to the customer, never included in any export the customer receives. |
| **Consent** | A recorded permission to contact this customer on a given channel for a given purpose, with a timestamp and a source. |
| **Merge** | Combining two customer records into one surviving record, preserving all history from both. Irreversible. |
| **Erasure** | Replacing identifying attributes with non-identifying placeholders while preserving aggregate counts. Not deletion of rows. |

## 3. Key entities

### Customer
The identity everything else attaches to. Created by an agent, by import, by
portal registration, or by inbound identity resolution (spec `003`). Lives
forever; is never deleted, only erased or merged away.

| Attribute | Type | Rules |
|---|---|---|
| `type` | `person` \| `organisation` | Required, immutable after creation |
| `display_name` | text | Required, 2–200 chars |
| `national_id` | text | Optional, unique when present |
| `account_ref` | text | Optional, unique when present. The ERP join key — that role survives `[CLARIFY-2]`'s closure as malformed, and the join itself is owned by spec `011` `[CLARIFY-5]`, not here |
| `preferred_language` | `ar` \| `en` | Required, defaults to the language of the channel that created the record |
| `preferred_channel` | channel type | Optional |
| `organisation_id` | ref Customer | Only when `type = person`; target must be `type = organisation` |
| `segments` | set of ref Segment | May be empty |
| `sensitive_flag` | boolean | Defaults false |
| `branch_id`, `department_id` | ref | Required; the scope predicate for constitution IV |
| `status` | `active` \| `merged` \| `erased` | System-managed |
| `merged_into` | ref Customer | Set only when `status = merged` |

### Contact point

| Attribute | Type | Rules |
|---|---|---|
| `customer_id` | ref Customer | Required |
| `channel_type` | `phone` \| `email` \| `whatsapp` | Required |
| `value` | text | Required; normalised (E.164 for phone and WhatsApp, lowercased for email) |
| `is_primary` | boolean | At most one true per `(customer_id, channel_type)` |
| `verified_at` | timestamp | Null until verified |

### Consent record

| Attribute | Type | Rules |
|---|---|---|
| `customer_id` | ref Customer | Required |
| `channel_type` | channel type | Required |
| `purpose` | `service` \| `notification` \| `marketing` | Required |
| `granted` | boolean | Required |
| `source` | text | Required — where the consent came from |
| `recorded_at` | timestamp | Required, immutable |

Consent records are append-only. Withdrawing consent writes a new record with
`granted = false`; it never edits the previous one.

### Custom field definition, Segment, Attachment, Internal note, Field-history entry
Standard shapes; each carries `branch_id` and `department_id` for scoping, and
each mutation writes a field-history entry per constitution II.

## 4. Acceptance scenarios

### AS-01 — Create a customer mid-call
**Given** an agent with create permission in branch B
**When** they submit a display name and one contact point
**Then** a customer is created with `status = active` and `branch_id = B`
**And** `preferred_language` defaults to the agent's current interface language
**And** a field-history entry records creation with the actor and timestamp

### AS-02 — Search finds a customer by any identifier
**Given** a customer with name "Ahmed Hassan", phone `+201001234567`, email `a.hassan@example.com` and national ID `29001011234567`
**When** an agent searches any one of those four values, in whole or as a prefix of at least 3 characters
**Then** the customer appears in the results within the `NFR-001` time budget
**And** searching the phone number written as `01001234567` or `0100 123 4567` also finds them

### AS-03 — Search respects scope
**Given** a customer in branch B and an agent scoped only to branch C
**When** the agent searches for that customer by exact national ID
**Then** no result is returned
**And** the API refuses the record by ID with a not-found response, not a forbidden response

### AS-04 — Duplicate warning on create
**Given** an existing customer with phone `+201001234567`
**When** an agent begins creating a new customer with that same phone
**Then** the existing customer is shown before the record is saved
**And** the agent may open the existing record, or proceed and create a second record
**And** proceeding records the override in field history

### AS-05 — Merge preserves everything
**Given** customer X with 4 tickets and 2 attachments, and customer Y with 3 tickets and 1 internal note
**When** a team lead merges Y into X
**Then** X holds 7 tickets, 3 attachments and all notes from both
**And** Y has `status = merged` and `merged_into = X`
**And** requesting Y by ID resolves to X
**And** every contact point from Y exists on X, with `is_primary` from X preserved
**And** the merge is written to the history of both records with the actor

### AS-06 — Internal notes never leave
**Given** a customer with an internal note
**When** the customer views their profile in the portal, or requests a data export
**Then** the internal note does not appear in either

### AS-07 — Consent gates outbound
**Given** a customer with a consent record of `granted = false` for `whatsapp` / `notification`
**When** an agent attempts to send a WhatsApp notification
**Then** the send is refused with an explanation naming the missing consent
**And** a `service` reply to an open ticket is still permitted `[CLARIFY-5]`

### AS-08 — Erasure preserves counts
**Given** an erased customer who previously had 12 tickets
**When** a manager runs a volume report covering that period
**Then** the 12 tickets are still counted
**And** the customer appears as a non-identifying placeholder
**And** no contact point, attachment or free-text note remains readable

### AS-09 — Bilingual record
**Given** a customer whose `preferred_language` is `ar`
**When** any automated message is generated for them
**Then** it is rendered in Arabic
**And** an agent viewing the record in English still sees English field labels

### AS-10 — Import reports rather than guesses
**Given** an import file of 1,000 rows where 12 have malformed phone numbers and 3 duplicate an existing national ID
**When** an administrator runs the import
**Then** 985 records are created
**And** an error report names each of the 15 rejected rows, its row number and its reason
**And** no partial customer is created for any rejected row

## 5. Functional requirements

| ID | Requirement | Level | Traces |
|---|---|---|---|
| `FR-001` | An agent MUST be able to create a customer from a display name plus at least one contact point; all other attributes MUST be optional. | MUST | `CM-01` |
| `FR-002` | Search MUST match on display name, any contact point value, national ID and account reference; MUST accept prefixes of 3+ characters; and MUST normalise phone input so local and international forms match the same record. | MUST | `CM-02` |
| `FR-003` | The customer view MUST present identity, all contact points, organisation, segments, entitlement, preferred language and tags without navigation away from the initial screen. | MUST | `CM-03` |
| `FR-004` | A customer MUST support unlimited contact points across `phone`, `email` and `whatsapp`. Each value MUST be **unique per channel type by default**: a collision with another active customer MUST surface that customer before saving and MUST require an explicit confirmation, which MUST be recorded in field history. It MUST NOT block creation. A value confirmed against a collision is a **shared contact point**, and `E-15` governs outbound on it. *(Amended 2026-09-07 by Mohamed Sadek (developer, acting as decision authority) — was an unconditional uniqueness constraint, which made a household or a switchboard unrepresentable. The amended form matches the posture `FR-010` and `AS-04` already take.)* | MUST | `CM-04` |
| `FR-005` | At most one contact point per channel type MAY be `is_primary`; outbound messaging MUST default to the primary, and to `preferred_language` for content. | SHOULD | `CM-05` |
| `FR-006` | The record MUST display a single reverse-chronological interaction history spanning all channels and all tickets, including logged calls and portal actions. | MUST | `CM-06` |
| `FR-007` | Interaction history MUST be filterable by channel type, date range and ticket. | SHOULD | `CM-07` |
| `FR-008` | Internal notes MUST be excluded from every customer-visible surface and from every customer-requested export. | MUST | `CM-08` |
| `FR-009` | Attachments MUST be storable against the customer independently of any ticket, subject to the type and size limits in spec `010`. | MUST | `CM-09` |
| `FR-010` | On create, the system MUST detect an existing customer matching on any contact point value, national ID or account reference, and MUST present it before saving. It MUST NOT block creation. | SHOULD | `CM-10` |
| `FR-011` | Merge MUST move all tickets, interactions, attachments, notes, consent records and contact points to the surviving record; MUST leave the merged record resolvable to the survivor; and MUST be irreversible. | SHOULD | `CM-11` |
| `FR-012` | A `person` MAY belong to at most one `organisation`; the organisation view MUST list every ticket raised by every member. | SHOULD | `CM-12` |
| `FR-013` | Administrators MUST be able to define segments; a customer MAY hold many; segments MUST be selectable as conditions in spec `005` rules. | SHOULD | `CM-13` |
| `FR-014` | The record MUST display current entitlement and SLA tier as read-only, sourced per `[CLARIFY-1]`, and MUST show explicitly when entitlement could not be resolved. | SHOULD | `CM-14` |
| `FR-015` | The record MAY display open ticket count, lifetime ticket count, mean satisfaction and last contact date. | MAY | `CM-15` |
| `FR-016` | A customer MAY be flagged sensitive; the flag MUST be visible on every surface where the customer's name appears to staff. | MAY | `CM-16` |
| `FR-017` | A signed-in customer MUST be able to edit their own contact points and preferred language and channel via the portal; each edit MUST write a field-history entry attributed to the customer. | SHOULD | `CM-17` |
| `FR-018` | Administrators MUST be able to define custom fields (text, number, date, single-select, multi-select, boolean) with optional required flags, and MUST supply an Arabic and an English label for each. | SHOULD | `CM-18`, constitution I |
| `FR-019` | Bulk import MUST validate every row before committing any, MUST create only valid rows, and MUST return a per-row error report naming row number and reason. | MUST | `CM-19` |
| `FR-020` | Every field mutation MUST write a history entry carrying actor, timestamp, field, before value and after value, per constitution II. History MUST be append-only. | MUST | `CM-20` |
| `FR-021` | Erasure MUST replace all identifying attributes, contact points, attachments and free text with non-identifying placeholders while preserving ticket and interaction counts for reporting. | SHOULD | `CM-21` |
| `FR-022` | Consent MUST be recorded per channel type and purpose, append-only with source and timestamp; outbound sends MUST be refused where consent for that channel and purpose is absent or withdrawn. | SHOULD | `CM-22` |
| `FR-023` | Every read and write MUST apply the caller's branch and department scope server-side; out-of-scope records MUST be indistinguishable from non-existent ones. | MUST | constitution IV |

## 6. Edge cases and failure behaviour

| # | Situation | Required behaviour |
|---|---|---|
| E-01 | Two agents create the same customer within seconds | Both records are created; duplicate detection surfaces them to whoever opens either next. No silent auto-merge. |
| E-02 | Merge is attempted on a record already merged | Refused, naming the surviving record. |
| E-03 | Merge target and source are in different branches | Refused unless the actor is scoped to both. |
| E-04 | Circular organisation membership (A belongs to B, B to A) | Refused at write time. |
| E-05 | Contact point value already belongs to another active customer | **Not refused — surfaced.** The existing customer is shown before saving, named if the actor is scoped to see it and unnamed otherwise (so scope is never disclosed, per constitution IV and spec `010` §8). Proceeding requires an explicit confirmation and writes a field-history entry recording the override and the record that was shown. The value then exists as a shared contact point on both customers. *(Amended 2026-09-07 by Mohamed Sadek (developer, acting as decision authority) — previously an unconditional refusal.)* |
| E-06 | Phone number in an unrecognised format | Stored as entered, flagged unnormalised, excluded from normalised matching, surfaced in a data-quality list. |
| E-07 | Entitlement lookup times out | The record renders; the entitlement panel shows "unavailable", not a blank or a stale value. |
| E-08 | Import file exceeds the row limit | Refused before processing, naming the limit. |
| E-09 | Import contains a column matching no field | Refused with the unrecognised column named; nothing is imported. |
| E-10 | Erasure requested for a customer with an open ticket | Refused until tickets are closed, or performed with the ticket anonymised per `[CLARIFY-4]`. |
| E-11 | Custom field is deleted while records hold values | Values are retained and readable; the field is marked retired and not offered for new entry. |
| E-12 | Customer edits their contact point to one owned by another customer | Refused with a neutral message that does not disclose the other customer's existence. |
| E-13 | Search term is a single character or empty | No search runs; no error. |
| E-14 | Attachment fails virus scanning | Rejected, not stored, and the attempt recorded in history. |
| E-15 | **Outbound send on a shared contact point** | **REFUSED. Fail closed.** A shared contact point carries the consent state of two or more customers, and `FR-022` records consent per customer, per channel type, per purpose. Sending under one customer's consent would send to the others without theirs. Until `[CLARIFY-5]` (whether a service reply is exempt from consent) is answered, outbound on a shared contact point MUST be refused, naming the sharing as the reason. It MUST NOT fall back to the first, the primary, or the most recently confirmed customer's consent. *(Added 2026-09-07 by Mohamed Sadek (developer, acting as decision authority) as a required consequence of amending `FR-004` — see decisions-pending §11.)* |

## 7. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| `NFR-001` | Customer search returns | ≤ 1s at p95, at the volume agreed in spec `013` |
| `NFR-002` | Full customer view including history renders | ≤ 2s at p95 |
| `NFR-003` | Interaction history pages rather than loading whole | ≥ 50 items per page |
| `NFR-004` | Bulk import throughput | ≥ 10,000 rows per run, progress visible |

## 8. Bilingual and localisation requirements

| Surface | Arabic | English | RTL notes |
|---|---|---|---|
| Field labels | Required | Required | Labels right-aligned; the form mirrors entirely |
| Segment names | Required | Required | Authored per language by admin |
| Custom field labels | Required | Required | `FR-018` enforces both at definition time |
| Internal notes | Free — either language | Free | Direction detected per note, not per interface |
| Names | Stored as entered; no transliteration | — | Latin and Arabic names must render correctly in one list |
| Phone numbers | Always LTR, even in an RTL layout | Always LTR | A number must never be visually reversed |
| Dates | Gregorian; Hijri display per `[CLARIFY]` in spec `012` | Gregorian | — |
| Error messages | Required | Required | — |

## 9. Permissions

| Action | CUST | AGT | LEAD | MGR | KBA | ADM | AUD |
|---|---|---|---|---|---|---|---|
| Search / view customer (in scope) | own only | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| Create customer | self-register | ✓ | ✓ | ✓ | — | ✓ | — |
| Edit identity fields | own contacts only | ✓ | ✓ | ✓ | — | ✓ | — |
| Read internal notes | — | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| Write internal notes | — | ✓ | ✓ | ✓ | — | ✓ | — |
| Attach / remove files | own only | ✓ | ✓ | ✓ | — | ✓ | — |
| Merge customers | — | — | ✓ | ✓ | — | ✓ | — |
| Assign segments | — | — | ✓ | ✓ | — | ✓ | — |
| Define custom fields / segments | — | — | — | — | — | ✓ | — |
| Bulk import | — | — | — | — | — | ✓ | — |
| Export customer list | — | — | ✓ | ✓ | — | ✓ | ✓ |
| Erase / anonymise | request | — | — | — | — | ✓ | ✓ |
| Read field history | — | ✓ | ✓ | ✓ | — | ✓ | ✓ |

Every row is enforced server-side per constitution IV. Export is separately
permissioned because it removes data from the audit boundary.

## 10. Audit requirements

| Event | Recorded fields |
|---|---|
| Customer created | actor, timestamp, source (`ui` / `import` / `portal` / `inbound`), initial values, branch, department |
| Field changed | actor, timestamp, field, before, after |
| Contact point added / removed / made primary | actor, timestamp, channel type, value, previous primary |
| Internal note written / removed | actor, timestamp, note id (body not duplicated into history) |
| Attachment added / removed | actor, timestamp, filename, size, scan result |
| Duplicate warning overridden | actor, timestamp, the record that was shown and dismissed |
| Merge performed | actor, timestamp, surviving id, merged id, counts moved per entity type |
| Segment assigned / removed | actor, timestamp, segment |
| Consent recorded | actor or customer, timestamp, channel, purpose, granted, source |
| Erasure performed | actor, timestamp, legal basis, requester, fields cleared |
| Export performed | actor, timestamp, row count, filter applied, destination |
| Customer viewed | actor, timestamp, customer id — **only when `sensitive_flag` is set** |

## 11. Contracts

Shape only; detail in [`contracts/`](./contracts/).

| Operation | Purpose | Scope predicate |
|---|---|---|
| `search customers` | Typeahead and full search | caller branch ∈ scope AND department ∈ scope |
| `get customer` | Full record with entitlement | same; out-of-scope returns not-found |
| `create customer` | New record | writes caller's branch and department |
| `update customer` | Field edits | same, plus per-field permission |
| `list interactions` | Paged history | inherits customer scope |
| `add / remove contact point` | Contact management | inherits customer scope |
| `check duplicates` | Pre-save probe | returns only in-scope matches; out-of-scope collisions return "unavailable", never the record |
| `merge customers` | Combine two records | caller scoped to **both** |
| `write / list internal note` | Internal context | staff only; never on any customer-facing contract |
| `record consent` | Append consent | inherits customer scope |
| `erase customer` | Lawful erasure | admin or auditor only |
| `import customers` | Bulk create | admin only; writes caller's branch unless the file names one in scope |
| `list field history` | Audit view | inherits customer scope |

## 12. Clarifications needed

- [x] `[CLARIFY-1]` **Who owns customer master data — the CRM or the ERP?** If the ERP owns it, `FR-001` and `FR-017` become read-only for synced fields and this spec changes materially. — *blocks* `FR-014`, `FR-019`, and spec `011` `FR-006` — *ask* client IT + operations
  - **RESOLVED 2026-09-07 — decided by Mohamed Sadek (developer, acting as decision authority). Not a client answer; there is no client review on this decision.** **The CRM is the system of record for customer master data. The ERP is read-only reference.** `account_ref` stays **optional**; there are no CRM→ERP writes; `011 FR-005` displays ERP contract, invoice and order facts; `011 FR-007` raises a *request* and posts nothing.
  - **Evidence this rests on.** `001` §3 marks `account_ref` *"Optional ... the ERP join key"*; `011 E-03` makes an absent join key a normal state (*"Panel states not linked"*); `011` §9 makes linking a deliberate `LEAD`+ action; `001` §13 measures *"Migration completeness | Count vs. ERP active customers"* — a one-time pull; `stories/001 CM-19` (**Must**) says *"import ... from Excel or the ERP"*.
  - **Consequences, recorded so they are not discovered later.** `stories/011 INT-06` (**Should**) is **downgraded** from a two-way sync under conflict rules to a divergence *report*. `011 E-10` (sync loop) is **N/A by construction** — no loop is reachable when nothing is written. Both are annotated in spec `011`.
  - **Residual risk accepted.** If the client's staff in fact maintain customers in the ERP, the CRM copy will drift and `011`'s *"Master data divergence ... under 0.5%"* becomes a report to read rather than a mechanism that prevents it. Revisitable as option A3 (an inbound feed that proposes and a human accepts) without rework. See [`docs/decisions-pending.md`](../../docs/decisions-pending.md) §0.
- [x] `[CLARIFY-2]` Which attribute is the unique identity key: phone, email, national ID, or ERP account reference? Duplicate detection and the ERP join both depend on it. — *blocks* `FR-002`, `FR-010` — *ask* client operations
  - **CLOSED AS MALFORMED 2026-09-07 — decided by Mohamed Sadek (developer, acting as decision authority).** **There is no single unique identity key, and this spec never had one.** §3 marks `national_id` and `account_ref` both *"Optional, unique when present"*, and `FR-001` (**MUST**) requires only *"a display name plus at least one contact point"* — so the only identifier the model guarantees is a contact point. None of the four candidates can be the key as modelled.
  - **THE REPLACEMENT.** The question conflated three jobs. They are separated:
    1. **Internal identity** — the record's own immutable identifier. Never displayed, never business-meaningful.
    2. **Match keys — a ranked list, not one key** — used by `FR-010` duplicate detection and spec `003` inbound identity resolution, in order: normalised E.164 phone → lowercased email → `national_id` → `account_ref`. Each is unique when present (§3) or unique per channel type (`FR-004`).
    3. **The ERP join key** — `account_ref`. A separate concern, owned by `011 [CLARIFY-5]`, not by this marker.
  - **This needed no new requirement.** `FR-002`, `FR-004` and `FR-010` already describe ranked matching; the replacement names what the spec already said.
  - **It also dissolves an internal contradiction.** `FR-010` (*"MUST NOT block creation"*) and `E-01` (*"No silent auto-merge"*) are incoherent alongside a canonical key and coherent alongside ranked matching. The contradiction was in the question, not the spec.
  - **Still open, and NOT closed by this:** the tie-break order when two candidates match on different keys (low cost, configurable); and whether `national_id` is **required** for `type = person`, which is an operational and legal fact entangled with `[CLARIFY-4]`.
- [ ] `[CLARIFY-3]` Are individuals and organisations one entity with a type flag, or two distinct entities? This spec assumes one. — *blocks* `FR-012` — *ask* client operations
- [ ] `[CLARIFY-4]` Which data-protection regime applies, what is the retention period per record type, and may a customer with open tickets be erased? — *blocks* `FR-021`, `E-10` — *ask* client legal
- [ ] `[CLARIFY-5]` Is a service reply to an open ticket exempt from consent, or does consent gate all outbound including replies? — *blocks* `FR-022`, `AS-07` — *ask* client legal

## 13. Success metrics

| Metric | Source | Target |
|---|---|---|
| Time to identify a caller | Agent timing study | < 10s |
| Duplicate rate among active customers | Fuzzy match on contact points | < 2% |
| Repeat-question complaints | CSAT free-text coding | halved in one quarter |
| Migration completeness | Count vs. ERP active customers | 100% at go-live |
| Records readable outside their scope | Penetration test | 0 |

## 14. Review checklist

- [x] No implementation detail (no schema, framework, library, endpoint path)
- [x] Every requirement is testable and uses MUST / SHOULD / MAY
- [x] No unfailable adjectives
- [x] Every requirement traces to a story ID or a constitution principle
- [x] Every acceptance scenario has a matching requirement, and vice versa
- [x] Edge cases cover empty, duplicate, concurrent, hostile and out-of-order input
- [x] Bilingual requirements stated for every user-visible surface
- [x] Permission matrix complete for every action
- [x] Audit entries defined for every mutation
- [ ] **Zero `[NEEDS CLARIFICATION]` markers remaining — 3 open (`[CLARIFY-3]` `[CLARIFY-4]` `[CLARIFY-5]`); `[CLARIFY-1]` and `[CLARIFY-2]` RESOLVED 2026-09-07 by Mohamed Sadek (developer, acting as decision authority). Resolved markers are marked `[x]` and retained rather than deleted, so the decision and its basis stay attributable (constitution II). Count unresolved with `grep -rn '^- \[ \] `\[CLARIFY-' specs/`.**
- [x] Constitution gates satisfied and named

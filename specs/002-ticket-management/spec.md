# Spec 002 — Ticket Management

> **المفروض الحاجة دي تشتغل إزاي بالظبط؟**

| | |
|---|---|
| **Number** | `002` |
| **Story** | [`stories/002-ticket-management/story.md`](../../stories/002-ticket-management/story.md) |
| **Status** | Draft — clarifying |
| **Constitution gates** | II (attributable), III (SLA clock), IV (server-side scope), VI (one thread), VII (testable) |
| **Blocking clarifications** | 1 open (`[CLARIFY-6]`) · 5 RESOLVED 2026-09-07 by Mohamed Sadek (developer, acting as decision authority) |

---

## 1. Scope

**In scope.** The ticket as a unit of work: identity and reference, the status
lifecycle and its legal transitions, categorisation and custom fields, priority,
assignment and escalation, the message thread and internal notes, attachments,
linking, merging and splitting, sub-tasks, tags, follow-up and reopening, search,
resolution coding, and the immutable history that records all of it.

**Out of scope.**

- The SLA clock, escalation *timing* and auto-assignment *rules* — spec `005`.
  This spec defines the status list and each status's `pauses_sla` flag; it never
  computes elapsed time (constitution III)
- Channel intake and inbound threading — spec `003`
- The agent-facing presentation of queues and counters — spec `004`
- AI summarisation, categorisation and duplicate detection — spec `007`
- Reporting and aggregation — spec `009`
- Approval workflows — spec `005`

## 2. Domain language

| Term | Means exactly |
|---|---|
| **Ticket** | One customer need, tracked to a conclusion. Has exactly one customer, one owning team, and at most one assigned agent. |
| **Reference** | The short human-quotable identifier. Immutable, never reused, survives merge. |
| **Status** | The ticket's position in its lifecycle. Exactly one at a time. Each status carries a `pauses_sla` flag and a `terminal` flag. |
| **Transition** | A permitted move from one status to another. A move not defined as a transition is refused. |
| **Category** | A node in the classification tree. A ticket references exactly one *leaf* node. |
| **Priority** | An ordinal urgency, set manually or derived by rule. The derivation source is always recorded. |
| **Owning team** | The team accountable for the ticket. Always set. Distinct from the assigned agent, which may be empty. |
| **Reply** | A message on the ticket visible to the customer. Delivered on a channel (spec `003`). |
| **Internal note** | A message on the ticket never visible to the customer and never delivered on any channel. |
| **Link** | A typed relationship between two tickets: `duplicate_of`, `related_to`, `blocks` / `blocked_by`. |
| **Merge** | Folding ticket B into ticket A. B becomes terminal with status `merged`; its messages appear in A's thread in true chronological order. |
| **Split** | Creating a child ticket from selected messages of a parent. Both continue independently with their own SLA. |
| **Sub-task** | A unit of work on a ticket, assignable to a different team, which does not have its own SLA and cannot be a customer-visible thread. |
| **Resolution** | The state in which we believe the need is met. Not yet `closed`. (`[CLARIFY-2]` resolved 2026-09-07: closure is on explicit customer confirmation only; there is no automatic close until spec `005` unblocks.) |
| **Closure** | Terminal. No further work. Reopening creates a transition out of closure within the reopen window, or a new ticket after it. |
| **Follow-up date** | A future date on a paused ticket, at which the system reminds or auto-closes. |

## 3. Key entities

### Ticket

| Attribute | Type | Rules |
|---|---|---|
| `reference` | text | Required, unique, immutable, never reused. Format `TKT-YYYY-NNNNN` — 5 digits, sequence resets annually, no branch or department encoded (`[CLARIFY-3]`, resolved) |
| `customer_id` | ref Customer | Required |
| `ticket_type` | ref TicketType | Required; determines the field set and the workflow |
| `category_id` | ref Category | Required at creation; MUST be a leaf node |
| `priority` | ordinal | Required; carries `priority_source` = `manual` \| `category_default` \| `rule` \| `ai` |
| `status` | ref Status | Required; only reachable via a defined transition |
| `owning_team_id` | ref Team | Required |
| `assigned_agent_id` | ref User | Optional; empty means queued |
| `branch_id`, `department_id` | ref | Required; the scope predicate (constitution IV) |
| `subject` | text | Required, 3–300 chars |
| `tags` | set of text | May be empty |
| `follow_up_at` | timestamp | Only valid while status has `pauses_sla` |
| `root_cause`, `resolution_code` | ref | Required on transition to resolved, per `FR-029` |
| `merged_into` | ref Ticket | Set only when `status = merged` |
| `parent_ticket_id` | ref Ticket | Set on a ticket created by split |
| `custom_field_values` | map | Validated against the category and type definitions |

### Status (administrator-defined)

| Attribute | Type | Rules |
|---|---|---|
| `key` | text | Unique, immutable once used by any ticket |
| `label_ar`, `label_en` | text | Both required (constitution I) |
| `pauses_sla` | boolean | Read by spec `005`; this spec never interprets it |
| `terminal` | boolean | Terminal statuses accept no reply and no assignment |
| `requires_resolution_fields` | boolean | Gates `FR-029` |

The status set below is **RATIFIED IN FULL** — both the keys and the
`pauses_sla` column (2026-09-07, Mohamed Sadek (developer, acting as decision authority)). It remains administrator-editable per
`FR-007` and `FR-008`, so a correction to a *label* or an *addition* to the set
is configuration, not code.

**The `pauses_sla` column was ratified separately and deliberately**, because it
is the one column that cannot be corrected after go-live: spec `005` computes
every clock against it and `005 FR-021` makes the pause ledger append-only, so a
flag changed later cannot be applied retroactively and periods spanning the
change are not comparable.

**The governing question for the column is: while a ticket sits here, is the
customer waiting on us?** If yes the clock runs, because we are consuming the
promise. If the customer or a genuinely external party is the reason nothing
moves, the clock does not punish us for it.

**`pending_third_party` was split into two statuses on ratification.** The
original single status meant *"Waiting on a supplier or another department"*, and
those halves are not equivalent: a supplier is outside the organisation, while
another department is inside it. To a customer, *"waiting on our warehouse
team"* is not different from *"waiting on us"* — they contracted with the
company, not the department. `FR-019` already provides sub-tasks *"assignable to
a different team"* that explicitly carry no SLA of their own, which is the
correct home for internal work while the parent clock keeps running.

**Terminal statuses keep `—` rather than a boolean.** A terminal clock reaches
`met`, `breached` or `cancelled` (spec `005` §2); no pause flag applies. Writing
`no` there would assert "the clock runs" on a status where nothing should be
running, which is a defect waiting to be implemented.

| Key | pauses_sla | terminal | Meaning |
|---|---|---|---|
| `new` | no | no | Created, not yet owned by a person |
| `assigned` | no | no | Has an agent, work not started |
| `in_progress` | no | no | Being worked |
| `pending_customer` | **yes** | no | Waiting on the customer. We have asked and cannot proceed. **The only status open to abuse — see `FR-021` and the guard requirement in spec `009`** |
| `pending_supplier` | **yes** | no | Waiting on a party **outside** the organisation — a supplier, a courier, a bank. Genuinely beyond our control |
| `pending_internal` | **no** | no | Waiting on **another department or team inside** the organisation. The customer contracted with the company, so the clock keeps running. Cross-internal work belongs in a `FR-019` sub-task, which carries no SLA of its own |
| `resolved` | yes | no | We believe it is done. **The reopen window does NOT run from here** — it runs from `closed` (`FR-022`, `AS-11`; `[CLARIFY-4]` resolved) |
| `closed` | — | **yes** | Terminal |
| `merged` | — | **yes** | Folded into another ticket |
| `cancelled` | — | **yes** | Withdrawn before resolution |

### Message, Attachment, Link, Sub-task, History entry
Standard shapes. Every message carries `visibility` = `customer` \| `internal`,
an author (a user, a customer, or the system), a channel where applicable, and an
immutable timestamp. History entries follow constitution II.

## 4. Acceptance scenarios

### AS-01 — Minimal creation
**Given** an agent with create permission
**When** they submit customer, subject, description, category and priority
**Then** a ticket is created with a unique reference, `status = new`, and the owning team taken from the category default
**And** the creation is written to history with actor, source and initial values

### AS-02 — Reference is stable and unique
**Given** 1,000 tickets created concurrently across three branches
**When** all have been created
**Then** every reference is unique
**And** no reference is reused after a ticket is closed, merged or cancelled

### AS-03 — Illegal transition refused
**Given** a ticket with `status = closed`, where no transition from `closed` to `in_progress` is defined
**When** an agent attempts to set `in_progress`
**Then** the change is refused, naming the statuses that *are* reachable
**And** the ticket is unchanged and no history entry is written

### AS-04 — Category default applies but does not override
**Given** category "Billing / Refund" with default priority High and default team Finance Support
**When** an agent creates a ticket in that category without setting priority
**Then** priority is High with `priority_source = category_default` and the owning team is Finance Support
**And** when the agent instead sets priority Low explicitly, priority is Low with `priority_source = manual`

### AS-05 — Priority provenance is visible
**Given** a ticket whose priority was raised from Normal to Urgent by an automation rule
**When** an agent views the ticket
**Then** the priority shows as rule-derived and names the rule
**And** history records the before value, the after value and the rule identity

### AS-06 — Reassignment carries a reason
**Given** an assigned ticket
**When** a lead reassigns it to another agent
**Then** a reason is required and stored
**And** both the previous and new assignee are recorded in history
**And** the previous assignee is notified

### AS-07 — Internal notes never reach the customer
**Given** a ticket with three customer replies and two internal notes
**When** the customer views the ticket in the portal, or receives an email reply, or requests a transcript
**Then** they see three messages
**And** no internal note content appears in any of those three surfaces

### AS-08 — Merge preserves both conversations in true order
**Given** ticket A with messages at 09:00 and 11:00, and ticket B with messages at 10:00 and 12:00
**When** B is merged into A
**Then** A's thread reads 09:00, 10:00, 11:00, 12:00
**And** each message still shows the reference it originally arrived on
**And** B has `status = merged`, `merged_into = A`, and resolves to A when requested
**And** B's SLA measurement stops at the merge instant and B is excluded from open-backlog counts

### AS-09 — Split produces independent tickets
**Given** a ticket containing a billing question and an unrelated technical fault
**When** an agent splits the technical messages into a child ticket
**Then** the child has its own reference, its own category, its own SLA clock started at the split instant, and `parent_ticket_id` set
**And** the parent retains the billing messages and its original clock
**And** both appear in the customer's history as separate requests

### AS-10 — Pending with follow-up
**Given** an agent sets `pending_customer` with a follow-up date 3 working days ahead
**When** the customer does not reply and the date arrives
**Then** the configured action occurs — reminder or auto-close, per spec `005` `FR-014`
**And** if the customer replies before it, the status returns to `in_progress` and `follow_up_at` is cleared

### AS-11 — Customer reply reopens within the window
**Given** a ticket `closed` 5 days ago, with a reopen window of 14 days
**When** the customer replies
**Then** the ticket transitions out of closure to `in_progress`, retaining its reference
**And** given the same reply at day 20, a new ticket is created and linked `related_to` the closed one

### AS-12 — Collision detection
**Given** agent A is composing a reply on a ticket
**When** agent B opens the same ticket
**Then** B is shown that A is composing, with A's name
**And** the indicator clears within 30 seconds of A stopping

### AS-13 — Resolution coding is enforced
**Given** a status with `requires_resolution_fields = true`
**When** an agent transitions to it without a root cause and resolution code
**Then** the transition is refused naming the missing fields

### AS-14 — Search reaches attachment text
**Given** a closed ticket whose only mention of "invoice 4471" is inside an attached PDF
**When** an agent searches "4471"
**Then** the ticket is returned, with the attachment named as the match location
**And** a ticket outside the agent's scope containing the same term is not returned

### AS-15 — History is append-only
**Given** any ticket with history
**When** any user, including an administrator, attempts to edit or delete a history entry
**Then** the attempt is refused
**And** the attempt itself is recorded

## 5. Functional requirements

| ID | Requirement | Level | Traces |
|---|---|---|---|
| `FR-001` | A ticket MUST be creatable from customer, subject, description, category and priority alone; every other field MUST be optional or defaulted. | MUST | `TM-01` |
| `FR-002` | Every ticket MUST receive a unique, immutable, human-quotable reference at creation. References MUST NOT be reused. | MUST | `TM-02` |
| `FR-003` | The system MUST accept ticket creation from an external channel (spec `003`) with the same validation as manual creation, and MUST record the source. | MUST | `TM-03` |
| `FR-004` | Categories MUST form a tree; a ticket MUST reference a leaf node; non-leaf nodes MUST NOT be selectable. | MUST | `TM-04` |
| `FR-005` | Each category node MUST support a default priority, owning team and SLA policy, inherited by descendants unless overridden. Defaults MUST NOT override an explicit agent choice. | MUST | `TM-05` |
| `FR-006` | Priority MUST be settable manually and derivable by rule; the system MUST store and display `priority_source`, naming the rule where applicable. | MUST | `TM-06` |
| `FR-007` | A ticket MUST hold exactly one status from the administrator-defined set; each status MUST carry `pauses_sla` and `terminal` flags. | MUST | `TM-07` |
| `FR-008` | Administrators MUST be able to define statuses and the legal transitions between them. Any transition not defined MUST be refused with the reachable statuses named. | SHOULD | `TM-08` |
| `FR-009` | Assignment and reassignment MUST record actor, previous holder, new holder and a reason; reassignment MUST notify both parties. | MUST | `TM-09` |
| `FR-010` | An agent MUST be able to self-assign any unassigned ticket within their scope. | MUST | `TM-10` |
| `FR-011` | Bulk assign, close and retag MUST apply per-ticket permission and transition validation, MUST report per-ticket outcomes, and MUST NOT abort the batch on one failure. | SHOULD | `TM-11` |
| `FR-012` | Escalation MUST require a note, MUST record the escalation level reached, and MUST notify the escalation target defined in spec `005`. | MUST | `TM-12` |
| `FR-013` | Every mutation MUST write an append-only history entry with actor, timestamp, field, before and after. No user or role MAY edit or delete history. | MUST | `TM-13`, constitution II |
| `FR-014` | Messages MUST carry a `visibility` of `customer` or `internal`. Internal messages MUST NOT be delivered on any channel or appear on any customer-facing surface. | MUST | `TM-14` |
| `FR-015` | Attachments MUST be addable to a ticket and to individual messages, subject to spec `010` scanning and limits, and MUST be included in search indexing where the format permits text extraction. | MUST | `TM-15` |
| `FR-016` | Tickets MUST be linkable with types `duplicate_of`, `related_to`, `blocks` and `blocked_by`. Links MUST be symmetrical where the type implies it, and MUST NOT form a cycle for `blocks`. | SHOULD | `TM-16` |
| `FR-017` | Merge MUST interleave both threads in true chronological order, preserve each message's originating reference, mark the source `merged`, resolve the source reference to the survivor, and stop the source's SLA measurement at the merge instant. | SHOULD | `TM-17` |
| `FR-018` | Split MUST create a child ticket from selected messages with its own reference, category, SLA clock started at the split instant, and a `parent_ticket_id`. | MAY | `TM-18` |
| `FR-019` | Sub-tasks MUST be creatable on a ticket, assignable to a different team, and MUST NOT carry their own SLA or be visible to the customer. A ticket MUST NOT reach a terminal status with an open sub-task. | SHOULD | `TM-19` |
| `FR-020` | Tags MUST be free text, reusable across tickets, and available as a report dimension in spec `009`. | SHOULD | `TM-20` |
| `FR-021` | A follow-up date MUST be settable only on a status where `pauses_sla` is true, and MUST be cleared automatically when the customer replies. | SHOULD | `TM-21` |
| `FR-022` | A customer reply within the configured reopen window MUST transition the ticket out of closure retaining its reference. Beyond the window it MUST create a new ticket linked `related_to` the original. | MUST | `TM-22` |
| `FR-023` | An agent MAY snooze a ticket to a future time; a snoozed ticket MUST remain in reports and MUST NOT pause the SLA clock. | MAY | `TM-23` |
| `FR-024` | The system MUST indicate to other agents when a colleague is composing a reply on the same ticket, naming them, and MUST clear the indicator within 30 seconds of inactivity. | SHOULD | `TM-24` |
| `FR-025` | Administrators MUST be able to define custom fields per category and per ticket type, with Arabic and English labels, optional required flags, and validation. Required custom fields MUST be enforced on the transition that requires them, not at creation. | SHOULD | `TM-25`, constitution I |
| `FR-026` | Agents MUST be able to save filters as named views and share them with a team; a shared view MUST still apply the viewer's own scope, never the author's. | SHOULD | `TM-26`, constitution IV |
| `FR-027` | Search MUST cover subject, message bodies, tags, reference, customer identity and extractable attachment text, MUST support both Arabic and English including diacritic-insensitive Arabic matching, and MUST apply the caller's scope. | MUST | `TM-27` |
| `FR-028` | Time MAY be logged against a ticket by an agent, per entry with a duration and an optional note. | MAY | `TM-28` |
| `FR-029` | Where a status has `requires_resolution_fields`, transition to it MUST be refused without a root cause and a resolution code from the administrator-defined lists. | SHOULD | `TM-29` |
| `FR-030` | An agent MUST be able to create a knowledge base draft from a ticket, pre-filled with the resolution, entering the spec `006` review workflow. The draft MUST NOT be published automatically. | SHOULD | `TM-30` |
| `FR-031` | Transition from `resolved` to `closed` MUST occur on explicit customer confirmation, or automatically after the configured grace period, per `[CLARIFY-2]`. | SHOULD | `TM-31` |
| `FR-032` | Administrators MUST be able to define ticket types, each with its own field set, category subtree and permitted status set. | SHOULD | `TM-32` |
| `FR-033` | Every read and write MUST apply the caller's branch, department and team scope server-side. | MUST | constitution IV |
| `FR-034` | This spec MUST NOT compute elapsed time, remaining time or breach state. All such values MUST be read from the spec `005` engine. | MUST | constitution III |

## 6. Edge cases and failure behaviour

| # | Situation | Required behaviour |
|---|---|---|
| E-01 | Two agents reply simultaneously | Both replies are stored and both are sent. Collision detection warns; it does not lock. Ordering is by server receipt time. |
| E-02 | Customer replies while the agent is mid-composition | The customer message is inserted; the agent's draft survives and is flagged as possibly stale. |
| E-03 | Merge target is already merged | Refused, naming the ultimate survivor. |
| E-04 | Circular merge (A into B, B into A) | Second merge refused. |
| E-05 | Merge across branches or departments | Refused unless the actor is scoped to both; the resulting ticket keeps the survivor's scope. |
| E-06 | Category is retired while tickets reference it | Existing tickets keep it and remain reportable; it is not offered for new tickets or as a move target. |
| E-07 | Category moved in the tree | Existing tickets keep the leaf reference; historical reports MUST reflect the tree as it was at ticket creation. |
| E-08 | Transition to terminal with an open sub-task | Refused, naming the open sub-tasks. |
| E-09 | Reply arrives on a merged ticket's reference | Appended to the surviving ticket. |
| E-10 | Reply arrives on a cancelled ticket | A new ticket is created, linked `related_to` the cancelled one. |
| E-11 | Follow-up date set on a non-pausing status | Refused. |
| E-12 | Assigned agent is deactivated | The ticket returns to the owning team queue as unassigned and the team lead is notified. History records the cause as deactivation, not as a reassignment by a person. |
| E-13 | Required custom field added after tickets exist | Existing tickets are not retroactively invalid; the field is enforced only on the next transition that requires it. |
| E-14 | Attachment format yields no extractable text | Stored and searchable by filename only; not an error. |
| E-15 | Bulk action where the actor lacks permission on some tickets | Permitted tickets are processed; refused ones are reported per ticket with a reason. |
| E-16 | Reference collision under concurrent creation | Impossible by construction; if detected, creation retries and the incident is logged as a defect. |
| E-17 | Split leaving the parent with no messages | Refused; a parent must retain at least one message. |
| E-18 | Search term matches only out-of-scope tickets | Zero results. No count, no hint that matches exist elsewhere. |
| E-19 | Reopen window elapses between the customer sending and the message arriving | Evaluated against the send timestamp, not the receipt timestamp. |

## 7. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| `NFR-001` | Ticket list with filters returns | ≤ 2s at p95 at agreed volume (spec `013`) |
| `NFR-002` | Full-text search returns | ≤ 3s at p95 |
| `NFR-003` | Ticket detail with full thread renders | ≤ 2s at p95; thread pages beyond 50 messages |
| `NFR-004` | Bulk action capacity | ≥ 500 tickets per action, progress reported |
| `NFR-005` | History retention | Full history retained for the life of the ticket, never truncated |

## 8. Bilingual and localisation requirements

| Surface | Arabic | English | RTL notes |
|---|---|---|---|
| Status labels | Required | Required | Authored per language; `key` stays language-neutral |
| Category names, at every level | Required | Required | Tree renders right-to-left in Arabic |
| Priority labels | Required | Required | Ordinal order preserved, not visually reversed |
| Ticket type and custom field labels | Required | Required | `FR-025` enforces both at definition |
| Root cause and resolution code lists | Required | Required | — |
| Subject and message bodies | Free — either, or mixed | Free | Direction detected per message; a mixed-direction thread must render each message correctly |
| Reference | Always LTR | Always LTR | Never visually reversed, even inside Arabic text |
| Tags | Free | Free | Search matches across scripts |
| Validation and refusal messages | Required | Required | Must name the specific field |
| Search | Diacritic-insensitive, alef and hamza variants equivalent | Case-insensitive | — |

## 9. Permissions

| Action | CUST | AGT | LEAD | MGR | ADM | AUD |
|---|---|---|---|---|---|---|
| View ticket (in scope) | own only | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create ticket | ✓ (portal) | ✓ | ✓ | ✓ | ✓ | — |
| Reply (customer-visible) | own only | ✓ | ✓ | ✓ | — | — |
| Read / write internal note | — | ✓ | ✓ | ✓ | ✓ | read only |
| Change status | limited¹ | ✓ | ✓ | ✓ | ✓ | — |
| Assign / self-assign | — | ✓ | ✓ | ✓ | ✓ | — |
| Reassign another agent's ticket | — | — | ✓ | ✓ | ✓ | — |
| Escalate | — | ✓ | ✓ | ✓ | — | — |
| Change category / priority | — | ✓ | ✓ | ✓ | ✓ | — |
| Link tickets | — | ✓ | ✓ | ✓ | ✓ | — |
| Merge | — | — | ✓ | ✓ | ✓ | — |
| Split | — | — | ✓ | ✓ | ✓ | — |
| Bulk actions | — | — | ✓ | ✓ | ✓ | — |
| Close | confirm only | ✓ | ✓ | ✓ | ✓ | — |
| Reopen | within window | ✓ | ✓ | ✓ | ✓ | — |
| Cancel | own, before resolution | — | ✓ | ✓ | ✓ | — |
| Define statuses / transitions / types / categories | — | — | — | — | ✓ | — |
| Log time | — | ✓ | ✓ | ✓ | — | — |
| Export ticket data | — | — | ✓ | ✓ | ✓ | ✓ |
| Read history | own, redacted² | ✓ | ✓ | ✓ | ✓ | ✓ |

¹ A customer may confirm resolution, reopen within the window, and cancel their
own ticket before resolution. Nothing else.
² A customer sees their own status changes; not internal notes, not assignment,
not the identity of individual agents beyond the replier per `[CLARIFY-6]`.

## 10. Audit requirements

| Event | Recorded fields |
|---|---|
| Ticket created | actor, timestamp, source (`ui` / `email` / `whatsapp` / `sms` / `chat` / `form` / `api` / `portal`), customer, category, priority, priority source, owning team, branch, department |
| Status changed | actor, timestamp, from, to, transition used, reason where required |
| Assigned / reassigned / unassigned | actor, timestamp, from agent, to agent, reason, cause (`manual` / `rule` / `deactivation`) |
| Escalated | actor, timestamp, level, target, note |
| Category / priority / type changed | actor, timestamp, before, after, source, rule identity where applicable |
| Custom field changed | actor, timestamp, field, before, after |
| Message added | author (user, customer or system), timestamp, visibility, channel, message id |
| Attachment added / removed | actor, timestamp, filename, size, scan result |
| Link created / removed | actor, timestamp, type, other ticket |
| Merged | actor, timestamp, survivor, source, message count moved |
| Split | actor, timestamp, parent, child, messages moved |
| Sub-task created / completed | actor, timestamp, team, outcome |
| Resolved | actor, timestamp, root cause, resolution code |
| Closed | actor or system, timestamp, cause (`customer_confirmed` / `grace_expired` / `agent` / `bulk`) |
| Reopened | actor or customer, timestamp, days since closure |
| Automation fired | rule identity, timestamp, condition matched, actions taken (constitution: `SLA-12`) |
| History edit attempted | actor, timestamp, target entry — always refused, always recorded |
| Ticket exported | actor, timestamp, ticket count, filter, destination |

## 11. Contracts

| Operation | Purpose | Scope predicate |
|---|---|---|
| `create ticket` | Manual, portal and channel creation | writes caller or customer branch and department |
| `get ticket` | Detail with paged thread | branch ∈ scope AND department ∈ scope AND (team ∈ scope OR role ≥ lead) |
| `list / filter tickets` | Queues, views, search | same; a shared view applies the *viewer's* scope |
| `search tickets` | Full text incl. attachments | same |
| `transition status` | Lifecycle move | validates against defined transitions and actor permission |
| `assign ticket` | Assign, reassign, unassign | reassignment of another agent's ticket requires lead |
| `escalate ticket` | Raise a level | note required |
| `add message` | Reply or internal note | internal note never exposed on any customer contract |
| `add / remove attachment` | Evidence | inherits ticket scope; scan gate applies |
| `link / unlink tickets` | Typed relationships | actor scoped to **both** |
| `merge tickets` | Fold B into A | actor scoped to **both** |
| `split ticket` | Create child | lead or above |
| `create / complete sub-task` | Cross-team work | target team need not be in the actor's scope |
| `bulk update` | Batch operations | per-ticket permission; per-ticket result |
| `set follow-up` | Pending management | status must have `pauses_sla` |
| `log time` | Effort capture | own tickets, or lead |
| `list history` | Audit view | inherits ticket scope; customer view is redacted |
| `create KB draft from ticket` | Knowledge capture | enters spec `006` workflow as draft |

## 12. Clarifications needed

- [x] `[CLARIFY-1]` **What is the exact status list, and which statuses pause the SLA clock?** The set in section 3 is a proposal. Every feature in specs `004`, `005`, `008` and `009` depends on the answer. — *blocks* `FR-007`, `FR-008`, and all of spec `005` — *ask* client operations
  - **RESOLVED IN FULL 2026-09-07 by Mohamed Sadek (developer, acting as decision authority). Both halves: the list and the `pauses_sla` flags.**
  - **The list — ten statuses**, being the original nine with `pending_third_party` split into `pending_supplier` and `pending_internal`. See §3. Administrator-editable per `FR-007`/`FR-008`.
  - **The flags, with the reasoning per status:**
    - `new` — **no.** No owner yet is the purest case of the customer waiting on us; it is what first-response SLA exists to measure. Pausing here would let an unstaffed queue look compliant.
    - `assigned` — **no.** A name on the ticket is internal progress. The customer cannot distinguish it from `new`, and neither should the clock.
    - `in_progress` — **no.** We work, they wait.
    - `pending_customer` — **yes.** We asked a question and cannot proceed. Reinforced by `FR-021`, which permits a follow-up date only where `pauses_sla` is true.
    - `pending_supplier` — **yes.** Outside the organisation and outside our control.
    - `pending_internal` — **no.** Inside the organisation. The customer contracted with the company, not the department. Internal handoffs belong in a `FR-019` sub-task, which carries no SLA.
    - `resolved` — **yes.** Spec `009` §2 already ends measurement here: *"Resolution time | Business duration from clock start to `resolved`"*. Running past it would measure the customer's response time as our delay. More important given `[CLARIFY-2]`'s no-auto-close resolution, since tickets may sit here indefinitely.
    - `closed` / `merged` / `cancelled` — **not applicable, recorded as `—`.** Terminal. The clock reaches `met`, `breached` or `cancelled` (spec `005` §2) and no pause flag applies. `FR-017` independently stops the source clock at the merge instant.
  - **A guard is owed, and is being written rather than assumed.** `pending_customer` can be abused: a token question parks a ticket and stops the clock. Nothing in this spec or spec `005` guards against it. A new requirement in spec `009` reports time-in-`pending_customer` as a share of handling time, per agent, per period, against a configurable threshold that flags rather than blocks. It originates from this review and has **no upstream story**, so a story is being written for it — constitution VIII is satisfied by writing it, not by pretending it existed.
  - **This unblocks `005 [CLARIFY-4]` and with it `005 FR-004`.** Spec `005` remains blocked overall on its own `[CLARIFY-1]` (the SLA numbers) and `[CLARIFY-2]` (the calendars).
- [x] `[CLARIFY-2]` **What does resolved mean versus closed, who decides, and what is the grace period?** Every quality metric in spec `009` depends on this. — *blocks* `FR-031`, `AS-11`, spec `009` `FR-007` — *ask* client operations
  - **RESOLVED 2026-09-07 by Mohamed Sadek (developer, acting as decision authority).** Two of the three questions were already answered by this spec; only the grace period was open.
  - **Already specified, not decided here.** *Meaning*: §2 — *"Resolution | The state in which we believe the need is met. Not yet `closed`"* / *"Closure | Terminal"*; §3 — `resolved` non-terminal, `closed` terminal. *Who decides*: `stories/002 TM-31` (**Should**) — *"closure only after I confirm or a grace period passes"* — and §9 footnote ¹, *"A customer may confirm resolution"*.
  - **Decided — the grace period: THERE IS NONE, for now.** Closure occurs on **explicit customer confirmation only**. No automatic close.
  - **Why.** `FR-031`'s alternative is *"automatically after the configured grace period"*, and a grace period stated in working days is a **business duration**, which constitution III requires be read from the spec `005` engine. `005 [CLARIFY-2]` (working hours and holidays per branch) is open, so the engine cannot supply it. The alternative — a wall-clock period presented where users expect business time — was rejected.
  - **Accepted consequence, recorded in `docs/trace.md`.** `009`'s reopen rate is *"Tickets reopened at least once ÷ tickets **closed** in the period"*. With no auto-close, that denominator is degenerate and **the metric must not be read as meaningful** until auto-close exists.
  - **`FR-031` is therefore HALF-COVERED**: the confirmation path is in scope, the grace-period path is deferred until spec `005` unblocks.
- [x] `[CLARIFY-3]` What is the reference format, and must it encode branch, department or year? This decides whether the reference is portable across a branch transfer. — *blocks* `FR-002` — *ask* client operations
  - **RESOLVED 2026-09-07 by Mohamed Sadek (developer, acting as decision authority).** Format **`TKT-YYYY-NNNNN`** — five digits, sequence resets annually, **no branch or department encoded**.
  - **This is a chosen format, NOT one the sources specify.** `FR-002` states only *"unique, immutable, human-quotable ... MUST NOT be reused"*. The single format appearing anywhere in the repository is `012 AS-04`'s illustration `TKT-2026-04471`, inside an unrelated RTL acceptance scenario. The choice is consistent with it; the sources did not make it.
  - **The one part that IS inferred from the text.** Omitting branch and department follows from `FR-002`'s *immutable* plus `AS-11`'s *"retaining its reference"*: a reference encoding a branch would become misleading after a cross-boundary transfer (`012 FR-009`).
  - **Note against `FR-002`'s "never reused":** an annual reset is safe only because the year is part of the reference. `TKT-2026-00001` and `TKT-2027-00001` are distinct.
- [x] `[CLARIFY-4]` How many days is the reopen window? — *blocks* `FR-022` — *ask* client operations
  - **RESOLVED 2026-09-07 by Mohamed Sadek (developer, acting as decision authority).** **14 calendar days, running from `closed`.**
  - **Chosen, not sourced.** No source states a length. `14` appears once, as an illustrative value in `AS-11`'s Given clause (*"a reopen window of 14 days"*). `stories/002 TM-22` (**Must**) says only *"a **recently** closed ticket"*. This is a ratified choice that happens to match an example.
  - **Calendar days, explicitly — not business days.** A business duration would have to come from the spec `005` engine (constitution III), which is blocked by `005 [CLARIFY-2]`. Calendar days are computable without it and are labelled as such wherever displayed.
  - **Runs from `closed`, resolving an internal contradiction.** §3 previously read *"reopen window open"* on the `resolved` row, while `FR-022` says *"out of closure"* and `AS-11` says *"a ticket `closed` 5 days ago"*. §3 has been amended to agree with `FR-022` and `AS-11`. The customer's total window is therefore confirmation-to-closure plus 14 days.
  - **Already specified, so not decided here:** `E-19` — the window is *"Evaluated against the **send** timestamp, not the receipt timestamp"*.
- [x] `[CLARIFY-5]` Is the category tree a fixed depth, and how deep? Variable depth complicates reporting rollups in spec `009`. — *blocks* `FR-004` — *ask* client operations
  - **RESOLVED 2026-09-07 by Mohamed Sadek (developer, acting as decision authority).** **Multi-level required; depth UNBOUNDED. Selection is leaf-only per `FR-004`. No depth validation is to be implemented.**
  - **Evidence.** `stories/002 TM-04` (**Must**): *"categorise down a **multi-level** tree"* — excludes depth 1. `FR-005` (**MUST**): *"inherited by **descendants**"* — implies ≥ 2 levels. `FR-004` (**MUST**): a ticket references a **leaf**; non-leaf nodes are not selectable.
  - **An earlier "fixed depth 3" is withdrawn as invented.** Nothing in any source supports three, or any other number.
  - **Accepted cost.** `009`'s reporting rollups must handle arbitrary depth. `E-07` already requires historical reports to *"reflect the tree as it was at ticket creation"*, so a depth-agnostic rollup was needed regardless.
- [ ] `[CLARIFY-6]` May a customer see which individual agent handled their ticket, or only the team? — *blocks* the customer history redaction in section 9 — *ask* client operations + HR

## 13. Success metrics

| Metric | Source | Target |
|---|---|---|
| Inbound requests logged as tickets | Ticket count vs. sampled inbox audit | > 95% within one month |
| Unassigned tickets at end of day | Assignment state | < 5 at any time |
| Ticket creation time, typed request | Agent timing study | < 45s |
| Mutations lacking a history entry | Reconciliation of history against change counts | 0 |
| Tickets closed with no resolution code | Field completeness | 0 where the status requires it |
| Duplicate tickets from one conversation | Merge count as a share of created | < 1% |

## 14. Review checklist

- [x] No implementation detail
- [x] Every requirement testable, using MUST / SHOULD / MAY
- [x] No unfailable adjectives
- [x] Every requirement traces to a story ID or constitution principle
- [x] Every acceptance scenario has a matching requirement, and vice versa
- [x] Edge cases cover empty, duplicate, concurrent, hostile and out-of-order input
- [x] Bilingual requirements stated for every user-visible surface
- [x] Permission matrix complete for every action
- [x] Audit entries defined for every mutation
- [x] Constitution III respected — this spec computes no durations (`FR-034`)
- [ ] **Zero `[NEEDS CLARIFICATION]` markers remaining — 1 open: `[CLARIFY-6]` (may a customer see the individual agent). `[CLARIFY-1]` through `[CLARIFY-5]` RESOLVED 2026-09-07 by Mohamed Sadek (developer, acting as decision authority). Resolved markers are marked `[x]` and retained rather than deleted per Governance, so each decision and its basis stay attributable (constitution II).**
- [x] Constitution gates satisfied and named

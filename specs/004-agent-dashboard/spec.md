# Spec 004 — Agent Dashboard

> **المفروض الحاجة دي تشتغل إزاي بالظبط؟**

| | |
|---|---|
| **Number** | `004` |
| **Story** | [`stories/004-agent-dashboard/story.md`](../../stories/004-agent-dashboard/story.md) |
| **Status** | Draft — clarifying |
| **Constitution gates** | I (bilingual), III (SLA clock is read, never computed), IV (server-side scope) |
| **Blocking clarifications** | 5 |

---

## 1. Scope

**In scope.** The agent workspace: the prioritised personal queue, workload
counters, the customer context panel, tasks and reminders, quick replies,
knowledge insertion, mentions and the internal discussion thread, presence,
notifications, draft preservation, the team queue for leads, and the SLA
countdown display.

**Out of scope.**

- SLA computation — spec `005`. This spec renders values it reads (constitution III)
- Routing and auto-assignment — spec `005`
- Ticket behaviour and the lifecycle — spec `002`
- AI summaries and suggested replies — spec `007`, which renders into surfaces this spec defines
- Management reporting and dashboards — spec `009`
- Mobile application and offline behaviour — spec `012`
- Knowledge base authoring — spec `006`

## 2. Domain language

| Term | Means exactly |
|---|---|
| **Queue** | An ordered, filtered list of tickets. Personal (assigned to me) or team (owned by a team I am in). |
| **Urgency order** | The default queue ordering. Definition pending `[CLARIFY-1]`. |
| **Counter** | A live count over a defined filter, shown as a tile. Always agrees with opening that filter. |
| **Context panel** | The customer information rendered beside the conversation. Read-only view of spec `001`. |
| **Task** | A personal to-do with a due date, always attached to a ticket. Not a sub-task (spec `002`), which is team work. |
| **Reminder** | A notification generated ahead of a task due date or an SLA threshold. |
| **Quick reply** | A stored message body with named placeholders, in Arabic and English. Personal, team or global. |
| **Placeholder** | A named token in a quick reply resolved at insertion against the ticket and customer. |
| **Mention** | A reference to a colleague inside an internal note that notifies them and grants them visibility of that ticket. |
| **Presence** | An agent's self-declared state: `available`, `busy`, `away`, `offline`. Read by chat routing (spec `003`). |
| **Draft** | Unsent reply text preserved server-side against loss. |
| **At risk** | An SLA state supplied by spec `005`, not derived here. |

## 3. Key entities

### Task

| Attribute | Type | Rules |
|---|---|---|
| `ticket_id` | ref Ticket | Required — a task never floats free |
| `owner_id` | ref User | Required |
| `due_at` | timestamp | Required |
| `remind_before` | duration | Optional; defaults per user preference |
| `state` | `open` \| `done` \| `cancelled` | — |
| `body` | text | Required |

### Quick reply

| Attribute | Type | Rules |
|---|---|---|
| `scope` | `personal` \| `team` \| `global` | Required |
| `owner_id` / `team_id` | ref | Set per scope |
| `title_ar`, `title_en` | text | Both required (constitution I) |
| `body_ar`, `body_en` | text | Both required |
| `placeholders` | set of name | Must all be resolvable |
| `category_ids` | set of ref | Optional filter for relevance |

### Notification

| Attribute | Type | Rules |
|---|---|---|
| `user_id` | ref User | Required |
| `kind` | `assigned` \| `mentioned` \| `customer_replied` \| `escalated` \| `task_due` \| `sla_threshold` \| `delivery_failed` \| `chat_offered` | Required |
| `ticket_id` | ref Ticket | Required except for system notices |
| `channels_sent` | set of `in_app` \| `email` \| `push` | Per user preference and `[CLARIFY-4]` |
| `read_at` | timestamp | Null until read |

### Presence, Draft, Saved view
Standard shapes. A saved view is defined in spec `002` `FR-026`; this spec
renders it and MUST apply the viewer's scope, never the author's.

## 4. Acceptance scenarios

### AS-01 — Opening the workspace requires no decision
**Given** an agent with 14 assigned tickets in mixed SLA states
**When** they open the workspace
**Then** their personal queue is shown in urgency order per `[CLARIFY-1]`
**And** the first item is the one most in need of action
**And** no filter selection is required to reach a workable list

### AS-02 — Counters agree with their filters
**Given** counters showing Open 14, Overdue 3, Pending 5, Resolved today 7
**When** the agent opens each counter
**Then** each list contains exactly that number of tickets
**And** the counters refresh within the `NFR-002` interval without a manual reload

### AS-03 — Context without navigation
**Given** an agent opens a ticket
**When** the ticket renders
**Then** customer identity, contact points, segments, entitlement, SLA tier and the last five tickets are visible without leaving the screen
**And** where entitlement cannot be resolved the panel states so rather than showing blank or stale data

### AS-04 — Quick reply resolves placeholders in the right language
**Given** a quick reply containing a customer-name and a ticket-reference placeholder, and a customer whose preferred language is Arabic
**When** the agent inserts it
**Then** the Arabic body is inserted with both placeholders resolved
**And** the reference renders left-to-right inside the Arabic text
**And** given a placeholder that cannot be resolved, insertion is refused naming it, rather than inserting the raw token

### AS-05 — Task reminders arrive before the deadline
**Given** a task due tomorrow at 10:00 with a 2-hour reminder
**When** 08:00 tomorrow arrives
**Then** the agent is notified on their configured channels
**And** the notification links directly to the ticket
**And** the task appears in the overdue count only after 10:00

### AS-06 — Mention grants access and notifies
**Given** agent A writes an internal note mentioning agent B, who is not on the ticket's owning team
**When** the note is saved
**Then** B is notified
**And** B may open that specific ticket
**And** B's access does not extend to other tickets in that team
**And** the grant is recorded in history

### AS-07 — Internal thread stays internal
**Given** a ticket with an internal discussion of four notes
**When** the customer views the ticket, or a transcript is emailed
**Then** none of the four appear

### AS-08 — SLA countdown is read, not computed
**Given** a ticket whose remaining resolution time is supplied by spec `005` as 45 minutes, at-risk
**When** the agent views the ticket and also views the team queue
**Then** both show 45 minutes and the at-risk state
**And** the value is identical to the one spec `009` reports for the same ticket at the same instant

### AS-09 — Draft survives a crash
**Given** an agent has typed 400 words of an unsent reply
**When** the browser closes without warning and they return within the retention period
**Then** the draft is restored
**And** if the customer replied meanwhile, the draft is restored and flagged as possibly stale

### AS-10 — Team queue is a working tool
**Given** a lead over two teams
**When** they open the team queue
**Then** they can view by unassigned, oldest, at-risk and per-agent load
**And** they can assign from the list without opening each ticket
**And** they see only the teams, branches and departments they are scoped to

### AS-11 — Presence affects routing
**Given** an agent sets presence to `away`
**When** a chat arrives requiring their skill
**Then** it is not offered to them
**And** on returning to `available` they become eligible again

### AS-12 — Notifications are not a firehose
**Given** a ticket receives six customer messages in two minutes
**When** the notifications are generated
**Then** the agent receives one grouped notification for that ticket, not six
**And** an escalation notification is never grouped or suppressed

## 5. Functional requirements

| ID | Requirement | Level | Traces |
|---|---|---|---|
| `FR-001` | The workspace MUST open on the agent's personal queue ordered by urgency per `[CLARIFY-1]`, with no filter selection required. | MUST | `AD-01` |
| `FR-002` | The workspace MUST show live counters for open, overdue, pending customer and resolved today; each MUST be openable as its own list and MUST agree exactly with that list. | MUST | `AD-02` |
| `FR-003` | The ticket view MUST render customer identity, contact points, segments, entitlement, SLA tier and recent tickets without navigating away, and MUST state explicitly when a value is unavailable. | MUST | `AD-03` |
| `FR-004` | Agents MUST be able to create tasks against a ticket with a due date and body, and to complete or cancel them. | MUST | `AD-04` |
| `FR-005` | The system MUST notify the agent ahead of a task due date and ahead of each SLA threshold defined in spec `005` `FR-006`. | MUST | `AD-05` |
| `FR-006` | Quick replies MUST support named placeholders and MUST store an Arabic and an English body; insertion MUST select by the customer's preferred language and MUST refuse rather than insert an unresolved placeholder. | MUST | `AD-06`, constitution I |
| `FR-007` | Quick replies MUST exist at personal, team and global scope; team and global MUST be manageable by a lead or above and MUST NOT be editable by an individual agent. | SHOULD | `AD-07` |
| `FR-008` | An agent MUST be able to search the knowledge base from within the ticket and insert an article as a link or as its full body, respecting article visibility from spec `006` `FR-005`. | MUST | `AD-08` |
| `FR-009` | An agent MUST be able to mention a colleague in an internal note; the mention MUST notify them and MUST grant them access to that ticket only, recorded in history. | MUST | `AD-09` |
| `FR-010` | Every ticket MUST carry an internal discussion thread, excluded from every customer-facing surface and from every channel delivery. | MUST | `AD-10` |
| `FR-011` | An agent MUST be able to set presence; chat routing in spec `003` `FR-011` MUST honour it. | SHOULD | `AD-11` |
| `FR-012` | The workspace MAY provide keyboard shortcuts and a command palette for queue navigation, reply, status change, assignment and search. | MAY | `AD-12` |
| `FR-013` | The system MUST deliver notifications for assignment, mention, customer reply, escalation, task due, SLA threshold, delivery failure and chat offer, on the channels the user has enabled. Notifications for one ticket within a configured window MUST be grouped, except escalations, which MUST NOT be grouped or suppressed. | MUST | `AD-13` |
| `FR-014` | The workspace MAY show colleague presence and current assigned-ticket count when choosing a transfer target. | MAY | `AD-14` |
| `FR-015` | Unsent reply text MUST be preserved server-side within a configured retention period and restored on return; a draft MUST be flagged when the thread has changed since it was written. | SHOULD | `AD-15` |
| `FR-016` | Leads MUST have a team queue viewable by unassigned, oldest, at-risk and per-agent load, supporting assignment from the list, scoped to the teams, branches and departments they hold. | MUST | `AD-16`, constitution IV |
| `FR-017` | The workspace MAY provide a single action that assigns the caller the highest-urgency unassigned ticket in their scope. | MAY | `AD-17` |
| `FR-018` | The ticket view MUST display remaining or elapsed SLA time and the at-risk or breached state persistently, read from spec `005`. | MUST | `AD-18`, constitution III |
| `FR-019` | This spec MUST NOT compute any duration, threshold or breach state. Every such value MUST be read from spec `005`. | MUST | constitution III |
| `FR-020` | Every list, counter and queue MUST apply the caller's scope server-side; a shared saved view MUST apply the viewer's scope. | MUST | constitution IV |

## 6. Edge cases and failure behaviour

| # | Situation | Required behaviour |
|---|---|---|
| E-01 | Agent has no assigned tickets | Empty state offering the team queue and the next-ticket action. Not an error, not a blank screen. |
| E-02 | Ticket is reassigned away while the agent is composing | The draft is preserved and the agent is told they no longer own it; sending is refused with the new owner named. |
| E-03 | Ticket is merged while open | The view follows to the surviving ticket; the draft is carried across. |
| E-04 | Two agents both use the next-ticket action simultaneously | Each receives a different ticket. No ticket is assigned twice. |
| E-05 | SLA service is unavailable | Countdowns render as "unavailable"; the queue falls back to priority then age, and states that it has done so. It MUST NOT compute a substitute duration. |
| E-06 | Quick reply references a retired custom field | Insertion refused naming the field; the reply is flagged for its owner to fix. |
| E-07 | Mentioned colleague is deactivated | Mention refused at save time naming them. |
| E-08 | Mentioned colleague is outside the branch scope | Permitted — the mention is an explicit, audited grant for one ticket. |
| E-09 | Task due date is in the past | Accepted and immediately overdue; not refused. |
| E-10 | Notification channel fails (push token expired) | Falls back to in-app; the failure is logged; the user is not silently uninformed. |
| E-11 | Agent leaves presence `available` while inactive for a long period | Presence auto-transitions to `away` after the configured idle period; chat routing stops offering. |
| E-12 | Draft retained longer than the retention period | Discarded; the agent is told on return rather than shown stale text. |
| E-13 | Counter and list disagree because of a concurrent change | The list is authoritative; the counter refreshes on open. |
| E-14 | Lead scoped to zero teams | Team queue is empty with an explanation, not an error. |
| E-15 | Article inserted whose visibility is internal-only | Insertion as a customer-visible reply is refused; insertion into an internal note is permitted. |

## 7. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| `NFR-001` | Workspace first meaningful render | ≤ 2s at p95 |
| `NFR-002` | Counter and queue freshness | ≤ 30s, without manual reload |
| `NFR-003` | Notification delivery, in-app | ≤ 5s from the triggering event |
| `NFR-004` | Draft autosave interval | ≤ 10s of typing, and on blur |
| `NFR-005` | Clicks to send a routine quick reply | ≤ 3 from the queue |
| `NFR-006` | Presence propagation to routing | ≤ 5s |

## 8. Bilingual and localisation requirements

| Surface | Arabic | English | RTL notes |
|---|---|---|---|
| Interface chrome, navigation, counters | Required | Required | Whole workspace mirrors, including the context panel side |
| Quick reply titles and bodies | Required | Required | `FR-006` enforces both |
| Task bodies | Free | Free | Direction detected per task |
| Notification text | Required | Required | Follows the recipient's interface language, not the customer's |
| SLA countdown | Required | Required | Digits and time units stay LTR; the label mirrors |
| Ticket reference in any placeholder | Always LTR | Always LTR | Never visually reversed |
| Empty states and refusal messages | Required | Required | Must name the specific cause |
| Keyboard shortcut hints | Required | Required | Key names not mirrored |

## 9. Permissions

| Action | AGT | LEAD | MGR | ADM | AUD |
|---|---|---|---|---|---|
| View own queue and counters | ✓ | ✓ | ✓ | ✓ | — |
| View team queue | own teams | ✓ | ✓ | ✓ | read only |
| Assign from the team queue | self only | ✓ | ✓ | ✓ | — |
| Create / complete own tasks | ✓ | ✓ | ✓ | ✓ | — |
| Create a task for another agent | — | ✓ | ✓ | ✓ | — |
| Manage personal quick replies | ✓ | ✓ | ✓ | ✓ | — |
| Manage team quick replies | — | ✓ | ✓ | ✓ | — |
| Manage global quick replies | — | — | ✓ | ✓ | — |
| Mention a colleague | ✓ | ✓ | ✓ | ✓ | — |
| Read / write internal thread | ✓ | ✓ | ✓ | ✓ | read only |
| Set own presence | ✓ | ✓ | ✓ | ✓ | — |
| Set another agent's presence | — | ✓ | ✓ | ✓ | — |
| View colleague presence and load | ✓ | ✓ | ✓ | ✓ | — |
| Configure own notification preferences | ✓ | ✓ | ✓ | ✓ | ✓ |
| Set notification defaults for a team | — | ✓ | ✓ | ✓ | — |

## 10. Audit requirements

| Event | Recorded fields |
|---|---|
| Task created / completed / cancelled / reassigned | actor, timestamp, ticket, owner, due at, outcome |
| Quick reply created / edited / deleted | actor, timestamp, scope, title, language variants changed |
| Quick reply used | actor, timestamp, ticket, quick reply identity, language inserted |
| Article inserted into a reply | actor, timestamp, ticket, article identity and version, link or full text |
| Mention made | actor, timestamp, ticket, mentioned user, access granted |
| Access granted by mention | granted user, ticket, granting actor, timestamp |
| Internal note written | author, timestamp, ticket, note id |
| Presence changed | actor, subject, timestamp, previous, new, cause (`manual` / `idle`) |
| Notification generated / delivered / failed | user, kind, ticket, channels attempted, outcome |
| Draft discarded | user, ticket, cause (`sent` / `expired` / `abandoned`) |
| Next-ticket action used | actor, timestamp, ticket assigned |
| Bulk assignment from the team queue | actor, timestamp, ticket count, per-ticket outcome |

## 11. Contracts

| Operation | Purpose | Scope predicate |
|---|---|---|
| `get my queue` | Personal work list | `assigned_agent = caller` |
| `get counters` | Workload tiles | same filters as the lists they open |
| `get team queue` | Lead view | team ∈ caller teams AND branch ∈ scope AND department ∈ scope |
| `get ticket context` | Customer panel | inherits ticket scope (spec `001`) |
| `list / create / update task` | Task management | own tasks, or lead for others |
| `list quick replies` | Insertion picker | personal ∪ own teams ∪ global |
| `manage quick reply` | Authoring | scope-appropriate role |
| `search knowledge (in ticket)` | Article insertion | visibility filter from spec `006` |
| `write internal note` / `mention` | Collaboration | ticket scope, or an existing mention grant |
| `set presence` | Availability | self, or lead for a team member |
| `list / mark notifications` | Notification centre | `user = caller` only |
| `save / fetch draft` | Loss prevention | `user = caller` AND ticket scope |
| `take next ticket` | Queue discipline | unassigned AND scope; atomic — no double assignment |
| `get sla state` (read-through to spec `005`) | Countdown | inherits ticket scope; **read only** |

## 12. Clarifications needed

- [ ] `[CLARIFY-1]` **What exactly is urgency order?** A high-priority ticket with a distant deadline versus a low-priority ticket near breach — which comes first? This spec cannot define the default queue without a rule. — *blocks* `FR-001`, `FR-017`, `AS-01` — *ask* client operations
- [ ] `[CLARIFY-2]` Are agents dedicated to one department or shared across several? This changes whether the personal queue is one list or several. — *blocks* `FR-001`, `FR-016` — *ask* client operations
- [ ] `[CLARIFY-3]` Is live chat in phase one? If not, presence (`FR-011`) has no consumer at launch. — *blocks* `FR-011` — *ask* client + delivery lead
- [ ] `[CLARIFY-4]` **May push notifications reach agents outside their working hours?** An employment question as much as a technical one. — *blocks* `FR-013` — *ask* client HR + operations
- [ ] `[CLARIFY-5]` Who authors and approves the initial quick reply library, in which language first, and how many must exist at go-live? An empty library makes `FR-006` worthless on day one. — *blocks* launch readiness — *ask* client operations

## 13. Success metrics

| Metric | Source | Target |
|---|---|---|
| Clicks to send a routine reply | Interaction recording | ≤ 3 |
| Time from workspace open to first action | Event log | < 15s |
| Quick reply share of outbound messages | Message metadata | > 40% in one quarter |
| Missed promised follow-ups | Overdue task count vs. created | < 2% |
| Agents still working from personal inboxes | Survey + inbox audit | 0 at month three |
| Countdown disagreement with spec `009` | Reconciliation | 0 (constitution III) |

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
- [x] Constitution III respected — `FR-019` forbids local duration computation; `E-05` defines the fallback
- [ ] **Zero `[NEEDS CLARIFICATION]` markers remaining — 5 open, `/plan` is blocked**
- [x] Constitution gates satisfied and named

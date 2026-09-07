# Story 002 — Ticket Management

> **عايزين نعمل إيه؟**
> We want every request to become a tracked unit of work with an owner, a
> deadline, a category and a history nobody can quietly rewrite.

| | |
|---|---|
| **Number** | `002` |
| **Spec** | [`specs/002-ticket-management/spec.md`](../../specs/002-ticket-management/spec.md) |
| **Source** | *Customer Support CRM · Core Features*, section 2 |
| **Status** | Draft |
| **Owner** | TBD |

---

## The need

Requests currently arrive in personal inboxes and phone calls. There is no
shared list, so nothing is prioritised, nothing has an owner, and nothing is
measurable. When a customer asks what is happening, the honest answer is that
nobody knows. When an agent leaves, their open work leaves with them.

## Who this is for

| Persona | What they get out of it |
|---|---|
| `AGT` Support agent | A worked queue instead of an inbox, and context that survives handoff |
| `LEAD` Team lead | Visible ownership, bulk actions, and somewhere for escalations to land |
| `MGR` Support manager | The captured data that makes epics 005 and 009 possible at all |
| `CUST` Customer | A reference number and a status that means something |
| `ADM` Administrator | A taxonomy and workflow they can change without a developer |
| `AUD` Auditor | An attributable record of every action taken on a request |

## What we want

After this ships, someone can:

- Log a request in a handful of fields, or have it logged automatically from any channel
- Quote a short reference number that the customer and the agent both recognise
- Categorise precisely enough that reporting and routing are useful
- See and change priority, and understand where an automatic priority came from
- Move work through a lifecycle where each status means one specific thing
- Assign, reassign and escalate with a reason attached
- Separate internal thinking from what the customer reads
- Link, merge and split tickets so the ticket count reflects reality
- Search everything ever written, including inside attachments
- Record why something happened, not just that it was closed
- Reopen rather than restart when a problem returns

## Why it matters

This epic is the spine. Sections 3, 4, 5, 7, 8 and 9 of the feature list all
read from or write to the ticket, and none of them can be specified until the
lifecycle exists. It is also the epic that carries the largest hidden decision:
the state machine. Twelve features assume statuses, and nobody has yet listed
them.

## Stories in this epic

| ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| `TM-01` | AGT | create a ticket from a handful of fields | logging never becomes the slow part of the job | Must |
| `TM-02` | SYS | give every ticket a short human-readable reference | customer and agent quote the same number | Must |
| `TM-03` | CUST | a ticket opened automatically from my email, message or form | I never repeat myself to start being helped | Must |
| `TM-04` | AGT | categorise down a multi-level tree | routing and reporting are precise, not approximate | Must |
| `TM-05` | ADM | set default priority, team and SLA per category node | the taxonomy matches how we actually work | Must |
| `TM-06` | AGT | set priority and see how an automatic one was derived | urgent looks urgent and I can tell why | Must |
| `TM-07` | AGT | move a ticket through a defined status lifecycle | progress is unambiguous to everyone looking | Must |
| `TM-08` | ADM | configure legal transitions and which statuses pause SLA | the workflow enforces our process, not documents it | Should |
| `TM-09` | AGT | assign or reassign to an agent or team with a reason | ownership is never in doubt and handoffs are explainable | Must |
| `TM-10` | AGT | pull an unassigned ticket from a shared queue | nothing waits for someone to be told to take it | Must |
| `TM-11` | LEAD | bulk assign, close or retag | I clear a backlog without a hundred clicks | Should |
| `TM-12` | AGT | escalate to a senior colleague or manager with a note | hard cases move up before the customer pushes | Must |
| `TM-13` | AUD | a complete immutable history of every change | every action on a ticket is attributable | Must |
| `TM-14` | AGT | keep internal notes separate from customer replies | I think out loud without the customer reading it | Must |
| `TM-15` | AGT | attach files and paste screenshots into a ticket | the evidence stays with the case | Must |
| `TM-16` | AGT | link tickets as duplicate of, related to, blocked by | connected issues are visibly connected | Should |
| `TM-17` | AGT | merge duplicate tickets keeping both conversations | the customer ends in one thread, not two | Should |
| `TM-18` | AGT | split a ticket containing several unrelated requests | each issue is tracked and measured on its own | Could |
| `TM-19` | AGT | create sub-tasks assigned to other departments | cross-team work is on the case, not in email | Should |
| `TM-20` | AGT | tag a ticket freely | we slice reports by themes nobody predicted | Should |
| `TM-21` | AGT | set pending with a follow-up date | it reminds me or auto-closes rather than rotting | Should |
| `TM-22` | CUST | my reply reopens a recently closed ticket | a recurrence continues the same conversation | Must |
| `TM-23` | AGT | snooze a ticket until a chosen time | work I cannot act on stops distracting me | Could |
| `TM-24` | AGT | see when a colleague is already typing on my ticket | we never send two contradictory answers | Should |
| `TM-25` | ADM | define custom fields per category | billing asks for an invoice number, technical does not | Should |
| `TM-26` | AGT | save and share filters as named views | I work the right list, not the whole list | Should |
| `TM-27` | AGT | search full text across tickets, replies and attachments | I find how we solved this last time | Must |
| `TM-28` | MGR | time logged against tickets | we measure real effort and bill it where relevant | Could |
| `TM-29` | AGT | record root cause and resolution code at closure | trend analysis has something honest to analyse | Should |
| `TM-30` | AGT | turn a resolved ticket into a knowledge base draft | today's answer becomes tomorrow's self-service | Should |
| `TM-31` | CUST | closure only after I confirm or a grace period passes | my ticket is not closed while still broken | Should |
| `TM-32` | ADM | define ticket types with their own fields and workflow | a complaint is not processed like a password reset | Should |

**32 stories** — 14 Must · 15 Should · 3 Could

## How we will know it worked

- **Requests logged in the system** — measured by ticket count vs. sampled inbox audit, above 95% of all inbound within one month
- **Tickets with an owner** — measured by unassigned count at end of day, under 5 at any time
- **Ticket creation time** — measured by agent timing study, under 45 seconds for a typed request
- **Reopen rate** — measured from status history, established as a baseline in month one and trending down thereafter

## Explicitly out of scope

- **SLA timers, escalation timing and auto-assignment logic** — this epic defines statuses and the pause flag; the clock itself is story `005`
- **Channel intake and threading** — this epic consumes tickets created by story `003`; it does not define how mail becomes a ticket
- **AI categorisation and summarisation** — story `007` writes to fields this epic defines
- **Approval workflows** (refunds, credit notes) — story `005`
- **Asset, contract or field-service management** — not in the source feature list

## Depends on

| Needs | Why |
|---|---|
| Story `001` | A ticket without a customer is not a ticket |
| Story `010` | Status changes, merges and closures are permission-gated actions |

## Open questions for the client

- [ ] **What is the exact status list, and which statuses pause the SLA clock?** — *blocks* `FR-007`, `FR-008`, and all of spec `005`
- [ ] What does *resolved* mean versus *closed*, and who decides? — *blocks* `FR-031`, and every metric in spec `009`
- [ ] What is the reference number format, and must it encode branch or department? — *blocks* `FR-002`
- [ ] How many days may a closed ticket be reopened by a customer reply? — *blocks* `FR-022`
- [ ] Is the category tree fixed depth, and how deep? — *blocks* `FR-004`
- [ ] Do we need billable time tracking at launch, or is `TM-28` genuinely deferrable? — *blocks* `FR-028`

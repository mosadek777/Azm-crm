# Story 004 — Agent Dashboard

> **عايزين نعمل إيه؟**
> We want the agent to open one screen that already knows what they should do
> next, and to answer without leaving it.

| | |
|---|---|
| **Number** | `004` |
| **Spec** | [`specs/004-agent-dashboard/spec.md`](../../specs/004-agent-dashboard/spec.md) |
| **Source** | *Customer Support CRM · Core Features*, section 4 |
| **Status** | Draft |
| **Owner** | TBD |

---

## The need

An agent handling forty conversations a day spends a large share of that day
deciding what to look at, hunting for customer context in another system, and
retyping the same answer. None of that is support work. Meanwhile the follow-up
they promised on Tuesday exists only in their memory.

## Who this is for

| Persona | What they get out of it |
|---|---|
| `AGT` Support agent | The screen they live in: prioritised work, context beside the reply box, one-click answers |
| `LEAD` Team lead | A live team queue they can rebalance before a deadline is lost |

## What we want

After this ships, someone can:

- Open the product and immediately see their work in deadline order
- See customer identity, entitlement and recent history beside the conversation
- Answer a common question in one keystroke, in either language
- Record a follow-up with a due date and be reminded before it is late
- Pull a colleague into a case without leaving it
- Discuss internally on the ticket, invisibly to the customer
- Be told about assignments, mentions and escalations rather than refreshing
- See the SLA countdown without looking for it
- Never lose a long reply to a crashed tab

## Why it matters

This is the only epic whose value is measured in seconds, and seconds here
multiply by every agent, every ticket, every day. It is also the epic that
determines whether agents adopt the system or quietly keep using their inbox —
and a support CRM that agents work around produces no data, which makes epics
005 and 009 worthless.

## Stories in this epic

| ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| `AD-01` | AGT | open to my assigned tickets ordered by SLA urgency | I never decide what to work on next | Must |
| `AD-02` | AGT | counters for open, overdue, pending and resolved today | I know where I stand without running a report | Must |
| `AD-03` | AGT | customer profile, entitlements and recent tickets beside the conversation | I answer without leaving the reply box | Must |
| `AD-04` | AGT | a task list with due dates against tickets | the follow-up I promised is not forgotten | Must |
| `AD-05` | AGT | reminders before a task or SLA deadline | I act before it breaches, not explain after | Must |
| `AD-06` | AGT | quick replies with placeholders in Arabic and English | common answers cost one keystroke, not five minutes | Must |
| `AD-07` | LEAD | shared quick replies per team, plus private ones per agent | the wording customers see stays consistent | Should |
| `AD-08` | AGT | drop a knowledge article into a reply as link or full text | I answer with approved content, not from memory | Must |
| `AD-09` | AGT | mention a colleague and have them notified | I pull in help without leaving the case | Must |
| `AD-10` | AGT | an internal discussion thread on the ticket | collaboration is captured in context | Must |
| `AD-11` | AGT | set presence to available, busy, away or offline | chat routing respects whether I can respond | Should |
| `AD-12` | AGT | keyboard shortcuts and a command palette | high-volume work does not depend on the mouse | Could |
| `AD-13` | AGT | in-app, email and push notifications for assignments, mentions, replies, escalations | I stop refreshing the list to see what changed | Must |
| `AD-14` | AGT | see who is online and how loaded before transferring | I hand work to someone who can take it | Could |
| `AD-15` | AGT | my draft reply auto-saved | a crashed tab does not cost me a long answer | Should |
| `AD-16` | LEAD | the team queue by unassigned, oldest, at-risk and agent | I rebalance load while it still matters | Must |
| `AD-17` | AGT | take the next ticket from one button | the queue is worked in order, not cherry-picked | Could |
| `AD-18` | AGT | the SLA countdown on the ticket itself | urgency is impossible to miss | Must |

**18 stories** — 11 Must · 4 Should · 3 Could

## How we will know it worked

- **Clicks to send a routine reply** — measured by interaction recording, 3 or fewer
- **Time from opening the product to first action** — measured by event log, under 15 seconds
- **Quick reply usage** — measured as a share of outbound messages, above 40% within one quarter
- **Missed promised follow-ups** — measured by overdue task count, under 2% of created tasks
- **Agents still working from personal inboxes** — measured by survey and inbox audit, zero at month three

## Explicitly out of scope

- **The SLA calculation itself** — this epic displays the countdown; story `005` computes it
- **Routing and auto-assignment rules** — story `005`
- **AI suggested replies and summaries** — story `007`; this epic provides the surface they appear on
- **Reporting and analytics for managers** — story `009`; the lead queue here is operational, not analytical
- **Mobile app** — story `012`; this epic assumes a desktop browser
- **Workforce management, shift rostering** — not in the source feature list

## Depends on

| Needs | Why |
|---|---|
| Story `002` | There is nothing to display without tickets, statuses and assignment |
| Story `001` | The context panel is the customer record |
| Story `005` | The countdown and urgency ordering need the SLA clock |
| Story `006` | Article insertion needs the knowledge base to exist |

## Open questions for the client

- [ ] What exactly does *urgency order* mean when a ticket has a high priority but a distant deadline, and another is close to breach at low priority? — *blocks* `FR-001`
- [ ] Are agents dedicated to one department, or shared across several? This changes the queue view fundamentally. — *blocks* `FR-016`
- [ ] Do we need presence for chat routing at launch, or is chat phase two? — *blocks* `FR-011`
- [ ] Should push notifications reach agents outside working hours? — *blocks* `FR-013`
- [ ] Who authors and approves the initial quick reply library, and in which language first? — *blocks* `FR-006`

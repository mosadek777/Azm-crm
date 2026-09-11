# Test cases — 004 Agent workspace

**18 cases.** The screen an agent works in all day: the queue they open on,
their counters, quick replies, tasks, notifications, drafts, and the team queue
a lead works from.

**Coverage:** 0 automated · 1 partial · 0 manual · 17 not testable yet

---

## Before you start

⚠ **This whole module is unbuilt, and until recently nothing recorded that.**
It was found by a requirement-by-requirement audit: 26 requirements, 14 of them
mandatory, no code, and no card on the project board. It is not a future module
like the knowledge base — it is the agent's daily workspace, and a ticket list
is currently standing in for it.

**What exists today, and why it is not this.** An agent signs in and sees a
ticket list with filters. That covers part of what an agent needs and none of
what a **team lead** needs. The difference is the substance of AD-01, AD-02 and
AD-16.

**One thing here has already been decided rather than merely deferred.** AD-09
(mentioning a colleague) asked for something that could not be built as written
— see that case.

**Two pieces are worth building first**, and the rest can wait: **AD-02**
(counters) and **AD-16** (the lead's team queue). They carry nearly all the
visible value, and a lead having the same screen as an agent is what somebody
senior notices in ten seconds.

---

## AD-01 — I never decide what to work on next

> *As an* **agent** *I want to* **open to my assigned tickets ordered by SLA
> urgency** *so that* **I never decide what to work on next.**

**Requirement:** `004 FR-001` (Must) — the workspace opens on the agent's
personal queue ordered by urgency, with no filter selection required.

**Preconditions**
- An agent with a dozen assigned requests in a spread of states and ages.

**Steps**
1. Sign in as the agent.
2. Look at the first screen, without clicking or filtering anything.
3. Note the order of the requests.
4. Sign in as a second agent and compare what they see.

**Expected result**
- Step 2 shows **their own** requests, already ordered — no filter to choose
  first.
- Step 3: the order reflects urgency, not creation date.
- Step 4: each agent sees their own queue in the same ordering. An agent who has
  to build their own view every morning uses whichever one they built last, and
  no two agents are looking at the same thing.

**Status:** ⛔ **Not testable yet.** The ticket list requires a filter choice
and orders by reference. **Also blocked on a decision:** what "urgency" orders
by has not been defined. Priority, age, service-level risk and customer tier all
have a claim, and the answer changes which request gets worked first — it cannot
be guessed.

---

## AD-02 — Know where I stand without running a report

> *As an* **agent** *I want to* **counters for open, overdue, pending and
> resolved today** *so that* **I know where I stand without running a report.**

**Requirement:** `004 FR-002` (Must) — live counters for open, overdue, pending
customer and resolved today; each openable as its own list, and **each agreeing
exactly** with that list.

**Preconditions**
- An agent with requests in each of the four states.

**Steps**
1. Read the four counters.
2. Click **open** and count the requests in the list that appears.
3. Compare with the counter.
4. Repeat for the other three.
5. Resolve one request and watch the counters.

**Expected result**
- Every counter matches its own list **exactly**. This is the hard part and the
  reason this requirement is mandatory — a counter that disagrees with the list
  behind it destroys confidence in every other number on the screen.
- Step 5: both the resolved-today and the open counters move.

**Status:** ⛔ **Not testable yet.** No counters exist. Nothing blocks this —
the data is all present and the scope rules already apply to the lists. It is
unscheduled rather than gated.

---

## AD-03 — Answer without leaving the reply box

> *As an* **agent** *I want to* **customer profile, entitlements and recent
> tickets beside the conversation** *so that* **I answer without leaving the
> reply box.**

**Requirement:** `004 FR-003` (Must) — the request view renders customer
identity, contact points, segments, entitlement, service tier and recent
requests without navigating away, and states explicitly when a value is
unavailable.

**Preconditions**
- A request from a customer with history.

**Steps**
1. Open the request.
2. Without navigating, look for: the customer's name and contact points, their
   segments, their entitlement and service tier, and their recent requests.
3. Note what is missing.
4. Find a customer whose entitlement cannot be determined and open one of their
   requests.

**Expected result**
- All of it is beside the conversation.
- Step 4 says **explicitly** that entitlement could not be determined — not a
  blank. A blank cannot be told apart from a value of nothing.

**Status:** ⛔ **Not testable yet.** The request view shows the customer's name.
Segments and entitlement **do not exist anywhere in the system** — the customer
record references a segment type that was never built, and nothing supplies
entitlement.

---

## AD-04 — The follow-up I promised is not forgotten

> *As an* **agent** *I want to* **a task list with due dates against tickets**
> *so that* **the follow-up I promised is not forgotten.**

**Requirement:** `004 FR-004` (Must) — agents create tasks against a request
with a due date and a body, and complete or cancel them.

**Preconditions**
- A request.

**Steps**
1. Add a task with a due date and a description.
2. Confirm it appears on the request and in a personal task list.
3. Complete it.
4. Add another and cancel it.
5. Confirm a completed and a cancelled task are distinguishable.

**Expected result**
- Tasks live on the request **and** in one list the agent can work from — a task
  visible only on a request nobody opens is not a reminder.

**Status:** ⛔ **Not testable yet.** No task record exists anywhere in the
system.

---

## AD-05 — Act before it breaches, not explain after

> *As an* **agent** *I want to* **reminders before a task or SLA deadline** *so
> that* **I act before it breaches, not explain after.**

**Requirement:** `004 FR-005` (Must) — the system notifies the agent ahead of a
task due date and ahead of each service-level threshold.

**Preconditions**
- AD-04 working, and service-level thresholds configured.

**Steps**
1. Create a task due shortly.
2. Wait for the reminder.
3. Let a request approach its response threshold.
4. Wait for that reminder.
5. Check the reminder arrives **before** the deadline, not on it.

**Expected result**
- Both reminders arrive with time to act. A notification at the moment of
  breach is a report, not a reminder.

**Status:** ⛔ **Not testable yet.** Depends on tasks (AD-04), on staff
notifications (AD-13), and on the service-level engine — none of which exists.

---

## AD-06 — Common answers cost one keystroke

> *As an* **agent** *I want to* **quick replies with placeholders in Arabic and
> English** *so that* **common answers cost one keystroke, not five minutes.**

**Requirement:** `004 FR-006` (Must) — quick replies support named
placeholders, store an Arabic **and** an English body, insert the one matching
the customer's preferred language, and **refuse rather than insert** an
unresolved placeholder.

**Preconditions**
- A quick reply with a placeholder for the customer's name, in both languages.
- One customer who prefers Arabic, one who prefers English.

**Steps**
1. Insert the quick reply into a reply to the Arabic-preferring customer.
2. Check which language body was used and that the placeholder was filled.
3. Do the same for the English-preferring customer.
4. Insert a quick reply whose placeholder cannot be resolved for this customer.
5. Try to save a quick reply with only an English body.

**Expected result**
- Step 2 inserts the **Arabic** body, chosen from the customer's preference —
  not the agent's interface language.
- Step 4 is **refused**. A half-filled template reading "Dear {{name}}," sent to
  a customer is worse than no template at all.
- Step 5 is refused — both languages, always.

**Status:** ⛔ **Not testable yet.** No quick replies exist. Note this case
carries a bilingual obligation that most unbuilt features do not: the template
itself must exist in both languages before it can be saved.

---

## AD-07 — The wording customers see stays consistent

> *As a* **team lead** *I want to* **shared quick replies per team, plus private
> ones per agent** *so that* **the wording customers see stays consistent.**

**Requirement:** `004 FR-007` (Should) — quick replies exist at personal, team
and global scope; team and global are managed by a lead or above and **cannot**
be edited by an individual agent.

**Preconditions**
- AD-06 working. An agent and a team lead.

**Steps**
1. As a lead, create a team quick reply.
2. As an agent, confirm you can use it.
3. As an agent, try to edit it.
4. As an agent, create a private one and confirm the lead does not see it in
   the team list.

**Expected result**
- Step 3 is refused. Shared wording that any agent can rewrite is not shared
  wording.

**Status:** ⛔ **Not testable yet.** Depends on AD-06.

---

## AD-08 — Answer with approved content, not from memory

> *As an* **agent** *I want to* **drop a knowledge article into a reply as link
> or full text** *so that* **I answer with approved content, not from memory.**

**Requirement:** `004 FR-008` (Must) — an agent searches the knowledge base
from within the request and inserts an article as a link or as its full body,
respecting the article's visibility.

**Preconditions**
- A knowledge base with a public article and an internal-only one.

**Steps**
1. From inside a request, search the knowledge base.
2. Insert an article as a link.
3. Insert another as full text.
4. Search for the internal-only article and try to insert it into a
   **customer-visible** reply.

**Expected result**
- Steps 2 and 3 both work without leaving the request.
- Step 4 is refused or warns clearly. Internal procedure reaching a customer
  through a quick insert is exactly how it leaks.

**Status:** ⛔ **Not testable yet.** No knowledge base exists.

---

## AD-09 — Pull in help without leaving the case

> *As an* **agent** *I want to* **mention a colleague and have them notified**
> *so that* **I pull in help without leaving the case.**

**Requirement:** `004 FR-009` (Must) — an agent mentions a colleague in an
internal note; the mention notifies them and is recorded in the history.

**Preconditions**
- Two agents who both have access to the same request.
- A third member of staff who does **not** have access to it.

**Steps**
1. Mention the colleague who already has access, in an internal note.
2. Confirm they are notified.
3. Confirm the mention appears in the request's history.
4. Try to mention the member of staff who does not have access.

**Expected result**
- Steps 1–3 work.
- Step 4: that person **cannot be mentioned**. They do not appear as a choice.

**Status:** ⛔ **Not testable yet — but the design question behind it is
settled.**

The requirement as originally written also said the mention should **grant** the
colleague access to that one request. That could not be built: a separate,
equally mandatory rule says permissions come only from roles and that per-person
exceptions must not exist, and the way access is decided in this system has no
way to express "this one person, this one record".

Settled by the project owner: **a mention may only name a colleague who can
already see the request.** It notifies; it grants nothing. Step 4 above is that
decision.

What this gives up, recorded so it can be reopened deliberately: an agent cannot
pull in a specialist from another department by mentioning them — that
specialist must be granted access the normal, audited way first.

---

## AD-10 — Collaboration captured in context

> *As an* **agent** *I want to* **an internal discussion thread on the ticket**
> *so that* **collaboration is captured in context.**

**Requirement:** `004 FR-010` (Must) — every request carries an internal
discussion thread, excluded from every customer-facing surface and from every
channel delivery.

**Preconditions**
- A request belonging to a customer who can sign in to the portal.

**Steps**
1. Add an internal note with a distinctive phrase.
2. Confirm colleagues see it on the request.
3. Sign in to the portal as the customer, open the request, and search the page
   for the phrase.

**Expected result**
- Staff see it; the customer sees nothing of it anywhere on the page.

**Status:** ⚠ **Partial — and this is the one thing in this module that is
built.** Automated: `backend/tests/ticket.test.js`, *"FR-014 / AS-07: message
visibility"*, and from the customer's side `backend/tests/portal.test.js`,
*"FR-019 / AS-06: internal content never reaches a portal surface"*, which
asserts the note appears in **no** portal response rather than merely not being
displayed.
**Missing:** *"and from every channel delivery"* cannot be tested — no channel
exists to deliver anything on. Re-run this case with the first channel.

---

## AD-11 — Chat routing respects whether I can respond

> *As an* **agent** *I want to* **set presence to available, busy, away or
> offline** *so that* **chat routing respects whether I can respond.**

**Requirement:** `004 FR-011` (Should) — an agent sets their presence, and chat
routing honours it.

**Preconditions**
- Live chat working.

**Steps**
1. Set presence to available and confirm chats arrive.
2. Set it to busy and confirm they stop.
3. Set it to offline and confirm the customer is offered the out-of-hours path
   rather than waiting.

**Expected result**
- Presence changes what the routing does, immediately.

**Status:** ⛔ **Not testable yet.** No presence, and no chat to route.

---

## AD-12 — High-volume work does not depend on the mouse

> *As an* **agent** *I want to* **keyboard shortcuts and a command palette**
> *so that* **high-volume work does not depend on the mouse.**

**Requirement:** `004 FR-012` (May) — the workspace may provide keyboard
shortcuts and a command palette for queue navigation, reply, status change,
assignment and search.

**Preconditions**
- The workspace built.

**Steps**
1. Open the command palette from the keyboard.
2. Move through the queue, open a request, reply, change status and assign —
   without touching the mouse.
3. Do the same in Arabic and confirm the shortcuts still work and any directional
   key behaves sensibly.

**Expected result**
- The whole common path is reachable from the keyboard.
- Step 3 matters more than it looks: arrow keys in a mirrored layout must move
  in the direction the reader expects.

**Status:** ⛔ **Not testable yet.** Optional, and the lowest priority in this
file — but note it overlaps the accessibility work, where full keyboard
operability is not optional.

---

## AD-13 — Stop refreshing the list to see what changed

> *As an* **agent** *I want to* **in-app, email and push notifications for
> assignments, mentions, replies, escalations** *so that* **I stop refreshing
> the list to see what changed.**

**Requirement:** `004 FR-013` (Must) — notifications for assignment, mention,
customer reply, escalation, task due, service-level threshold, delivery failure
and chat offer, on the channels the user has enabled. Several about one request
arrive grouped.

**Preconditions**
- Two agents.

**Steps**
1. Assign a request to the second agent and confirm they are told.
2. Have a customer reply and confirm the owner is told.
3. Send six customer messages on one request within two minutes.
4. Count the notifications the agent receives.
5. Turn off one notification kind and confirm it stops.

**Expected result**
- Step 4: **one grouped notification**, not six. An agent who receives six
  notifications for one conversation learns to ignore all of them.
- An escalation is never grouped away or suppressed.

**Status:** ⛔ **Not testable yet.** **Nothing notifies staff of anything
today.** Two other mandatory requirements depend on this and are equally
unserved: reassigning a request is required to notify both the previous and the
new owner, and escalating one is required to notify the target. In-app
notification does not depend on any messaging channel and could be built now.

---

## AD-14 — Hand work to someone who can take it

> *As an* **agent** *I want to* **see who is online and how loaded before
> transferring** *so that* **I hand work to someone who can take it.**

**Requirement:** `004 FR-014` (May) — the workspace may show colleague presence
and current assigned-request count when choosing a transfer target.

**Preconditions**
- AD-11 working.

**Steps**
1. Begin transferring a request.
2. Read each candidate's presence and current load.
3. Confirm only colleagues in scope are offered.

**Expected result**
- The chooser can see who is actually available before deciding.
- Step 3: the list respects the same access rules as everything else.

**Status:** ⛔ **Not testable yet.** Depends on presence.

---

## AD-15 — A crashed tab does not cost me a long answer

> *As an* **agent** *I want to* **my draft reply auto-saved** *so that* **a
> crashed tab does not cost me a long answer.**

**Requirement:** `004 FR-015` (Should) — unsent reply text is preserved
server-side within a configured retention period and restored on return; a draft
is flagged when the conversation has changed since it was written.

**Preconditions**
- A request.

**Steps**
1. Type a long reply. Do not send it.
2. Close the browser without saving.
3. Reopen the request **on a different machine**.
4. Check the draft is there.
5. Have a colleague reply to the request while your draft is open, then return
   to it.

**Expected result**
- Step 3 is the real test: the draft must be held **server-side**, not in the
  browser, or it is lost with the machine.
- Step 5: the draft is flagged as written against an older conversation — the
  colleague may already have said what you were about to say.

**Status:** ⛔ **Not testable yet.** No draft preservation of any kind.

---

## AD-16 — Rebalance load while it still matters

> *As a* **team lead** *I want to* **the team queue by unassigned, oldest,
> at-risk and agent** *so that* **I rebalance load while it still matters.**

**Requirement:** `004 FR-016` (Must) — leads have a team queue viewable by
unassigned, oldest, at-risk and per-agent load, supporting assignment from the
list, scoped to the teams, branches and departments they hold.

**Preconditions**
- A team lead, three agents with uneven loads, and some unassigned requests.

**Steps**
1. Sign in as the lead and open the team queue.
2. View by **unassigned**.
3. View by **oldest**.
4. View by **at-risk**.
5. View by **agent** and compare the three agents' loads.
6. Assign a request to an agent directly from the list, without opening it.
7. Confirm requests from another branch do not appear in any view.

**Expected result**
- Four genuinely different views of the same work.
- Step 6 works from the list — a lead rebalancing twenty requests should not
  open twenty screens.
- Step 7 holds in every view.

**Status:** ⛔ **Not testable yet.** **A lead currently sees exactly the same
screen as an agent.** This is the most visible gap in the module and, with
AD-02, the piece worth building first. The at-risk view additionally needs the
service-level engine; unassigned, oldest and per-agent do not.

---

## AD-17 — The queue is worked in order, not cherry-picked

> *As an* **agent** *I want to* **take the next ticket from one button** *so
> that* **the queue is worked in order, not cherry-picked.**

**Requirement:** `004 FR-017` (May) — a single action assigns the caller the
highest-urgency unassigned request in their scope.

**Preconditions**
- Several unassigned requests of differing urgency.

**Steps**
1. Press **next ticket**.
2. Check which request you were given.
3. Have two agents press it at the same moment.

**Expected result**
- Step 2: the most urgent one, not the newest or the one at the top.
- Step 3: they receive **different** requests. No request is assigned twice —
  which is the whole difficulty of this feature.

**Status:** ⛔ **Not testable yet.** Depends on AD-01's ordering decision, which
is unanswered.

---

## AD-18 — Urgency impossible to miss

> *As an* **agent** *I want to* **the SLA countdown on the ticket itself** *so
> that* **urgency is impossible to miss.**

**Requirement:** `004 FR-018` (Must) — the request view displays remaining or
elapsed service time and the at-risk or breached state persistently, **read
from** the service-level engine. This module computes no durations of its own.

**Preconditions**
- The service-level engine working.

**Steps**
1. Open a request and find the countdown.
2. Confirm it is visible without scrolling or hovering.
3. Let a request pass its at-risk threshold and confirm the display changes.
4. Stop the service-level engine and reload.

**Expected result**
- Step 4 is the important one: the countdown reads **"unavailable"**. It does
  **not** fall back to a plain "created two days ago" subtraction. A duration
  that ignores paused clocks, weekends and holidays is wrong in a way nobody
  notices, which is worse than showing nothing.

**Status:** ⛔ **Not testable yet.** The service-level engine is not built. The
discipline this case describes **is** already in force: one shared component is
the only thing in the system permitted to calculate a duration, and it
deliberately reports "unavailable" today. Nothing else subtracts two dates.

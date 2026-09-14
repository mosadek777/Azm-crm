# Test cases — 004 Agent workspace

**18 cases.** The screen an agent works in all day: the queue they open on,
their counters, quick replies, tasks, notifications, drafts, and the team queue
a lead works from.

**Coverage:** 3 automated · 11 partial · 0 manual · 4 not testable yet

**Last revised 2026-09-14**, after the workspace was built. The previous
revision of this file said *"this whole module is unbuilt"* and marked 17 of
the 18 cases not testable. That was true when it was written and had stopped
being true, which is the more dangerous of the two states for a document like
this to be in.

---

## Before you start

**Eleven of these eighteen stories are built.** The other seven are not, and
none of them is waiting on effort — each is blocked on something named below.

**Accounts.** Sign-in details are printed by `npm run seed:demo`. You need:

| Role | Who | Why they are here |
|---|---|---|
| Agent | Sara Ahmed | The person this whole module is for |
| Team lead | Nadia Lead | Sees the team queue and can assign from it |
| Administrator | Dalia Admin | Can reach the configuration screens |
| Auditor | Yousef Auditor | Reads everything, changes nothing — several cases turn on this |

The lead, the auditor and a second agent are not in the demo seed. Create them
from the Users screen, or the lead-versus-agent cases below compare one agent
with another and prove nothing.

**Read this before judging any timing case.** Nothing in this product computes
how long anything has taken. The service-level clock needs working hours and
holidays per branch, which is an open client question (`005 [CLARIFY-2]`), and
until it is answered every duration renders as **unavailable** with a line
saying why. That is deliberate. A case below that expects "unavailable" is not
recording a defect — it is recording the one honest answer available.

**A word on "in scope".** Every member of staff is attached to one branch and
one department and sees only records in theirs. A record elsewhere comes back
as **not found**, exactly as if it had never existed — saying "forbidden" would
confirm it exists.

**Language.** Run every case in both Arabic and English.

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

**Status:** ⚠ **Partial — the queue is built, the ORDER it promises is not.**

Automated: `backend/tests/workspace.test.js` proves the queue returns the
caller's own open tickets, that it is scope-filtered, and that the server
**states which ordering it applied** rather than leaving the screen to assume
one.

**What is NOT proven, and cannot be:** that the order reflects urgency. Nobody
has defined what urgency means — `004 [CLARIFY-1]` asks whether a high-priority
ticket with a distant deadline outranks a low-priority one near breach, and the
answer changes which ticket gets worked first.

So the queue runs the fallback `E-05` already specifies — priority, then age —
**and says so on the screen**. Step 3 above should be read as "the order is
stated and consistent", not "the order is by urgency". The day `[CLARIFY-1]` is
answered this becomes a data change rather than a rebuild.

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

**Status:** ⚠ **Partial — three of the four counters are real.**

Automated: `backend/tests/workspace.test.js` proves Open, Pending customer and
Resolved today each agree **exactly** with the list they open, because the card
and the list run the same server query — two implementations of "open" would
drift and one cannot. It also proves "today" is evaluated in the branch's own
timezone (`009 E-19`), and names the zones it used.

**The Overdue counter renders "unavailable", not a number.** Overdue means past
a target, and there is no target until `005 [CLARIFY-1]` supplies the numbers.
A `0` there would be a factual claim that nothing is overdue, which nobody can
make. Check that it says so rather than showing a zero — a zero is the defect,
not the word.

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

**Status:** ⚠ **Partial — the panel is there; three of its fields cannot be
filled.**

Built: the customer's identity, contact points, preferred language and last five
tickets appear beside the conversation, with no navigation away from a
half-written reply.

**Segments, entitlement and service-level tier each render "unavailable" with a
reason.** Segments belong to spec `001` and are not built; entitlement comes
from the ERP, which is out of scope for this phase; the tier depends on the same
unanswered service-level numbers. `FR-003`'s own words are *"MUST state
explicitly when a value is unavailable"* — so the panel saying so **is** the
requirement being met for those three, not a gap in it.

What to check: that each says *why*, not merely "unavailable". A bare
"unavailable" reads as broken; a reason reads as deliberate.

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

**Status:** ✅ **Automated** — `backend/tests/task.test.js`.

It proves creation against a ticket, the required due date and body, completion
and cancellation, and the permission split in `§9`: an agent may create and
close their own, a lead may act on a colleague's, an auditor may do neither.

The case worth reading the code for is **`E-09`**: a due date in the PAST is
**accepted**, not refused, and shows as overdue immediately. Recording a
follow-up you already owe is the normal case, and a validator added later "for
safety" would break it silently. The test exists to stop that.

Do not run this one by hand.

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

**Status:** ⚠ **Partial — the task half is built; the service-level half has
nothing to read.**

Automated: `backend/tests/task.test.js` proves both boundaries of `AS-05` as a
pure function — a task due tomorrow at 10:00 with a two-hour reminder is
*due soon* at 08:00 and *overdue* only after 10:00. Collapsing those two is the
mistake any check that merely asks "did a reminder appear" would miss.

**Three things this does NOT do, and the screen says all three:**

1. Reminders appear **in the product only**. They are not emailed or pushed —
   both need spec `003`, which does not exist.
2. They are **computed when you open the workspace**. There is no scheduler in
   this system: no cron, no queue, no worker, no timer. Nothing happens while
   nobody is looking.
3. The **service-level threshold half of `FR-005` is not built at all**, because
   the thresholds live in `005 FR-006` and `005` is blocked.

What to check by hand: that the workspace says all three. An agent who assumes
an email is coming, or that a reminder is waiting the moment it falls due, is
worse off than one who knows to look.

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

**Status:** ✅ **Automated** — `backend/tests/quick-reply.test.js`.

It proves the bilingual title and body are both required, that insertion picks
the body by the **customer's** preferred language, and — the case that matters —
that an unresolved placeholder causes the insertion to be **refused naming the
token**, rather than the raw `{{customer.name}}` reaching a customer.

The placeholder vocabulary is fixed for this phase: six tokens, chosen so that
none of them can resolve to "unavailable" (decision 41). A placeholder that
rendered "unavailable" in a customer-facing reply would be worse than one that
refused.

Worth doing by hand once: insert a token into an Arabic sentence and check the
result reads correctly. The token is a left-to-right identifier landing in
right-to-left text, which is where bidirectional rendering goes wrong.

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

**Status:** ⚠ **Partial — the wording is shared, but there is no "team".**

Automated: `backend/tests/quick-reply.test.js` proves that a personal reply is
visible only to its author, that a shared one is visible to everybody, and that
managing a shared one requires a **manager or above** — `§9`'s row, which is
narrower than `FR-007`'s floor of "a lead or above". Where a requirement gives a
floor for a pair and the matrix gives a row per member, the row describes the
individual case, and a permission takes the narrower reading.

**`FR-007` asks for THREE scopes — personal, team and global — and there are
two.** `Team` does not exist anywhere in this system (decision 20), so the
shared library is global: visible to every member of staff, not to a team. A
second agent should see a shared reply they did not write. That is correct
today and will narrow when `Team` is built.

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

**Status:** ⛔ **Not testable yet.** No knowledge base exists — spec `006` is
not built, and `006 [CLARIFY-1]` blocks it.

Nothing in this module can stand in for it: quick replies (AD-06) are wording an
agent keeps, not articles somebody approves and versions. Inserting "approved
content" needs content that has been approved.

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

**Status:** ⚠ **Partial — a colleague can be mentioned and notified; nobody
can be PULLED IN.**

Automated: `backend/tests/notification.test.js` proves a mention notifies the
named colleague, that the mention is recorded in history, that a deactivated
colleague is refused **at save time naming them** (`E-07`), and that the note is
refused **whole** if any name in it cannot be mentioned — an author who named
three colleagues and had one silently dropped believes all three were asked.

**The granting half of `FR-009` is declined, deliberately, and this is the one
case in the module where the requirement as written could not be built.**

`FR-009` says a mention *"MUST grant them access to that ticket only"*.
`010 FR-002` says *"per-user permission overrides MUST NOT exist"*. A grant to
one named person over one named record is an override on any reading, so the two
mandatory requirements cannot both hold. Decision 39 resolves it by restricting
**who may be named**: only a colleague who already holds scope on that ticket.

So the case's step 4 — mentioning somebody outside the branch — is **refused**,
not permitted. `E-08` ("permitted; the mention is an audited grant") is declined
with the clause it depends on. What survives is the part that matters: a
colleague who can already see the ticket is told their attention is wanted.

**If the client says cross-scope mentions are a real need, this is the decision
to reopen** — and it reopens into a record-level grant, which is a change to the
scope predicate and therefore to every read and write in the system.

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

**Status:** ⚠ **Partial — internal notes work; they are not a separate
discussion.**

Automated: `backend/tests/ticket.test.js` and `backend/tests/portal.test.js`
between them prove the substance — an internal note is staff-only, its
visibility is **immutable** so it can never be flipped customer-visible
afterwards, and `AS-07` holds: a ticket with internal notes shows the customer
none of them. That is enforced **in the query** on the portal, not by a filter
in the interface, so the text never reaches the customer's browser at all.

**What is not built:** a separate discussion view. Internal notes sit on the
same thread as customer messages, distinguished by an amber rule and a chip. For
a support tool that is arguably the better answer — the conversation and the
commentary about it are one story — so it is carded rather than assumed to be a
gap. Board card `internal-thread-view`.

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

**Status:** ⛔ **Not testable yet.** No presence, and nothing that would read
it.

Blocked on `004 [CLARIFY-3]`: is live chat in phase one? `AS-11` defines
presence entirely in terms of chat routing — *"an agent sets presence to away →
a chat arrives requiring their skill → it is not offered to them"*. Without
chat, presence is a status somebody sets and nothing reads.

Board card `presence-and-routing`.

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

**Status:** ⛔ **Not testable yet.** Not attempted.

`FR-012` is a **MAY** with no acceptance scenario behind it, and the story is a
*Could*. Worth doing once the screens it would drive have stopped moving —
shortcuts pointing at a layout still being designed are shortcuts that get
rebound twice. Board card `keyboard-shortcuts`.

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

**Status:** ⚠ **Partial — one of the three channels, and three of the eight
events.**

Automated: `backend/tests/notification.test.js` proves the notification centre
shows only the caller's own (`§11`'s *"user = caller only"* — an administrator
cannot see somebody else's), that marking read touches nobody else's rows, and
that `FR-013`'s grouping clause works both ways: several notifications about one
ticket inside the window become one group carrying a count, and an **escalation
is never grouped**, which the requirement states as a MUST NOT.

**In-app only.** Email and push need spec `003`, which does not exist. The
screen says so.

**Three of the eight event kinds have a producer:** assignment, mention and
customer reply. Escalation, service-level threshold, delivery failure and chat
offer have nothing that can raise them. Task-due deliberately writes no row —
with no scheduler, a row written when somebody opens the workspace would carry a
timestamp claiming a delivery that never happened.

What to check by hand: that the count on the navigation and the list on the
screen agree. They read one source for exactly that reason.

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

**Status:** ⚠ **Partial — the load half is built, the presence half is
blocked.**

Built: the team queue shows **open ticket count per colleague in scope,
including those carrying zero**. The zero rows are the point — a count built from
tickets alone can only produce people who already hold work, which is the
opposite of the question a lead is asking. Proved in
`backend/tests/team-queue.test.js`, and mutation-proved: assigning one ticket
moves one agent's number and leaves the other's alone.

**Availability is not built**, for the same reason as AD-11. So a lead can see
who is least loaded and cannot see who is actually at their desk.

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

**Status:** ✅ **Automated** — `backend/tests/draft.test.js`.

It proves a draft is saved and restored, that it is **private to its author**
(`§11`: *"user = caller AND ticket scope"*), and `AS-09`'s second clause — a
draft restored after the customer has replied is **flagged as possibly stale**
rather than silently handed back.

Two decisions are recorded here rather than inferred. Drafts are kept **seven
days** (decision 42) — long enough to survive a weekend, short enough that a
thread has usually moved on. And on reassignment (`E-02`) a draft **stays with
its author** and the new assignee never sees it: a half-written reply in
somebody else's voice is worse than no draft.

Draft text follows the same visibility rule as an internal note — staff only,
never reachable from the portal — and that holds by construction, because the
portal has no endpoint that reads drafts at all.

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

**Status:** ⚠ **Partial — three of the four views answer.**

Automated: `backend/tests/team-queue.test.js` proves the unassigned and oldest
views, the per-agent load, assignment from the list without opening each ticket
(`AS-10`), and that the whole thing is scope-bounded — proved against a caller
who **can** see the excluded ticket, so a queue that returned nothing to
everybody could not pass.

**The at-risk view is offered and REFUSES.** "At risk" is a statement about
remaining time against a target, and the clock answers unavailable. It is not
hidden and it does not show an empty list: an empty at-risk list would assert
that no ticket is at risk, which nobody knows. `AS-08` is why faking it would be
worse than useless — it requires this number to be *identical* to the one spec
`009` reports for the same ticket at the same instant, and an invented one
disagrees by construction.

**"Team" here means branch and department.** `Team` does not exist, so the
predicate runs on two of its three parts — which makes the queue **wider** than
the spec intends, not narrower. That is not new exposure: the ticket list
already returns exactly this set to exactly these callers. The screen says so.

Also not built: **bulk assignment** (`§10` names its audit event). One row at a
time. Board card `team-queue-bulk-assign`.

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

**Status:** ⛔ **Not testable yet.** Blocked on the same question as AD-01.

"Take the next one" is meaningless without an order to take the next *from*, and
`004 [CLARIFY-1]` has not defined urgency. The queue's stated fallback is honest
for a list a human reads and chooses from; it is not honest as the basis for a
button that chooses **for** them.

The concurrency half is already solved — assignment is transactional and refuses
a ticket somebody else holds. Board card `take-next-ticket`.

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

**Status:** ⚠ **Partial — the countdown renders, and what it renders is
"unavailable".**

Built: the ticket view and the queue both show the service-level state, read
from one implementation and never computed at the call site. `AS-08` requires
the ticket and the team queue to agree exactly, and they do — because there is
one source, not two.

**It says "unavailable", with a line explaining that timing needs the working
calendar.** That is the requirement being met in its degraded form, not a
missing feature: `FR-019` and the constitution both forbid computing a
substitute, and a naive difference between two timestamps would disagree with
every report spec `009` produces.

What to check: that the reason appears beside it. A bare "unavailable" reads as
broken.
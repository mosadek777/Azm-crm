# Test cases — 002 Ticket management

**32 cases.** The support request lifecycle: creating, categorising,
prioritising, assigning, moving through statuses, and the conversation on each.

**Coverage:** 5 automated · 7 partial · 0 manual · 20 not testable yet

---

## Before you start

**Accounts.** Printed by `npm run seed:demo`.

| Role | Who | What they can do here |
|---|---|---|
| Agent | Sara Ahmed | Create requests, take unassigned ones, reply to customers |
| Administrator | Dalia Admin | Assigns requests. **Cannot** post a customer-visible reply — that needs an agent, team lead or manager |
| Customer | Layla Mansour | Portal only |

**Vocabulary.** "Ticket" and "request" are the same thing — staff screens say
ticket, the customer portal says request.

**Statuses.** A request holds exactly one status, and only certain moves between
them are legal. The interface offers the legal ones; anything else is refused.
Some statuses pause the response clock and some do not, and the interface marks
which.

**A note on "not found".** Anything outside your branch and department returns
**not found**, never "forbidden" — see the same note in
`001-customer-management.md`.

---

## TM-01 — Log a request without it becoming the slow part of the job

> *As an* **agent** *I want to* **create a ticket from a handful of fields** *so
> that* **logging never becomes the slow part of the job.**

**Requirement:** `002 FR-001` (Must) — creatable from customer, subject,
description, category and priority alone; every other field optional or
defaulted.

**Preconditions**
- Signed in as Sara Ahmed. A customer exists.

**Steps**
1. Choose **New ticket**.
2. Fill in only: customer, subject, description, category, priority.
3. Save.
4. Try again leaving the subject empty.

**Expected result**
- Step 3 succeeds. Nothing else was required — no assignee, no tags, no due
  date.
- The new request opens, with a status of new and no assignee.
- Step 4 is refused, naming the missing field.

**Status:** **Automated** — `backend/tests/ticket.test.js`, sections *"FR-001 /
AS-01: create"* and *"FR-001: refuses incomplete"*.

---

## TM-02 — A number the customer and the agent can both quote

> *As the* **system** *I want to* **give every ticket a short human-readable
> reference** *so that* **customer and agent quote the same number.**

**Requirement:** `002 FR-002` (Must) — every request receives a unique,
immutable, human-quotable reference at creation. References are never reused.

**Preconditions**
- Signed in as Sara Ahmed.

**Steps**
1. Create a request and note the reference.
2. Create a second and note that reference.
3. Read the first reference aloud, as if to a customer on the phone.
4. Search for the first reference.
5. Delete or cancel a request, then create another, and check whether the
   cancelled request's reference is issued again.

**Expected result**
- The reference reads like `TKT-2026-00042` — short enough to say out loud and
  write down. Not a long internal identifier.
- The two are different.
- Step 4 finds the request.
- Step 5: the old reference is **not** reissued. A reference that comes back
  later points at two different things in two different conversations.

**Status:** ⚠ **Partial.** Automated: the format, uniqueness between two
requests, and that a caller cannot change it.
**Missing:** **never reused.** Nothing creates a request, disposes of it, and
confirms the number is not issued again. Run step 5 by hand.

---

## TM-03 — Never repeat myself to start being helped

> *As a* **customer** *I want to* **a ticket opened automatically from my email,
> message or form** *so that* **I never repeat myself to start being helped.**

**Requirement:** `002 FR-003` (Must) — the system accepts request creation from
an external channel with the same validation as manual creation, and records
where it came from.

**Preconditions**
- A working inbound channel.

**Steps**
1. Send an email to the support address.
2. Find the request that appears.
3. Check that the sender was matched to their existing customer record.
4. Check what the request records as its source.
5. Send an email missing something required and confirm it is handled the same
   way a manual creation would be.

**Expected result**
- A request is created without anyone retyping it.
- It is linked to the right customer.
- Its source says **email**, not "manual" — so reporting can tell channels
  apart.
- Validation is the same on both paths. A channel is not a way around the rules.

**Status:** ⛔ **Not testable yet.** No channel exists. The **source** field is
built and defaults correctly, so half the requirement is ready for the day a
channel arrives. Tracked as *channel-email* and its siblings.

---

## TM-04 — Categorise precisely, not approximately

> *As an* **agent** *I want to* **categorise down a multi-level tree** *so that*
> **routing and reporting are precise, not approximate.**

**Requirement:** `002 FR-004` (Must) — categories form a tree; a request points
at a leaf; the branches above a leaf cannot be selected.

**Preconditions**
- A category tree, e.g. Billing → Refunds → Late refund.

**Steps**
1. Create a request and open the category picker.
2. Try to select **Billing** — a branch, not a leaf.
3. Select **Billing → Refunds → Late refund**.
4. Save and reopen; confirm the full path is shown, not just the leaf name.

**Expected result**
- Step 2 is not selectable. A request filed under "Billing" tells a report
  nothing.
- Step 3 saves.
- Step 4 shows the whole path, so "Late refund" is not ambiguous between two
  branches that both have one.

**Status:** ⛔ **Not testable yet, and this one has already shipped
differently.** Category is currently a **single flat text field** — a deliberate
deviation taken under time pressure and recorded as such. Every request created
today holds a value the tree cannot represent, so adopting the tree later means
a data migration. Tracked as *category-tree*.

---

## TM-05 — A taxonomy that matches how we work

> *As an* **administrator** *I want to* **set default priority, team and SLA per
> category node** *so that* **the taxonomy matches how we actually work.**

**Requirement:** `002 FR-005` (Must) — each category node carries a default
priority, owning team and service-level policy, inherited by everything beneath
it unless overridden. Defaults never override an explicit choice by an agent.

**Preconditions**
- TM-04 passing. The tree must exist first.

**Steps**
1. On **Billing**, set a default priority of high and an owning team.
2. Create a request under **Billing → Refunds** without choosing a priority.
3. Create another under the same category and explicitly choose low.
4. Override the default on **Refunds** specifically, and repeat step 2.

**Expected result**
- Step 2 inherits high from the parent.
- Step 3 stays low. **An explicit choice by a person always beats a default** —
  otherwise agents learn the system overrides them and stop bothering.
- Step 4 uses the node's own value in preference to its parent's.

**Status:** ⛔ **Not testable yet.** Depends on TM-04. Also depends on the team
concept, which no specification defines — tracked separately as *scope-team*.

---

## TM-06 — Urgent looks urgent, and I can tell why

> *As an* **agent** *I want to* **set priority and see how an automatic one was
> derived** *so that* **urgent looks urgent and I can tell why.**

**Requirement:** `002 FR-006` (Must) — priority is settable by hand and
derivable by rule; the system stores and displays where it came from, naming the
rule where applicable.

**Preconditions**
- Signed in as Sara Ahmed.

**Steps**
1. Create a request and set the priority to high yourself.
2. Open it and look for an indication of **where the priority came from**.
3. Arrange for a rule to set a priority automatically.
4. Open that request and read where its priority came from.

**Expected result**
- Step 2 says the priority was set manually.
- Step 4 says it came from a rule, **and names the rule**. "Automatic" without
  naming the rule leaves an agent unable to judge whether it applied sensibly.

**Status:** ⚠ **Partial.** Automated: a manually chosen priority is stored and
reported as manual.
**Missing:** steps 3 and 4 entirely — no rules exist to derive a priority, so
the field currently has nothing to discriminate against. Note the subtlety: the
record defaults to "manual", so a version that never recorded the origin at all
would still read correctly today. The automated check catches the origin being
recorded **wrongly**, not its absence.

---

## TM-07 — Progress that is unambiguous to everyone

> *As an* **agent** *I want to* **move a ticket through a defined status
> lifecycle** *so that* **progress is unambiguous to everyone looking.**

**Requirement:** `002 FR-007` (Must) — a request holds exactly one status from
the defined set; each status carries whether it pauses the clock and whether it
is final.

**Preconditions**
- A request with status new.

**Steps**
1. Open it and look at the status control.
2. Move it to in progress.
3. Look at the status control again.
4. Try to move it directly to a status not offered.
5. Move it to a final status, then try to move it again.

**Expected result**
- Step 1 offers only the statuses legal from new.
- Step 3 offers a **different** set — what is legal depends on where you are.
- Step 4 is refused, and the refusal **names the statuses that are reachable**
  rather than only saying no.
- Step 5: a final status is final. No further move is offered or accepted.

**Status:** **Automated** — `backend/tests/ticket.test.js`, sections *"FR-007:
legal transitions"* and *"FR-008 / AS-03: undefined transition refused,
reachable named"*.

---

## TM-08 — A workflow that enforces our process

> *As an* **administrator** *I want to* **configure legal transitions and which
> statuses pause SLA** *so that* **the workflow enforces our process, not
> documents it.**

**Requirement:** `002 FR-008` (Should) — administrators define the statuses and
the legal moves between them; any move not defined is refused, naming the
reachable ones.

**Preconditions**
- Administrator access.

**Steps**
1. Open the status configuration.
2. Add a status.
3. Define which statuses it can be reached from and moved to.
4. Mark whether it pauses the response clock.
5. Confirm the new status appears in the interface for agents.
6. Confirm a move you did **not** define is refused.

**Expected result**
- All six steps work without a developer or a release.

**Status:** ⚠ **Partial.** Automated: step 6, and that the interface reads the
legal moves from the server rather than holding its own copy — so configuration
becomes possible later without changing every screen.
**Missing:** steps 1–5. **Statuses are currently fixed in the code**, so an
administrator cannot add one. Tracked as *admin-configuration*.

---

## TM-09 — Ownership never in doubt, handoffs explainable

> *As an* **agent** *I want to* **assign or reassign to an agent or team with a
> reason** *so that* **ownership is never in doubt and handoffs are
> explainable.**

**Requirement:** `002 FR-009` (Must) — assignment and reassignment record who
did it, the previous holder, the new holder **and a reason**; reassignment
notifies both people.

**Preconditions**
- A request assigned to one agent, and a second agent in the same branch and
  department.

**Steps**
1. As a team lead, reassign the request to the second agent — try first with the
   reason field empty.
2. Reassign again, this time giving a reason: "Hana owns billing this week".
3. Open the request's history.
4. Find the reassignment and read the reason.
5. Confirm both the previous and the new assignee were notified.
6. Wait, or come back later, and read the reason again.

**Expected result**
- Step 1 is refused. The reason is not optional.
- Step 2 succeeds.
- Step 4 shows **the reason as typed**, who moved it, from whom, to whom, and
  when.
- Step 5: both people are told.
- Step 6: the reason is still there. This is the point of the story — six months
  later somebody asks why this moved, and the answer is in the record.

**Status:** ⚠ **Partial — and this is the clearest example in the whole
folder.**
Automated: a reason is **required** (the empty attempt is refused), the call
succeeds when one is given, and the new assignee is correct.
**Missing:** **nothing reads the reason back.** Remove the reason from what gets
stored and every automated check still passes. The stored value is correct
today — this is a gap in the tests, not in the behaviour — but nothing would
catch it breaking. Steps 4 and 6 must be run by hand.
**Also missing:** step 5. No notification of any kind is sent to staff; tracked
as *staff-notifications* under the agent workspace.

---

## TM-10 — Nothing waits for someone to be told to take it

> *As an* **agent** *I want to* **pull an unassigned ticket from a shared
> queue** *so that* **nothing waits for someone to be told to take it.**

**Requirement:** `002 FR-010` (Must) — an agent may self-assign any unassigned
request within their scope.

**Preconditions**
- An unassigned request in Sara's branch and department. Another unassigned
  request in a **different** branch.

**Steps**
1. As Sara, filter the request list to unassigned.
2. Take one.
3. Confirm it now shows her as the assignee.
4. Release it and confirm it returns to the unassigned list.
5. Try to take the request in the other branch.

**Expected result**
- Step 2 needs nobody's permission.
- Step 3 shows the change immediately.
- Step 5 fails — that request is **not found** for her, and does not appear in
  her list at all.

**Status:** **Automated** — `backend/tests/ticket.test.js`, *"FR-010: an agent
may self-assign an unassigned ticket"* and *"and the assignee really is them"*,
with the scope refusal covered in the same suite.

---

## TM-11 — Clear a backlog without a hundred clicks

> *As a* **team lead** *I want to* **bulk assign, close or retag** *so that* **I
> clear a backlog without a hundred clicks.**

**Requirement:** `002 FR-011` (Should) — bulk actions apply per-request
permission and transition checks, report the outcome for each, and do **not**
abandon the whole batch when one fails.

**Preconditions**
- Twenty requests, of which one is in a state that cannot legally be closed.

**Steps**
1. Select all twenty.
2. Close them in bulk.
3. Read the result.

**Expected result**
- Nineteen close. The twentieth does not.
- The result names **which** one failed and why — not "1 of 20 failed".
- The nineteen are not rolled back because of the one. A bulk action that is
  all-or-nothing across twenty unrelated requests is unusable.

**Status:** ⛔ **Not testable yet.** No bulk actions exist.

---

## TM-12 — Hard cases move up before the customer pushes

> *As an* **agent** *I want to* **escalate to a senior colleague or manager with
> a note** *so that* **hard cases move up before the customer pushes.**

**Requirement:** `002 FR-012` (Must) — escalation requires a note, records the
level reached, and notifies the escalation target.

**Preconditions**
- A request, and a defined escalation target.

**Steps**
1. Escalate the request with the note field empty.
2. Escalate with a note.
3. Check the request shows it has been escalated, and to what level.
4. Confirm the escalation target was notified.
5. Escalate again and confirm the level increases rather than repeating.

**Expected result**
- Step 1 is refused — an escalation with no explanation is just a reassignment.
- Steps 2–5 all behave as described.

**Status:** ⛔ **Not testable yet.** Escalation targets and levels are defined by
the service-level engine, which is not built. Notification is not built either.

---

## TM-13 — Every action attributable

> *As an* **auditor** *I want to* **a complete immutable history of every
> change** *so that* **every action on a ticket is attributable.**

**Requirement:** `002 FR-013` (Must) — every change writes an append-only
history entry with who, when, which field, before and after. No user or role may
edit or delete history.

**Preconditions**
- A request, and an auditor account.

**Steps**
1. Create a request, assign it, change its status, and add a message.
2. Open the history.
3. Confirm there is an entry for each of the four actions.
4. On the status change, read what it moved **from** and **to**.
5. Confirm every entry names who did it and when.
6. As an administrator — the most privileged role — try to edit or delete an
   entry.

**Expected result**
- Four entries, each attributed.
- Step 4 shows both the old and the new status.
- Step 6 is impossible for anybody, including administrators. Not hidden in the
  interface — refused.

**Status:** ⚠ **Partial.** Automated: an entry is written for every change, it
records before and after, it names an actor, and editing or deleting one is
refused at the database level. `npm run audit:reconcile` additionally proves no
change exists without an entry and no entry without a change.
**Missing:** the message entry. The history shown on a request covers the
request's own changes; whether **every message** produces a visible history
entry is not asserted. Run step 1's fourth action and check step 3 by hand.

---

## TM-14 — Think out loud without the customer reading it

> *As an* **agent** *I want to* **keep internal notes separate from customer
> replies** *so that* **I think out loud without the customer reading it.**

**Requirement:** `002 FR-014` (Must) — every message is marked either
customer-visible or internal; internal messages are never delivered on any
channel and never appear on any customer-facing surface.

**Preconditions**
- A request belonging to a customer who can sign in to the portal.

**Steps**
1. As Sara, add an **internal** note with a distinctive phrase.
2. Add a **customer-visible** reply.
3. Confirm the staff view shows both, and marks which is which.
4. Sign in to the portal as the customer and open the request.
5. Search the page for the phrase from step 1.
6. As an administrator, try to post a customer-visible reply.

**Expected result**
- Step 3 shows both, clearly distinguished — an agent must never mistake one for
  the other.
- Step 4 shows only the customer-visible reply.
- Step 5 finds nothing. The internal note is not on the page in any form.
- Step 6 is **refused**: posting to a customer requires an agent, team lead or
  manager role. An administrator administers; they do not speak to customers.

**Status:** **Automated** — `backend/tests/ticket.test.js`, *"FR-014 / AS-07:
message visibility"*; and from the customer's side,
`backend/tests/portal.test.js`, *"FR-019 / AS-06: internal content never reaches
a portal surface"*, which asserts the note appears in **no** portal response.

---

## TM-15 — The evidence stays with the case

> *As an* **agent** *I want to* **attach files and paste screenshots into a
> ticket** *so that* **the evidence stays with the case.**

**Requirement:** `002 FR-015` (Must) — attachments can be added to a request and
to individual messages, subject to scanning and size limits, and their text is
indexed for search where the format allows.

**Preconditions**
- A request.

**Steps**
1. Attach a file to the request itself.
2. Attach a file to one specific message.
3. Paste a screenshot directly into the reply box.
4. Attach a file of a forbidden type, and one over the size limit.
5. Search for a word that appears only **inside** an attached document.

**Expected result**
- Steps 1–3 work; step 2's file is tied to that message, not the request as a
  whole.
- Step 4 is refused **before** anything is stored, and the attempt is recorded.
- Step 5 finds the request.

**Status:** ⛔ **Not testable yet.** No attachments anywhere. Tracked as
*attachments*, together with the scanning rule that makes them safe.

---

## TM-16 — Connected issues visibly connected

> *As an* **agent** *I want to* **link tickets as duplicate of, related to,
> blocked by** *so that* **connected issues are visibly connected.**

**Requirement:** `002 FR-016` (Should) — requests can be linked as duplicate of,
related to, blocks, blocked by. Links are symmetrical where the type implies it,
and "blocks" cannot form a loop.

**Preconditions**
- Three requests, A, B and C.

**Steps**
1. Link A as related to B.
2. Open B and confirm the link back to A is there.
3. Link A blocks B, and B blocks C.
4. Try to link C blocks A.

**Expected result**
- Step 2: the link is visible from both ends. A one-way link is invisible from
  the side that needs it.
- Step 4 is refused — that would be a loop in which nothing can ever start.

**Status:** ⛔ **Not testable yet.** No linking exists. This also blocks TM-22,
which needs "related to" for the beyond-the-window case.

---

## TM-17 — The customer ends in one thread, not two

> *As an* **agent** *I want to* **merge duplicate tickets keeping both
> conversations** *so that* **the customer ends in one thread, not two.**

**Requirement:** `002 FR-017` (Should) — merging interleaves both conversations
in true time order, preserves which reference each message arrived under, marks
the source as merged and resolves it to the survivor.

**Preconditions**
- Two requests from the same customer about the same problem, each with
  messages, interleaved in time.

**Steps**
1. Merge the second into the first.
2. Read the combined conversation.
3. Check the order of the messages against their timestamps.
4. Open the old reference.

**Expected result**
- Step 2 shows every message from both.
- Step 3: they are in **true time order**, interleaved — not one conversation
  appended to the other, which would misrepresent what was said when.
- Each message still shows which reference it came in under.
- Step 4 lands on the survivor.

**Status:** ⛔ **Not testable yet.** The field that would point a merged request
at its survivor exists; the merge operation does not.

---

## TM-18 — Each issue tracked on its own

> *As an* **agent** *I want to* **split a ticket containing several unrelated
> requests** *so that* **each issue is tracked and measured on its own.**

**Requirement:** `002 FR-018` (Could) — splitting creates a child request from
selected messages, with its own reference, category, service clock started at
the moment of the split, and a link to its parent.

**Preconditions**
- One request containing two unrelated problems.

**Steps**
1. Select the messages about the second problem.
2. Split them into a new request.
3. Check the new request's reference, category and clock.
4. Check the link between parent and child.

**Expected result**
- The child has its **own** reference and its clock starts at the split, not at
  the original creation — otherwise it is born already late.
- Parent and child are linked in both directions.

**Status:** ⛔ **Not testable yet.** The parent link field exists; the operation
does not.

---

## TM-19 — Cross-team work on the case, not in email

> *As an* **agent** *I want to* **create sub-tasks assigned to other
> departments** *so that* **cross-team work is on the case, not in email.**

**Requirement:** `002 FR-019` (Should) — sub-tasks are creatable on a request,
assignable to a different team, carry no clock of their own and are invisible to
the customer. A request cannot reach a final status with an open sub-task.

**Preconditions**
- A request, and a second department.

**Steps**
1. Create a sub-task and assign it to the other department.
2. Confirm the sub-task has no service clock of its own.
3. Sign in as the customer and confirm the sub-task is invisible.
4. Try to close the request while the sub-task is open.
5. Complete the sub-task, then close the request.

**Expected result**
- Step 4 is refused, naming the open sub-task. Closing a request whose dependent
  work is unfinished is how things get silently dropped.
- Step 5 succeeds.

**Status:** ⛔ **Not testable yet.** Needs the team concept, which no
specification defines.

---

## TM-20 — Slice reports by themes nobody predicted

> *As an* **agent** *I want to* **tag a ticket freely** *so that* **we slice
> reports by themes nobody predicted.**

**Requirement:** `002 FR-020` (Should) — tags are free text, reusable across
requests, and available as a dimension in reporting.

**Preconditions**
- Two requests.

**Steps**
1. Tag the first with a word nobody has used before.
2. Tag the second with the same word.
3. Filter the request list by that tag.
4. Run a report grouped by tag.

**Expected result**
- No administrator has to create the tag first — that is what "themes nobody
  predicted" means.
- Step 3 returns both and nothing else.
- Step 4 groups by it.

**Status:** ⚠ **Partial.** Automated: tags round-trip, the same tag is reusable
across requests, and filtering by one returns exactly the tagged requests and no
others.
**Missing:** step 4. Reporting is not built, so *"we slice reports by themes"* —
the story's actual purpose — is unproven.

---

## TM-21 — It reminds me rather than rotting

> *As an* **agent** *I want to* **set pending with a follow-up date** *so that*
> **it reminds me or auto-closes rather than rotting.**

**Requirement:** `002 FR-021` (Should) — a follow-up date is settable only on a
status that pauses the clock, and is cleared automatically when the customer
replies.

**Preconditions**
- A request.

**Steps**
1. Move it to a status that pauses the clock and set a follow-up date.
2. Move it to a status that does **not** pause the clock and try to set one.
3. Have the customer reply.
4. Check the follow-up date.
5. Wait for a follow-up date to pass and check you are reminded.

**Expected result**
- Step 1 succeeds; step 2 is refused. A follow-up date on a running clock is
  meaningless — the request is already being worked.
- Step 4: the date is **cleared**. The customer replied, so there is nothing to
  chase.
- Step 5: a reminder arrives.

**Status:** ⚠ **Partial.** Automated: a follow-up date is permitted only on a
clock-pausing status — `backend/tests/ticket.test.js`, *"FR-021: followUpAt only
on a pausing status"*.
**Missing:** steps 3–5. Nothing clears the date when the customer replies, and
no reminder exists. The story's promise — *"it reminds me"* — is entirely
unproven.

---

## TM-22 — A recurrence continues the same conversation

> *As a* **customer** *I want to* **my reply reopens a recently closed ticket**
> *so that* **a recurrence continues the same conversation.**

**Requirement:** `002 FR-022` (Must) — a customer reply within the agreed window
moves the request out of closure keeping its reference. Beyond the window it
creates a new request linked to the old one.

**Preconditions**
- A request closed two days ago, and another closed more than fourteen days ago.
  (Fourteen calendar days from closure is the agreed window.)

**Steps**
1. As the customer, reply to the recently closed request.
2. Check its status and its reference.
3. Reply to the long-closed one.
4. Check what happens.

**Expected result**
- Step 2: it is open again and **keeps its original reference** — the customer
  quotes the same number they always did.
- Step 4: a **new** request is created, linked to the old one so the history is
  connected.

**Status:** ⛔ **Not testable yet.** Neither behaviour is built. The code is
honest about it — a reply to a closed request is currently **refused** with an
explanation rather than silently doing the wrong thing. The window itself is
agreed. The beyond-the-window half also needs TM-16's linking.

---

## TM-23 — Work I cannot act on stops distracting me

> *As an* **agent** *I want to* **snooze a ticket until a chosen time** *so
> that* **work I cannot act on stops distracting me.**

**Requirement:** `002 FR-023` (Could) — a request may be snoozed to a future
time; a snoozed request still appears in reports and its clock does **not**
pause.

**Preconditions**
- A request.

**Steps**
1. Snooze it until tomorrow.
2. Confirm it leaves your working queue.
3. Run a report and confirm it is still counted.
4. Check whether the response clock paused.

**Expected result**
- Steps 2 and 3 both hold: out of sight, still counted.
- Step 4: the clock keeps running. Snoozing is the agent choosing not to look;
  it is not the customer agreeing to wait.

**Status:** ⛔ **Not testable yet.** Not built.

---

## TM-24 — Never send two contradictory answers

> *As an* **agent** *I want to* **see when a colleague is already typing on my
> ticket** *so that* **we never send two contradictory answers.**

**Requirement:** `002 FR-024` (Should) — the system shows other agents when a
colleague is composing a reply on the same request, naming them, and clears the
indicator within thirty seconds of inactivity.

**Preconditions**
- Two agents, two browsers, one request.

**Steps**
1. Agent A starts typing a reply.
2. Agent B watches the same request.
3. Agent A stops typing and waits.

**Expected result**
- Step 2: B sees that A is typing, **by name**.
- Step 3: the indicator clears within thirty seconds. A stale "someone is
  typing" that never clears is worse than none — it gets ignored.

**Status:** ⛔ **Not testable yet.** Needs a live connection between browsers,
which the current stack does not provide.

---

## TM-25 — Billing asks for an invoice number, technical does not

> *As an* **administrator** *I want to* **define custom fields per category**
> *so that* **billing asks for an invoice number, technical does not.**

**Requirement:** `002 FR-025` (Should) — administrators define custom fields per
category and per request type, with Arabic and English labels, optional required
flags and validation. Required custom fields are enforced.

**Preconditions**
- Administrator access, and at least two categories.

**Steps**
1. Define an "invoice number" field on the billing category, required, with both
   labels.
2. Try to save it with only an English label.
3. Create a billing request and confirm the field appears and is required.
4. Create a technical request and confirm it does **not** appear.

**Expected result**
- Step 2 is refused — both languages, always.
- Steps 3 and 4: the field follows the category, which is the whole point.

**Status:** ⛔ **Not testable yet.** No custom fields, and no category tree to
attach them to.

---

## TM-26 — Work the right list, not the whole list

> *As an* **agent** *I want to* **save and share filters as named views** *so
> that* **I work the right list, not the whole list.**

**Requirement:** `002 FR-026` (Should) — agents save filters as named views and
share them with a team. **A shared view applies the viewer's own scope, never
the author's.**

**Preconditions**
- Two agents in **different** branches.

**Steps**
1. Agent A builds a filter and saves it as a named view.
2. Agent A shares it with the team.
3. Agent B, in another branch, opens the shared view.
4. Compare what B sees with what A sees.

**Expected result**
- B sees the same **filter** applied to **B's own** records.
- B does **not** see A's branch's requests. The view carries the filter, not the
  author's permissions.

**Status:** ⛔ **Not testable yet.** Not built — and note step 4 carries a
non-negotiable access rule. If saved views are ever built casually, that is the
clause that gets missed, and the failure would be a silent cross-branch
disclosure rather than an error.

---

## TM-27 — Find how we solved this last time

> *As an* **agent** *I want to* **search full text across tickets, replies and
> attachments** *so that* **I find how we solved this last time.**

**Requirement:** `002 FR-027` (Must) — search covers subject, message bodies,
tags, reference, customer identity and extractable attachment text, in Arabic
and English, and matches Arabic regardless of diacritics.

**Preconditions**
- A request with a distinctive word in its subject, another with a distinctive
  word only in a reply, and an Arabic request whose subject can be typed with
  and without diacritics.

**Steps**
1. Search for the word in the subject.
2. Search for the word that appears only in a reply.
3. Search for a reference.
4. Search for a customer's name.
5. Search the Arabic subject **with** diacritics, then **without**.
6. Search for a word that appears nowhere.

**Expected result**
- Steps 1–4 each find the right request.
- Step 5 returns the **same** request both times. Arabic is written with and
  without diacritics interchangeably, and a search that distinguishes them is
  unreliable in a way an English search is not.
- Step 6 returns nothing — a search returning everything would satisfy the
  earlier steps for the wrong reason.

**Status:** ⚠ **Partial.** Automated: search by subject and by reference, plus
the empty case that stops the others passing vacuously.
**Missing:** message bodies, customer identity, attachment text, and
**diacritic-insensitive Arabic**. The last one matters most: it means Arabic
search is currently less reliable than English search, in a product whose first
principle is that the two languages are equals.

---

## TM-28 — Measure real effort

> *As a* **support manager** *I want to* **time logged against tickets** *so
> that* **we measure real effort and bill it where relevant.**

**Requirement:** `002 FR-028` (Could) — time may be logged against a request by
an agent, per entry, with a duration and an optional note.

**Preconditions**
- A request.

**Steps**
1. Log forty minutes with a note.
2. Log a further twenty minutes.
3. Read the total.
4. Run a report of time by agent.

**Expected result**
- Entries accumulate rather than replacing one another, and the total is one
  hour.

**Status:** ⛔ **Not testable yet.** Not built.

---

## TM-29 — Trend analysis with something honest to analyse

> *As an* **agent** *I want to* **record root cause and resolution code at
> closure** *so that* **trend analysis has something honest to analyse.**

**Requirement:** `002 FR-029` (Should) — where a status requires them, moving to
it is refused without a root cause and a resolution code chosen from the defined
lists.

**Preconditions**
- A status configured to require them.

**Steps**
1. Try to move a request to that status without choosing either.
2. Choose a root cause and a resolution code from the lists.
3. Move it again.
4. Run a report grouped by root cause.

**Expected result**
- Step 1 is refused, naming both missing fields.
- Step 3 succeeds.
- Step 4 groups by real values, not free text. Free text cannot be grouped, which
  is why these are lists.

**Status:** ⛔ **Not testable yet.** **The client has not supplied the lists.**
This is deliberately unbuilt rather than guessed: these values become the
vocabulary every future report groups by, and inventing plausible ones would
seed reporting with a made-up classification nobody would later recognise as
invented.

---

## TM-30 — Today's answer becomes tomorrow's self-service

> *As an* **agent** *I want to* **turn a resolved ticket into a knowledge base
> draft** *so that* **today's answer becomes tomorrow's self-service.**

**Requirement:** `002 FR-030` (Should) — an agent can create a knowledge draft
from a request, pre-filled with the resolution, entering the review workflow. It
is never published automatically.

**Preconditions**
- A resolved request with a good answer in it.

**Steps**
1. Choose to create a knowledge article from it.
2. Check what has been pre-filled.
3. Check the article's state.
4. Check whether it is visible to customers.

**Expected result**
- The resolution is carried across so the agent edits rather than retypes.
- The article is a **draft** awaiting review. Nothing an agent wrote in a hurry
  to one customer is published to all of them without somebody reading it first.

**Status:** ⛔ **Not testable yet.** No knowledge base exists.

---

## TM-31 — My ticket is not closed while still broken

> *As a* **customer** *I want to* **closure only after I confirm or a grace
> period passes** *so that* **my ticket is not closed while still broken.**

**Requirement:** `002 FR-031` (Should) — moving from resolved to closed happens
on explicit customer confirmation, or automatically after the agreed grace
period.

**Preconditions**
- A request marked resolved.

**Steps**
1. As the customer, confirm the resolution.
2. Check the status.
3. On a second resolved request, do nothing and wait out the grace period.
4. Check that status.

**Expected result**
- Step 2: closed, because the customer said so.
- Step 4: closed automatically, because they did not object.

**Status:** ⛔ **Not testable yet.** **Automatic closure is deliberately not
built** — the grace period is a business duration and the engine that measures
business durations does not exist. Closing on a naive count of days would close
requests over a weekend or a public holiday. Customer confirmation is also not
built.

---

## TM-32 — A complaint is not processed like a password reset

> *As an* **administrator** *I want to* **define ticket types with their own
> fields and workflow** *so that* **a complaint is not processed like a password
> reset.**

**Requirement:** `002 FR-032` (Should) — administrators define request types,
each with its own field set, category subtree and permitted statuses.

**Preconditions**
- Administrator access.

**Steps**
1. Define a "complaint" type with its own fields and its own statuses.
2. Define a "password reset" type with a shorter workflow.
3. Create one of each and confirm they offer different fields and different
   statuses.

**Expected result**
- The two types behave differently without a code change.

**Status:** ⛔ **Not testable yet.** Not built. Depends on the same
administrator-configuration work as TM-08 and TM-25.

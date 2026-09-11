# Test cases — 005 Service levels and automation

**18 cases.** Response and resolution targets, the clocks that measure them,
escalation when they slip, and the rules that route and act without a person.

**Coverage:** 0 automated · 0 partial · 0 manual · 18 not testable yet

---

## Before you start

⛔ **Nothing in this module is built**, and it blocks more of the product than
any other unbuilt module.

**Why it blocks so much.** One shared component in this system is the *only*
thing permitted to calculate a duration, and it deliberately reports
**"unavailable"** until this module defines what pauses a clock and how working
hours and holidays are handled. Nothing else anywhere subtracts two dates. That
is a rule held on purpose: an apparently obvious "created until now" subtraction
is wrong the moment a clock can pause, and wrong **silently**.

So every countdown, every at-risk marker, every duration in a report, and
automatic closure all wait here.

**Two things are missing before any of it can be built**, and neither is effort:

| Missing | Consequence |
|---|---|
| The **target times** themselves — what first response and resolution must be, per priority and tier | Every case below can be built against a configurable target, but none can be *verified* against a number nobody has agreed |
| **Business hours and holiday sets** | The branch record already points at both, and **neither exists**. A clock that does not know a weekend measures nothing useful |

**A note on fairness.** Several cases below exist because a target measured
naively punishes the wrong person — an agent measured on a customer's delay, or
on hours when the office was shut. That is the substance of SLA-03, SLA-04 and
SLA-17, and it is why they are mandatory rather than refinements.

---

## SLA-01 — Commitments written down and measurable

> *As a* **support manager** *I want to* **define policies with first-response
> and resolution targets** *so that* **our commitments are written down and
> measurable.**

**Requirement:** `005 FR-001` (Must)

**Preconditions**
- Manager access.

**Steps**
1. Create a policy with a first-response target and a resolution target.
2. Save it and reopen it.
3. Apply it to a request and confirm both targets appear on that request.

**Expected result**
- Both targets are stored, editable, and visible on requests the policy governs.
- A policy with no target is refused — an unmeasurable commitment is not a
  commitment.

**Status:** ⛔ **Not testable yet.** No policy record exists. Also waiting on
the client to supply the target figures.

---

## SLA-02 — Differentiate instead of promising everyone the same

> *As a* **support manager** *I want to* **vary targets by priority, category,
> tier, channel, department, branch** *so that* **we differentiate instead of
> promising everyone the same.**

**Requirement:** `005 FR-002` (Must)

**Preconditions**
- SLA-01 working, and more than one branch, department and priority.

**Steps**
1. Define a target for high priority and a different one for low.
2. Define a different target for one customer tier.
3. Create requests matching each and check which target applied.
4. Create a request matching **two** rules and check which one wins.

**Expected result**
- Each request gets the right target.
- Step 4: the resolution order is defined and predictable, not incidental. Two
  policies matching one request must not produce a different answer depending on
  which was created first.

**Status:** ⛔ **Not testable yet.** Note this also depends on customer tier and
segments, which do not exist as records.

---

## SLA-03 — Targets fair to agents who are not at their desks

> *As an* **administrator** *I want to* **clocks that respect business hours,
> weekends and per-branch holidays** *so that* **targets are fair to agents who
> are not at their desks.**

**Requirement:** `005 FR-003` (Must)

**Preconditions**
- Business hours and a holiday set configured for a branch.

**Steps**
1. Create a request at 16:00 on a Thursday with a four-hour response target,
   where the working day ends at 17:00 and Friday is not a working day.
2. Check when the target falls due.
3. Repeat on the day before a public holiday.
4. Compare two branches in different time zones with the same policy.

**Expected result**
- Step 2: the target falls due **three hours into the next working day**, not at
  20:00 that evening.
- Step 3 skips the holiday.
- Step 4: each branch is measured in its own working time. A branch is not late
  because another branch's office was open.

**Status:** ⛔ **Not testable yet.** **Business hours and holiday sets do not
exist.** The branch record carries a reference to each, pointing at nothing —
they were specified, referenced in code, and never built.

---

## SLA-04 — Not measured on someone else's delay

> *As an* **agent** *I want to* **the clock paused while waiting on the customer
> or a third party** *so that* **I am not measured on someone else's delay.**

**Requirement:** `005 FR-004` (Must)

**Preconditions**
- SLA-03 working. A request with a running clock.

**Steps**
1. Move the request to a status that pauses the clock — waiting on the customer.
2. Wait, then read the time remaining.
3. Have the customer reply, moving it back to a running status.
4. Read the time remaining again.
5. Repeat with a status that waits on a **supplier** rather than the customer.
6. Repeat with a status that waits on another **internal** team.

**Expected result**
- Step 2: the remaining time has not moved.
- Step 4: the clock resumes from where it stopped, not from the beginning.
- Step 5 pauses. Step 6 does **not** — an internal team's delay is still the
  organisation's delay, and this distinction is why the two waiting statuses
  were separated.

**Status:** ⛔ **Not testable yet.** Which statuses pause is already decided and
**already recorded on every status** — that groundwork exists and is tested. The
clock that would honour it does not.

---

## SLA-05 — Prioritise by deadline, not instinct

> *As an* **agent** *I want to* **time remaining, at-risk and breached shown on
> every ticket** *so that* **I prioritise by deadline, not instinct.**

**Requirement:** `005 FR-005` (Must)

**Preconditions**
- SLA-01 to SLA-04 working.

**Steps**
1. Open a request well inside its target and read the remaining time.
2. Open one near its threshold and confirm it is marked at risk.
3. Open one past its target and confirm it is marked breached.
4. Check the same markers appear in the request **list**, not only on the
   request.

**Expected result**
- Three visibly distinct states, on both the list and the request.
- The marker is not colour alone — an at-risk request must be identifiable
  without distinguishing red from amber.

**Status:** ⛔ **Not testable yet.** The request view already reads its duration
from the shared component and displays whatever it returns, which is currently
"unavailable". The display path is ready; the engine behind it is not.

---

## SLA-06 — Breaches pre-empted rather than reported

> *As a* **support manager** *I want to* **notifications at configurable
> thresholds to agent, lead, manager** *so that* **breaches are pre-empted
> rather than reported.**

**Requirement:** `005 FR-006` (Must)

**Preconditions**
- SLA-05 working, and staff notifications working.

**Steps**
1. Configure thresholds at 50%, 80% and 100% of the target.
2. Set who is told at each.
3. Let a request pass each threshold.
4. Check who was notified and when.

**Expected result**
- The agent hears first, the lead later, the manager at breach — escalating
  attention rather than telling everybody at once.
- Every notification arrives **before** the breach except the last. A breach
  notification alone is a report.

**Status:** ⛔ **Not testable yet.** Depends on the clock and on staff
notifications, neither of which exists.

---

## SLA-07 — An ageing ticket cannot be quietly ignored

> *As a* **support manager** *I want to* **multi-level time-based escalation
> rules** *so that* **an ageing ticket cannot be quietly ignored.**

**Requirement:** `005 FR-007` (Must)

**Preconditions**
- SLA-06 working.

**Steps**
1. Define escalation at two levels with different targets.
2. Let a request age past the first.
3. Confirm it escalates, records the level, and notifies the target.
4. Let it age past the second.
5. Confirm it escalates again rather than repeating level one.

**Expected result**
- Each level is recorded on the request, so its history shows how far it went.
- Escalation is automatic — the story is about the request nobody is looking at.

**Status:** ⛔ **Not testable yet.** This is also what request-level escalation
in the ticket module waits on: escalation targets are defined here.

---

## SLA-08 — Nobody hand-sorts the queue every morning

> *As a* **support manager** *I want to* **automatic assignment by round robin,
> load, or skill and language** *so that* **nobody hand-sorts the queue every
> morning.**

**Requirement:** `005 FR-008` (Must)

**Preconditions**
- Several agents with differing skills, languages and loads.

**Steps**
1. Configure round-robin assignment and create four requests.
2. Check they were distributed evenly.
3. Switch to load-based and create more against uneven loads.
4. Switch to skill-and-language and create an Arabic request needing a specific
   skill.
5. Confirm every automatic assignment respects branch and department access.

**Expected result**
- Each strategy behaves as named.
- Step 4 reaches someone who can actually answer.
- Step 5 is non-negotiable: automation must not assign a request to somebody who
  would not be allowed to open it.

**Status:** ⛔ **Not testable yet.** The agent record carries skills, languages
and a capacity figure already — the data is there, the engine is not.

---

## SLA-09 — Tickets land with someone who can act today

> *As an* **administrator** *I want to* **assignment that skips offline,
> on-leave and at-capacity agents** *so that* **tickets land with someone who
> can act today.**

**Requirement:** `005 FR-009` (Should)

**Preconditions**
- SLA-08 working. One agent offline, one at capacity, one available.

**Steps**
1. Let automatic assignment run.
2. Check who received the request.
3. Set every agent unavailable and create another request.

**Expected result**
- The available agent receives it.
- Step 3: the request stays **unassigned and visible** rather than being given
  to somebody who cannot act. A request assigned to an absent agent is worse
  than an unassigned one, because it no longer looks like it needs anybody.

**Status:** ⛔ **Not testable yet.** Depends on presence, which is part of the
unbuilt agent workspace.

---

## SLA-10 — A process change does not need a developer

> *As an* **administrator** *I want to* **if-this-then-that rules for routing,
> tagging, priority, notification** *so that* **a process change does not need a
> developer.**

**Requirement:** `005 FR-010` (Must)

**Preconditions**
- Administrator access.

**Steps**
1. Build a rule: when a request is created in the billing category with high
   priority, tag it and assign it to a named team.
2. Enable it.
3. Create a matching request and a non-matching one.
4. Check the rule fired on the first and not the second.
5. Change the rule and confirm the change takes effect without a release.

**Expected result**
- All five steps are possible from the interface, by an administrator.

**Status:** ⛔ **Not testable yet.** Everything configurable in this product is
currently a value in the code, so this is the largest single piece of the
module.

---

## SLA-11 — Do not discover the mistake on the live queue

> *As an* **administrator** *I want to* **simulate a rule against recent tickets
> before enabling it** *so that* **I do not discover the mistake on the live
> queue.**

**Requirement:** `005 FR-011` (Could)

**Preconditions**
- SLA-10 working, and a month of historical requests.

**Steps**
1. Build a rule but do not enable it.
2. Simulate it against the last month.
3. Read how many requests it would have matched, and which.
4. Confirm nothing was actually changed.

**Expected result**
- Step 3 names the requests, not just a count — "412 requests would have been
  reassigned" is alarming without being informative.
- Step 4: simulation touches nothing. A dry run that writes is not a dry run.

**Status:** ⛔ **Not testable yet.**

---

## SLA-12 — Surprising behaviour is explainable, not spooky

> *As an* **agent** *I want to* **see which automations fired on the ticket and
> why** *so that* **surprising behaviour is explainable, not spooky.**

**Requirement:** `005 FR-012` (Should)

**Preconditions**
- SLA-10 working, with a rule that fires.

**Steps**
1. Create a request that matches a rule.
2. Open its history.
3. Find what the automation did, which rule did it, and what condition matched.

**Expected result**
- The history says **which rule** and **why it matched** — not "priority changed
  by system". An agent who cannot see why their request moved stops trusting the
  system and starts working around it.

**Status:** ⛔ **Not testable yet.** The history that would carry it already
exists, records who did what, and already permits a non-human actor.

---

## SLA-13 — Automations cannot fight each other or run away

> *As an* **administrator** *I want to* **rule ordering and loop protection**
> *so that* **automations cannot fight each other or run away.**

**Requirement:** `005 FR-013` (Should)

**Preconditions**
- SLA-10 working.

**Steps**
1. Create two rules whose actions each satisfy the other's condition.
2. Enable both and create a matching request.
3. Watch what happens.
4. Reorder two rules and confirm the order changes the outcome predictably.

**Expected result**
- Step 3: the cascade stops at a defined bound and is **recorded** as having
  been stopped. It does not run until something else breaks.
- Step 4: ordering is explicit and controllable, not incidental.

**Status:** ⛔ **Not testable yet.** Worth designing before SLA-10 is built
rather than after — loop protection retrofitted to a live rules engine is much
harder than loop protection designed into one.

---

## SLA-14 — Routine follow-through without remembering

> *As an* **administrator** *I want to* **scheduled automations — auto-close,
> CSAT send, due reminders** *so that* **routine follow-through happens without
> remembering.**

**Requirement:** `005 FR-014` (Must)

**Preconditions**
- SLA-03 working, so "three working days" means something.

**Steps**
1. Configure automatic closure a set period after resolution.
2. Resolve a request and wait out the period.
3. Confirm it closed, and that the history says the system closed it.
4. Confirm the period was measured in **working** time.

**Expected result**
- Step 3: closure is attributed to the automation, not to the last human who
  touched it.
- Step 4 is the reason this waits on SLA-03. A grace period counted in plain
  days closes requests over a weekend or a public holiday, when the customer had
  no chance to object.

**Status:** ⛔ **Not testable yet.** **Automatic closure is deliberately not
built** for exactly the reason in step 4 — closure currently happens only on
explicit confirmation.

---

## SLA-15 — Fix causes instead of counting symptoms

> *As a* **support manager** *I want to* **a reason recorded against each
> breach** *so that* **we fix causes instead of counting symptoms.**

**Requirement:** `005 FR-015` (Should)

**Preconditions**
- SLA-05 working, and a breached request.

**Steps**
1. Open the breached request.
2. Record a reason for the breach.
3. Run a report grouped by breach reason.

**Expected result**
- Step 3 is the point: "we missed 40 targets" is a symptom; "31 of them were
  waiting on the same supplier" is a cause.

**Status:** ⛔ **Not testable yet.** Depends on the clock and on reporting.

---

## SLA-16 — One outage does not destroy a quarter of metrics

> *As a* **support manager** *I want to* **pause SLA globally during a declared
> major incident** *so that* **one outage does not destroy a quarter of
> metrics.**

**Requirement:** `005 FR-016` (Could)

**Preconditions**
- SLA-04 working.

**Steps**
1. Declare a major incident.
2. Confirm clocks pause across affected requests.
3. End the incident and confirm they resume.
4. Check the pause is recorded and visible in reporting.

**Expected result**
- Step 4 matters: a global pause that is invisible afterwards is
  indistinguishable from metrics being quietly edited. The report must show that
  a pause was declared, by whom, and for how long.

**Status:** ⛔ **Not testable yet.**

---

## SLA-17 — The target reflects the commitment we made

> *As the* **system** *I want to* **start the clock at the next business hour
> for out-of-hours tickets** *so that* **the target reflects the commitment we
> made.**

**Requirement:** `005 FR-017` (Must)

**Preconditions**
- SLA-03 working.

**Steps**
1. Create a request at 22:00, well outside working hours.
2. Read when its response target falls due.
3. Create another at 09:00 inside working hours with the same policy.
4. Compare.

**Expected result**
- Step 2: the clock starts at the next working hour, so a four-hour target due
  at 13:00 the next day — not at 02:00 while everyone is asleep.
- The commitment was "four working hours", and that is what is measured.

**Status:** ⛔ **Not testable yet.** Depends on business hours, which do not
exist.

---

## SLA-18 — Money does not move without a second signature

> *As a* **support manager** *I want to* **an approval step for sensitive
> resolutions such as refunds** *so that* **money does not move without a second
> signature.**

**Requirement:** `005 FR-018` (Could)

**Preconditions**
- A resolution type marked as requiring approval.

**Steps**
1. As an agent, resolve a request with that resolution type.
2. Confirm it enters an awaiting-approval state rather than resolving.
3. As the same agent, try to approve your own.
4. As a manager, approve it.
5. Check the history records both the request and the approval, with both names.

**Expected result**
- Step 3 is refused. An approval you can grant yourself is not an approval —
  this is the entire point of the story.
- Step 5 shows two distinct people.

**Status:** ⛔ **Not testable yet.** Note step 3 is a permission rule of a kind
the system does not currently express: "not the same person as" is different
from every access rule built so far, which are all about role and place.

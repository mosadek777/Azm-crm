# Test cases — 009 Reports and management information

**21 cases.** Volume, backlog, target attainment, agent performance, customer
satisfaction and the dashboards over them.

**Coverage:** 0 automated · 0 partial · 0 manual · 21 not testable yet

---

## Before you start

⛔ **Nothing in this module is built, and it is blocked twice over.**

**1. Most figures worth reporting are durations**, and durations wait on the
service-level engine. One shared component is the only thing permitted to
calculate elapsed time and it reports "unavailable" today. Response time,
resolution time, attainment, ageing — all of it.

**2. The grouping dimensions do not exist.** Root cause and resolution codes
have not been supplied by the client; segments and customer tier were specified
and never built. A report can currently group by category, status, priority,
branch, department and agent — and by nothing that explains *why* anything
happened.

**A report built today could count requests and very little else.** That is not
a reason to defer the cases; it is the reason to write them now, so that when
the engine lands the reports are specified rather than improvised.

---

## ⚠ One figure here is degenerate today, and will silently lie

**Reopen rate, and any metric whose denominator is "requests closed".**

Automatic closure is deliberately not built — a request closes only on explicit
confirmation. So "requests closed" counts only the ones somebody actively
confirmed, which is a small and unrepresentative subset. A reopen rate computed
against it will look **excellent** and mean nothing.

RP-07 carries this warning. It applies to RP-03 and RP-04 as well whenever
closure is the denominator. Do not publish any of these three until either
automatic closure exists or the denominator is stated explicitly on the report
itself.

---

## ⚠ RP-21 is not yet a ratified requirement

`RP-21` traces to `009 FR-025`, which is recorded as **awaiting review** rather
than accepted. Its case is written below like any other, but it should not be
built until the requirement is ratified. It is included so the review has
something concrete to judge.

---

## RP-01 — Understand where demand comes from

> *As a* **support manager** *I want to* **volume by period, channel, category,
> department, branch, priority** *so that* **I understand where demand comes
> from.**

**Requirement:** `009 FR-001` (Must)

**Preconditions**
- Several months of requests across branches, departments and priorities.

**Steps**
1. Open the volume report for last month.
2. Group by category, then by branch, then by priority.
3. Group by channel.
4. Change the period and confirm the figures change.
5. Sum a grouped breakdown and compare with the ungrouped total.

**Expected result**
- Step 5 is the check that matters: the parts add up to the whole. A breakdown
  that does not reconcile with its own total is worse than no breakdown.
- Step 3 currently has one value — every request comes from the interface or the
  portal — which is honest rather than broken.

**Status:** ⛔ **Not testable yet.** This is the **least blocked** case in the
file: counting requests by dimension needs no duration and no missing entity.

---

## RP-02 — Accumulating risk visible before a crisis

> *As a* **support manager** *I want to* **backlog and ageing by bucket** *so
> that* **accumulating risk is visible before a crisis.**

**Requirement:** `009 FR-002` (Must)

**Preconditions**
- Open requests of varying ages.

**Steps**
1. Open the backlog report.
2. Read the ageing buckets — under a day, one to three days, over a week.
3. Compare with last week's snapshot.
4. Confirm paused requests are identifiable within the buckets.

**Expected result**
- Step 3 needs a stored snapshot: backlog is meaningful as a **trend**, and a
  figure recomputed from scratch each time cannot show one.
- Step 4: a request waiting on the customer for a week is not the same risk as
  one nobody has touched for a week, and a bucket that mixes them misleads.

**Status:** ⛔ **Not testable yet.** Ageing needs the duration component; step 4
needs the pause semantics.

---

## RP-03 — State our performance with evidence

> *As a* **support manager** *I want to* **SLA compliance for response and
> resolution by team, agent, tier** *so that* **I state our performance with
> evidence.**

**Requirement:** `009 FR-003` (Must)

**Preconditions**
- The service-level engine working, with history.

**Steps**
1. Open the attainment report.
2. Read response and resolution attainment separately.
3. Group by agent, then by tier.
4. Drill into a failing group and read the underlying requests.
5. Confirm the percentage states its denominator.

**Expected result**
- Response and resolution are reported separately — they fail for different
  reasons.
- Step 5: "94%" without saying of what is not evidence. See the degeneracy
  warning above.

**Status:** ⛔ **Not testable yet.** Blocked on the engine, and on the team
concept for the team grouping.

---

## RP-04 — Coach on facts, not impressions

> *As a* **support manager** *I want to* **per-agent volume, response,
> resolution, reopen rate, satisfaction** *so that* **I coach on facts, not
> impressions.**

**Requirement:** `009 FR-004` (Must)

**Preconditions**
- Several agents with history.

**Steps**
1. Open the per-agent report.
2. Read each figure for one agent.
3. Drill into the requests behind a figure.
4. Confirm an agent can see their own figures.
5. Confirm the report respects the viewer's own access.

**Expected result**
- Step 3: every number is traceable to the requests behind it. A performance
  figure a person cannot interrogate is not a basis for a conversation about
  their work.
- Step 5: a lead sees their own teams, not everybody.

**Status:** ⛔ **Not testable yet.** Reopen rate is degenerate — see the warning
above.

---

## RP-05 — The customer voice reaches the people who decide

> *As a* **support manager** *I want to* **satisfaction scores with trend and
> free-text comments** *so that* **the customer voice reaches the people who
> decide.**

**Requirement:** `009 FR-005` (Must)

**Preconditions**
- Customer ratings collected.

**Steps**
1. Open the satisfaction report.
2. Read the score and its trend.
3. Read the free-text comments.
4. Filter to low scores and read only those.

**Expected result**
- Step 3 is the substance. A score tells a manager something is wrong; the
  comments tell them what.

**Status:** ⛔ **Not testable yet.** Customer rating is not built, so there is
nothing to report.

---

## RP-06 — Support health without asking anyone

> *As an* **executive** *I want to* **one dashboard with headline KPIs and
> trends** *so that* **I see support health without asking anyone.**

**Requirement:** `009 FR-006` (Must)

**Preconditions**
- The reports above working.

**Steps**
1. Open the executive dashboard.
2. Read the headline figures and their direction of travel.
3. Confirm every figure agrees with the detailed report behind it.
4. Confirm it loads without configuration.

**Expected result**
- Step 3: the dashboard and the reports are the same numbers. Two views
  disagreeing is how an organisation stops trusting both.

**Status:** ⛔ **Not testable yet.**

---

## RP-07 — Manage quality, not just speed

> *As a* **support manager** *I want to* **first-contact resolution and reopen
> rate** *so that* **we manage quality, not just speed.**

**Requirement:** `009 FR-007` (Should)

**Preconditions**
- Resolved and reopened requests.

**Steps**
1. Open the quality report.
2. Read first-contact resolution.
3. Read reopen rate.
4. **Read what the reopen rate's denominator is.**

**Expected result**
- Step 4 is the case. See the degeneracy warning at the top of this file: while
  closure requires explicit confirmation, this figure is computed over a small
  self-selected subset and will look excellent regardless of reality.
- Until that is resolved, the report must state its denominator on its face.

**Status:** ⛔ **Not testable yet**, and **must not be published when it
becomes possible** without the denominator fix.

---

## RP-08 — Invest in channels that actually work

> *As a* **support manager** *I want to* **channel comparison on volume,
> resolution time, satisfaction** *so that* **we invest in channels that
> actually work.**

**Requirement:** `009 FR-008` (Should)

**Preconditions**
- More than one channel in use.

**Steps**
1. Open the channel comparison.
2. Compare volume, resolution time and satisfaction across channels.
3. Confirm each channel's figures use the same definitions.

**Expected result**
- Comparable numbers. A channel measured differently from another cannot be
  compared with it.

**Status:** ⛔ **Not testable yet.** Only one channel exists.

---

## RP-09 — Demonstrate what the portal and base are worth

> *As a* **support manager** *I want to* **self-service deflection reporting**
> *so that* **I demonstrate what the portal and base are worth.**

**Requirement:** `009 FR-009` (Should)

**Preconditions**
- The knowledge base in use from the portal.

**Steps**
1. Open the deflection report.
2. Read how many customers read an article and did not raise a request.
3. Read how many read one and raised a request anyway.
4. Read the searches that returned nothing.

**Expected result**
- Steps 3 and 4 are the useful halves. Step 2 alone flatters the base; the other
  two say what to write next.

**Status:** ⛔ **Not testable yet.** No knowledge base.

---

## RP-10 — Take a fix upstream to another department

> *As a* **support manager** *I want to* **top categories and root causes with
> period-on-period change** *so that* **I take a fix upstream to another
> department.**

**Requirement:** `009 FR-010` (Must)

**Preconditions**
- Root causes recorded at closure.

**Steps**
1. Open the report and read the top categories this month against last.
2. Read the top root causes the same way.
3. Drill into a rising root cause.
4. Export it to take to another department.

**Expected result**
- Step 2 is the whole story: a category says what the request was about, a root
  cause says why it happened, and only the second is actionable by somebody
  outside support.

**Status:** ⛔ **Not testable yet.** **Root-cause values have not been supplied
by the client.** They are deliberately not invented — these values become the
vocabulary every future report groups by, and plausible-looking invented ones
would be indistinguishable from real ones later.

---

## RP-11 — Answer a question I did not anticipate

> *As a* **support manager** *I want to* **filter every report by date,
> department, branch, team, agent, channel, segment** *so that* **I answer a
> question I did not anticipate.**

**Requirement:** `009 FR-011` (Must)

**Preconditions**
- Any report.

**Steps**
1. Apply each filter in turn.
2. Combine several.
3. Confirm the filters are the same on every report.
4. Confirm filtering never widens what the viewer can see.

**Expected result**
- Step 3: one filter vocabulary across all reports, so a manager learns it once.
- **Step 4 is non-negotiable.** A filter selects within what the viewer may
  already see; it never grants access to another branch's data.

**Status:** ⛔ **Not testable yet.** Segment filtering additionally needs the
segment record type, which does not exist.

---

## RP-12 — The number is verifiable, not believed

> *As a* **support manager** *I want to* **drill from any chart to the
> underlying tickets** *so that* **the number is verifiable, not believed.**

**Requirement:** `009 FR-012` (Should)

**Preconditions**
- Any chart.

**Steps**
1. Click a bar or segment.
2. Read the list of requests behind it.
3. Count them and compare with the figure.
4. Confirm the list respects the viewer's access.

**Expected result**
- Step 3: the count matches **exactly**. This is the same rule as the agent's
  counters agreeing with their lists, and it fails the same way — one
  disagreement and nobody trusts any of the numbers again.

**Status:** ⛔ **Not testable yet.**

---

## RP-13 — The analysis travels outside the system

> *As a* **support manager** *I want to* **export any report to Excel, CSV or
> PDF** *so that* **the analysis travels outside the system.**

**Requirement:** `009 FR-013` (Must)

**Preconditions**
- Any report, and Arabic content in it.

**Steps**
1. Export to each format.
2. Open each and compare with the on-screen report.
3. Open the Arabic export and check the text renders correctly and the column
   order mirrors.
4. Confirm the export is recorded in the audit trail.
5. Confirm the export contains only what the exporter may see.

**Expected result**
- Step 3 is a distinct problem from rendering on screen, and the one most often
  broken — Arabic in a spreadsheet or a PDF frequently reverses or loses its
  shaping.
- Step 4: exporting is how data leaves, so it is audited.
- Step 5: an export must not be a way around the access rules.

**Status:** ⛔ **Not testable yet.**

---

## RP-14 — Stakeholders informed without me remembering

> *As a* **support manager** *I want to* **scheduled reports to a distribution
> list** *so that* **stakeholders are informed without me remembering.**

**Requirement:** `009 FR-014` (Should)

**Preconditions**
- RP-13 working, and an outbound channel.

**Steps**
1. Schedule a report weekly to a list.
2. Confirm it arrives.
3. Confirm each recipient's copy respects **their own** access, not the
   scheduler's.

**Expected result**
- Step 3 is the trap in this feature. A scheduled report is generated without
  anybody present, and the easy implementation runs it as the scheduler and
  sends the same file to everybody — which can disclose one branch's data to
  another.

**Status:** ⛔ **Not testable yet.**

---

## RP-15 — Not limited to what was imagined at build time

> *As a* **support manager** *I want to* **build custom reports from fields,
> filters, groupings, chart types** *so that* **I am not limited to what was
> imagined at build time.**

**Requirement:** `009 FR-015` (Should)

**Preconditions**
- Reporting working.

**Steps**
1. Build a report choosing fields, filters, grouping and a chart type.
2. Save and name it.
3. Share it and confirm the viewer's own access applies, not the author's.
4. Confirm a custom report cannot reach fields the author may not see.

**Expected result**
- Steps 3 and 4: the same rule as shared saved views on requests. A report
  builder is the most likely place for it to be forgotten, because the builder
  works with fields rather than records.

**Status:** ⛔ **Not testable yet.**

---

## RP-16 — Told when something goes wrong

> *As a* **support manager** *I want to* **threshold alerts on key metrics** *so
> that* **I am told when something goes wrong.**

**Requirement:** `009 FR-016` (Should)

**Preconditions**
- Reporting and notifications working.

**Steps**
1. Set an alert when backlog exceeds a figure.
2. Push the backlog past it.
3. Confirm the alert arrives.
4. Confirm it does not repeat every hour while the condition persists.

**Expected result**
- Step 4: an alert repeating indefinitely is an alert that gets muted, and then
  the next one is missed too.

**Status:** ⛔ **Not testable yet.**

---

## RP-17 — The floor corrects itself without me announcing it

> *As a* **team lead** *I want to* **a live wallboard of queue, waiting chats,
> at-risk tickets** *so that* **the floor corrects itself without me announcing
> it.**

**Requirement:** `009 FR-017` (Should)

**Preconditions**
- Reporting working.

**Steps**
1. Open the wallboard.
2. Confirm it refreshes without interaction.
3. Change the queue and watch it update.
4. Leave it running for an hour and confirm it is still accurate.

**Expected result**
- It updates itself. A wallboard somebody has to refresh is a report on a
  screen.

**Status:** ⛔ **Not testable yet.** Needs a live update mechanism the stack
does not currently provide — the same gap as the typing indicator and live chat.

---

## RP-18 — Staff shifts against demand, not habit

> *As a* **support manager** *I want to* **workload forecasting by day and
> hour** *so that* **I staff shifts against demand, not habit.**

**Requirement:** `009 FR-018` (Could)

**Preconditions**
- A year of history.

**Steps**
1. Open the forecast.
2. Read predicted volume by day and hour.
3. Compare last month's forecast with what happened.

**Expected result**
- Step 3: the forecast is checkable against reality, or it is a guess with a
  chart around it.

**Status:** ⛔ **Not testable yet.**

---

## RP-19 — See where performance genuinely differs

> *As an* **executive** *I want to* **branches and departments compared side by
> side** *so that* **I see where performance genuinely differs.**

**Requirement:** `009 FR-019` (Should)

**Preconditions**
- Two branches with history.

**Steps**
1. Open the comparison.
2. Compare volume, attainment and satisfaction.
3. Confirm differences in working hours and holidays are accounted for.

**Expected result**
- Step 3 is what makes the comparison fair. A branch with fewer working days is
  not underperforming because a naive clock counted the days it was shut.

**Status:** ⛔ **Not testable yet.** Needs business calendars, which do not
exist.

---

## RP-20 — Account reviews rest on defensible numbers

> *As a* **support manager** *I want to* **an audit-ready SLA report for one
> customer or contract** *so that* **account reviews rest on defensible
> numbers.**

**Requirement:** `009 FR-020` (Should)

**Preconditions**
- A customer with a contract and history.

**Steps**
1. Produce the report for one customer over a period.
2. Read attainment against their agreed targets.
3. Drill into every breach and read its recorded reason.
4. Export it.

**Expected result**
- Step 3: every breach is explainable. "Audit-ready" means a customer's own
  auditor can follow each figure to the requests behind it.

**Status:** ⛔ **Not testable yet.** Needs the engine, breach reasons, and
entitlement — none of which exists.

---

## RP-21 — Tell a genuine customer wait from a parked ticket

> *As a* **support manager** *I want to* **see how much of each agent's handling
> time sits in a paused status, against a configurable threshold** *so that* **I
> can tell a genuine customer wait from a parked ticket, before the SLA figures
> stop meaning anything.**

**Requirement:** `009 FR-025` — ⚠ **awaiting review, not yet ratified.**

**Preconditions**
- The service-level engine working, with pause semantics.

**Steps**
1. Open the report.
2. Read, per agent, the share of handling time spent in a paused status.
3. Compare against the configured threshold.
4. Drill into an agent above it and read the requests.
5. Confirm the report **flags** rather than blocks or penalises.

**Expected result**
- Step 5 is the shape of this requirement: a long wait on a customer is
  legitimate and common. This is a supervision signal for a conversation, not an
  enforcement mechanism, and an implementation that automatically acted on it
  would be wrong.

**Status:** ⛔ **Not testable yet**, and **not yet a ratified requirement** —
see the note at the top of this file. Written so the review has something
concrete to judge.

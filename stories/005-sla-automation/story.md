# Story 005 — SLA & Automation

> **عايزين نعمل إيه؟**
> We want the system to know what we promised, warn us before we break it, and
> route work without anyone sorting a queue by hand.

| | |
|---|---|
| **Number** | `005` |
| **Spec** | [`specs/005-sla-automation/spec.md`](../../specs/005-sla-automation/spec.md) |
| **Source** | *Customer Support CRM · Core Features*, section 5 |
| **Status** | Draft |
| **Owner** | TBD |

---

## The need

We tell customers we will respond within a certain time and we have no mechanism
to know whether we did. Nobody can say what proportion of promises we keep, and
a ticket that nobody picks up ages silently until the customer escalates by
telephone. Every morning a team lead sorts the queue by hand, which is both
expensive and inconsistent.

## Who this is for

| Persona | What they get out of it |
|---|---|
| `MGR` Support manager | Commitments that are written down, measured and defensible |
| `LEAD` Team lead | Escalation that happens without them watching |
| `AGT` Support agent | A clear deadline, fair measurement, and no manual queue sorting |
| `ADM` Administrator | A rules engine they can change as the process changes |
| `CUST` Customer | A response inside the time they were promised |

## What we want

After this ships, someone can:

- Define response and resolution targets that differ by priority, category, tier, channel, department and branch
- Trust that elapsed time respects working hours, weekends and each branch's holidays
- Stop the clock while we are legitimately waiting on the customer or a third party
- Be warned at chosen thresholds before a breach, not after it
- Have ageing tickets escalate through levels automatically
- Have new tickets assigned automatically by round robin, load or skill and language
- Change a routing or notification rule without a developer
- Understand afterwards which rule fired and why
- Schedule routine follow-through — auto-close, satisfaction survey, due-date reminders

## Why it matters

This is the largest hidden project in the feature list. It reads as four bullets
and contains three separate builds: a business calendar, a pausable clock with a
ledger, and a rules engine with ordering and loop protection. Underestimating it
is the most likely cause of a missed delivery date. It is also the epic that
makes epic 009 meaningful — SLA compliance is the headline number the client will
ask for first.

## Stories in this epic

| ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| `SLA-01` | MGR | define policies with first-response and resolution targets | our commitments are written down and measurable | Must |
| `SLA-02` | MGR | vary targets by priority, category, tier, channel, department, branch | we differentiate instead of promising everyone the same | Must |
| `SLA-03` | ADM | clocks that respect business hours, weekends and per-branch holidays | targets are fair to agents who are not at their desks | Must |
| `SLA-04` | AGT | the clock paused while waiting on the customer or a third party | I am not measured on someone else's delay | Must |
| `SLA-05` | AGT | time remaining, at-risk and breached shown on every ticket | I prioritise by deadline, not instinct | Must |
| `SLA-06` | MGR | notifications at configurable thresholds to agent, lead, manager | breaches are pre-empted rather than reported | Must |
| `SLA-07` | MGR | multi-level time-based escalation rules | an ageing ticket cannot be quietly ignored | Must |
| `SLA-08` | MGR | automatic assignment by round robin, load, or skill and language | nobody hand-sorts the queue every morning | Must |
| `SLA-09` | ADM | assignment that skips offline, on-leave and at-capacity agents | tickets land with someone who can act today | Should |
| `SLA-10` | ADM | if-this-then-that rules for routing, tagging, priority, notification | a process change does not need a developer | Must |
| `SLA-11` | ADM | simulate a rule against recent tickets before enabling it | I do not discover the mistake on the live queue | Could |
| `SLA-12` | AGT | see which automations fired on the ticket and why | surprising behaviour is explainable, not spooky | Should |
| `SLA-13` | ADM | rule ordering and loop protection | automations cannot fight each other or run away | Should |
| `SLA-14` | ADM | scheduled automations — auto-close, CSAT send, due reminders | routine follow-through happens without remembering | Must |
| `SLA-15` | MGR | a reason recorded against each breach | we fix causes instead of counting symptoms | Should |
| `SLA-16` | MGR | pause SLA globally during a declared major incident | one outage does not destroy a quarter of metrics | Could |
| `SLA-17` | SYS | start the clock at the next business hour for out-of-hours tickets | the target reflects the commitment we made | Must |
| `SLA-18` | MGR | an approval step for sensitive resolutions such as refunds | money does not move without a second signature | Could |

**18 stories** — 10 Must · 4 Should · 4 Could

## How we will know it worked

- **First-response SLA compliance** — measured by the SLA engine, baseline in month one, above the client's agreed target by month three
- **Breaches with no prior warning issued** — measured against notification log, always zero
- **Tickets unassigned for more than 15 minutes in working hours** — measured from assignment history, under 1%
- **Manual queue sorting time per lead per day** — measured by observation, under 5 minutes
- **Disputes about whether a breach was our fault** — measured by pause-ledger completeness, resolvable from the record in 100% of cases

## Explicitly out of scope

- **Displaying the countdown** — story `004` renders what this epic computes
- **SLA reporting and dashboards** — story `009` reports on what this epic records
- **Predicting breaches with a model** — story `007`
- **Contract and entitlement management** — story `001` supplies the tier; this epic consumes it
- **Shift rostering and capacity planning** — not in the source feature list; `SLA-09` only reads an availability flag

## Depends on

| Needs | Why |
|---|---|
| Story `002` | The clock pauses on status, so the status list and its pause flags must exist first |
| Story `001` | Tier-based targets need customer segmentation |
| Story `012` | Per-branch calendars need the branch model |

## Open questions for the client

- [ ] **What are the actual SLA numbers?** Hours and minutes, per priority and per tier. Until these exist, this epic can be built but not tested. — *blocks* `FR-001`, `FR-002`
- [ ] What are the working hours and the holiday calendar, for each branch? — *blocks* `FR-003`
- [ ] Which statuses pause the clock? (Also open on story `002`.) — *blocks* `FR-004`
- [ ] Is first response measured to any reply, or to a substantive human reply? Does an auto-acknowledgement satisfy it? — *blocks* `FR-001`
- [ ] Which assignment strategy is the default, and who may override it? — *blocks* `FR-008`
- [ ] Who receives escalation at each level, and after how long? — *blocks* `FR-007`
- [ ] Is the approval step for refunds required at launch, and what is the threshold? — *blocks* `FR-018`

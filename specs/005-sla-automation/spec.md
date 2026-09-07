# Spec 005 — SLA & Automation

> **المفروض الحاجة دي تشتغل إزاي بالظبط؟**

| | |
|---|---|
| **Number** | `005` |
| **Story** | [`stories/005-sla-automation/story.md`](../../stories/005-sla-automation/story.md) |
| **Status** | Draft — clarifying |
| **Constitution gates** | **III (the one and only SLA clock)**, II (attributable), IV (server-side scope), VII (testable) |
| **Blocking clarifications** | 6 open · 1 RESOLVED 2026-09-07 by Mohamed Sadek (developer, acting as decision authority) |

---

## 1. Scope

**In scope.** The single authoritative implementation of elapsed and remaining
time (constitution III): SLA policies and target selection, the business
calendar, the pause ledger, threshold notification, multi-level escalation,
automatic assignment, the rules engine with ordering and loop protection, rule
execution logging, scheduled automations, breach reasons, incident-wide pause,
and the approval step.

**Out of scope.**

- Displaying the countdown — spec `004`
- Reporting on compliance — spec `009`, which reads this engine's records
- Predicting breach risk with a model — spec `007`
- Contract and entitlement sourcing — spec `001`
- Status definitions and their `pauses_sla` flags — spec `002`; this spec *reads* them
- Notification transport — spec `003` for customer channels, spec `004` for agents

## 2. Domain language

| Term | Means exactly |
|---|---|
| **SLA policy** | A named set of targets with a selection condition. |
| **Target** | A duration for one measured event: `first_response` or `resolution`. |
| **Selection** | Choosing which policy applies to a ticket. Deterministic; see `FR-002`. |
| **Business calendar** | Working hours per weekday plus a holiday list, owned by a branch. Shared with spec `003` `FR-024`. |
| **Business duration** | Elapsed time counting only working hours in the applicable calendar, minus paused intervals. **The only definition of elapsed time in this system.** |
| **Pause ledger** | The append-only list of intervals during which a ticket's clock was stopped, each with a cause. |
| **Clock** | A per-ticket, per-target measurement with a start instant, a target duration, a pause ledger and a computed state. |
| **Clock state** | `running` \| `paused` \| `met` \| `breached` \| `cancelled`. |
| **At risk** | `running` and consumed proportion ≥ the configured at-risk threshold. |
| **Threshold** | A proportion of a target at which notification fires. |
| **Escalation level** | An ordinal step with a delay, a target audience and optional actions. |
| **Assignment strategy** | `round_robin` \| `least_loaded` \| `skill_match` \| `manual`. |
| **Eligible agent** | An agent who is active, in the owning team, in scope, present, under capacity, and holds any required skill or language. |
| **Rule** | An ordered `when` / `if` / `then` unit. |
| **Trigger** | `ticket_created` \| `ticket_updated` \| `message_received` \| `message_sent` \| `status_changed` \| `sla_threshold` \| `scheduled`. |
| **Rule run** | One evaluation of one rule against one ticket, recorded whether or not it acted. |
| **Loop protection** | The bound on how many rule runs one originating event may cause. |
| **Incident pause** | An administrator-declared interval during which named clocks are paused system-wide. |
| **Breach reason** | A required classification recorded when a clock reaches `breached`. |

## 3. Key entities

### SLA policy

| Attribute | Type | Rules |
|---|---|---|
| `name_ar`, `name_en` | text | Both required (constitution I) |
| `priority` | integer | Selection order; unique. Lower wins |
| `conditions` | set | Any of: ticket priority, category subtree, customer segment, entitlement tier, channel, department, branch, ticket type |
| `first_response_target` | duration | Required |
| `resolution_target` | duration | Required |
| `at_risk_threshold` | proportion | Required, 0 < x < 1 |
| `thresholds` | list of proportion | e.g. 0.5, 0.75, 1.0 |
| `calendar_source` | `branch` \| `fixed` | Which calendar applies |
| `active` | boolean | Inactive policies never select |

### Clock

| Attribute | Type | Rules |
|---|---|---|
| `ticket_id`, `target_kind` | ref, enum | Unique together |
| `policy_id`, `policy_version` | ref, integer | Frozen at start — see `FR-020` |
| `calendar_id` | ref | Frozen at start |
| `started_at` | timestamp | Per `FR-017` |
| `target_duration` | duration | Frozen at start |
| `state` | enum | Above |
| `met_at` / `breached_at` | timestamp | Whichever occurred |
| `breach_reason_id` | ref | Required once `breached`, per `FR-015` |

### Pause interval (append-only)

| Attribute | Type | Rules |
|---|---|---|
| `clock_id` | ref Clock | Required |
| `from`, `to` | timestamp | `to` null while open; at most one open interval per clock |
| `cause` | `status` \| `incident` \| `approval` \| `holiday` | Required |
| `cause_ref` | ref | The status, incident or approval that caused it |

Intervals are never edited or deleted. A correction appends a compensating
interval and records why.

### Rule

| Attribute | Type | Rules |
|---|---|---|
| `name_ar`, `name_en` | text | Both required |
| `trigger` | enum | Required |
| `order` | integer | Unique within trigger; evaluation is strictly ordered |
| `conditions` | expression tree | AND / OR / NOT over ticket, customer and clock attributes |
| `actions` | ordered list | assign, set priority, set category, add tag, change status, notify, escalate, send template, create task, call webhook |
| `stop_on_match` | boolean | When true, no later rule for this trigger runs |
| `active` | boolean | — |
| `version` | integer | Incremented on edit; rule runs record the version that ran |

### Escalation policy, Assignment strategy, Incident, Approval request, Rule run
Standard shapes. A rule run is written for every evaluation, including
non-matches, retained per `NFR-005`.

## 4. Acceptance scenarios

### AS-01 — Deterministic policy selection
**Given** three active policies whose conditions all match a ticket, with selection priorities 10, 20 and 30
**When** the ticket is created
**Then** the policy with priority 10 applies
**And** the clock records which policy and which version was selected
**And** given no policy matches, the system default policy applies and the absence of a match is logged

### AS-02 — Business hours are respected
**Given** a calendar of 09:00–17:00 Sunday to Thursday, a resolution target of 8 business hours, and a ticket created Thursday at 16:00
**When** time passes
**Then** 1 hour is consumed by 17:00 Thursday
**And** no time is consumed Friday or Saturday
**And** the target is reached at 16:00 the following Wednesday

### AS-03 — Out-of-hours arrival starts at the next working instant
**Given** the same calendar and a ticket created Friday at 22:00
**When** the clock starts
**Then** `started_at` is Sunday at 09:00
**And** the customer acknowledgement in spec `003` `AS-09` states a time consistent with this

### AS-04 — Holidays do not consume time
**Given** a branch holiday on Monday and a clock with 4 business hours remaining at Sunday 17:00
**When** the week proceeds
**Then** no time is consumed on Monday
**And** the remaining 4 hours are consumed across Tuesday

### AS-05 — Pause and resume, with a ledger
**Given** a running resolution clock with 6 hours consumed
**When** an agent sets a status whose `pauses_sla` is true
**Then** the clock state becomes `paused` and an open pause interval is written with cause `status`
**And** while paused, consumed time does not increase
**When** the customer replies
**Then** the interval is closed, the state returns to `running`, and consumption resumes from 6 hours
**And** both the pause and the resume appear in ticket history

### AS-06 — First response is measured to a human reply
**Given** a ticket that received an automatic acknowledgement at 09:01 and an agent reply at 10:30
**When** the first-response clock is evaluated
**Then** it is met at 10:30, not 09:01, per `[CLARIFY-3]`
**And** an internal note does not satisfy it

### AS-07 — Thresholds notify before breach
**Given** a 4-hour first-response target with thresholds at 0.5 and 0.75, and an at-risk threshold of 0.75
**When** 2 business hours have been consumed
**Then** the assigned agent is notified
**And** at 3 hours the agent and the team lead are notified and the ticket shows at-risk
**And** at 4 hours the clock is `breached`, the manager is notified, and a breach reason is required

### AS-08 — No breach without a prior warning
**Given** any clock that reaches `breached`
**When** the notification log is inspected
**Then** at least one threshold notification was issued before the breach
**And** where none was, this is recorded as a defect, not tolerated silently

### AS-09 — Escalation climbs on its own
**Given** an escalation policy of level 1 after 2h unassigned to the team lead, level 2 after 4h to the manager
**When** a ticket sits unassigned for 4 business hours
**Then** level 1 fired at 2h and level 2 at 4h
**And** each is recorded in history with the level, the target and the delay
**And** escalation continues across a status change unless the status pauses the clock

### AS-10 — Assignment skips the unavailable
**Given** a team of four where one is on leave, one is offline, one is at capacity, and one is eligible
**When** a ticket arrives for that team
**Then** it is assigned to the eligible agent
**And** given none are eligible, the ticket remains unassigned in the team queue and the lead is notified
**And** it is never assigned to an ineligible agent to avoid an empty queue

### AS-11 — Round robin is fair across the interval
**Given** three eligible agents and 30 tickets under `round_robin`
**When** all are assigned
**Then** each holds 10
**And** an agent who becomes ineligible mid-sequence is skipped without disturbing the order of the rest

### AS-12 — Rules run in order and can stop
**Given** rule A (order 10, `stop_on_match` true) and rule B (order 20) both matching a created ticket
**When** the ticket is created
**Then** A's actions run and B does not
**And** a rule run is recorded for A as matched and for B as not evaluated, with the reason

### AS-13 — Loop protection holds
**Given** rule X sets a tag on update and rule Y sets a priority on update, each satisfying the other's condition
**When** either is triggered
**Then** evaluation stops at the configured cascade bound
**And** the ticket is left in a consistent state
**And** an administrator alert names both rules

### AS-14 — Rule execution is explainable
**Given** a ticket whose priority was raised and whose team was changed by automation
**When** an agent opens the ticket's automation log
**Then** each rule is listed with its version, the condition that matched, the actions taken and the timestamp
**And** the same information is available for rules that evaluated and did not match

### AS-15 — Simulation changes nothing
**Given** a draft rule and the last 200 tickets
**When** an administrator simulates it
**Then** they see which tickets would have matched and what would have changed
**And** no ticket is modified, no notification is sent, and no clock is affected

### AS-16 — Scheduled automation acts once
**Given** an auto-close automation for tickets resolved more than 7 days ago
**When** the schedule runs twice in one day because of a retry
**Then** each eligible ticket is closed exactly once
**And** the closure records cause `grace_expired`

### AS-17 — Incident pause is reversible and audited
**Given** an administrator declares an incident affecting category "Network"
**When** the incident is active
**Then** resolution clocks on matching open tickets are paused with cause `incident`
**And** first-response clocks continue, per `[CLARIFY-6]`
**When** the incident is closed
**Then** the intervals close and clocks resume
**And** spec `009` can report both with and without the incident interval

### AS-18 — Approval gates the action, not the ticket
**Given** an approval rule for refunds above the configured threshold
**When** an agent selects that resolution
**Then** an approval request is created for the configured approver and the resolution does not apply
**And** the ticket remains workable and its clock behaviour follows `[CLARIFY-7]`
**And** on approval the resolution applies; on rejection the agent is told, with the reason

### AS-19 — One clock, one answer
**Given** any ticket at any instant
**When** the remaining time is read by spec `004`, by spec `009` and through the API
**Then** all three return the identical value
**And** no other component computes it

## 5. Functional requirements

| ID | Requirement | Level | Traces |
|---|---|---|---|
| `FR-001` | The system MUST support SLA policies defining `first_response` and `resolution` targets as business durations. | MUST | `SLA-01` |
| `FR-002` | Policy selection MUST be deterministic: conditions may combine ticket priority, category subtree, customer segment, entitlement tier, channel, department, branch and ticket type; where several match, the lowest selection priority wins; where none match, a system default MUST apply and the absence MUST be logged. | MUST | `SLA-02` |
| `FR-003` | Every clock MUST be measured against a business calendar of working hours, weekends and holidays, owned by a branch, and MUST NOT consume time outside it. | MUST | `SLA-03` |
| `FR-004` | A clock MUST pause while the ticket holds a status whose `pauses_sla` is true, and MUST resume on transition to a status where it is false. Every pause and resume MUST append to the pause ledger with a cause, and MUST be visible in ticket history. | MUST | `SLA-04` |
| `FR-005` | The engine MUST expose, per ticket and per target: state, consumed duration, remaining duration, target, at-risk flag and breach flag. This MUST be the only source of these values (constitution III). | MUST | `SLA-05`, constitution III |
| `FR-006` | Notifications MUST fire at each configured threshold, to a configurable audience per threshold, and again on breach. | MUST | `SLA-06` |
| `FR-007` | Escalation policies MUST support ordered levels, each with a delay measured as a business duration, an audience and optional actions. Levels MUST fire in order and MUST NOT skip. | MUST | `SLA-07` |
| `FR-008` | Automatic assignment MUST support `round_robin`, `least_loaded` and `skill_match`, selectable per team or per category. | MUST | `SLA-08` |
| `FR-009` | Assignment MUST consider only eligible agents — active, in the owning team, in scope, present, under capacity, holding required skill and language. Where none are eligible the ticket MUST remain unassigned and the lead MUST be notified. | SHOULD | `SLA-09` |
| `FR-010` | Administrators MUST be able to define rules with a trigger, a condition expression over ticket, customer and clock attributes, and an ordered action list drawn from: assign, set priority, set category, add tag, change status, notify, escalate, send template, create task, call webhook. | MUST | `SLA-10` |
| `FR-011` | Administrators MAY simulate a rule against a historical ticket set, seeing matches and intended changes, with no mutation, notification or clock effect. | MAY | `SLA-11` |
| `FR-012` | Every rule evaluation MUST write a rule run recording rule identity and version, trigger, ticket, whether it matched, the condition outcome, the actions taken and the timestamp — including non-matches. The log MUST be visible on the ticket. | SHOULD | `SLA-12` |
| `FR-013` | Rules MUST evaluate in a strict order within a trigger, MUST support `stop_on_match`, and MUST be bounded by loop protection on the cascade depth caused by one originating event. Exceeding the bound MUST halt evaluation, leave the ticket consistent, and alert an administrator naming the rules involved. | SHOULD | `SLA-13` |
| `FR-014` | The system MUST support scheduled automations, at minimum: auto-close after a resolution grace period, satisfaction survey dispatch, follow-up-date reminders, and follow-up-date auto-close. Each MUST be idempotent per ticket per occurrence. | MUST | `SLA-14` |
| `FR-015` | On breach, a breach reason from an administrator-defined list MUST be recorded before the ticket may reach a terminal status. | SHOULD | `SLA-15` |
| `FR-016` | An administrator MAY declare an incident that pauses named target kinds on matching open tickets, with a start and end, recorded as pause intervals with cause `incident`, such that spec `009` can report figures both including and excluding them. | MAY | `SLA-16` |
| `FR-017` | Where a ticket arrives outside the applicable calendar's working hours, the clock's `started_at` MUST be the next working instant. Where it arrives inside them, `started_at` is the arrival instant. | MUST | `SLA-17` |
| `FR-018` | The system MAY require approval for configured resolutions; the approval request MUST name an approver, MUST block only the gated action, and MUST record the decision and its reason. | MAY | `SLA-18` |
| `FR-019` | First response MUST be satisfied only by a customer-visible message authored by a human. Automatic acknowledgements and internal notes MUST NOT satisfy it, per `[CLARIFY-3]`. | MUST | `SLA-01`, spec `003` `FR-024` |
| `FR-020` | Editing a policy, calendar or rule MUST NOT retroactively alter a running or completed clock. Each clock MUST retain the policy version, calendar and target frozen at its start. | MUST | constitution VII |
| `FR-021` | The pause ledger MUST be append-only. Corrections MUST append a compensating interval with a recorded reason; no interval may be edited or deleted. | MUST | constitution II |
| `FR-022` | Every automation action MUST be attributable in ticket history to the rule and version that caused it, distinguishable from a human action. | MUST | constitution II |
| `FR-023` | Rule and policy administration MUST apply the caller's scope; a rule MUST NOT act on tickets outside the scope of the administrator who created it. | MUST | constitution IV |

## 6. Edge cases and failure behaviour

| # | Situation | Required behaviour |
|---|---|---|
| E-01 | Ticket priority changes mid-flight, selecting a different policy | The running clock keeps its original target (`FR-020`). The new policy applies to clocks started after the change. Recorded in history. |
| E-02 | Customer segment changes mid-flight | Same as E-01. |
| E-03 | Ticket transfers to another branch with a different calendar | The clock keeps its original calendar unless an administrator explicitly recalculates, which is audited (spec `012` `PLT-09`). |
| E-04 | Status pauses and resumes twice in one minute | Two intervals recorded. Sub-minute intervals are retained, not rounded away. |
| E-05 | Two pause causes overlap (status pause during an incident pause) | Intervals may overlap; consumed time counts an instant once. |
| E-06 | Calendar edited while clocks are running | Running clocks keep the frozen calendar; the edit applies to clocks started afterwards. |
| E-07 | Branch has no calendar configured | Policy selection fails loudly: the ticket is created, the clock is not started, and an administrator is alerted. Never silently 24/7. |
| E-08 | Holiday declared retroactively over a consumed period | Consumed time is not recalculated. The declaration is recorded and spec `009` may report the adjustment separately. |
| E-09 | Ticket resolved before first response | The first-response clock is `cancelled`, not `met`; spec `009` counts it as neither met nor breached and reports the count. |
| E-10 | Ticket merged | Both clocks on the source stop at the merge instant with state `cancelled`; the survivor's clocks continue unchanged. |
| E-11 | Ticket split | The child starts fresh clocks at the split instant; the parent's are untouched. |
| E-12 | Clock breached while paused | Impossible — a paused clock consumes nothing. If observed, it is a defect and must alert. |
| E-13 | Assignment strategy set to `round_robin` for an empty team | Ticket stays unassigned; the lead and an administrator are notified. |
| E-14 | Every agent is at capacity for an extended period | Tickets queue; a capacity alert fires at the configured queue depth. Capacity is never silently exceeded. |
| E-15 | Rule references a retired category or deactivated user | Rule is marked invalid, does not run, and the administrator is alerted. It does not fail silently or match everything. |
| E-16 | Rule action fails (webhook unreachable) | Remaining actions still run; the failure is recorded on the rule run; retries follow spec `011` `FR-014`. |
| E-17 | Scheduled automation misses its window (outage) | Runs on recovery, evaluating eligibility at run time, remaining idempotent. |
| E-18 | Scheduled automation would act on 10,000 tickets | Processes in batches with progress recorded; partial completion is resumable, not restarted. |
| E-19 | Incident closed before it was ever active | Refused. |
| E-20 | Approver is deactivated with a request pending | Request reassigns to the configured fallback approver and an administrator is alerted. |
| E-21 | Approval never answered | After the configured period the request expires, the agent is notified, and the ticket clock behaviour follows `[CLARIFY-7]`. |
| E-22 | Engine unavailable | Tickets remain creatable and workable. Clocks reconcile on recovery from the event history. Consuming specs show "unavailable" (spec `004` `E-05`) and MUST NOT substitute their own calculation. |

## 7. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| `NFR-001` | Clock state read | ≤ 200ms at p95 for a single ticket |
| `NFR-002` | Threshold notification latency | ≤ 60s after the threshold instant |
| `NFR-003` | Automatic assignment latency | ≤ 30s from ticket creation |
| `NFR-004` | Rule evaluation per originating event | ≤ 2s at p95 |
| `NFR-005` | Rule run log retention | ≥ 90 days, then aggregated, never deleted for matched runs |
| `NFR-006` | Clock correctness | 0 discrepancies in a reconciliation test replaying the event history |
| `NFR-007` | Cascade bound | Configurable; default 10 rule runs per originating event |

## 8. Bilingual and localisation requirements

| Surface | Arabic | English | RTL notes |
|---|---|---|---|
| Policy, rule and escalation names | Required | Required | Authored per language |
| Breach reason list | Required | Required | — |
| Threshold and escalation notification text | Required | Required | Follows the recipient's interface language |
| Customer-facing automated messages (surveys, reminders, auto-close notices) | Required | Required | Follows the customer's `preferred_language` |
| Duration rendering | Required | Required | Digits and units stay LTR; the label mirrors |
| Calendar day and month names | Required | Required | — |
| Holiday names | Required | Required | Per branch |
| Approval request and decision text | Required | Required | — |
| Rule condition builder interface | Required | Required | Expression tree mirrors; operators are not mirrored |

## 9. Permissions

| Action | AGT | LEAD | MGR | ADM | AUD |
|---|---|---|---|---|---|
| Read clock state on a ticket | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read rule run log on a ticket | ✓ | ✓ | ✓ | ✓ | ✓ |
| Record a breach reason | ✓ | ✓ | ✓ | ✓ | — |
| Pause via status change | ✓ | ✓ | ✓ | ✓ | — |
| Define / edit SLA policies | — | — | ✓ | ✓ | — |
| Define / edit business calendars and holidays | — | — | — | ✓ | — |
| Define / edit escalation policies | — | — | ✓ | ✓ | — |
| Set assignment strategy per team | — | ✓ | ✓ | ✓ | — |
| Define / edit / activate rules | — | — | — | ✓ | — |
| Simulate a rule | — | — | ✓ | ✓ | — |
| Declare / close an incident pause | — | — | ✓ | ✓ | — |
| Approve or reject an approval request | — | per policy | per policy | — | — |
| Append a compensating pause interval | — | — | — | ✓ | — |
| Read the full engine audit | — | — | ✓ | ✓ | ✓ |

No role may edit or delete a pause interval, a clock record or a rule run.

## 10. Audit requirements

| Event | Recorded fields |
|---|---|
| Clock started | ticket, target kind, policy and version, calendar, target duration, `started_at`, selection reason |
| Clock paused / resumed | timestamp, cause, cause reference, consumed at that instant |
| Compensating interval appended | actor, timestamp, interval, reason |
| Threshold reached | ticket, target, proportion, audience notified, delivery outcome |
| Clock met / breached / cancelled | timestamp, consumed, target, cause of cancellation where applicable |
| Breach reason recorded | actor, timestamp, reason |
| Escalation fired | ticket, level, delay elapsed, audience, actions taken |
| Assignment performed by strategy | ticket, strategy, eligible pool considered, agent chosen, reason others were skipped |
| Assignment failed, none eligible | ticket, pool considered, exclusion reason per agent, lead notified |
| Rule run | rule and version, trigger, ticket, matched or not, condition outcome, actions, timestamp, duration |
| Rule cascade halted | originating event, rules involved, depth reached |
| Rule created / edited / activated / deactivated | actor, timestamp, version, before, after |
| Policy / calendar / escalation policy changed | actor, timestamp, field, before, after, version |
| Simulation run | actor, timestamp, rule draft, ticket set size, match count |
| Incident declared / closed | actor, timestamp, scope conditions, target kinds paused, tickets affected |
| Approval requested / approved / rejected / expired | actor, approver, timestamp, gated action, threshold, decision reason |
| Scheduled automation run | automation, timestamp, tickets evaluated, tickets acted on, failures |

## 11. Contracts

| Operation | Purpose | Scope predicate |
|---|---|---|
| `get clock state` | The single source of durations | inherits ticket scope; **read only for every consumer** |
| `get clock states (batch)` | Queue and report rendering | inherits caller scope per ticket |
| `list pause intervals` | Audit and dispute resolution | inherits ticket scope |
| `record breach reason` | Close-out requirement | actor on the ticket |
| `list / manage SLA policies` | Configuration | manager or admin; branch ∈ scope |
| `list / manage calendars` | Working hours and holidays | admin; branch ∈ scope |
| `list / manage escalation policies` | Escalation configuration | manager or admin |
| `set assignment strategy` | Per team or category | lead and above; team ∈ scope |
| `list / manage rules` | Automation configuration | admin; rules constrained to the author's scope |
| `simulate rule` | Safe preview | manager or admin; **guaranteed side-effect free** |
| `list rule runs` | Explainability | inherits ticket scope, or admin for the global log |
| `declare / close incident` | Mass pause | manager or admin |
| `list / decide approval requests` | Approval gate | approver named by the policy only |
| `run scheduled automation` (internal) | Scheduler entry | system; idempotent per ticket per occurrence |

## 12. Clarifications needed

- [ ] `[CLARIFY-1]` **What are the actual SLA numbers?** Hours and minutes for first response and resolution, per priority and per customer tier. Until these exist this engine can be built but not tested, and no acceptance scenario in section 4 has real values. — *blocks* `FR-001`, `FR-002` — *ask* client management
- [ ] `[CLARIFY-2]` **What are the working hours and holiday calendar, per branch?** — *blocks* `FR-003`, `FR-017`, and spec `003` `FR-024` — *ask* client operations + HR
- [ ] `[CLARIFY-3]` **Does an automatic acknowledgement satisfy first response?** This spec assumes not (`FR-019`). The answer moves every compliance figure in spec `009`. — *blocks* `FR-019`, `AS-06` — *ask* client management
- [x] `[CLARIFY-4]` **Which statuses pause the clock?** Owned by spec `002` `[CLARIFY-1]`; repeated here because this engine cannot be tested without it. — *blocks* `FR-004` — *ask* client operations
  - **RESOLVED 2026-09-07 by Mohamed Sadek (developer, acting as decision authority), with spec `002` `[CLARIFY-1]`.** Pausing: `pending_customer`, `pending_supplier`, `resolved`. Not pausing: `new`, `assigned`, `in_progress`, `pending_internal`. Not applicable (terminal): `closed`, `merged`, `cancelled`.
  - **`pending_third_party` no longer exists** — it was split into `pending_supplier` (pauses) and `pending_internal` (does not), because internal departmental waiting is not something the customer contracted for. Reasoning per status is in spec `002` §12 `[CLARIFY-1]`.
  - **`FR-004` is unblocked.** This spec remains blocked overall on `[CLARIFY-1]` (the SLA hours and minutes) and `[CLARIFY-2]` (working hours and holidays per branch), without which the engine can be built but not tested.
- [ ] `[CLARIFY-5]` Who is the escalation audience at each level, and after what delay? — *blocks* `FR-007` — *ask* client management
- [ ] `[CLARIFY-6]` During an incident pause, do first-response clocks also pause, or only resolution? This spec assumes resolution only. — *blocks* `FR-016`, `AS-17` — *ask* client management
- [ ] `[CLARIFY-7]` While an approval is pending, does the resolution clock pause? Pausing protects the agent but hides real customer waiting time. — *blocks* `FR-018`, `AS-18`, `E-21` — *ask* client management

## 13. Success metrics

| Metric | Source | Target |
|---|---|---|
| First-response SLA compliance | This engine | baseline month one, agreed target by month three |
| Breaches with no prior warning | Notification log vs. breach records | 0 |
| Tickets unassigned > 15 working minutes | Assignment history | < 1% |
| Manual queue sorting per lead per day | Observation | < 5 minutes |
| Breach disputes resolvable from the pause ledger | Dispute review | 100% |
| Duration values disagreeing between specs `004`, `009` and the API | Reconciliation | 0 (constitution III) |
| Rule cascades halted by loop protection | Engine alerts | 0 in steady state |

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
- [x] **Constitution III satisfied — this is the sole implementation (`FR-005`), immune to retroactive edits (`FR-020`), with an append-only ledger (`FR-021`)**
- [ ] **Zero `[NEEDS CLARIFICATION]` markers remaining — 7 open, `/plan` is blocked. This spec is the most blocked in the project.**
- [x] Constitution gates satisfied and named

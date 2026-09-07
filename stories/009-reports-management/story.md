# Story 009 — Reports & Management

> **عايزين نعمل إيه؟**
> We want to answer, with evidence, three questions: how much work is there, are
> we keeping our promises, and where is it going wrong.

| | |
|---|---|
| **Number** | `009` |
| **Spec** | [`specs/009-reports-management/spec.md`](../../specs/009-reports-management/spec.md) |
| **Source** | *Customer Support CRM · Core Features*, section 9 |
| **Status** | Draft |
| **Owner** | TBD |

---

## The need

Management currently runs on impressions. Nobody can state the backlog, the
compliance rate, or which category is growing. Agent performance conversations
happen without numbers, which makes them unfair in both directions. And when a
recurring product fault generates hundreds of tickets, nobody can prove it to the
department that could fix it.

## Who this is for

| Persona | What they get out of it |
|---|---|
| `MGR` Support manager | The operational picture: volume, backlog, compliance, quality, staffing |
| `EXEC` Executive | One dashboard, headline numbers, no need to ask anyone |
| `LEAD` Team lead | A live wallboard the floor corrects itself against |
| `AGT` Support agent | Fair measurement, based on the same data everyone else sees |

## What we want

After this ships, someone can:

- State ticket volume by period, channel, category, department, branch and priority
- See backlog and ageing before it becomes a crisis
- Report SLA compliance for response and resolution, by team, agent and tier
- Discuss agent performance from volume, speed, reopen rate and satisfaction together
- Read what customers actually said, not just the score
- Compare channels, branches and departments on the same basis
- Drill from any number down to the tickets behind it
- Export, schedule and distribute without asking anyone
- Build a report nobody anticipated, without a developer
- Be alerted when a metric crosses a threshold

## Why it matters

This epic has no data of its own. Every number here is a consequence of what was
captured in stories `002` and `005`, which means report design belongs at the
start of the project rather than the end. It is also the epic the client will
judge the whole delivery by — the SLA compliance figure is the first thing they
will ask for, and it must be defensible line by line.

## Stories in this epic

| ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| `RP-01` | MGR | volume by period, channel, category, department, branch, priority | I understand where demand comes from | Must |
| `RP-02` | MGR | backlog and ageing by bucket | accumulating risk is visible before a crisis | Must |
| `RP-03` | MGR | SLA compliance for response and resolution by team, agent, tier | I state our performance with evidence | Must |
| `RP-04` | MGR | per-agent volume, response, resolution, reopen rate, satisfaction | I coach on facts, not impressions | Must |
| `RP-05` | MGR | satisfaction scores with trend and free-text comments | the customer voice reaches the people who decide | Must |
| `RP-06` | EXEC | one dashboard with headline KPIs and trends | I see support health without asking anyone | Must |
| `RP-07` | MGR | first-contact resolution and reopen rate | we manage quality, not just speed | Should |
| `RP-08` | MGR | channel comparison on volume, resolution time, satisfaction | we invest in channels that actually work | Should |
| `RP-09` | MGR | self-service deflection reporting | I demonstrate what the portal and base are worth | Should |
| `RP-10` | MGR | top categories and root causes with period-on-period change | I take a fix upstream to another department | Must |
| `RP-11` | MGR | filter every report by date, department, branch, team, agent, channel, segment | I answer a question I did not anticipate | Must |
| `RP-12` | MGR | drill from any chart to the underlying tickets | the number is verifiable, not believed | Should |
| `RP-13` | MGR | export any report to Excel, CSV or PDF | the analysis travels outside the system | Must |
| `RP-14` | MGR | scheduled reports to a distribution list | stakeholders are informed without me remembering | Should |
| `RP-15` | MGR | build custom reports from fields, filters, groupings, chart types | I am not limited to what was imagined at build time | Should |
| `RP-16` | MGR | threshold alerts on key metrics | I am told when something goes wrong | Should |
| `RP-17` | LEAD | a live wallboard of queue, waiting chats, at-risk tickets | the floor corrects itself without me announcing it | Should |
| `RP-18` | MGR | workload forecasting by day and hour | I staff shifts against demand, not habit | Could |
| `RP-19` | EXEC | branches and departments compared side by side | I see where performance genuinely differs | Should |
| `RP-20` | MGR | an audit-ready SLA report for one customer or contract | account reviews rest on defensible numbers | Should |
| `RP-21` | MGR | to see how much of each agent's handling time sits in a paused status, against a configurable threshold | I can tell a genuine customer wait from a parked ticket, before the SLA figures stop meaning anything | Should |

**21 stories** — 8 Must · 12 Should · 1 Could

**Amendment, 2026-09-07.** `RP-21` does **not** derive from *Customer Support
CRM · Core Features*. It originates from the decision to ratify
`pending_customer` as pausing the SLA clock (spec `002` `[CLARIFY-1]`, resolved
2026-09-07). Pausing the clock on a status an agent can set at will creates an
incentive nobody asked for, and no existing requirement surfaces it. Recorded
here as an explicit, dated amendment per constitution VIII rather than
attributed to the source document.

The actor is `MGR`, not `LEAD`, deliberately: the report reflects a lead's own
team's figures, so holding it at team level would put the measurement in the
hands of the person it also measures. Spec `009` §9 marks `LEAD` as **never**
for this one.

## How we will know it worked

- **Questions answerable without a developer** — measured against a list of 20 standard management questions, all 20
- **Report and agent-view agreement** — measured by reconciling SLA figures between story `004` and this epic, always identical (constitution III)
- **Dashboard freshness** — measured as lag behind live data, under 15 minutes
- **Manual reporting effort** — measured in manager hours per month, reduced from current baseline to under 2
- **Numbers disputed in a client review** — measured per review, zero unresolvable by drill-down

## Explicitly out of scope

- **The SLA calculation** — story `005` computes; this epic reports. There must not be a second implementation (constitution III)
- **AI-generated insight and theme clustering** — story `007` (`AI-13`)
- **Predicted breach risk** — story `007` (`AI-19`)
- **Pushing data to an external warehouse or BI tool** — story `011` (`INT-12`)
- **Financial reporting, cost accounting, billing** — the ERP owns these
- **Workforce management and rostering** — `RP-18` forecasts demand; it does not schedule people

## Depends on

| Needs | Why |
|---|---|
| Story `002` | Every dimension in every report is a field captured on the ticket |
| Story `005` | Compliance, breach and pause data come from the SLA engine |
| Story `001` | Segment, tier and organisation are customer attributes |
| Story `010` | A manager must see only the branches and departments they are scoped to |

## Open questions for the client

- [ ] **What is the agreed definition of resolved versus closed?** First-contact resolution, reopen rate and CSAT all depend on it. Nothing here is buildable without it. — *blocks* `FR-007`, and every metric definition
- [ ] Is satisfaction measured as CSAT, NPS, or both, and on which scale? — *blocks* `FR-005`
- [ ] Which 8 to 10 metrics belong on the executive dashboard? — *blocks* `FR-006`
- [ ] Do agents see their own performance figures, and do they see their colleagues'? — *blocks* the permission matrix
- [ ] Is a live wallboard required at launch, and is there a screen in the team room for it? — *blocks* `FR-017`
- [ ] Which reports must exist as fixed, client-approved formats versus built ad hoc? — *blocks* scope of `FR-015`

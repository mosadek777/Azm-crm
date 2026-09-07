# Spec 009 — Reports & Management

> **المفروض الحاجة دي تشتغل إزاي بالظبط؟**

| | |
|---|---|
| **Number** | `009` |
| **Story** | [`stories/009-reports-management/story.md`](../../stories/009-reports-management/story.md) |
| **Status** | Draft — clarifying |
| **Constitution gates** | **III (reads the SLA clock, never recomputes)**, IV (scope applies to aggregates), VII (every metric defined) |
| **Blocking clarifications** | 6 |

---

## 1. Scope

**In scope.** Metric definitions; volume, backlog and ageing reports; SLA
compliance; agent performance; satisfaction; the executive dashboard; quality
metrics; channel, branch and department comparison; deflection; category and
root-cause trends; universal filtering; drill-down; export; scheduled
distribution; the custom report builder; threshold alerts; the live wallboard;
forecasting; and per-contract SLA evidence.

**Out of scope.**

- Computing durations — spec `005` is the sole source (constitution III)
- AI theme clustering and breach prediction — spec `007`
- Pushing data to an external warehouse or BI tool — spec `011` `FR-012`
- Financial reporting, cost accounting and billing — the ERP owns these
- Workforce scheduling — `FR-018` forecasts demand; it does not roster people
- The lead's operational team queue — spec `004` `FR-016`; the wallboard here is a display, not a work surface

## 2. Domain language

Constitution VII applies with unusual force here: an undefined metric is a
future argument with the client. Every term below is the *only* permitted
meaning.

| Term | Means exactly |
|---|---|
| **Volume** | Count of tickets **created** in the period, by creation timestamp. Not touched, not closed. |
| **Backlog** | Count of tickets in a non-terminal status **at the reporting instant**. A point-in-time measure, never a period sum. |
| **Age** | Business duration from creation to now for open tickets, from creation to resolution for resolved ones. Read from spec `005`. |
| **First response** | The first customer-visible message authored by a human, per spec `005` `FR-019`. Acknowledgements do not count. |
| **Resolution time** | Business duration from clock start to `resolved`, excluding pause intervals. Read from spec `005`. |
| **SLA compliance** | Clocks in state `met` ÷ (clocks `met` + clocks `breached`). Clocks `cancelled` are excluded from both and reported separately. |
| **First-contact resolution** | Resolved with exactly one customer-visible outbound message and no reassignment. Definition pending `[CLARIFY-1]`. |
| **Reopen rate** | Tickets reopened at least once ÷ tickets closed in the period. Counted once per ticket regardless of how often it reopened. |
| **Satisfaction** | Mean score over rated tickets. The unrated count is always reported beside it (`FR-005`). |
| **Deflection** | Per spec `006` domain language. Session-based, with the attribution window stated on the report. |
| **Handled** | For agent performance: tickets on which the agent authored at least one customer-visible message in the period. Not "assigned". |
| **Drill-down** | Navigation from an aggregate to the exact ticket list that produced it. The list must reproduce the number. |
| **Freshness** | The lag between the underlying event and its appearance in a report. Displayed on every report. |
| **Snapshot** | A stored point-in-time backlog measurement, needed because backlog cannot be reconstructed retroactively (`FR-002`). |

## 3. Key entities

### Metric definition

| Attribute | Type | Rules |
|---|---|---|
| `key` | text | Stable; quoted in client conversations |
| `name_ar`, `name_en` | text | Both required (constitution I) |
| `definition_ar`, `definition_en` | text | **Required** — the prose definition displayed with the metric |
| `source` | enum | `ticket` \| `sla_engine` \| `feedback` \| `knowledge` \| `channel` |
| `dimensions` | set | Which filters apply |
| `excludes` | text | What it deliberately omits, e.g. cancelled clocks |

No metric may be rendered without its definition reachable from the same
screen. This is the mechanism that prevents the argument in month four.

### Backlog snapshot

| Attribute | Type | Rules |
|---|---|---|
| `taken_at` | timestamp | Required; at the configured interval |
| `dimensions` | map | Branch, department, team, category, priority, status |
| `count` | integer | — |

### Report definition, Schedule, Threshold alert, Wallboard configuration
Standard shapes. A report definition stores filters, groupings, metrics and
chart type, and a visibility scope. A schedule stores recipients, cadence and
format.

## 4. Acceptance scenarios

### AS-01 — Every number is reproducible
**Given** an SLA compliance figure of 87.4% for one team in one month
**When** a manager drills into it
**Then** the ticket list shown contains exactly the clocks counted
**And** recomputing from that list yields 87.4%
**And** the cancelled clocks excluded from the ratio are listed separately with their count

### AS-02 — Durations agree everywhere
**Given** one ticket at one instant
**When** its remaining time is read on the agent's ticket (spec `004`), in a report here, and through the API
**Then** all three are identical
**And** no report recomputes a duration from timestamps

### AS-03 — Backlog is point-in-time
**Given** 40 tickets created and 35 closed in a week
**When** a manager views backlog
**Then** it shows the count of non-terminal tickets at the chosen instant, not 5
**And** a historical backlog trend is drawn from stored snapshots
**And** where no snapshot exists for a requested instant, the report says so rather than interpolating

### AS-04 — Filters apply everywhere, identically
**Given** any report
**When** a manager filters by date range, department, branch, team, agent, channel, category, priority and customer segment
**Then** every metric on the report reflects every filter
**And** the applied filters are stated on the export and in the scheduled email

### AS-05 — Scope constrains aggregates
**Given** a manager scoped to branch B only
**When** they view any report without a branch filter
**Then** the figures cover branch B only
**And** the report states that a scope restriction is in effect
**And** they cannot construct a filter that reveals branch C, including through a shared report definition authored by someone scoped to C

### AS-06 — Satisfaction reports its own coverage
**Given** 200 resolved tickets of which 40 were rated, mean 4.2
**When** a manager views satisfaction
**Then** they see 4.2, the 40 rated, the 160 unrated, and the 20% response rate
**And** the mean is never shown without the coverage

### AS-07 — Agent performance is multi-dimensional by construction
**Given** an agent performance report
**When** it renders
**Then** volume handled, mean first response, mean resolution, reopen rate and satisfaction appear together
**And** no single one of them can be exported alone from this report
**And** sentiment scores from spec `007` do not appear

### AS-08 — Export carries its context
**Given** a filtered report
**When** it is exported to Excel, CSV or PDF
**Then** the file contains the filters applied, the generation timestamp, the data freshness, the actor, and the definition of every metric included
**And** the export is recorded in the audit log with its row count

### AS-09 — Scheduled reports respect the recipient
**Given** a weekly report scheduled to three recipients with different scopes
**When** it runs
**Then** each receives figures for their own scope
**And** the schedule does not deliver the author's scope to everyone

### AS-10 — Threshold alerts fire once per crossing
**Given** an alert on backlog above 200
**When** backlog rises to 210, falls to 190 and rises to 220
**Then** two alerts fire, one per crossing
**And** it does not fire repeatedly while the value remains above the threshold

### AS-11 — Wallboard is live and unattended
**Given** a wallboard on a team-room screen
**When** the queue changes
**Then** it updates within its freshness target without interaction
**And** on losing its connection it displays the staleness of the data rather than a silently frozen figure

### AS-12 — Contract evidence stands up
**Given** a client asks for SLA evidence for one customer over a quarter
**When** a manager produces the per-contract report
**Then** every ticket is listed with its target, its clock states, its pause intervals with causes, and its met or breached outcome
**And** the totals reconcile with the compliance figure on the summary report

### AS-13 — Retired dimensions still report
**Given** a category retired last month, previously used by 300 tickets
**When** a manager reports on the prior quarter
**Then** those 300 tickets appear under that category
**And** the category is marked retired rather than omitted or silently rolled into its parent

## 5. Functional requirements

| ID | Requirement | Level | Traces |
|---|---|---|---|
| `FR-001` | The system MUST report ticket volume by period, channel, category, department, branch, priority and ticket type. | MUST | `RP-01` |
| `FR-002` | The system MUST report backlog as a point-in-time count and MUST retain periodic snapshots so that historical backlog trends are drawn from recorded measurements, never interpolated. Ageing MUST be reported in configurable buckets. | MUST | `RP-02` |
| `FR-003` | The system MUST report SLA compliance for first response and resolution, by team, agent, customer tier, category, channel, department and branch, reading clock states from spec `005` and reporting cancelled clocks separately. | MUST | `RP-03`, constitution III |
| `FR-004` | The system MUST report per-agent handled volume, mean first response, mean resolution, reopen rate and satisfaction together as one view. Sentiment MUST NOT appear. | MUST | `RP-04` |
| `FR-005` | The system MUST report satisfaction as a mean, always accompanied by the rated count, the unrated count and the response rate, with free-text comments readable. | MUST | `RP-05` |
| `FR-006` | The system MUST provide an executive dashboard of the agreed headline metrics with period-on-period trend, per `[CLARIFY-3]`. | MUST | `RP-06` |
| `FR-007` | The system SHOULD report first-contact resolution and reopen rate, per the definitions in section 2 and `[CLARIFY-1]`. | SHOULD | `RP-07` |
| `FR-008` | The system SHOULD compare channels on volume, mean resolution time and satisfaction. | SHOULD | `RP-08` |
| `FR-009` | The system SHOULD report knowledge deflection and self-service usage, reading from spec `006` `FR-011` and stating the attribution window on the report. | SHOULD | `RP-09` |
| `FR-010` | The system MUST report top categories and root causes with period-on-period change. | MUST | `RP-10` |
| `FR-011` | Every report MUST support filtering by date range, department, branch, team, agent, channel, category, priority, ticket type and customer segment, and every metric on the report MUST reflect every applied filter. | MUST | `RP-11` |
| `FR-012` | Every aggregate MUST support drill-down to the exact ticket list that produced it, and that list MUST reproduce the aggregate. | SHOULD | `RP-12` |
| `FR-013` | Every report MUST be exportable to Excel, CSV and PDF, carrying the filters applied, the generation timestamp, the data freshness, the actor and the definition of every metric included. | MUST | `RP-13` |
| `FR-014` | Reports MUST be schedulable to a recipient list at a chosen cadence; each recipient MUST receive figures computed for their own scope. | SHOULD | `RP-14`, constitution IV |
| `FR-015` | Managers MUST be able to build reports by selecting metrics, dimensions, filters, groupings and chart type, and to save and share them. A shared report MUST apply the viewer's scope. | SHOULD | `RP-15`, constitution IV |
| `FR-016` | Managers MUST be able to configure threshold alerts on metrics; an alert MUST fire once per threshold crossing and MUST NOT repeat while the value remains beyond it. | SHOULD | `RP-16` |
| `FR-017` | The system SHOULD provide an unattended wallboard showing queue state, waiting chats and at-risk tickets, updating without interaction and displaying data staleness on connection loss. | SHOULD | `RP-17` |
| `FR-018` | The system MAY forecast expected volume by day of week and hour from historical data, labelled as a forecast. | MAY | `RP-18` |
| `FR-019` | The system SHOULD support side-by-side comparison of branches and departments on the same metrics and period. | SHOULD | `RP-19` |
| `FR-020` | The system SHOULD produce a per-customer or per-contract SLA report listing every ticket with its target, clock states, pause intervals with causes, and outcome, reconciling with the summary compliance figure. | SHOULD | `RP-20` |
| `FR-021` | Every metric MUST carry an Arabic and English name and a prose definition, and MUST NOT be rendered anywhere without its definition reachable from the same screen. | MUST | constitution VII |
| `FR-022` | This spec MUST NOT compute any duration or breach state. Every such value MUST be read from spec `005`. | MUST | constitution III |
| `FR-023` | A dimension value that is retired or deleted MUST continue to appear in historical reports, marked retired, and MUST NOT be omitted or silently rolled into a parent. | MUST | constitution VII |
| `FR-024` | Every report MUST display its data freshness, and MUST apply the caller's scope to every aggregate. | MUST | constitution IV |
| `FR-025` | The system MUST report, per agent and per period, the proportion of total handling time that tickets spent in a status whose `pauses_sla` is true, reported separately per pausing status. An administrator MUST be able to configure a threshold per status above which an agent's proportion is flagged in the report. A flag MUST NOT block any action, MUST NOT alter any SLA outcome, and MUST NOT be presented as a finding of misconduct. Durations MUST be read from spec `005` (`FR-022`). | SHOULD | `RP-21`, amendment 2026-09-07 |

## 6. Edge cases and failure behaviour

| # | Situation | Required behaviour |
|---|---|---|
| E-01 | Zero tickets match the filters | Zero is displayed with the filters restated. Never a blank panel or an error. |
| E-02 | Division by zero (compliance with no completed clocks) | "No data" rather than 0% or 100%. |
| E-03 | Ticket transferred between teams mid-period | Attributed per `[CLARIFY-4]`; the chosen rule is stated on the report. |
| E-04 | Agent leaves and is deactivated | Their historical figures remain; they are marked inactive and excluded from current-period comparisons by default. |
| E-05 | Ticket merged during the period | The source is excluded from volume and backlog from the merge instant; the survivor carries the combined thread. Stated in the definition. |
| E-06 | Ticket split during the period | Counted as two tickets from the split instant onward. |
| E-07 | Category or team retired | Per `FR-023` — appears, marked retired. |
| E-08 | Customer erased under spec `001` `FR-021` | Aggregate counts preserved; the customer appears as a placeholder; per-customer reports for them are refused. |
| E-09 | SLA engine unavailable | Compliance and duration reports state unavailable. They MUST NOT fall back to timestamp arithmetic (constitution III). Volume and backlog still render. |
| E-10 | Backlog snapshot missing for a requested instant | The gap is shown as a gap. No interpolation, no carry-forward. |
| E-11 | Report requested over a range predating the system | The available range is stated; partial data is labelled partial. |
| E-12 | Scheduled report recipient loses their scope or leaves | Delivery to them stops; the schedule owner is notified. |
| E-13 | Shared report definition references a dimension the viewer cannot see | That dimension is dropped from the viewer's rendering and the omission is stated. |
| E-14 | Export exceeds the row limit | Refused with the limit named and a narrower filter suggested. Never silently truncated. |
| E-15 | Two thresholds cross simultaneously | Both alerts fire, each identifying its own metric. |
| E-16 | Wallboard connection lost | Displays the age of the data prominently. Never a stale figure presented as current. |
| E-17 | Free-text comment contains personal data | Displayed to permitted roles only; included in exports only where the exporting role may read it. |
| E-18 | Same ticket reopened three times in one period | Counted once in reopen rate (section 2). |
| E-19 | Timezone differs between branches | Periods are evaluated in the branch's own timezone; a multi-branch report states which timezone it used. |

## 7. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| `NFR-001` | Standard report render | ≤ 5s at p95 over a 12-month range |
| `NFR-002` | Executive dashboard render | ≤ 3s at p95 |
| `NFR-003` | Data freshness | ≤ 15 minutes, displayed on every report |
| `NFR-004` | Wallboard refresh | ≤ 30s |
| `NFR-005` | Drill-down reproduces the aggregate | Exactly, in 100% of cases |
| `NFR-006` | Export row limit | ≥ 100,000 rows, refusing beyond with guidance |
| `NFR-007` | Backlog snapshot interval | ≤ hourly, retained for the life of the system |

## 8. Bilingual and localisation requirements

| Surface | Arabic | English | RTL notes |
|---|---|---|---|
| Metric names **and definitions** | Required | Required | `FR-021` enforces both |
| Report titles, axis labels, legends | Required | Required | Chart mirrors; axis order mirrors; numeric axes do not reverse |
| Dimension values (categories, statuses, teams, channels) | Required | Required | Sourced from their owning spec, not re-authored |
| Filter interface | Required | Required | Date pickers mirror; date input order follows locale |
| Exported files | Required | Required | Column order mirrors in Arabic exports; numbers stay LTR |
| Scheduled email body | Required | Required | Follows the recipient's interface language |
| Threshold alert text | Required | Required | — |
| Wallboard | Required | Required | Chosen per screen, not per viewer |
| Free-text comments | Rendered as written | Rendered as written | Direction detected per comment |
| Numbers, percentages, durations | Locale-formatted, always LTR | Locale-formatted | Tabular alignment preserved in both directions |

## 9. Permissions

| Action | AGT | LEAD | MGR | EXEC | ADM | AUD |
|---|---|---|---|---|---|---|
| View own performance figures | ✓ | ✓ | ✓ | — | — | ✓ |
| View a colleague's performance figures | per `[CLARIFY-5]` | own teams | ✓ | ✓ | — | ✓ |
| View volume, backlog, ageing | own queue | own teams | ✓ | ✓ | ✓ | ✓ |
| View SLA compliance | own tickets | own teams | ✓ | ✓ | ✓ | ✓ |
| View satisfaction scores | own tickets | own teams | ✓ | ✓ | — | ✓ |
| Read satisfaction free-text comments | own tickets | own teams | ✓ | ✓ | — | ✓ |
| View executive dashboard | — | — | ✓ | ✓ | ✓ | ✓ |
| Compare branches and departments | — | — | ✓ | ✓ | ✓ | ✓ |
| Build and save a report | — | ✓ | ✓ | ✓ | ✓ | — |
| Share a report definition | — | ✓ | ✓ | ✓ | ✓ | — |
| Export a report | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Schedule a report | — | ✓ | ✓ | ✓ | ✓ | — |
| Configure threshold alerts | — | ✓ | ✓ | — | ✓ | — |
| Configure the wallboard | — | ✓ | ✓ | — | ✓ | — |
| Produce per-contract SLA evidence | — | — | ✓ | ✓ | ✓ | ✓ |
| View the paused-time distribution (`FR-025`) | — | **never** | ✓ | ✓ | — | ✓ |
| Configure a paused-time threshold (`FR-025`) | — | — | ✓ | — | ✓ | — |
| Define or edit a metric definition | — | — | — | — | ✓ | — |

Export is separately permissioned throughout because it removes data from the
audit boundary.

`FR-025` is deliberately **not** available to `LEAD`, and this is the only
`never` in the table. The report measures whether agents are parking tickets to
stop the SLA clock, and a lead's own team's figures are what it reflects — so
granting it to `LEAD` would put the measurement in the hands of the person it
also measures. Cross-team visibility is the point of the report, which makes
`MGR` the lowest role that can hold it without a conflict of interest.

## 10. Audit requirements

| Event | Recorded fields |
|---|---|
| Report viewed | actor, timestamp, report identity, filters applied, scope in effect |
| Report exported | actor, timestamp, report, filters, format, row count, destination |
| Report definition created / edited / shared / deleted | actor, timestamp, before, after, share scope |
| Schedule created / edited / run / failed | actor, timestamp, recipients, cadence, per-recipient outcome |
| Threshold alert configured / fired / cleared | actor or system, timestamp, metric, threshold, value at crossing |
| Metric definition changed | actor, timestamp, before, after — **retained permanently; a definition change alters history's meaning** |
| Per-contract evidence produced | actor, timestamp, customer, period, ticket count |
| Backlog snapshot taken / missed | timestamp, dimensions, count, or the failure reason |
| Free-text comments viewed | actor, timestamp, ticket count — comments may contain personal data |

## 11. Contracts

| Operation | Purpose | Scope predicate |
|---|---|---|
| `get metric definitions` | Definitions beside every figure | all roles |
| `run report` | Any standard or custom report | branch ∈ scope AND department ∈ scope AND (team ∈ scope OR role ≥ manager), applied to the **aggregate**, not only the row list |
| `drill down` | Aggregate to ticket list | same predicate; the list must reproduce the aggregate |
| `get clock states (batch)` (read-through to spec `005`) | Compliance and durations | **read only**; no local computation |
| `list backlog snapshots` | Historical trend | same scope |
| `get executive dashboard` | Headline metrics | manager and above |
| `manage report definition` | Build, save, share | lead and above; shared definitions apply the viewer's scope |
| `export report` | File output | separately permissioned; audited with row count |
| `manage schedule` | Distribution | lead and above; per-recipient scope enforced at run time |
| `manage threshold alert` | Monitoring | lead and above |
| `get wallboard` | Unattended display | configured scope; read only |
| `get contract sla evidence` | Client account reviews | manager and above; customer ∈ scope |
| `manage metric definition` | Governance | admin only; permanently audited |

## 12. Clarifications needed

- [ ] `[CLARIFY-1]` **What is the agreed definition of resolved versus closed?** Shared with spec `002` `[CLARIFY-2]`. First-contact resolution, reopen rate and satisfaction all rest on it; without it no metric here is buildable. Also: does first-contact resolution tolerate a clarifying question? — *blocks* `FR-007`, and every metric definition — *ask* client management
- [ ] `[CLARIFY-2]` Is satisfaction CSAT, NPS or both, on what scale, and requested after what delay? Shared with spec `008` `[CLARIFY-3]`. — *blocks* `FR-005` — *ask* client management
- [ ] `[CLARIFY-3]` **Which 8 to 10 metrics belong on the executive dashboard?** — *blocks* `FR-006` — *ask* client executive sponsor
- [ ] `[CLARIFY-4]` When a ticket moves between teams, branches or agents mid-period, which one is credited: first, last, or apportioned? This decides every per-team and per-agent figure. — *blocks* `FR-003`, `FR-004`, `E-03` — *ask* client management
- [ ] `[CLARIFY-5]` **Do agents see their own figures, and do they see their colleagues'?** An employment and culture question with a direct permission consequence. — *blocks* the section 9 matrix — *ask* client HR + management
- [ ] `[CLARIFY-6]` Which reports must exist as fixed, client-approved formats, and which are built ad hoc? This decides how much of `FR-015` is needed at launch. — *blocks* the scope of `FR-015` — *ask* client management

## 13. Success metrics

| Metric | Source | Target |
|---|---|---|
| Standard management questions answerable without a developer | Against an agreed list of 20 | 20 of 20 |
| Duration figures disagreeing with spec `004` or the API | Reconciliation | 0 (constitution III) |
| Drill-downs failing to reproduce their aggregate | Automated check across all reports | 0 |
| Data freshness | Measured lag | < 15 minutes |
| Manual reporting effort per month | Manager hours | < 2 |
| Numbers disputed in a client review and unresolvable by drill-down | Per review | 0 |
| Metrics rendered without a reachable definition | UI audit | 0 |

## 14. Review checklist

- [x] No implementation detail
- [x] Every requirement testable, using MUST / SHOULD / MAY
- [x] No unfailable adjectives
- [x] Every requirement traces to a story ID or constitution principle
- [x] Every acceptance scenario has a matching requirement, and vice versa
- [x] Edge cases cover empty, zero-division, retired dimensions, mid-period movement and unavailable dependencies
- [x] Bilingual requirements stated, including metric **definitions**, not only names
- [x] Permission matrix complete, with export separately permissioned
- [x] Audit entries defined, with metric-definition changes retained permanently
- [x] **Constitution III satisfied — `FR-022` forbids local duration computation; `E-09` forbids a timestamp fallback**
- [x] Constitution VII satisfied — every metric carries a displayed definition (`FR-021`)
- [ ] **Zero `[NEEDS CLARIFICATION]` markers remaining — 6 open, `/plan` is blocked**
- [x] Constitution gates satisfied and named

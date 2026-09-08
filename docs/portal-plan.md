# portal-plan.md — the customer-facing flow, audited and split

Written 2026-09-08, after auditing this flow against `specs/` and `stories/`:

1. Customer signs in and opens a ticket
2. It lands with someone, who assigns it to an agent
3. Agent and customer exchange messages
4. Agent marks it resolved
5. Customer sees it is resolved

**Approve pieces from §6 one at a time.** Nothing in §6 is started. The two
prerequisites already done are marked as such.

Read `state.md` for what exists and `next-steps.md` for debt in what exists.
This file covers only the customer-facing flow above.

---

## 1. The short version

**The customer side is entirely unbuilt** — no account, no screen, no route, no
way in. Staff authentication resolves against the `User` collection only; a
`Customer` has no credentials and no session. The one nuance: `ContactPoint`
already carries a `verifiedAt` column, so the data model anticipates
verification. Nothing ever writes it, and `008 FR-001` requires authentication
against a *verified* contact point — so the column exists and the mechanism does
not.

**Step 2 as originally imagined — landing with an administrator who routes it —
has no requirement anywhere, and has been dropped in favour of the specified
model** (§4). Tickets land unassigned in the owning team's queue, are assigned
by rule, or are self-assigned. An administrator assigning stays what it is: a
manual override that §9 permits.

That makes **Team the blocker for the real intake path**. Its entity is now
decided — owned by spec `012`, one Department, independent of Branch, membership
on `RoleAssignment` (§5.4, decision 30) — but **one rule is still missing**:
`002 E-12`'s singular *"the team lead"* has no stated behaviour for zero or
several leads, and `E1` cannot be built against an undefined recipient (§5.5
Point 4). `B5` precedes `E1`, and both precede the specified version of step 2.

**Four decisions were ratified 2026-09-08** (§5.1), by the delivery team rather
than the client, and are marked in §5.1 as either a reading the specs argue for
or a judgement made where they are silent. One is deliberately deferred (§5.2).
One listed as open was never open (§5.3).

Spec `012` owns the Team entity, and its data model is decided — `T1` + `M1`
(§5.4). The options and evidence are kept in §5.5 rather than deleted. **One
rule remains open and blocks `E1`** (§5.5 Point 4).

---

## 2. Step-by-step coverage

| Step | Requirements | State |
|---|---|---|
| **1.** Customer signs in | `008 FR-001`, `AS-01`, `E-01`–`E-03`; `CP-01` | Unbuilt. `[CLARIFY-1]` decided §5.1: one-time code, accounts only |
| **1.** Opens a ticket | `008 FR-002`, `AS-04`; `002 §9` (CUST create ✓ portal); `CP-02` | Unbuilt. Ticket has no `source` field |
| **2.** Lands somewhere | `002` entity (`assigned_agent_id` empty = queued, `owning_team_id` required); `004 FR-001` | Unbuilt — no Team, no queue |
| **2.** Assigned to an agent | `002 FR-009`, `FR-010`, `§9`; `005 FR-008` (**MUST**), `FR-009` | Manual assignment built. Auto-assignment unbuilt |
| **3.** Agent → customer | `002 FR-014`; `008 AS-06`, `FR-019` | Half-built: stored, never delivered |
| **3.** Customer → agent | `008 FR-004`, `AS-07`; `CP-04`; constitution VI | Unbuilt |
| **4.** Agent marks resolved | `002 FR-007`, `FR-008` | Built |
| **4.** …with resolution fields | `002 FR-029`, `AS-13` | Requirement exists, gate disabled (decision 23) |
| **5.** Customer sees resolved | `008 FR-003`, `FR-005`, `AS-05`; `CP-03` | Unbuilt. `FR-003` stays an **uncovered MUST** — timing shows nothing until spec `005` (§5.1) |
| **5.** Is told it resolved | `008 FR-010`, `AS-11`; spec `003` | Unbuilt, blocked on spec `003` |
| **5.** Confirms closure | `002 FR-031`; `§9` "Close: confirm only" | Unbuilt. `002 [CLARIFY-2]` **resolved 2026-09-07**: confirmation only, no auto-close (§5.3) |
| **5.** Rates it | `008 FR-008`, `AS-08`; `CP-08` | Unbuilt, blocked on `008 [CLARIFY-3]` |

### Covered by a requirement, with no code

`008 FR-001`–`FR-005`, `FR-010`, `FR-011`, `FR-013`, `FR-019`, `FR-020` ·
`002 FR-022`, `FR-029`, `FR-031` · `005 FR-008` (a **MUST**) · `004 FR-001` ·
the whole of spec `003`, which is what makes step 3 only half-built: a stored
message reaches nobody.

---

## 3. Requirements that exist nowhere

Three things this flow needs that no spec owns. Each needs a decision or a spec
amendment before the piece that depends on it is built.

| Gap | Why it matters |
|---|---|
| **Ticket `source`** | `008 AS-04` mandates a ticket created with `source: portal`, but `002`'s Ticket entity has no `source` attribute. Neither spec owns the field. Without it, portal intake is indistinguishable from an agent typing on the customer's behalf — and `008`'s own success metric "portal share of ticket intake" is unmeasurable. |
| **Customer-facing status labels** | `008 §8` says they are "sourced from spec `002` status labels, not re-authored here". `002` defines status keys and no customer-facing label. Nothing in the product tells a customer what `pending_internal` means, in either language. |
| **An administrator intake surface** | No spec describes one. `004` is the agent and lead workspace. Recorded because the original step 2 assumed it; the assumption has been dropped rather than built. |

---

## 4. Where the original flow contradicted the specs

Kept for the record, since the decision has been taken and the plan below
follows the specs rather than the original sketch.

**Step 2.** The specified intake model is a queue, not a person:

- `002` Ticket: `assigned_agent_id` — *"Optional; empty means queued"*;
  `owning_team_id` — **Required**
- `002 E-12`: a deactivated agent's ticket *"returns to the owning team queue"*
- `004 FR-001`: the workspace opens on *"the agent's personal queue"*
- `005 FR-008` (**MUST**): auto-assignment supporting `round_robin`,
  `least_loaded` and `skill_match`
- `005 FR-009`: assignment considers only agents *"in the owning team"*

**Decision taken 2026-09-08:** the spec's model stands. Tickets land in a team
queue, auto-assigned or self-assigned. An administrator assigning remains the
manual override `002 §9` permits. No administrator inbox will be built.

Consequence: every queue statement above is anchored on `owning_team_id`, so
**Team gates the real intake path**. `B5` before `E1`, both before step 2 works
as specified.

**Step 1** presumed a decision not then made. `008 [CLARIFY-1]` is now decided —
§5.1: one-time code to email or phone, accounts only, no anonymous submission.

**Step 5** carried three dependencies on one screen, and all three are now
decided (§5.1, §5.4): timing shows nothing, no agent identity is shown, and the
**owning team** `008 FR-003` requires the screen to display is now a defined
entity. `D2` therefore depends on `B5` having been built, not on a decision.

---

## 5. Decisions

### 5.1 Ratified 2026-09-08

**By Mohamed Sadek (developer, acting as decision authority) — the delivery team,
not the client.** Recorded in those words because the constitution requires it:

> A decision made by the delivery team rather than the client is recorded as
> such, in those words.
> — `.specify/memory/constitution.md`, Governance

The `Kind` column separates a decision the specs already argued for from one the
decision-maker supplied where the specs are silent. The constitution's gate is
that *"a marker's answer is never invented"* — a **judgement** below is not an
invented reading of the specs; it is an owned choice where the specs say nothing,
and it is marked so a later reader can tell the two apart.

| Marker | Decision | Kind | Basis |
|---|---|---|---|
| `008 [CLARIFY-1]` — method | **One-time code to email or phone. No password.** | **Reading** — the specs argue it | `008 AS-01` §4: *"the customer requests a one-time code and submits it correctly"*; `008 E-03` §6: *"One-time code requested repeatedly \| Rate-limited per source and per contact point"*; `008 NFR-004` §7: *"One-time code delivery \| ≤ 30s at p95"* — a target written for OTP; `stories/008 CP-01`: *"sign in by email or phone one-time code, or SSO \| **my requests are tied to me without another password**"*. `password` appears only in the `auth_method` enum at §3 and nothing supports it |
| `008 [CLARIFY-1]` — anonymous | **No anonymous submission. Accounts only.** | **Judgement** — the specs are silent | Nothing in `specs/` or `stories/` leans either way. `008 §9` defers the anonymous cell (*"Submit a ticket \| per `[CLARIFY-1]`"*) and `008 E-02` offers both paths without choosing (*"Registration is offered per `[CLARIFY-1]`, **or** the customer is directed to contact us"*). Decided by the delivery team |
| `008 [CLARIFY-2]` | **Show nothing about timing. PROVISIONAL — revisit when spec `005` unblocks.** | **Reading** — forced by the constitution | Both other options are durations, and constitution III: *"Elapsed time is never computed as `now - created_at` … Any feature that displays, sorts by, reports on or alerts against remaining time reads from that one implementation."* That implementation is spec `005`, unbuilt. "Nothing" is the only option buildable today — not a preference |
| `002 [CLARIFY-6]` | **Team only. No agent identity, including the replier.** | Team-only: **reading**. Including the replier: **judgement** | Team-only rests on `008 FR-003` §5 (*"MUST show a customer-facing status label, the **owning team**, and timing information"* — names the team, not the agent) and `stories/008 CP-03` (*"see status, **owning team** and expected response time"*); the marker routes to *"client operations + **HR**"*, the only marker in either spec that involves HR. The replier half resolves an ambiguity the spec does not: `002 §9` footnote ² reads *"not the identity of individual agents **beyond the replier** per `[CLARIFY-6]`"*, which parses two ways. Decided by the delivery team: the whole clause is subject to the marker, so the replier is hidden too |

**Consequence to keep visible:** `008 FR-003` is a **MUST** that requires *"timing
information per `[CLARIFY-2]`"*. Deciding to show nothing satisfies the marker,
**not the requirement**. `FR-003` remains an uncovered MUST until spec `005`
exists, and `[CLARIFY-2]` is to be reopened then. It must not be recorded
anywhere as satisfied.

### 5.2 Still open

| Marker | Question | Blocks | State |
|---|---|---|---|
| `008 [CLARIFY-3]` | *"Is satisfaction CSAT, NPS or both, on what scale, and after what delay is it requested? Shared with spec `009` `[CLARIFY-2]`."* | `008 FR-008`, `009 FR-005` — piece `F2` only | **Deferred deliberately**, to be taken with the client. Inventing a scale would make satisfaction data incomparable across the change point, and `009 FR-005` reports it as a **mean** |

Three further `008` markers are open but fall outside this flow: `[CLARIFY-4]`
(organisation visibility, blocks `FR-006`), `[CLARIFY-5]` (complaints, blocks
`FR-017`), `[CLARIFY-6]` (portal domain, blocks `FR-016`, `FR-018`, `E-16`).

### 5.3 Correction — `002 [CLARIFY-2]` was never open

An earlier revision of this file listed *"How long is the auto-close grace period
after `resolved`?"* as a fifth open decision. It is not.
`specs/002-ticket-management/spec.md` §12 carries it as `- [x]`, **RESOLVED
2026-09-07**:

> **Decided — the grace period: THERE IS NONE, for now.** Closure occurs on
> **explicit customer confirmation only**. No automatic close.

So `002 FR-031` is not blocked on a decision. It is blocked on there being a
customer who can confirm — which is the portal itself. Piece `F3`'s blocker is
corrected accordingly in §6.

### 5.4 Team — owner decided, data model open

**Spec `012` (Platform) owns the Team entity.** Ratified 2026-09-08 by the
delivery team, on the specs' own division of labour:

- `012 §1` in scope: *"…**the department and branch models**; cross-boundary
  ticket transfer…"*
- `012 §1` out of scope: *"Permission enforcement — spec `010`; **this spec
  defines the department and branch entities that scoping applies to**"*
- `010 §1` in scope: *"Staff accounts, roles and granular permissions; **scoping
  by department, branch and team**"*

012 defines the organisational entities; 010 scopes by them. Team is an
organisational entity that 010 scopes by. Decisively, `012 §3` already carries
`default_team_id | ref | **Required**` on Department — a required foreign key to
an entity the same spec never defines.

**The data model is now decided — `T1` + `M1`, ratified 2026-09-08 by Mohamed
Sadek (developer, acting as decision authority), a decision made by the delivery
team rather than the client.** Recorded as decision 30 in
`docs/decisions-pending.md`.

- **`T1`** — a Team belongs to **exactly one Department**, and is **independent
  of Branch**.
- **`M1`** — **membership rides on `RoleAssignment`**: an assignment names
  branch, department and team.

The deciding argument was reversal asymmetry, not elegance: `T2 → T1` later
means giving every existing team a department and re-checking every ticket's
`owning_team_id` against it — cheap at zero ticket volume, expensive after —
while `T1 → T2` is near-free. `M1` was chosen because it inherits `010 AS-04`
(*a granting admin cannot exceed their own scope*), which is already built and
tested, whereas `M2` would need its own overreach rule and **no spec provides
one**.

The options and the evidence behind them are kept in §5.5 rather than deleted,
so the reasoning stays attributable.

**⚠ One rule is still missing, and `E1` is blocked on it** — see §5.5 Point 4.

### 5.5 Team — the open points, with options

Twenty-five relationships are already stated across `002`, `004`, `005`, `009`,
`010` and `012`; they are not repeated here. What follows is only what is *not*
stated, with the options each leaves open and what each costs to reverse.

Two points listed as open in the 2026-09-08 audit turned out to be closer to
answered on re-reading, and are recorded as such rather than presented as free
choices.

#### Point 1 — what a Team belongs to — **DECIDED: T1**

| Option | Shape | Evidence for | Evidence against |
|---|---|---|---|
| **T1** | Team belongs to exactly **one Department**; independent of Branch | `012 §3` Department`.default_team_id` **Required** gives Department→Team. `012 AS-09`: *"two departments with different **categories**"* — categories are department-scoped, and `002 FR-005` gives each category a default owning team, so those teams sit inside a department. `005 §2` lists *"in the owning team, **in scope**"* as two separate conditions, so team is not a restatement of branch | — |
| **T2** | Team is a **third independent dimension**, belonging to neither branch nor department | Reads the scope predicates most literally: `010 §3` `scope_context \| map \| The branch, department and team in effect`; `002 §11` *"branch ∈ scope AND department ∈ scope AND (team ∈ scope OR role ≥ lead)"* | `012 §3`'s Required `default_team_id` would point at a team with no stated relationship to that department, and `012 AS-09` + `002 FR-005` would give a department's categories default teams from anywhere |
| **T3** | Team belongs to **one Department AND one Branch** | Matches an intuition that a team is a group of people in a place | **Contradicted by `012 §3`.** `default_team_id` is a *single* ref on Department, and Department carries no branch reference — so a department operating in three branches could name only one branch's team as its default |

**T3 is excluded by the specs, not by preference.** The live choice is T1 or T2.

*Reversal cost (delivery-team estimate, not from the specs):* T2 → T1 later means
giving every existing team a department and re-checking every ticket's
`owning_team_id` against its `department_id` — cheap while ticket volume is zero,
expensive after. T1 → T2 is near-free. **T1 is the more expensive to get wrong in
one direction and the safer default in the other.**

#### Point 2 — whether a Team belongs to a Branch — **DECIDED: no (T1)**

Folded into Point 1: T1 and T2 both say no, T3 says yes and is excluded. The
strongest single line against branch-bound teams is `005 §2`, which lists *"in
the owning team"* and *"in scope"* as separate conditions of eligibility — if a
team were branch-bound the second would be implied by the first.

#### Point 3 — who assigns membership, and how — **DECIDED: M1**

Nothing in any spec creates, edits or populates a team. `004 §2` (*"a team I am
in"*), `004 FR-016` (*"the teams … they hold"*) and `004 E-14` (*"Lead scoped to
zero teams"*) establish that membership exists and is plural, and stop there.

| Option | Shape | Cost |
|---|---|---|
| **M1** | Membership rides on the existing **RoleAssignment**: an assignment names branch, department **and team** | No new entity. Inherits `010 AS-04` (*a granting admin cannot exceed their own scope*) for free — already built and tested. Matches `010 §3` `scope_context`'s single map of three coordinates. Consequence: you cannot be in a team without holding a role there |
| **M2** | A separate **TeamMembership** entity, independent of roles | Allows membership without a role. Needs its own no-overreach rule, and **no spec provides one** — it would be invented. Two membership concepts to keep in sync with the scope predicate |

*Evidence leans M1;* the choice of which is a judgement.

#### Point 4 — what a "team lead" is — **OPEN, and it blocks `E1`**

| Option | Shape | Evidence |
|---|---|---|
| **L1** | The existing `LEAD` role, scoped to that team | `010` §4: *"a user who is an agent in branch B and a **team lead** in branch C"* — phrased as a role held at a place. `004 FR-016`: *"scoped to the teams, branches and departments **they hold**"* |
| **L2** | An explicit `lead_user_id` attribute on Team | Nothing in any spec proposes it |

**Not decided, and no rule invented here.** `002 E-12` says *"the ticket returns
to the owning team queue as unassigned and **the team lead** is notified"* —
singular and definite. Under `M1` a team lead is the `LEAD` role scoped to that
team, so a team may hold **zero leads or several**, and **no spec states what
happens in either case**:

- With zero, `E-12`'s notification has no recipient, and a deactivated agent's
  tickets return to a queue nobody is told about.
- With several, `E-12` does not say whether all are notified or one is chosen.
  `005`'s escalation *"level 1 after 2h unassigned to the team lead"* carries the
  same ambiguity.

**This blocks piece `E1`.** `005 FR-009` requires that *"where none are eligible
the ticket MUST remain unassigned and **the lead** MUST be notified"* — not
implementable against an undefined recipient. It needs either a stated rule in
`012` alongside the Team entity, or option `L2` (an explicit `lead_user_id` on
Team). Neither has been chosen.

#### Point 5 — team-scoped reads *(more answered than first recorded)*

For tickets the predicate **is** stated: `002 §11` gives
*"branch ∈ scope AND department ∈ scope AND (team ∈ scope OR role ≥ lead)"* for
`get ticket`, and *"same"* for `list / filter tickets`. `009 §11` gives the same
shape at manager level for reports.

The genuine residue is narrower than first recorded:

- **Does team scoping apply to non-ticket entities?** `002 FR-033` states it for
  this spec's records. `001` mentions a team once, in an unrelated sentence about
  a lead merging duplicates. Nothing says whether reading a *customer* applies a
  team term.
- **What "team ∈ scope" means for a caller holding no teams.** `004 E-14` covers
  only a lead's queue view (*"empty with an explanation, not an error"*).

#### Point 6 — may a Department have teams beyond its default *(implied, needs ratifying)*

Two stated facts together imply yes: `012 AS-09` establishes that categories are
department-scoped (*"only their department's categories are offered"*), and
`002 FR-005` gives **each category node** a default owning team. A department
with several categories having different default teams requires several teams,
or per-category defaults would be pointless. The worked example at `002` §4 names
one — *"category 'Billing / Refund' with default priority High and default team
**Finance Support**"*.

This is an inference from two stated facts, not a stated fact. It needs
ratifying rather than deciding.

---

## 6. The pieces

One developer at this project's pace. Days are engineering days and exclude
client turnaround and review. Backend and frontend are separate so they can be
approved, scheduled or split between people independently.

### Done

| # | Piece | Actual | Commit |
|---|---|---|---|
| `B1` | Authorise a message by its visibility (`002 §9`) — an administrator may write an internal note, not a customer reply | 0.5 be | `2cab44c` |

### Prerequisites inside the staff product

These pay off whether or not the portal is ever built.

| # | Piece | Backend | Frontend | Blocked on |
|---|---|---|---|---|
| `B2` | Ticket `source` field, `portal` origin, exposed on read | 0.5 | — | §3 gap 1 |
| `B3` | Bilingual customer-facing status labels (`008 §8`) | 1 | 0.5 | §3 gap 2 |
| `B4` | Root-cause and resolution-code lists; enable the `FR-029` gate; reverses decision 23 | 1.5 | 1 | client supplies the values |
| `B5` | **Team entity** — model (`T1`), membership on `RoleAssignment` (`M1`), `owning_team_id`, third scope dimension, backfill; reverses decision 20 | 2–3 | 1 | — (decision 30) |

### Customer identity — the way in

| # | Piece | Backend | Frontend | Blocked on |
|---|---|---|---|---|
| `C1` | Contact point verification: a flow that actually writes `verifiedAt` | 1.5–2 | — | — |
| `C2` | Portal identity, one-time-code sign-in, rate limiting, `E-01`–`E-03` neutral responses | 3–4 | — | `C1` (`[CLARIFY-1]` decided) |
| `C3` | The `customer = session` scope predicate — a second, separate predicate; the staff one assumes a branch and department the customer does not hold | 1.5–2 | — | `C2` |
| `C4` | Portal shell: sign-in, layout, RTL mirror, mobile (`FR-011`, `FR-012`) | — | 2–3 | `C2` |

`C3` is the piece to review hardest. It is a **new access model**, not a widened
one, and it is the only place where constitution IV's guarantee could be
weakened by accident.

### The portal surface

| # | Piece | Backend | Frontend | Blocked on |
|---|---|---|---|---|
| `D1` | Submit a ticket (`FR-002`, `AS-04`) | 1–1.5 | 2–3 | `C3`, `B2` |
| `D2` | Ticket list and detail, internal content excluded (`FR-003`, `FR-005`, `FR-019`, `AS-06`) — no timing, no agent identity (§5.1) | 2 | 3–4 | `C3`, `B3` |
| `D3` | Customer reply onto the same thread (`FR-004`, `AS-07`) | 1 | 1–1.5 | `D2` |
| `D4` | Attachments with the spec `010` scanning gate (`FR-015`, `E-09`, `E-10`) | 2–3 | 1–1.5 | — |

### Intake as specified

| # | Piece | Backend | Frontend | Blocked on |
|---|---|---|---|---|
| `E1` | Auto-assignment: `round_robin`, `least_loaded`, `skill_match`, eligibility, unassigned-and-notify fallback (`005 FR-008`, `FR-009`) | 3–4 | 1–2 | `B5`, **and the team-lead rule (§5.5 Point 4)** |

### Remaining portal requirements

| # | Piece | Backend | Frontend | Blocked on |
|---|---|---|---|---|
| `F1` | Notifications on status change (`FR-010`, `AS-11`) | — | — | spec `003` — **not estimable** until a channel exists |
| `F2` | Feedback, one rating per resolved ticket (`FR-008`, `AS-08`) | 1.5 | 1 | `008 [CLARIFY-3]` |
| `F3` | Reopen, withdraw, and confirm closure (`FR-009`, `FR-014`, `002 FR-022`, `002 FR-031`) | 1.5 | 1 | `D2` — not a decision (§5.3) |

---

## 7. What the five steps minimally need

`B3`, `C1`, `C2`, `C3`, `C4`, `D1`, `D2`, `D3` — plus `B2` if portal-origin
tickets are to be distinguishable at all.

**≈13 backend days, ≈10 frontend days — roughly five weeks for one developer**
(23 engineering days at midpoint, before review).

Even then, step 5 shows no timing and no owning team until `008 [CLARIFY-2]` and
Team are answered, and nothing notifies the customer until spec `003` exists —
they must return to the portal to discover the ticket was resolved.

**For step 2 as specified** rather than as a manual override, add `B5` and `E1`:
**+5–7 backend, +2–3 frontend.**

---

## 8. Estimate honesty

These are wall-clock estimates for one developer at the pace this repository was
built, and they carry the same caveat as `next-steps.md` §4: ballpark, not a
quote. Three specific reasons they could stretch:

- **`C2` and `C3` are security surfaces.** A portal is the first
  internet-facing, unauthenticated-until-proven entry point in this product.
  The estimates cover building it; they do not cover a penetration test, and one
  is warranted before it is exposed.
- **`D2` carries `FR-019`** — no internal note, AI output, automation log or
  assignment detail on any portal surface, export or notification. That is a
  guarantee about *every* surface, and it needs a test per surface rather than
  one check.
- **The frontend still has no meaningful tests** (`next-steps.md` §5). Portal
  screens are where hand-rolled components meet untrusted users and Arabic
  layout at the same time. Either the accessibility and RTL pass in
  `next-steps.md` §6 happens before `C4`, or these numbers are optimistic.

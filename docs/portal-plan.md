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

That makes **Team the blocker for the real intake path**, and Team is undefined
in every spec that uses it. `B5` precedes `E1`, and both precede the specified
version of step 2.

**Five client decisions gate the rest** (§5). `008 [CLARIFY-1]` is the sharpest:
it decides whether "signs in" is the first step at all, or whether a customer
may submit without an account.

---

## 2. Step-by-step coverage

| Step | Requirements | State |
|---|---|---|
| **1.** Customer signs in | `008 FR-001`, `AS-01`, `E-01`–`E-03`; `CP-01` | Blocked and unbuilt — `008 [CLARIFY-1]` |
| **1.** Opens a ticket | `008 FR-002`, `AS-04`; `002 §9` (CUST create ✓ portal); `CP-02` | Unbuilt. Ticket has no `source` field |
| **2.** Lands somewhere | `002` entity (`assigned_agent_id` empty = queued, `owning_team_id` required); `004 FR-001` | Unbuilt — no Team, no queue |
| **2.** Assigned to an agent | `002 FR-009`, `FR-010`, `§9`; `005 FR-008` (**MUST**), `FR-009` | Manual assignment built. Auto-assignment unbuilt |
| **3.** Agent → customer | `002 FR-014`; `008 AS-06`, `FR-019` | Half-built: stored, never delivered |
| **3.** Customer → agent | `008 FR-004`, `AS-07`; `CP-04`; constitution VI | Unbuilt |
| **4.** Agent marks resolved | `002 FR-007`, `FR-008` | Built |
| **4.** …with resolution fields | `002 FR-029`, `AS-13` | Requirement exists, gate disabled (decision 23) |
| **5.** Customer sees resolved | `008 FR-003`, `FR-005`, `AS-05`; `CP-03` | Unbuilt |
| **5.** Is told it resolved | `008 FR-010`, `AS-11`; spec `003` | Unbuilt, blocked on spec `003` |
| **5.** Confirms closure | `002 FR-031`; `§9` "Close: confirm only" | Unbuilt, blocked on `002 [CLARIFY-2]` |
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

**Step 1** presumes a decision not yet made — see `008 [CLARIFY-1]` below.

**Step 5** carries three unresolved dependencies on one screen: timing per
`008 [CLARIFY-2]`, the owning team (undefined), and agent identity per
`002 [CLARIFY-6]`.

---

## 5. The five client decisions

None of these is an engineering question. `C1`–`C4` should not start before the
first is answered.

| # | Question | Blocks |
|---|---|---|
| `008 [CLARIFY-1]` | **Is customer authentication a one-time code, a password, or the client's SSO — and may a customer submit a ticket with no account at all?** | `FR-001`, `FR-002`, `E-02`, and whether "signs in" is step 1 at all. Decides `C2`, `C4`, `D1` |
| `008 [CLARIFY-2]` | What does the portal show about timing: the SLA target, an estimate, or nothing? | `FR-003`, `AS-05` — the resolved view in step 5 |
| `002 [CLARIFY-6]` | May a customer see which individual agent handled their ticket? | `008 AS-05`; what `D2` renders |
| `002 [CLARIFY-2]` | How long is the auto-close grace period after `resolved`? | `002 FR-031`, `F3` |
| **Team** | What is a Team: who belongs, does it nest inside a department or cross departments, who assigns membership? A spec defect, not a client preference — but the client owns the answer. | `B5`, `E1`, `008 FR-003` ("owning team"), and the specified step 2 |

Answering `008 [CLARIFY-1]` first buys the most: it is the only one that can
invalidate work rather than merely delay it.

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
| `B5` | **Team entity** — model, membership, `owning_team_id`, third scope dimension, backfill; reverses decision 20 | 2–3 | 1 | Team definition |

### Customer identity — the way in

| # | Piece | Backend | Frontend | Blocked on |
|---|---|---|---|---|
| `C1` | Contact point verification: a flow that actually writes `verifiedAt` | 1.5–2 | — | — |
| `C2` | Portal identity, one-time-code sign-in, rate limiting, `E-01`–`E-03` neutral responses | 3–4 | — | `[CLARIFY-1]`, `C1` |
| `C3` | The `customer = session` scope predicate — a second, separate predicate; the staff one assumes a branch and department the customer does not hold | 1.5–2 | — | `C2` |
| `C4` | Portal shell: sign-in, layout, RTL mirror, mobile (`FR-011`, `FR-012`) | — | 2–3 | `C2` |

`C3` is the piece to review hardest. It is a **new access model**, not a widened
one, and it is the only place where constitution IV's guarantee could be
weakened by accident.

### The portal surface

| # | Piece | Backend | Frontend | Blocked on |
|---|---|---|---|---|
| `D1` | Submit a ticket (`FR-002`, `AS-04`) | 1–1.5 | 2–3 | `C3`, `B2` |
| `D2` | Ticket list and detail, internal content excluded (`FR-003`, `FR-005`, `FR-019`, `AS-06`) | 2 | 3–4 | `C3`, `B3` |
| `D3` | Customer reply onto the same thread (`FR-004`, `AS-07`) | 1 | 1–1.5 | `D2` |
| `D4` | Attachments with the spec `010` scanning gate (`FR-015`, `E-09`, `E-10`) | 2–3 | 1–1.5 | — |

### Intake as specified

| # | Piece | Backend | Frontend | Blocked on |
|---|---|---|---|---|
| `E1` | Auto-assignment: `round_robin`, `least_loaded`, `skill_match`, eligibility, unassigned-and-notify fallback (`005 FR-008`, `FR-009`) | 3–4 | 1–2 | `B5` |

### Remaining portal requirements

| # | Piece | Backend | Frontend | Blocked on |
|---|---|---|---|---|
| `F1` | Notifications on status change (`FR-010`, `AS-11`) | — | — | spec `003` — **not estimable** until a channel exists |
| `F2` | Feedback, one rating per resolved ticket (`FR-008`, `AS-08`) | 1.5 | 1 | `008 [CLARIFY-3]` |
| `F3` | Reopen and withdraw (`FR-009`, `FR-014`, `002 FR-022`) | 1.5 | 1 | `002 [CLARIFY-2]` |

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

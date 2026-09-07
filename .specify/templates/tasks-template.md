# Tasks NNN — [Epic name]

> Every task traces to a functional requirement (constitution VIII). A task with
> no `Traces` value is deleted, not justified.

| | |
|---|---|
| **Spec** | [`./spec.md`](./spec.md) |
| **Plan** | [`./plan.md`](./plan.md) |
| **Gate** | Plan approved, constitution check all PASS |

Legend: `[P]` may run in parallel with its neighbours · tests are written before
the implementation they cover.

---

## Phase 1 — Contract and model

| # | Task | Traces | Parallel | Done |
|---|---|---|---|---|
| T001 | Write failing contract test for [operation] | `FR-001` | `[P]` | [ ] |
| T002 | | | | [ ] |

## Phase 2 — Behaviour

| # | Task | Traces | Parallel | Done |
|---|---|---|---|---|
| | | | | [ ] |

## Phase 3 — Bilingual and RTL

| # | Task | Traces | Parallel | Done |
|---|---|---|---|---|
| | | | | [ ] |

## Phase 4 — Permissions and audit

| # | Task | Traces | Parallel | Done |
|---|---|---|---|---|
| | | | | [ ] |

## Phase 5 — Acceptance

One task per acceptance scenario in the spec. All must pass.

| # | Scenario | Traces | Done |
|---|---|---|---|
| | `AS-01` | | [ ] |

## Definition of done

- [ ] Every acceptance scenario in the spec passes
- [ ] Every MUST requirement has a passing test
- [ ] Arabic and English verified, RTL verified
- [ ] Permission matrix verified server-side, not only in the UI
- [ ] Audit entries verified present with correct fields
- [ ] No task left with an empty `Traces` value

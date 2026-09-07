# Plan NNN — [Epic name]

> **هنعملها إزاي؟** — How will we build it?
> The plan is where implementation detail becomes legal. It may not contradict
> the spec; where it needs to, the spec is amended first.

| | |
|---|---|
| **Spec** | [`../spec.md`](./spec.md) |
| **Status** | Draft / Approved / In build |
| **Gate** | Spec must carry zero `[NEEDS CLARIFICATION]` markers |

---

## Constitution check

| Principle | How this plan satisfies it | Verdict |
|---|---|---|
| I. Bilingual is architecture | | PASS / FAIL |
| II. Every state change is attributable | | |
| III. SLA clock is a domain object | | |
| IV. Scope enforced server-side | | |
| V. AI proposes, human disposes | | |
| VI. One conversation, one thread | | |
| VII. Specs are testable | | |
| VIII. No orphan work | | |

Any FAIL blocks the plan. Record the justification and the mitigation, or amend
the constitution with a version bump.

## Technical context

| | |
|---|---|
| Language / runtime | |
| Storage | |
| Key libraries | |
| Test approach | |
| Deployment target | |

## Approach

[Two or three paragraphs. The shape of the solution and, more importantly, the
alternatives rejected and why.]

## Rejected alternatives

| Option | Why not |
|---|---|

## Data model

Concrete now — tables, columns, indexes, constraints. Traces to spec section 3.
Detail may be split into `data-model.md`.

## Contracts

Concrete endpoints, payloads, status codes. Detail lives in `contracts/`.
Every endpoint states its scope predicate.

## Sequencing

| # | Slice | Delivers | Depends on |
|---|---|---|---|

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|

## Open technical questions

- [ ] [question]

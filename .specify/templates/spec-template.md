# Spec NNN — [Epic name]

> **المفروض الحاجة دي تشتغل إزاي بالظبط؟** — How exactly should this work?
> A spec states observable behaviour precisely enough to be tested and argued
> with. It describes WHAT the system does and WHY, never HOW it is built. No
> table names, no frameworks, no endpoints beyond the contract shape.

| | |
|---|---|
| **Number** | `NNN` |
| **Story** | [`stories/NNN-slug/story.md`](../../stories/NNN-slug/story.md) |
| **Status** | Draft / Clarifying / Ready to plan / Planned / Implemented |
| **Constitution gates** | [principles this spec must satisfy] |
| **Blocking clarifications** | N |

---

## 1. Scope

**In scope.** [one paragraph]

**Out of scope.** [bulleted, with where each item lives instead]

## 2. Domain language

Terms used with a precise meaning in this spec. If a word appears here, it means
exactly this and nothing looser.

| Term | Means exactly |
|---|---|
| | |

## 3. Key entities

Conceptual only — attributes and relationships, no storage decisions.

### [Entity]
[what it represents, its lifecycle, what owns it]

| Attribute | Type | Rules |
|---|---|---|

## 4. Acceptance scenarios

Numbered, Given/When/Then, each independently testable. These are the contract:
if all of them pass and no edge case is violated, the spec is satisfied.

### AS-01 — [name]
**Given** [state]
**When** [action]
**Then** [observable result]
**And** [further result]

## 5. Functional requirements

MUST / SHOULD / MAY. Each is observable and failable by a test. Each traces to
one or more backlog story IDs.

| ID | Requirement | Level | Traces |
|---|---|---|---|
| `FR-001` | The system MUST … | MUST | `XX-01` |

## 6. Edge cases and failure behaviour

What happens when the input is hostile, absent, duplicated, concurrent or out of
order. An unlisted edge case becomes a production defect.

| # | Situation | Required behaviour |
|---|---|---|

## 7. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| `NFR-001` | | |

## 8. Bilingual and localisation requirements

Per constitution I. What must exist in both languages, and what RTL changes.

| Surface | Arabic | English | RTL notes |
|---|---|---|---|

## 9. Permissions

Who may do what, per constitution IV.

| Action | CUST | AGT | LEAD | MGR | KBA | ADM | AUD |
|---|---|---|---|---|---|---|---|

## 10. Audit requirements

Per constitution II. What is written to history, and with which fields.

| Event | Recorded fields |
|---|---|

## 11. Contracts

Shape only — request, response, error cases. Detail belongs in
`contracts/`. Every entry names the scope predicate it applies (constitution IV).

| Operation | Purpose | Scope predicate |
|---|---|---|

## 12. Clarifications needed

Each marker blocks `/plan`. Resolve by amending this spec and removing the
marker, recording the answer and who gave it.

- [ ] `[NEEDS CLARIFICATION: question]` — *blocks* `FR-NNN` — *ask* [who]

## 13. Success metrics

| Metric | Source | Target |
|---|---|---|

## 14. Review checklist

- [ ] No implementation detail (no schema, framework, library, endpoint path)
- [ ] Every requirement is testable and uses MUST / SHOULD / MAY
- [ ] No unfailable adjectives (fast, intuitive, seamless, robust)
- [ ] Every requirement traces to a story ID
- [ ] Every acceptance scenario has a matching requirement, and vice versa
- [ ] Edge cases cover empty, duplicate, concurrent, hostile and out-of-order input
- [ ] Bilingual requirements stated for every user-visible surface
- [ ] Permission matrix complete for every action
- [ ] Audit entries defined for every mutation
- [ ] Zero `[NEEDS CLARIFICATION]` markers remaining
- [ ] Constitution gates satisfied and named

# specs/ — المفروض الحاجة دي تشتغل إزاي بالظبط؟

**How exactly should this work?**

A spec states observable behaviour precisely enough to be tested and argued
with. It describes WHAT the system does and WHY — never HOW it is built. No
table names, no frameworks, no library choices, no endpoint paths beyond the
contract shape. Those belong in `plan.md`, which is written after the
clarification gate is passed.

Each spec folder holds:

```
specs/NNN-slug/
├── spec.md         the behaviour  ← written
├── plan.md         the approach   ← blocked until clarifications are zero
├── tasks.md        the work       ← blocked until the plan is approved
└── contracts/      operation detail
```

## The fourteen sections

Every spec carries the same skeleton, so a reviewer always knows where to look.

| § | Section | Why it is there |
|---|---|---|
| 1 | Scope | In, and — more usefully — out, with where each excluded thing lives instead |
| 2 | Domain language | Terms used with a precise meaning. If a word appears here it means exactly this |
| 3 | Key entities | Conceptual only: attributes and rules, no storage decisions |
| 4 | Acceptance scenarios | Given/When/Then, numbered, independently testable. **The contract** |
| 5 | Functional requirements | MUST / SHOULD / MAY, each failable by a test, each tracing to a story ID |
| 6 | Edge cases | Hostile, absent, duplicated, concurrent, out-of-order. An unlisted edge case becomes a defect |
| 7 | Non-functional requirements | Numbers, not adjectives |
| 8 | Bilingual and localisation | Per constitution I, for every user-visible surface |
| 9 | Permissions | Per actor, per action. Its value is what it refuses |
| 10 | Audit requirements | Per constitution II, for every mutation |
| 11 | Contracts | Shape only, each naming its scope predicate |
| 12 | Clarifications needed | Each marker blocks `/plan` |
| 13 | Success metrics | How we know it worked |
| 14 | Review checklist | Self-audit, with the clarification gate unchecked until it is |

## Index

| # | Spec | Reqs | Scenarios | Edge cases | Open | Gates |
|---|---|---|---|---|---|---|
| 001 | [Customer Management](001-customer-management/spec.md) | 23 | 10 | 14 | 5 | I · II · IV |
| 002 | [Ticket Management](002-ticket-management/spec.md) | 34 | 15 | 19 | 6 | II · III · IV · VI · VII |
| 003 | [Communication Channels](003-communication-channels/spec.md) | 27 | 15 | 20 | 6 | I · II · **VI** |
| 004 | [Agent Dashboard](004-agent-dashboard/spec.md) | 20 | 12 | 15 | 5 | I · III · IV |
| 005 | [SLA & Automation](005-sla-automation/spec.md) | 23 | 19 | 22 | 7 | **III** · II · IV · VII |
| 006 | [Knowledge Base](006-knowledge-base/spec.md) | 18 | 11 | 16 | 5 | **I** · II · IV |
| 007 | [AI Features](007-ai-features/spec.md) | 23 | 14 | 19 | 7 | **V** · I · II · IV |
| 008 | [Customer Portal](008-customer-portal/spec.md) | 20 | 13 | 18 | 6 | **I** · II · IV · VI |
| 009 | [Reports & Management](009-reports-management/spec.md) | 24 | 13 | 19 | 6 | **III** · IV · **VII** |
| 010 | [Security & Administration](010-security-administration/spec.md) | 21 | 15 | 21 | 7 | **IV** · II · I |
| 011 | [Integrations](011-integrations/spec.md) | 18 | 12 | 20 | 7 | IV · II · VII |
| 012 | [Platform](012-platform/spec.md) | 15 | 13 | 19 | 7 | **I** · IV |
| 013 | [Cross-cutting](013-cross-cutting/spec.md) | 11 | 10 | 14 | 8 | **VII** · II |
| | | **277** | **172** | **236** | **82** | |

Bold marks the principle a spec is the primary custodian of.

## Three cross-spec rules worth knowing before you read any of them

**Spec `005` owns time.** It holds the only implementation of elapsed and
remaining duration. Specs `002`, `004`, `009` and `011` read it and are
explicitly forbidden from computing durations — including as a fallback when the
engine is unavailable, where they must show "unavailable" instead. Constitution
III exists because two implementations of elapsed time guarantee two different
numbers in the agent view and the manager report.

**Spec `010` owns access.** It defines the audit mechanism and the scope
predicate that the other twelve reference in their contracts tables. Its
`[CLARIFY-3]` — the role list — blocks the permission section of every other
spec.

**Spec `012` owns language.** Its section 3 enumerates every configurable
string in the system by owning spec, and its `FR-004` refuses a single-language
save outright. Its section 8 is the bilingual checklist the other twelve
inherit. The one deliberate exception is API and webhook payloads, whose field
names stay English — a bilingual wire format is a defect source, and
constitution I governs *user-visible* strings.

## The gate

```bash
grep -rn 'CLARIFY-[0-9]' . | wc -l    # must be 0 before any /plan
```

Currently 82 unique markers across 13 specs, resolving to roughly
[thirteen client decisions](../README.md#the-eighty-two-open-questions-are-really-thirteen).
Each marker names the requirement it blocks and who to ask.

Resolve one by getting the answer, amending the spec, recording who gave the
answer and when, and deleting the marker. Do not delete a marker by guessing.

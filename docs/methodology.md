# AZM Squad — Customer Support CRM: methodology

Spec-Driven Development workspace. Two folders, one numbering scheme.

```
stories/NNN-slug/story.md    عايزين نعمل إيه؟     — what do we want to do?
specs/NNN-slug/spec.md       المفروض تشتغل إزاي؟  — how exactly should it work?
```

A story and its spec **share a number for the life of the project**. `001` is
Customer Management in both folders, always. The story is the need, written so
the client can agree or disagree with it without knowing anything about
software. The spec is the behaviour, written precisely enough to be tested and
argued with.

This file is the original root README, restored here after the root README was
rewritten to describe the *build* rather than the *method*. See
[README.md](../README.md) for what actually exists in the repository today —
`docs/state.md`, `docs/decisions-pending.md` and `docs/trace.md` are more
current than the tables below, which describe the specs as authored, not as
built.

---

## The loop

```
constitution  →  story  →  spec  →  clarify  →  plan  →  tasks  →  implement
                  ↑                     │
                  └─────  amend  ───────┘
```

| Stage | Artefact | Gate to pass |
|---|---|---|
| Constitution | [`.specify/memory/constitution.md`](../.specify/memory/constitution.md) | Eight principles that outrank every spec |
| Story | `stories/NNN-*/story.md` | The need, the value, and what is out of scope |
| Spec | `specs/NNN-*/spec.md` | Every requirement testable; every mutation audited |
| **Clarify** | `[CLARIFY-n]` markers in the spec | **Zero markers before planning** |
| Plan | `specs/NNN-*/plan.md` | Constitution check all PASS |
| Tasks | `specs/NNN-*/tasks.md` | Every task traces to a requirement |

The clarification gate is the point of this structure. A spec carrying an open
`[CLARIFY-n]` marker may not be planned, tasked or implemented — the question is
answered first and the spec amended, rather than the answer being guessed in
code.

**Amended 2026-09-07 (constitution 0.2.0):** the gate is per-**requirement**,
not per-spec. A spec may proceed on its unblocked requirements; only the
blocked requirement itself waits. See the amendment log in
`.specify/memory/constitution.md` for why.

```bash
# the gate, as a command — unresolved markers only (constitution 0.4.0)
grep -rEn '^- \[ \] .\[CLARIFY-[0-9]' specs/ | wc -l    # must be 0 before /plan
```

---

## The thirteen

As originally derived. See `docs/decisions-pending.md` for which of these
questions have since been ratified by the developer (with evidence, or as an
explicit judgement call where the sources are silent) versus which remain
genuinely open.

| # | Epic | Stories | Requirements | Scenarios | Edge cases | Open (original) |
|---|---|---|---|---|---|---|
| 001 | [Customer Management](../specs/001-customer-management/spec.md) | 22 | 23 | 10 | 14 | 5 |
| 002 | [Ticket Management](../specs/002-ticket-management/spec.md) | 32 | 34 | 15 | 19 | 6 |
| 003 | [Communication Channels](../specs/003-communication-channels/spec.md) | 25 | 27 | 15 | 20 | 6 |
| 004 | [Agent Dashboard](../specs/004-agent-dashboard/spec.md) | 18 | 20 | 12 | 15 | 5 |
| 005 | [SLA & Automation](../specs/005-sla-automation/spec.md) | 18 | 23 | 19 | 22 | 7 |
| 006 | [Knowledge Base](../specs/006-knowledge-base/spec.md) | 17 | 18 | 11 | 16 | 5 |
| 007 | [AI Features](../specs/007-ai-features/spec.md) | 20 | 23 | 14 | 19 | 7 |
| 008 | [Customer Portal](../specs/008-customer-portal/spec.md) | 18 | 20 | 13 | 18 | 6 |
| 009 | [Reports & Management](../specs/009-reports-management/spec.md) | 20 | 24 | 13 | 19 | 6 |
| 010 | [Security & Administration](../specs/010-security-administration/spec.md) | 20 | 21 | 15 | 21 | 7 |
| 011 | [Integrations](../specs/011-integrations/spec.md) | 17 | 18 | 12 | 20 | 7 |
| 012 | [Platform](../specs/012-platform/spec.md) | 14 | 15 | 13 | 19 | 7 |
| 013 | [Cross-cutting](../specs/013-cross-cutting/spec.md) † | 10 | 11 | 10 | 14 | 8 |
| | | **251** | **277** | **172** | **236** | **82** |

† Not in the source document. Added during derivation because the feature list
described twelve areas of functionality and no qualities — no performance
budget, no uptime target, no browser matrix, no recovery objective. Unstated,
those become defects at acceptance testing, because nobody agreed the number
that was being missed.

Every requirement carries a `Traces` column back to a story ID (`TM-14`,
`SLA-04`) or to a constitution principle. Nothing in `specs/` exists without an
upstream reason in `stories/`.

---

## The eighty-two open questions are really thirteen

Most `[CLARIFY]` markers are the same question asked from different specs. These
thirteen decisions unblock all of them. Ordered by how much they block.

| Decision | Blocks | Ask |
|---|---|---|
| **Are Arabic and English peer languages, or one primary and one translation?** | `012`, `006` — and the data model of every configurable label, every layout, the search index | Executive sponsor |
| **What is the exact role list, and who signs off the permission matrix?** | `010` — and the permission section of all twelve other specs | Operations + IT |
| **How many agents concurrently, how many tickets per month?** | `013` — and the acceptance of every other spec's performance table | Operations |
| **What is the status list, and which statuses pause the SLA clock?** | `002`, `005` — and every metric in `009` | Operations |
| **What does *resolved* mean versus *closed*?** | `002`, `009` — first-contact resolution, reopen rate and satisfaction all rest on it | Management |
| **Who owns customer master data — the CRM or the ERP?** | `001`, `011` — both cannot be the source of truth | IT + operations |
| **What are the actual SLA numbers?** | `005` — the engine is buildable but untestable without hours and minutes | Management |
| **Which AI model, hosted where?** | `007` entirely — and it collides with data residency in `010` | Legal + IT |
| **How many departments and branches, and how isolated?** | `010`, `012` — scoped access and multi-tenancy are different builds | Operations |
| **What uptime, RPO and RTO are we committing to?** | `013`, `010` — commercial commitments, not technical preferences | Executive sponsor |
| **Which privacy regime, and who supplies the policy text in both languages?** | `001`, `010`, `013` | Legal |
| **Does an automatic acknowledgement satisfy first response?** | `003`, `005` — moves every compliance figure in `009` | Management |
| **Which channels ship in phase one?** | `003` — five channels is five integrations and five failure modes | Delivery lead |

**Update, 2026-09-07 — resolved or ratified since derivation:**

| Original question | Resolution |
|---|---|
| Peer languages? | Ratified peer languages (decision, unratified by client) |
| Role list | Ratified: `AGT`/`LEAD`/`MGR`/`ADM`/`AUD` |
| Status list / pause flags | List ratified; pause flags ratified per-status (decisions 8, 14, 15) |
| Resolved vs. closed | Ratified: no auto-close until spec 005 unblocks (decision 9) |
| CRM vs. ERP ownership | Ratified: CRM is the system of record (decision 6, a judgement call — see `decisions-pending.md`) |
| Departments/branches, isolation | Ratified: scoped access, not multi-tenancy; departments flat (decisions 1, 2) |

Everything else in this table is still genuinely open. See
`docs/decisions-pending.md` for the full, current decision log with evidence,
and `docs/state.md` for what is blocked right now.

Two of these are worth stating plainly, because they are the ones that get
deferred and then cost a rewrite:

- **Peer languages** is architecture, not configuration. Building monolingual and
  adding Arabic later means revisiting every string, every layout, every
  configurable record and every search index.
- **Departments and branches** turn permissions from a login problem into a
  data-scoping problem. Deciding late means rewriting the permission layer.

---

## Constitution, in one line each

The full text is in [`.specify/memory/constitution.md`](../.specify/memory/constitution.md).
A spec that contradicts a principle is wrong, not the principle. Now at
**0.4.0** — see that file's amendment log for what changed and why.

| | Principle | Test |
|---|---|---|
| I | Bilingual is architecture, not configuration | No user-visible string has one value |
| II | Every state change is attributable | Every editable field states its history entry |
| III | The SLA clock is a first-class domain object | No spec computes a duration itself |
| IV | Data scope is enforced server-side, per request | Every contract names its scope predicate |
| V | AI proposes, a human disposes — and it is labelled | Every `007` spec answers all four questions |
| VI | One conversation, one thread | Every channel states its correlation rule |
| VII | Specs are testable or they are not done | No unfailable adjectives; no guessed unknowns |
| VIII | No orphan work | Every task traces to a requirement to a story |

Principle III has a visible consequence worth knowing about: spec `005` owns the
only implementation of elapsed time. Specs `004`, `009` and `011` read it and are
explicitly forbidden from recomputing it — including as a fallback when the
engine is unavailable. Two implementations of elapsed time guarantee two
different numbers in the agent view and the manager report, and the report is
the one shown to the client.

---

## Working in here

```bash
# read the need, then the behaviour
cat stories/005-sla-automation/story.md
cat specs/005-sla-automation/spec.md

# what is blocking planning, everywhere (unresolved markers only)
grep -rEn '^- \[ \] .\[CLARIFY-[0-9]' specs/

# what is blocking one spec
grep -n 'CLARIFY' specs/005-sla-automation/spec.md

# find every requirement that traces to one story
grep -rn 'SLA-04' specs/
```

Templates for the next stages are in [`.specify/templates/`](../.specify/templates/):
`story-template.md`, `spec-template.md`, `plan-template.md`, `tasks-template.md`.

To add an epic, take `014` — numbers are permanent, and a retired epic keeps its
number marked superseded rather than freeing it.

### If you want the official tooling

This workspace follows the Spec Kit layout but was written by hand; no CLI is
installed. To get the `/constitution`, `/specify`, `/clarify`, `/plan`,
`/tasks`, `/analyze` and `/implement` commands:

```bash
uvx --from git+https://github.com/github/spec-kit.git specify init --here
```

It will scaffold its own `.specify/` alongside this one — reconcile the
templates rather than letting it overwrite the constitution.

---

## Status

**This section describes the state at derivation (2026-09-06), before any code
existed.** For the current state — what's actually built — see
[`docs/state.md`](state.md), which is the file to read first in any new
session.

Every spec started as **Draft — clarifying**. None had passed the
clarification gate, so none was ready for `/plan`. That was the correct state:
the source material was a two-page feature list, and 82 questions is what it
honestly contained.

Nothing here was, or is, client-approved. Priorities were the delivery team's
reading, the thirteenth epic was an addition, and the constitution was proposed
pending ratification. Thirteen of the eighty-two questions have since been
ratified by the developer as a decision authority (not by the client) to allow
a first vertical slice to be built — see `docs/decisions-pending.md` for every
one of them, with its evidence or its explicit status as a judgement call.

Derived from *Customer Support CRM · Core Features* (2 pp.), 2026-09-06. That
source document is not present in this repository.

# test-cases

Written test cases for every user story in this product — **253 cases across
thirteen files**, one file per module, named to match `specs/` and `stories/`
exactly.

## What this is for

`backend/tests/` proves the API behaves. These documents prove **the user got
what they asked for**, and they are readable and executable by a person with no
access to the code.

Every case is written from a user story, keeps that story's own words, and can
be run by someone who has never opened the repository.

## Read one file, run it

Each file opens with the accounts and data you need, then lists its cases in
story order. A case is self-contained: preconditions, numbered steps, the
expected result, and its status.

You do not need the specifications open. Requirement identifiers appear as
supporting references, never as the only explanation of what something means.

## Status, and what each value obliges

| Status | Meaning |
|---|---|
| **Automated** | Proven by a named check in `backend/tests/`. The case names where. Do not run it by hand and do not restate the assertion here — the code is the single source of truth for what is asserted. |
| **Partial** | Something is automated, but **not the part the story actually promises**. The case says exactly which assertion is missing. These are the most dangerous cases in this folder: they look covered and are not. |
| **Manual** | Built and working, but nothing automated proves it. Run it by hand. |
| **Not testable yet** | Nothing to run. The case is written anyway, and says what blocks it — an unbuilt module, a missing decision, or a dependency. |

**Cases for unbuilt modules are written, not omitted.** That is deliberate: they
should be ready the day the module starts, not written then. A module with its
cases already written begins with its acceptance criteria agreed.

## Files

| File | Module | Cases |
|---|---|---|
| `001-customer-management.md` | Customer records, contact points, duplicates | 22 |
| `002-ticket-management.md` | The support request lifecycle | 32 |
| `003-communication-channels.md` | Email, WhatsApp, SMS, chat | 25 |
| `004-agent-dashboard.md` | The agent's daily workspace | 18 |
| `005-sla-automation.md` | Targets, clocks, escalation, automation | 18 |
| `006-knowledge-base.md` | Articles, search, publication | 17 |
| `007-ai-features.md` | Summarising, classification, suggestion | 20 |
| `008-customer-portal.md` | The customer-facing side | 18 |
| `009-reports-management.md` | Volume, workload, attainment | 21 |
| `010-security-administration.md` | Identity, access, audit, configuration | 20 |
| `011-integrations.md` | ERP, API, webhooks, import | 17 |
| `012-platform.md` | Bilingual, right-to-left, branches, accessibility | 15 |
| `013-cross-cutting.md` | Performance, uptime, monitoring, release | 10 |

## Two things carried across from the coverage audit

**Thirty cases are marked partial, and each says what is missing.** The clearest
is `TM-09` in `002`: the automated checks prove a reason is *required* when
reassigning a ticket, and nothing ever reads that reason back. The story asks
that nobody wonders later why. Half of that is proven and half is not, and the
case says so.

**The overall picture, counted from the cases themselves:**

| Status | Cases |
|---|---|
| Automated | **14** |
| Partial | **30** |
| Manual | **1** |
| Not testable yet | **208** |
| **Total** | **253** |

208 of 253 are not testable because the module is unbuilt — which is the honest
shape of a product with five modules built out of thirteen, not a gap in this
folder. Each of those cases names what blocks it.

**Spec `013`'s ten stories were once thought to trace to no requirement.** They
do — see the note at the top of `013-cross-cutting.md` for what actually
happened and why the earlier claim was wrong.

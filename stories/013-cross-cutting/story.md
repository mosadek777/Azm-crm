# Story 013 — Cross-cutting requirements

> **عايزين نعمل إيه؟**
> We want the numbers nobody wrote down — speed, uptime, recovery, monitoring —
> agreed in advance, so that missing them is a broken promise rather than a
> surprise.

| | |
|---|---|
| **Number** | `013` |
| **Spec** | [`specs/013-cross-cutting/spec.md`](../../specs/013-cross-cutting/spec.md) |
| **Source** | **Not in the source document.** Added 2026-09-06 during story derivation. |
| **Status** | Draft — client has not seen this epic |
| **Owner** | TBD |

---

## The need

The source feature list describes twelve areas of functionality and no
qualities. It does not say how fast a ticket list must load, how many agents the
system must hold, what uptime we are committing to, how far back a restore can
reach, or which browsers are supported.

Left unstated, these do not disappear — they become defects. A page that takes
nine seconds is reported as broken even though no requirement was missed, because
nobody ever agreed the number that was being missed. This epic exists so that
every one of those arguments is had now, in writing, with the client.

## Who this is for

| Persona | What they get out of it |
|---|---|
| `AGT` Support agent | A tool that is never the reason they are slow |
| `MGR` Support manager | A defensible answer to *is it us or them* |
| `ADM` Administrator | Monitoring that reports a problem before customers do |
| `DEV` Integrator | Releases that are routine rather than events |
| `AUD` Auditor | A documented legal basis for holding this data |

## What we want

After this ships, someone can:

- Open a ticket list at full data volume without waiting
- State the concurrent agents and monthly volume the system holds, with headroom
- Point at an uptime commitment and a status page
- Trust that a chat message arrives while the conversation is still live
- Know precisely which browsers are supported, and therefore which are not
- Be alerted to an error rate or a failing integration before a customer reports it
- Ship a fix without downtime, and reverse it if it is wrong
- Rely on validation at the data layer, so reports are not undermined by empty fields
- Show a customer the privacy policy and consent record in their own language

## Why it matters

Two of these carry commercial weight beyond the technical. The **uptime and
recovery targets** are the numbers the client will quote in their own customer
commitments, so they must be agreed by someone who can sign for them. The
**privacy and consent obligations** are the ones that make holding this data
lawful at all — and story `001` cannot specify deletion behaviour without them.

Everything else here is cheap to agree now and expensive to negotiate during
acceptance testing.

## Stories in this epic

| ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| `NFR-01` | AGT | ticket lists and searches to return in under two seconds at full volume | the tool is never the reason I am slow | Must |
| `NFR-02` | ADM | the agreed concurrent agents and monthly volume held, with headroom | growth does not force a re-platform | Must |
| `NFR-03` | MGR | a stated uptime target and a public status page | I can answer whether it is us or them | Must |
| `NFR-04` | CUST | chat messages and notifications within a second | the conversation feels live, not posted | Should |
| `NFR-05` | ADM | attachment size limits, deduplication and fast delivery of large files | storage and page load stay under control | Should |
| `NFR-06` | ADM | to know exactly which browsers and versions are supported | support of the tool itself has a defined boundary | Should |
| `NFR-07` | ADM | monitoring and alerting on error rates, queue depth, integration failures | we find out before the customers tell us | Must |
| `NFR-08` | DEV | CI with zero-downtime releases and reversible migrations | shipping a fix is routine, not an event | Must |
| `NFR-09` | ADM | required fields and validation enforced at the data layer | reports are not undermined by half-empty records | Should |
| `NFR-10` | AUD | privacy policy, terms and consent capture in both languages | the legal basis for holding this data is documented | Must |

**10 stories** — 6 Must · 4 Should · 0 Could

## How we will know it worked

- **Performance under load** — measured by load test at target volume before go-live, every listed target met
- **Uptime** — measured monthly against the agreed target, met every month
- **Alert lead time** — measured as time between our alert and the first customer report, always positive
- **Restore drill** — measured against the agreed RTO, successful before go-live and quarterly thereafter
- **Releases causing downtime** — measured per release, zero
- **Acceptance-test disputes about qualities** — measured at UAT, zero, because every number here was agreed in advance

## Explicitly out of scope

- **Backup, restore, encryption and retention** — story `010` (`SEC-10`, `SEC-15`, `SEC-17`); they are security requirements and live there
- **Hosting, cloud vendor and infrastructure topology** — a plan-phase decision
- **Penetration testing and security certification** — project activities, not product requirements
- **Disaster-recovery site selection** — follows from the RPO and RTO agreed in story `010`
- **Support and maintenance contract terms** — commercial, not product

## Depends on

| Needs | Why |
|---|---|
| None | This epic constrains every other epic rather than depending on any |

## Open questions for the client

Every requirement in this epic is a blank waiting for a number. These are not
technical questions; they are commitments the client must be willing to make.

- [ ] **How many agents concurrently, and how many tickets per month, at launch and in three years?** — *blocks* `FR-001`, `FR-002`
- [ ] **What uptime are we committing to, and is there a penalty?** — *blocks* `FR-003`
- [ ] **What are the RPO and RTO?** How much data may be lost, and how long may recovery take? — *blocks* story `010`, `FR-017`
- [ ] Which browsers and minimum versions must be supported? Any locked-down corporate build? — *blocks* `FR-006`
- [ ] What is the maximum attachment size, and the total storage budget? — *blocks* `FR-005`
- [ ] Who receives operational alerts, on which channel, and out of hours? — *blocks* `FR-007`
- [ ] Which privacy regime applies, and who provides the policy and terms text in both languages? — *blocks* `FR-010`
- [ ] Is there a maintenance window, or is zero-downtime deployment mandatory? — *blocks* `FR-008`

# Story 010 — Security & Administration

> **عايزين نعمل إيه؟**
> We want each person to see exactly what their job requires and nothing more,
> every action to be attributable, and the routine configuration to be ours to
> change without a developer.

| | |
|---|---|
| **Number** | `010` |
| **Spec** | [`specs/010-security-administration/spec.md`](../../specs/010-security-administration/spec.md) |
| **Source** | *Customer Support CRM · Core Features*, section 10 |
| **Status** | Draft |
| **Owner** | TBD |

---

## The need

The product will hold every customer's contact details, contracts and complaint
history across multiple departments and branches. Without scoping, every agent
can read every record — which in a multi-branch business is a data leak waiting
for an audit. Without an audit trail, a dispute about who changed what has no
answer. And without an administration screen, every change to a category or an
email template becomes a developer ticket.

## Who this is for

| Persona | What they get out of it |
|---|---|
| `ADM` Administrator | Users, roles, scoping and configuration under their own control |
| `AUD` Auditor | An immutable, searchable record of who did what, when and from where |
| `MGR` Support manager | Confidence that one branch cannot read another's customers |
| `AGT` Support agent | A workspace containing only their own department's work |

## What we want

After this ships, someone can:

- Create, deactivate and reactivate accounts as people join and leave
- Define roles once and assign them, rather than configuring each person
- Scope data by department, branch and team, enforced on the server
- Sign in through the organisation's own identity provider, with MFA
- Reconstruct any incident from an audit log nobody can edit
- Change statuses, categories, SLA, hours, holidays, templates and branding from a screen
- Revoke a third-party integration's access in one action
- Restore the system to a known point, against a stated recovery target
- Prove a deletion request was honoured

## Why it matters

Multi-department and multi-branch operation, promised in story `012`, turns
permissions from a login problem into a data-scoping problem — and a scoping bug
is a cross-customer data leak, not a cosmetic defect. Constitution IV exists
because of this epic. It also gates almost everything else: `001`, `002`, `006`,
`008` and `009` all need the permission model before their own specs can define
who may do what.

## Stories in this epic

| ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| `SEC-01` | ADM | create, deactivate and reactivate accounts | access matches employment without a ticket to IT | Must |
| `SEC-02` | ADM | define roles with granular permissions | people see and do exactly what their job requires | Must |
| `SEC-03` | ADM | control who may delete, merge, close, refund and export | the dangerous actions are held by few hands | Should |
| `SEC-04` | ADM | scope data by department, branch and team | one branch cannot read another branch's customers | Must |
| `SEC-05` | ADM | one user with different roles in different teams | matrix reporting lines are actually supported | Should |
| `SEC-06` | ADM | SSO through SAML or OIDC, with optional MFA | access follows corporate identity policy | Must |
| `SEC-07` | ADM | password policy, session timeout, concurrent-session limits | an unattended browser is not an open door | Must |
| `SEC-08` | AUD | an immutable log of logins, permission changes, exports, deletions, edits, with actor, time and IP | any incident can be reconstructed | Must |
| `SEC-09` | AUD | search and export the audit log by user, entity, action, date | an investigation is practical, not theoretical | Should |
| `SEC-10` | ADM | data encrypted in transit and at rest | a stolen disk or sniffed connection yields nothing | Must |
| `SEC-11` | ADM | configure statuses, priorities, categories, SLA, hours, holidays, templates, branding from a screen | routine change does not queue behind a developer | Must |
| `SEC-12` | ADM | notification templates per channel and language | what customers receive is consistent and localised | Should |
| `SEC-13` | ADM | see, scope and revoke API keys and integration credentials | third-party access is cut off in one action | Should |
| `SEC-14` | ADM | restrict administrative access by IP range | the highest-privilege screens are hardest to reach | Could |
| `SEC-15` | ADM | retention and archival configured per record type | we comply with policy and control storage growth | Should |
| `SEC-16` | ADM | attachments virus-scanned, with type and size limits | an upload cannot become an incident | Should |
| `SEC-17` | ADM | backups and point-in-time restore against a stated RPO and RTO | we can recover, and we know how far back and how fast | Must |
| `SEC-18` | ADM | a sandbox mirroring production configuration | changes are proven before they reach live | Should |
| `SEC-19` | ADM | impersonate a user, logged and consented | I reproduce a permissions problem I cannot see | Could |
| `SEC-20` | AUD | control which jurisdiction data is stored in | records stay where regulation requires | Could |

**20 stories** — 8 Must · 9 Should · 3 Could

## How we will know it worked

- **Cross-scope access attempts blocked** — measured by penetration test against every endpoint, 100% refused server-side
- **Mutations without an audit entry** — measured by reconciling history against change counts, always zero
- **Configuration changes needing a developer** — measured per month, zero for the items listed in `SEC-11`
- **Restore drill** — measured against the stated RTO, performed successfully before go-live and quarterly after
- **Orphan accounts** — measured as active accounts for departed staff, always zero

## Explicitly out of scope

- **Automatic user provisioning from the identity provider (SCIM)** — story `011` (`INT-10`); this epic covers manual administration and SSO login
- **Customer authentication for the portal** — story `008` (`CP-01`); this epic covers internal staff
- **AI-specific governance** (redaction, model opt-out, AI audit log) — story `007`, though it inherits this epic's audit machinery
- **Penetration testing and certification as deliverables** — a project activity, not a product feature
- **Physical and network security of the hosting environment** — the hosting decision, not this specification

## Depends on

| Needs | Why |
|---|---|
| Story `012` | Departments and branches must be modelled before data can be scoped to them |

*Everything else depends on this one.*

## Open questions for the client

- [ ] **How many departments and branches, and how isolated must they be?** Data scoping and full multi-tenancy are very different builds, and deciding late means rewriting the permission layer. — *blocks* `FR-004`, and story `012`
- [ ] Which identity provider, and is MFA already enforced there? — *blocks* `FR-006`
- [ ] What is the exact role list, and who signs off the permission matrix? — *blocks* `FR-002`, and the matrix in every other spec
- [ ] Which data-protection regime applies, and what is the required retention period per record type? — *blocks* `FR-015`
- [ ] What are the required RPO and RTO? These are commercial numbers, not technical ones. — *blocks* `FR-017`
- [ ] Must data remain in a specific jurisdiction? This may rule out the AI approach in story `007`. — *blocks* `FR-020`
- [ ] Is a sandbox environment funded? Without one, `SEC-18` is aspiration. — *blocks* `FR-018`

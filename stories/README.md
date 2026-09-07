# stories/ — عايزين نعمل إيه؟

**What do we want to do?**

A story states the need and the value. It never states the mechanism. If a
sentence in here could be argued with by a developer rather than by the client,
it belongs in [`specs/`](../specs/) instead.

Each story answers six things:

1. **The need** — what is broken or absent today, and for whom, in plain language
2. **Who this is for** — the personas who get something out of it
3. **What we want** — outcomes, each completing "after this ships, someone can…"
4. **Why it matters** — the business consequence of not doing it
5. **How we will know it worked** — a number and how it is measured
6. **What is explicitly out of scope** — the section that prevents the argument in month four

Plus the full story table (`As a … I want … so that …` with a stable ID), the
dependencies, and the questions only the client can answer.

## Index

| # | Story | Stories | Must | Should | Could |
|---|---|---|---|---|---|
| 001 | [Customer Management](001-customer-management/story.md) | 22 | 8 | 12 | 2 |
| 002 | [Ticket Management](002-ticket-management/story.md) | 32 | 14 | 15 | 3 |
| 003 | [Communication Channels](003-communication-channels/story.md) | 25 | 7 | 18 | 0 |
| 004 | [Agent Dashboard](004-agent-dashboard/story.md) | 18 | 11 | 4 | 3 |
| 005 | [SLA & Automation](005-sla-automation/story.md) | 18 | 10 | 4 | 4 |
| 006 | [Knowledge Base](006-knowledge-base/story.md) | 17 | 6 | 8 | 3 |
| 007 | [AI Features](007-ai-features/story.md) | 20 | 7 | 8 | 5 |
| 008 | [Customer Portal](008-customer-portal/story.md) | 18 | 10 | 5 | 3 |
| 009 | [Reports & Management](009-reports-management/story.md) | 20 | 8 | 11 | 1 |
| 010 | [Security & Administration](010-security-administration/story.md) | 20 | 8 | 9 | 3 |
| 011 | [Integrations](011-integrations/story.md) | 17 | 5 | 7 | 5 |
| 012 | [Platform](012-platform/story.md) | 14 | 6 | 5 | 3 |
| 013 | [Cross-cutting](013-cross-cutting/story.md) | 10 | 6 | 4 | 0 |
| | | **251** | **112** | **110** | **35** |

## Personas

Story IDs are prefixed by epic; the actor is named in each row.

| Code | Persona | Who they are |
|---|---|---|
| `CUST` | Customer | Raises and tracks requests. The only external actor. |
| `AGT` | Support agent | Works the queue; lives in the ticket view all day. |
| `LEAD` | Team lead | Balances load, handles escalations, coaches. |
| `MGR` | Support manager | Owns SLA, staffing, quality and reporting. |
| `EXEC` | Executive | Consumes dashboards; never opens a ticket. |
| `KBA` | Knowledge author | Writes and maintains articles and FAQs. |
| `ADM` | Administrator | Configures the system without developer help. |
| `DEV` | Integrator | Builds against the API and the ERP bridge. |
| `AUD` | Auditor | Reads logs and evidence; changes nothing. |
| `SYS` | The system | Automated behaviour with no human trigger. |

## Priority

A starting MoSCoW read, not a commitment.

- **Must** — the product is not credible without it
- **Should** — expected, but survivable at launch
- **Could** — earns its place only once the core works

## Dependency order

Read this before sequencing any work. `010` and `012` are foundations —
everything else needs the permission model and the bilingual, multi-branch
platform to exist first.

```
012 Platform ──┬──► 010 Security ──┬──► 001 Customers ──┬──► 002 Tickets ──┬──► 003 Channels
               │                   │                    │                  ├──► 004 Dashboard
               └───────────────────┘                    └──► 011 ERP       ├──► 005 SLA ──► 009 Reports
                                                                           ├──► 006 KB ──► 007 AI
                                                                           └──► 008 Portal

013 Cross-cutting ─────────── constrains all of the above ───────────────────────────►
```

`013` depends on nothing and constrains everything, which is why its numbers
must be agreed before the others are accepted.

# Story 011 — Integrations

> **عايزين نعمل إيه؟**
> We want the CRM to stop being an island: read what the ERP already knows, tell
> other systems what happened, and let anyone build against it.

| | |
|---|---|
| **Number** | `011` |
| **Spec** | [`specs/011-integrations/spec.md`](../../specs/011-integrations/spec.md) |
| **Source** | *Customer Support CRM · Core Features*, section 11 |
| **Status** | Draft |
| **Owner** | TBD |

---

## The need

An agent answering a billing question has the customer on one screen and the
invoice in another system, and reconciles the two by reading aloud. Customer
records will exist in both the CRM and the ERP, and without an agreed direction
of truth they will diverge within weeks. Meanwhile anything that needs to react
to a ticket event — another department's system, a dashboard, a notification —
has no way to hear about it.

## Who this is for

| Persona | What they get out of it |
|---|---|
| `DEV` Integrator | A documented, versioned, authenticated API and real webhooks |
| `AGT` Support agent | Contract, invoice and order facts on the ticket, not in another window |
| `ADM` Administrator | Provider credentials, field mapping and failure recovery under their control |
| `MGR` Support manager | Support data joined to the rest of the business in the warehouse |

## What we want

After this ships, someone can:

- Read and write customers, tickets, comments, attachments, articles and users through a documented API
- Authenticate with scoped credentials under published rate limits
- Subscribe to ticket events and receive them reliably, with signatures and retries
- See ERP contract, invoice and order data on the ticket
- Keep customer master data consistent between the two systems, under an explicit rule
- Swap an email, SMS or WhatsApp provider without a code change
- See whether a message was delivered, read or failed
- Recover a broken sync by replaying it, rather than by investigation
- Move CRM data into the warehouse for cross-business analysis

## Why it matters

The ERP link is the riskiest dependency in the whole feature list. It requires
a data owner and a conflict rule agreed before any code is written, and it
depends on a system we do not control, on a team that is not ours, to a schedule
that is not ours. Left until later it becomes the reason for a slipped go-live.
The API and webhooks matter for a different reason: without them every future
requirement becomes a change request to us.

## Stories in this epic

| ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| `INT-01` | DEV | a documented REST API for customers, tickets, comments, attachments, articles, users | we build against the CRM without reverse engineering | Must |
| `INT-02` | DEV | OAuth2 or scoped API keys under published rate limits | integration is secure and predictable under load | Must |
| `INT-03` | DEV | webhooks for created, updated, status-changed, breached, resolved, with retries and signatures | external systems react in real time and can trust the payload | Must |
| `INT-04` | DEV | interactive API docs and a sandbox to call | integration work is self-service | Should |
| `INT-05` | AGT | ERP contract, invoice and order data on the ticket | I answer billing without opening another system | Must |
| `INT-06` | ADM | ~~customer and account sync with the ERP under explicit conflict rules~~ **DOWNGRADED 2026-09-07** to a scheduled **divergence report**: drift is detected and reported, never resolved automatically | master data divergence is visible, though not prevented | Should |
| `INT-07` | AGT | raise a follow-up ERP transaction from the ticket | a handoff is not an email and a hope | Could |
| `INT-08` | ADM | configure email, SMS and WhatsApp credentials and swap providers | we are not locked to one vendor's pricing | Should |
| `INT-09` | AGT | sent, delivered, read and failed status shown on the ticket | I know whether the customer received my reply | Should |
| `INT-10` | ADM | users provisioned automatically from the identity provider | joiners and leavers are handled without manual steps | Could |
| `INT-11` | AGT | screen pop on inbound call, click to dial, link to the recording | voice fits the same workflow as everything else | Could |
| `INT-12` | MGR | CRM data pushed to our data warehouse | support data joins the rest of the business | Should |
| `INT-13` | ADM | bulk import and export with validation and an error report | migrations and mass corrections are safe to attempt | Must |
| `INT-14` | ADM | integration monitoring with failures, payloads and manual replay | a broken sync is recoverable, not a mystery | Should |
| `INT-15` | DEV | a versioned API with a deprecation policy | our integration does not break without warning | Should |
| `INT-16` | ADM | escalation notices into Teams or Slack | support reaches other departments where they already are | Could |
| `INT-17` | ADM | field mapping between CRM and external systems in a UI | a new integration adapts without development | Could |

**17 stories** — 5 Must · 7 Should · 5 Could

## How we will know it worked

- **ERP data available on the ticket** — measured as tickets where entitlement resolved successfully, above 98%
- **Master data divergence** — measured by scheduled reconciliation against the ERP, under 0.5% of records
- **Webhook delivery** — measured against subscriber acknowledgements, above 99.9% delivered within 60 seconds
- **Unrecoverable sync failures** — measured from the integration log, always zero; every failure replayable
- **Undetected message delivery failures** — measured against provider status, always zero
- **Time for a third party to make their first successful API call** — measured from documentation alone, under one day

## Explicitly out of scope

- **The channel transports themselves** (mailbox, WhatsApp, SMS, chat) — story `003`; this epic covers provider credentials, swapping and delivery receipts
- **Building the warehouse or the BI reports** — `INT-12` delivers the data out; the analysis is not ours
- **Writing to ERP financial records** — `INT-07` raises a request for a transaction; it does not post one
- **A public developer portal or partner programme** — internal and client integrators only
- **iPaaS or middleware selection** — a plan-phase decision, not a requirement

## Depends on

| Needs | Why |
|---|---|
| Story `001` | The customer entity is the thing being synced |
| Story `002` | Ticket events are the thing being published |
| Story `010` | API credentials, scoping and revocation are security features |

## Open questions for the client

- [ ] **Who owns customer master data — the CRM or the ERP?** Both cannot be the source of truth. Also open on story `001`. — *blocks* `FR-006`
- [ ] Which ERP, which version, and what integration surface does it actually expose today? — *blocks* `FR-005`, `FR-006`, `FR-007`
- [ ] Who on the ERP side owns this work, and what is their availability? This is the most common cause of slippage on projects of this shape. — *blocks* delivery date
- [ ] Is ERP data read live on ticket open, or cached? Live means the ticket view depends on ERP uptime. — *blocks* `FR-005`
- [ ] Which key is the join between a CRM customer and an ERP account? — *blocks* `FR-006`
- [ ] Is telephony integration in scope at all, and which platform? — *blocks* `FR-011`
- [ ] Which warehouse, and at what refresh frequency? — *blocks* `FR-012`

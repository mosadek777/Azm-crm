# Story 008 — Customer Portal

> **عايزين نعمل إيه؟**
> We want the customer to raise a request, see honestly what is happening to it,
> and find answers without contacting us at all.

| | |
|---|---|
| **Number** | `008` |
| **Spec** | [`specs/008-customer-portal/spec.md`](../../specs/008-customer-portal/spec.md) |
| **Source** | *Customer Support CRM · Core Features*, section 8 |
| **Status** | Draft |
| **Owner** | TBD |

---

## The need

A customer who has raised a request has no way to check on it except contacting
us again — which creates a second interaction about the first one, and those
chase contacts are pure cost. They also cannot see what they asked last year, and
they have nowhere to tell us they were unhappy except a phone call to an agent
who cannot act on it.

## Who this is for

| Persona | What they get out of it |
|---|---|
| `CUST` Customer | Self-service: raise, track, read history, find answers, be heard |
| `AGT` Support agent | Fewer chase contacts, and structured intake instead of vague email |
| `MGR` Support manager | Satisfaction data collected systematically rather than anecdotally |
| `ADM` Administrator | A branded front door they control |

## What we want

After this ships, someone can:

- Sign in with a phone or email one-time code, or through their own SSO
- Raise a request with the right category and their evidence attached
- See status, owning team and expected response time without asking
- Reply and attach files, keeping one conversation in one place
- Search their own request history
- Read FAQs and articles in Arabic or English, correctly laid out
- Rate the outcome and say why
- Reopen a resolved request when the problem returns
- Choose which notifications they receive, and on which channel
- Do all of the above on a phone

## Why it matters

This is the only part of the product a customer ever judges us on. It is also
where Arabic right-to-left layout either works properly or embarrasses the
client publicly, which makes constitution I non-negotiable here. Commercially,
chase contacts are the cheapest volume to eliminate: they are contacts about
contacts, and a working status page removes most of them.

## Stories in this epic

| ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| `CP-01` | CUST | sign in by email or phone one-time code, or SSO | my requests are tied to me without another password | Must |
| `CP-02` | CUST | submit a ticket with category, description and attachments | I raise an issue without phoning anyone | Must |
| `CP-03` | CUST | see status, owning team and expected response time | I do not chase to find out if anything is happening | Must |
| `CP-04` | CUST | reply and add attachments from the portal | the conversation lives in one place I can revisit | Must |
| `CP-05` | CUST | browse, search and filter all my past requests | I can point at what happened last time | Must |
| `CP-06` | CUST | see every ticket my organisation raised, where permitted | I manage requests across my own team | Should |
| `CP-07` | CUST | browse and search FAQs and articles in the portal | I solve it myself at no cost to either of us | Must |
| `CP-08` | CUST | rate my experience and comment when resolved | my opinion reaches someone who can act | Must |
| `CP-09` | CUST | reopen a resolved ticket when the problem returns | I do not re-explain everything from nothing | Should |
| `CP-10` | CUST | choose which updates I get, by email, SMS or WhatsApp | I stay informed without being spammed | Must |
| `CP-11` | CUST | Arabic or English with correct right-to-left layout | it is genuinely usable in my language | Must |
| `CP-12` | CUST | use the portal comfortably on my phone | I raise and track requests from anywhere | Must |
| `CP-13` | CUST | view and edit my profile and contact preferences | my details stay accurate without an agent typing them | Should |
| `CP-14` | CUST | withdraw a request I no longer need | nobody spends time on something already resolved | Could |
| `CP-15` | CUST | download or print a ticket summary | I hold a record for my own files | Could |
| `CP-16` | CUST | see service announcements and known issues | I check before submitting a ticket about a known outage | Could |
| `CP-17` | CUST | raise a complaint through a distinct path with its own escalation | serious dissatisfaction is not queued behind routine questions | Should |
| `CP-18` | ADM | brand the portal with our logo, colours, domain and pages | customers see our organisation, not our vendor | Should |

**18 stories** — 10 Must · 5 Should · 3 Could

## How we will know it worked

- **Chase contacts** — measured as contacts referencing an existing open ticket, reduced by 40% within one quarter
- **Portal share of intake** — measured by ticket source, above 30% by month six
- **CSAT response rate** — measured against resolved tickets, above 25%
- **Arabic portal usability** — measured by task-completion test with Arabic-first users, above 90% completion
- **Mobile completion rate** — measured on ticket submission, no worse than desktop by more than 5 points

## Explicitly out of scope

- **The knowledge base content and authoring** — story `006`; this epic presents it
- **The AI chatbot inside the portal** — story `007`
- **Live chat transport** — story `003`; this epic hosts the widget
- **Customer-managed user administration** (a corporate contact granting colleagues access) — `CP-06` reads a permission set by us; self-administration is a later amendment
- **Payments, invoices, ordering** — the ERP owns these; story `011` may surface them read-only
- **A native mobile app** — story `012`; this epic targets a mobile browser

## Depends on

| Needs | Why |
|---|---|
| Story `002` | The portal is a view onto tickets, their statuses and their threads |
| Story `006` | The self-service half of the portal is empty without articles |
| Story `010` | Customer authentication and organisation-level visibility are permission features |
| Story `012` | RTL, bilingual content and mobile layout are platform capabilities |

## Open questions for the client

- [ ] Is authentication by one-time code, password, or the client's existing SSO — and does a customer need an account to submit at all? — *blocks* `FR-001`
- [ ] What does *expected response time* show the customer: the SLA target, a computed estimate, or nothing? Showing a target we then miss is worse than showing nothing. — *blocks* `FR-003`
- [ ] Who decides which colleagues a corporate contact may see tickets for? — *blocks* `FR-006`
- [ ] Which domain does the portal live on, and who controls its DNS and certificate? — *blocks* `FR-018`
- [ ] Is the complaint path a separate ticket type with its own SLA, or a flag? — *blocks* `FR-017`
- [ ] Is a service-status page in scope for launch, and who publishes to it? — *blocks* `FR-016`

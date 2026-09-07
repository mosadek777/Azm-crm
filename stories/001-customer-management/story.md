# Story 001 — Customer Management

> **عايزين نعمل إيه؟**
> We want one trustworthy record per customer, holding everything we know about
> them and everything we have ever said to them.

| | |
|---|---|
| **Number** | `001` |
| **Spec** | [`specs/001-customer-management/spec.md`](../../specs/001-customer-management/spec.md) |
| **Source** | *Customer Support CRM · Core Features*, section 1 |
| **Status** | Draft |
| **Owner** | TBD |

---

## The need

Today a customer who has contacted us four times is four unrelated
conversations. Nobody answering the phone can see what was promised last month,
which branch handled it, or whether this customer is on a contract that entitles
them to a faster answer. Agents ask questions the customer has already answered,
which is the single most common complaint in support.

## Who this is for

| Persona | What they get out of it |
|---|---|
| `AGT` Support agent | Opens one screen and knows who they are talking to before speaking |
| `LEAD` Team lead | Can merge the duplicates that currently split reporting |
| `MGR` Support manager | Can segment customers so SLA and routing treat tiers differently |
| `CUST` Customer | Stops repeating themselves; keeps their own details current |
| `ADM` Administrator | Adds business-specific fields without a code change |
| `AUD` Auditor | Can prove who changed a record, and honour deletion requests |

## What we want

After this ships, someone can:

- Find any customer in seconds by name, phone, email or national/account ID
- See identity, contacts, segment, entitlement and full cross-channel history on one screen
- Reach a customer on the channel and in the language they prefer
- Keep several phones, emails and WhatsApp numbers per person without ambiguity
- Record internal context the customer never sees
- Attach contracts and identity documents to the person, not to a ticket
- Merge two records that turn out to be the same human, without losing history
- Group individuals under an organisation and see that organisation's whole load
- Import the existing customer base rather than retyping it
- Delete or anonymise a customer's data on lawful request

## Why it matters

Every metric in epic 009 is aggregated by customer. If identity is wrong,
satisfaction scores, SLA compliance per tier and repeat-contact rate are all
wrong, and they are the numbers we will show the client. Duplicate records are
also the mechanism by which a VIP silently receives standard service. This epic
is cheap to build now and expensive to correct after twelve months of tickets
have accumulated against the wrong records.

## Stories in this epic

| ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| `CM-01` | AGT | create a new customer profile mid-call | I can log a request from someone not yet in the system | Must |
| `CM-02` | AGT | search by name, phone, email or national/account ID | I find the right record while the caller waits | Must |
| `CM-03` | AGT | see contacts, company, segment, language and tags on one screen | I do not click through tabs while someone is talking | Must |
| `CM-04` | AGT | store several phones, emails and WhatsApp numbers | I can reach them on whichever channel works | Must |
| `CM-05` | AGT | mark a primary contact and a preferred channel and language | outbound defaults to the right place and language | Should |
| `CM-06` | AGT | one chronological history of every interaction, all channels | I understand the relationship before I speak | Must |
| `CM-07` | AGT | filter that history by channel, date range and ticket | I can find one specific past conversation | Should |
| `CM-08` | AGT | add internal notes the customer can never see | I record context for whoever picks this up next | Must |
| `CM-09` | AGT | attach files to the customer, not only to tickets | contracts and ID copies live with the profile | Must |
| `CM-10` | AGT | be warned before creating a duplicate customer | the database does not hold the same person three times | Should |
| `CM-11` | LEAD | merge duplicates and keep the combined history | reporting is not split across two versions of one customer | Should |
| `CM-12` | AGT | link a customer to an organisation account | I see every ticket that company has raised | Should |
| `CM-13` | MGR | segment by tier, region, branch and VIP status | routing and SLA rules can treat them differently | Should |
| `CM-14` | AGT | see active contract, entitlement and SLA tier on the profile | I know what service level this customer is owed | Should |
| `CM-15` | AGT | see open tickets, lifetime tickets, avg satisfaction, last contact | I judge the health of the relationship at a glance | Could |
| `CM-16` | AGT | flag a customer as sensitive or escalated | colleagues handle them carefully without being told | Could |
| `CM-17` | CUST | update my own contact details in the portal | my information stays current without phoning anyone | Should |
| `CM-18` | ADM | define custom fields on the customer record | we capture business-specific data without a code change | Should |
| `CM-19` | ADM | import customers in bulk from Excel or the ERP | we can migrate existing data on day one | Must |
| `CM-20` | AUD | see who changed which field and when | I can settle a data dispute with evidence | Should |
| `CM-21` | AUD | anonymise or delete personal data on request | we honour data-protection obligations | Should |
| `CM-22` | AGT | see consent status per channel before messaging | I do not send a message we have no permission to send | Should |

**22 stories** — 8 Must · 12 Should · 2 Could

## How we will know it worked

- **Time to identify a caller** — measured by agent timing study, under 10 seconds by launch + 1 month
- **Duplicate rate** — measured by fuzzy match on phone/email, under 2% of active customers
- **Repeat-question complaints** — measured by CSAT free-text coding, halved within one quarter
- **Migration completeness** — measured against ERP record count, 100% of active customers present at go-live

## Explicitly out of scope

- **Marketing segmentation and campaigns** — this is a support CRM; segments here drive routing and SLA only
- **Sales pipeline, opportunities, quotes** — not in the source feature list at all
- **Customer-facing organisation admin** (a customer managing their own colleagues' access) — deferred to story `008`
- **Deduplication as a background job** — merge is agent-initiated in this epic; automatic merging needs a confidence policy nobody has written

## Depends on

| Needs | Why |
|---|---|
| Story `010` | Data scoping by branch and department must exist before customer records are visible to anyone |
| Story `011` | ERP is a candidate source of truth for customer master data; the direction of sync changes this epic materially |

## Open questions for the client

- [x] **Who owns customer master data — the CRM or the ERP?** Both cannot be the source of truth. — *blocks* `FR-014`, `FR-019` *(corrected 2026-09-07: this line previously read "blocks `FR-019`, `FR-020`". `FR-020` is "Every field mutation MUST write a history entry" and has nothing to do with ERP ownership; `FR-014` (entitlement display) does. `specs/001` had the correct set.)*
  - **RESOLVED 2026-09-07 by Mohamed Sadek (developer, acting as decision authority): the CRM is the system of record; the ERP is read-only reference.** See `specs/001` §12 `[CLARIFY-1]`.
- [x] Which identifier is the unique key: phone, email, national ID, or an ERP account number? — *blocks* `FR-002`, `FR-010`
  - **CLOSED AS MALFORMED 2026-09-07 by Mohamed Sadek (developer, acting as decision authority): there is no single key.** Replaced by a ranked match list (phone → email → national ID → account reference) plus a separate ERP join key. See `specs/001` §12 `[CLARIFY-2]`.
- [ ] Which data-protection regime applies, and what is the required retention period? — *blocks* `FR-021`
- [ ] Are individuals and organisations one entity with a type flag, or two? — *blocks* `FR-012`
- [ ] Is consent captured by us, or read from an existing system? — *blocks* `FR-022`

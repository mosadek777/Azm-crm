# Story 006 — Knowledge Base

> **عايزين نعمل إيه؟**
> We want the answer written once, in both languages, and then reused — by the
> customer before they ask, by the agent mid-reply, and by the chatbot.

| | |
|---|---|
| **Number** | `006` |
| **Spec** | [`specs/006-knowledge-base/spec.md`](../../specs/006-knowledge-base/spec.md) |
| **Source** | *Customer Support CRM · Core Features*, section 6 |
| **Status** | Draft |
| **Owner** | TBD |

---

## The need

The same twenty questions account for most of our volume, and each one is
answered from scratch, differently, by whoever picks it up. The good answer lives
in one agent's sent folder. Customers who would happily have solved it themselves
have nowhere to look, so they queue.

## Who this is for

| Persona | What they get out of it |
|---|---|
| `CUST` Customer | Solves it themselves, at any hour, in their own language |
| `AGT` Support agent | Answers with approved wording without composing it |
| `KBA` Knowledge author | A place to publish, with review, versioning and evidence of what helps |
| `MGR` Support manager | Deflected volume, and data showing which content to write next |

## What we want

After this ships, someone can:

- Write an article once and publish it in Arabic and English as linked translations
- Restrict an article to public, customer-only, internal or a specific role
- Send content through review before it reaches a customer
- Roll back a bad edit in seconds
- Be reminded when content is due for review, before it becomes wrong
- Search with typo tolerance in both languages and find the answer
- Be shown likely answers while typing a ticket subject, and not submit at all
- Insert an article into a reply from inside the ticket
- See what was searched for and not found, and write that next

## Why it matters

This epic is the multiplier for two others. The chatbot in story `007` is only
as good as the base it answers from, and the self-service portal in story `008`
is an empty shell without it. Deflection is also the only lever in the whole
product that reduces cost per ticket rather than shifting it, which is the
argument that justifies the AI investment later.

## Stories in this epic

| ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| `KB-01` | KBA | a rich editor with images, tables and attachments | guidance is clear enough to follow unaided | Must |
| `KB-02` | KBA | categories and tags | content is found by browsing as well as searching | Must |
| `KB-03` | KBA | write in Arabic and English, linked as translations | every reader gets the same answer in their language | Must |
| `KB-04` | KBA | draft, review and publish with an approver | wrong information cannot reach customers unreviewed | Should |
| `KB-05` | KBA | visibility per article: public, customer, internal, role | internal procedure never leaks onto the public site | Must |
| `KB-06` | KBA | version history and rollback | a bad edit is a five-second fix | Should |
| `KB-07` | KBA | a review date, and a reminder when it passes | the base does not quietly become wrong | Should |
| `KB-08` | CUST | search with typo tolerance in Arabic and English | I find it even when I spell it badly | Must |
| `KB-09` | CUST | likely articles shown as I type my ticket subject | I may not need to submit a ticket at all | Should |
| `KB-10` | AGT | search from inside the ticket and insert the answer | I reply fast with approved wording | Must |
| `KB-11` | MGR | views, failed searches, helpful votes, deflection rate | I know what to write next from evidence | Should |
| `KB-12` | CUST | rate an article and say why | authors learn whether it actually helped | Should |
| `KB-13` | KBA | FAQs as a distinct short-answer format | common questions are answered above the fold | Must |
| `KB-14` | KBA | related articles, manual and automatic | a reader who lands nearby still gets there | Could |
| `KB-15` | CUST | read public articles without logging in | getting help has no barrier in front of it | Should |
| `KB-16` | KBA | step-by-step guide and solution templates | articles are consistently structured without effort | Could |
| `KB-17` | ADM | stable, shareable, search-indexable article URLs | answers can be linked from anywhere | Could |

**17 stories** — 6 Must · 8 Should · 3 Could

## How we will know it worked

- **Deflection rate** — measured as portal article views that end without a ticket, above 20% by month six
- **Failed searches** — measured from search log, under 10% of queries return nothing useful
- **Agent replies containing an article** — measured on outbound messages, above 30%
- **Articles overdue for review** — measured against review dates, under 5% at any time
- **Coverage of top questions** — measured as top 20 ticket categories with a published article in both languages, 100%

## Explicitly out of scope

- **The AI chatbot that reads this base** — story `007`
- **AI-drafted articles from resolved tickets** — story `007` (`AI-18`)
- **The portal shell the base is presented in** — story `008`
- **Document management** (versioned files, contracts, policies for internal use) — this is a support knowledge base, not a DMS
- **Community forums, customer-authored content** — not in the source feature list
- **Translation by machine** — `KB-03` requires human-authored parallel articles; machine translation of messages is `AI-12`

## Depends on

| Needs | Why |
|---|---|
| Story `010` | Visibility levels are a permission model, not a display flag |
| Story `012` | Bilingual authoring and RTL rendering are platform capabilities |

## Open questions for the client

- [ ] **Are Arabic and English peer articles, or is one the original and one a translation?** This changes the content model, the workflow and the search index. — *blocks* `FR-003`, `FR-008`
- [ ] Who authors the initial content, and how many articles must exist at go-live? An empty base makes the portal and the chatbot useless.  — *blocks* launch readiness
- [ ] Who approves publication, and is approval required for internal articles too? — *blocks* `FR-004`
- [ ] Is any of this base public and search-engine indexable, or all behind login? — *blocks* `FR-015`, `FR-017`
- [ ] What is the review cycle length — 6 months, 12? — *blocks* `FR-007`

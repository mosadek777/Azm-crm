# Story 007 — AI Features

> **عايزين نعمل إيه؟**
> We want the machine to do the reading, the sorting and the first draft — and
> we want a human to stay in charge of what the customer actually receives.

| | |
|---|---|
| **Number** | `007` |
| **Spec** | [`specs/007-ai-features/spec.md`](../../specs/007-ai-features/spec.md) |
| **Source** | *Customer Support CRM · Core Features*, section 7 |
| **Status** | Draft |
| **Owner** | TBD |

---

## The need

Agents spend a large part of the day on work that is mechanical rather than
skilled: reading a forty-message thread to take over a case, choosing a category
from a tree, retyping an answer that exists elsewhere, and translating between
Arabic and English. Meanwhile customers who contact us at two in the morning wait
until nine for an answer that was already written down.

## Who this is for

| Persona | What they get out of it |
|---|---|
| `AGT` Support agent | Summaries instead of archaeology, drafts instead of blank boxes |
| `CUST` Customer | An answer at any hour, and a clean handoff to a human when the bot cannot help |
| `LEAD` Team lead | Context generated automatically on escalation and transfer |
| `MGR` Support manager | Emerging themes visible in week one, and quality review that scales |
| `ADM` Administrator | Control over sources, redaction, and evidence of whether it helps |

## What we want

After this ships, someone can:

- Take over a long case by reading a summary rather than the thread
- Start from a suggested reply grounded in our own approved content, and edit it
- Have routine tickets categorised and prioritised on arrival, with low-confidence ones sent to a human
- See suggested solutions with their sources, and verify before trusting
- Get an answer from a chatbot at any hour, restricted to our knowledge base
- Be handed to a human with the whole conversation when the bot reaches its limit
- Have angry tickets flagged before the customer escalates
- Serve a customer in a language the agent does not write well
- See what the whole ticket population is complaining about this week

## Why it matters

This epic is the most visible differentiator in the product and the most
dangerous. A confidently wrong answer about a customer's contract is worse than
no answer, and unlabelled machine text destroys trust permanently once
discovered. It is also entirely dependent on story `006` and story `002`: without
a good knowledge base and clean ticket history, every feature here degrades from
useful to embarrassing. Everything in this epic is therefore **Should** or lower
except the items that are safe by construction.

## Stories in this epic

| ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| `AI-01` | AGT | an AI summary of a long thread | I take over without reading forty messages | Must |
| `AI-02` | LEAD | a summary generated on escalation and transfer | the receiving agent starts with context | Should |
| `AI-03` | AGT | suggested replies grounded in the base and past resolutions, editable before sending | I answer faster without giving up the words | Must |
| `AI-04` | AGT | drafts in the customer's language and a chosen tone | the suggestion is usable, not a starting point | Should |
| `AI-05` | SYS | auto-categorise and prioritise with confidence, low confidence to a human | triage is fast where safe, human where not | Must |
| `AI-06` | AGT | suggested solutions with links to their sources | I can verify before I trust | Must |
| `AI-07` | CUST | a chatbot on portal, site and WhatsApp answering from the base | I get help at two in the morning | Must |
| `AI-08` | CUST | handoff to a human with my whole conversation when the bot cannot help | I am never trapped in a loop with a machine | Must |
| `AI-09` | ADM | the chatbot restricted to approved sources, and visibility when it declines | it cannot invent policy on our behalf | Must |
| `AI-10` | SYS | detect frustration and flag or escalate angry tickets | the customer about to leave gets attention first | Should |
| `AI-11` | SYS | detect inbound language and route accordingly | the customer is answered by someone who understands them | Should |
| `AI-12` | AGT | translate inbound and outbound messages | I serve a customer in a language I do not write well | Could |
| `AI-13` | MGR | AI-clustered themes across recent tickets | I spot a systemic problem in week one, not month three | Should |
| `AI-14` | SYS | surface similar or duplicate open tickets at creation | two agents do not solve the same problem twice | Should |
| `AI-15` | MGR | AI-assisted quality scoring on a sample of conversations | quality review scales past what I can read | Could |
| `AI-16` | AUD | a log of suggestions shown, accepted, edited and rejected | we measure whether the model actually helps | Should |
| `AI-17` | ADM | personal data redacted before it reaches a model, per-department opt-out | using AI does not create a compliance problem | Should |
| `AI-18` | AGT | AI draft a knowledge article from a resolved ticket | capturing knowledge stops being unpaid extra work | Could |
| `AI-19` | MGR | predicted breach risk on open tickets | I intervene before the SLA is lost | Could |
| `AI-20` | CUST | see clearly when a reply or summary was AI-generated | I am not misled about who I am talking to | Should |

**20 stories** — 7 Must · 8 Should · 5 Could

## How we will know it worked

- **Suggested reply acceptance rate** — measured from the AI audit log, above 50% accepted or lightly edited
- **Auto-categorisation accuracy** — measured against agent corrections, above 85% on high-confidence predictions
- **Chatbot containment** — measured as bot conversations ending without a ticket, above 30% of after-hours contacts
- **Chatbot escalation quality** — measured by sampled review, 100% of handoffs carry full context
- **Hallucination incidents** — measured by agent and customer reports, zero tolerated; each one triggers a source review
- **Handling time on long threads** — measured before and after summaries, reduced by 30%

## Explicitly out of scope

- **Fully autonomous resolution** — no AI closes a ticket or commits us to anything without a human, per constitution V
- **Voice AI, speech recognition, IVR** — not in the source feature list
- **Training a bespoke model on customer data** — this epic assumes a hosted model with retrieval over our own content
- **AI-authored articles published without review** — `AI-18` produces a draft that enters the story `006` review workflow
- **Sentiment as a performance metric for agents** — `AI-10` routes attention; it does not score people

## Depends on

| Needs | Why |
|---|---|
| Story `006` | Every grounded feature here reads from the knowledge base; an empty base makes them harmful |
| Story `002` | Summaries, similarity and categorisation read ticket history |
| Story `010` | Redaction, per-department opt-out and the AI audit log are governance features |

## Open questions for the client

- [ ] **Which model, hosted where?** `AI-17` and the data-residency requirement in story `010` collide if customer data must stay in-jurisdiction while the model is a foreign API. — *blocks* this entire spec
- [ ] What is the acceptable cost per AI action, and is there a monthly ceiling? — *blocks* `FR-003`, `FR-007`
- [ ] What is the confidence threshold below which a ticket goes to a human? — *blocks* `FR-005`
- [ ] Is the chatbot permitted to read the customer's own ticket history, or only public articles? — *blocks* `FR-007`, `FR-009`
- [ ] Which departments may opt out of AI entirely? — *blocks* `FR-017`
- [ ] How must AI content be labelled to customers — a badge, a sentence, a disclosure in the footer? — *blocks* `FR-020`
- [ ] Does Arabic quality meet the bar for customer-facing drafts, or is Arabic agent-assist only at launch? — *blocks* `FR-004`

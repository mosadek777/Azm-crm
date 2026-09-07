# Story 003 — Communication Channels

> **عايزين نعمل إيه؟**
> We want five ways in and one conversation out. Whatever the customer uses, the
> agent reads a single thread.

| | |
|---|---|
| **Number** | `003` |
| **Spec** | [`specs/003-communication-channels/spec.md`](../../specs/003-communication-channels/spec.md) |
| **Source** | *Customer Support CRM · Core Features*, section 3 |
| **Status** | Draft |
| **Owner** | TBD |

---

## The need

Customers already contact us by email, WhatsApp, phone and web form. Each lands
somewhere different, and none of them lands in a shared place. A customer who
emails on Sunday and messages on Monday gets two answers from two people, or
none. Agents copy and paste between applications all day, and the copy is where
the mistakes happen.

## Who this is for

| Persona | What they get out of it |
|---|---|
| `CUST` Customer | Uses the channel they already have open, and is recognised on it |
| `AGT` Support agent | One inbox, one timeline, no application switching |
| `ADM` Administrator | Connects and monitors channels without a developer |
| `MGR` Support manager | Can compare channels on cost, speed and satisfaction |

## What we want

After this ships, someone can:

- Send us email, WhatsApp, SMS, live chat or a web form and reach the same queue
- Reply from inside the ticket and have it arrive as a normal message on that channel
- Continue an existing conversation without opening a second ticket
- Read one timeline showing every channel in the order things were actually said
- Switch channel mid-conversation without the customer starting again
- Get an acknowledgement that reflects real business hours
- Have a phone call recorded in history alongside everything else
- See at a glance that a channel has stopped working

## Why it matters

The promised value of this product is the unified inbox, and the whole of that
value sits in the threading. Connecting five providers is a fortnight of work;
correlating five providers onto one ticket reliably is the hard part and the part
usually deferred until it cannot be fixed. Every channel also carries a failure
mode outside our control — WhatsApp template approval, mail deliverability, SMS
gateway outages — and each needs specified behaviour rather than a stack trace.

## Stories in this epic

| ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| `CH-01` | ADM | connect a mailbox over IMAP, Exchange or Microsoft 365 | inbound email becomes tickets without forwarding | Must |
| `CH-02` | AGT | reply by email from inside the ticket | the customer sees an ordinary email thread | Must |
| `CH-03` | SYS | thread replies onto the existing ticket by message reference | one conversation does not become six tickets | Must |
| `CH-04` | ADM | send from our branded domain with SPF and DKIM set | our replies reach the inbox, not the spam folder | Must |
| `CH-05` | ADM | suppress out-of-office replies and bounce notices | the queue is not padded with machine noise | Should |
| `CH-06` | ADM | connect the WhatsApp Business API | customers open tickets where they already are | Must |
| `CH-07` | AGT | send and receive images, PDFs, voice notes and location | the customer shows me the problem instead of describing it | Should |
| `CH-08` | AGT | be warned when the WhatsApp window closed, and offered a template | my reply still reaches them | Should |
| `CH-09` | ADM | manage approved WhatsApp templates in Arabic and English | notifications comply with policy in both languages | Should |
| `CH-10` | CUST | start a live chat from the website or portal | I get help now rather than waiting for a reply | Must |
| `CH-11` | AGT | chats routed by availability, skill and language | I only receive conversations I can handle | Should |
| `CH-12` | AGT | transfer a live chat with its full context | escalating mid-conversation does not restart the customer | Should |
| `CH-13` | CUST | an offline form out of hours that becomes a ticket | late-night problems are not simply lost | Should |
| `CH-14` | CUST | the chat transcript emailed and kept on the ticket | we both hold the same record of what was said | Should |
| `CH-15` | ADM | connect an SMS gateway | we send confirmations, one-time codes and short replies | Should |
| `CH-16` | SYS | attach inbound SMS to the originating ticket | the thread stays whole on a channel with no threading | Should |
| `CH-17` | ADM | build web forms with fields, validation and required attachments | intake arrives structured instead of as free text | Must |
| `CH-18` | ADM | embed a form on any page or share it as a link | customers submit through the right front door | Should |
| `CH-19` | ADM | CAPTCHA and rate limiting on public forms and chat | a bot cannot flood the queue overnight | Should |
| `CH-20` | AGT | one unified timeline showing every channel in order | I read one story rather than five fragments | Must |
| `CH-21` | AGT | switch channel mid-conversation without leaving the ticket | starting on chat and finishing by email is seamless | Should |
| `CH-22` | ADM | channel health with connection status, last sync and failures | a dead mailbox is noticed in minutes, not on Monday | Should |
| `CH-23` | AGT | log a phone call with direction, duration and notes | voice appears in history alongside everything else | Should |
| `CH-24` | ADM | business hours and auto-acknowledgement text per channel | customers know when to expect a human | Should |
| `CH-25` | ADM | an outbound queue with retries and failure alerts | a gateway error never silently swallows a reply | Should |

**25 stories** — 7 Must · 18 Should · 0 Could

## How we will know it worked

- **Correct threading rate** — measured by sampled manual audit, above 98% of inbound messages land on the right existing ticket
- **Duplicate tickets from one conversation** — measured by merge count, under 1% of tickets
- **Channel downtime undetected** — measured from health log against first human report, always zero
- **Outbound delivery failures unnoticed** — measured against provider webhooks, always zero

## Explicitly out of scope

- **Full telephony / call centre integration** (screen pop, click-to-dial, recordings) — story `011`; this epic only manually logs a call
- **Social media channels** (Facebook, Instagram, X) — not in the source feature list
- **The AI chatbot that answers on these channels** — story `007`; this epic provides the transport
- **Outbound marketing or bulk messaging** — this is support only
- **Video calls and screen sharing** — not in the source feature list

## Depends on

| Needs | Why |
|---|---|
| Story `002` | Messages have to attach to a ticket that exists |
| Story `001` | Inbound identity resolution needs the customer record and its contact list |

## Open questions for the client

- [ ] **Which channels ship in phase one?** Five channels is five integrations, five threading rules and five failure modes. — *blocks* scope of this entire spec
- [ ] Which WhatsApp Business Solution Provider, and is the number already approved? Template approval is outside our control and has a lead time. — *blocks* `FR-006`, `FR-009`
- [ ] Which mail platform, and do we control DNS to set SPF and DKIM? — *blocks* `FR-004`
- [ ] Which SMS gateway, and is it used for one-time codes as well as notifications? — *blocks* `FR-015`
- [ ] What are the business hours per branch, and the holiday calendar? — *blocks* `FR-024`, and spec `005`
- [ ] When identity cannot be resolved from an inbound message, do we create an unverified customer or hold the message for triage? — *blocks* `FR-003`

# Spec 003 — Communication Channels

> **المفروض الحاجة دي تشتغل إزاي بالظبط؟**

| | |
|---|---|
| **Number** | `003` |
| **Story** | [`stories/003-communication-channels/story.md`](../../stories/003-communication-channels/story.md) |
| **Status** | Draft — clarifying |
| **Constitution gates** | I (bilingual), II (attributable), VI (one conversation, one thread) |
| **Blocking clarifications** | 6 |

---

## 1. Scope

**In scope.** Inbound and outbound transport for email, WhatsApp, live chat, SMS
and web forms; identity resolution of an inbound message to a customer;
correlation of an inbound message to an existing ticket or a new one; the unified
conversation timeline; channel switching within one ticket; per-channel business
hours and acknowledgements; the outbound queue with retries; channel health; and
manual call logging.

**Out of scope.**

- The ticket itself, its statuses and its thread storage — spec `002`
- The customer record and contact points — spec `001`
- Telephony integration (screen pop, click-to-dial, recordings) — spec `011`
- Provider credential management and delivery receipts — spec `011`
- The AI chatbot answering on these channels — spec `007`
- Social media channels — not in the source feature list
- Outbound marketing or bulk messaging — not this product

## 2. Domain language

| Term | Means exactly |
|---|---|
| **Channel** | A transport: `email`, `whatsapp`, `sms`, `chat`, `form`, `call`. |
| **Channel account** | One configured endpoint on a channel — a specific mailbox, a specific WhatsApp number, a specific form. Belongs to exactly one department and branch. |
| **Inbound message** | A message received from a customer on a channel, before correlation. |
| **Identity resolution** | Determining which customer an inbound message is from, using its channel address against contact points (spec `001`). |
| **Correlation** | Determining which ticket an inbound message belongs to. Produces exactly one of: an existing ticket, a new ticket, or `unresolved`. |
| **Correlation key** | The channel-specific evidence used to correlate. Per channel, defined in section 5. |
| **Unresolved queue** | Where messages that cannot be correlated or resolved wait for human triage. Never silently discarded. |
| **Service window** | A provider-imposed period during which a free-form reply is permitted. WhatsApp imposes 24 hours from the customer's last message. |
| **Template message** | A provider-pre-approved message, required to initiate outside a service window. |
| **Business hours** | The working schedule of a channel account, per branch calendar. |
| **Acknowledgement** | An automatic first reply confirming receipt. Never counts as first response, per `[CLARIFY-4]`. |
| **Outbound job** | A queued send attempt with a state, an attempt count and a terminal outcome. |
| **Channel health** | The observable state of a channel account: connected, degraded, failed, with a last-successful-sync timestamp. |

## 3. Key entities

### Channel account

| Attribute | Type | Rules |
|---|---|---|
| `channel` | channel type | Required, immutable |
| `identifier` | text | Required — mailbox address, WhatsApp number, form slug |
| `branch_id`, `department_id` | ref | Required; tickets created here inherit them |
| `default_category_id` | ref Category | Required — the fallback classification for this account |
| `business_hours_id` | ref Calendar | Required; shared with spec `005` (constitution III) |
| `ack_enabled` | boolean | — |
| `ack_template_ar`, `ack_template_en` | text | Both required when `ack_enabled` (constitution I) |
| `state` | `connected` \| `degraded` \| `failed` \| `disabled` | System-managed |
| `last_success_at` | timestamp | System-managed |

### Inbound message

| Attribute | Type | Rules |
|---|---|---|
| `channel_account_id` | ref | Required |
| `external_id` | text | Provider's message id; unique per channel account — the idempotency key |
| `from_address` | text | Normalised as in spec `001` |
| `sent_at`, `received_at` | timestamp | `sent_at` from the provider where available; used for the reopen-window test in spec `002` `E-19` |
| `body`, `attachments` | — | — |
| `correlation_key` | text | The evidence used; stored for diagnosis |
| `outcome` | `appended` \| `created` \| `unresolved` \| `suppressed` \| `duplicate` | Required |
| `ticket_id` | ref Ticket | Set when `appended` or `created` |

### Outbound job

| Attribute | Type | Rules |
|---|---|---|
| `ticket_id`, `message_id` | ref | Required |
| `channel`, `to_address` | — | Required |
| `state` | `queued` \| `sending` \| `sent` \| `failed` \| `abandoned` | — |
| `attempts` | integer | Bounded per `FR-025` |
| `last_error` | text | Retained on failure |

### Chat session, Web form definition, Call log
Standard shapes. A chat session becomes a ticket at first customer message, not
at widget open. A form definition holds per-field Arabic and English labels.

## 4. Acceptance scenarios

### AS-01 — Email becomes a ticket
**Given** a connected mailbox with default category "General Enquiry"
**When** an email arrives from an address matching a customer's contact point
**Then** a ticket is created, attributed to that customer, in the mailbox's branch, department and default category
**And** the email body becomes the first customer-visible message with the sender's `sent_at` timestamp
**And** attachments are stored subject to spec `010` scanning

### AS-02 — Email reply threads onto the existing ticket
**Given** an open ticket whose last outbound email carried a message identifier
**When** the customer replies, quoting that identifier in their references
**Then** the message is appended to that ticket
**And** no new ticket is created
**And** the quoted text of our previous message is collapsed, not stored as new content

### AS-03 — Correlation falls back safely
**Given** an inbound email with no recognisable reference and no ticket reference in its subject
**When** it arrives from a customer with exactly one open ticket in that department, sent within 72 hours of that ticket's last message
**Then** it is appended to that ticket per `[CLARIFY-6]`
**And** given the same email from a customer with three open tickets, a new ticket is created and linked `related_to` the others
**And** given the same email from an unrecognised address, the outcome is per `[CLARIFY-2]`

### AS-04 — Duplicate delivery is idempotent
**Given** an inbound message already processed with external id `X`
**When** the provider delivers `X` a second time
**Then** the outcome is `duplicate`
**And** no message is appended and no ticket is created

### AS-05 — Auto-replies are suppressed
**Given** an inbound email carrying an auto-submitted header, or an out-of-office indicator, or a bounce report
**When** it arrives
**Then** the outcome is `suppressed`
**And** it is visible on the ticket as a suppressed system event, not as a customer message
**And** it does not satisfy or reset any SLA measurement

### AS-06 — WhatsApp service window enforced
**Given** a ticket whose customer last messaged 30 hours ago
**When** an agent composes a free-form WhatsApp reply
**Then** they are told the window has closed before sending
**And** they are offered the approved templates for this account, in the customer's preferred language
**And** given the customer last messaged 2 hours ago, free-form sending proceeds normally

### AS-07 — Unified timeline is chronological across channels
**Given** a ticket with an email at 09:00, a WhatsApp message at 09:40, an internal note at 10:00, an agent email reply at 10:15 and a logged call at 11:00
**When** an agent opens the ticket
**Then** all five appear in that order
**And** each shows its channel and its author
**And** the internal note is visually distinct and is excluded from every customer-facing rendering

### AS-08 — Channel switch keeps one ticket
**Given** a ticket opened by live chat
**When** the chat ends and an agent later replies by email to the same customer on the same ticket
**Then** it remains one ticket with one reference
**And** the timeline shows the channel change

### AS-09 — Out of hours acknowledgement
**Given** a channel account with business hours 09:00–17:00 Sunday to Thursday, and acknowledgement enabled
**When** a message arrives Friday at 22:00 from a customer whose preferred language is Arabic
**Then** the Arabic acknowledgement is sent
**And** it states when a human will respond, consistent with the SLA start computed by spec `005` `FR-017`
**And** the acknowledgement does not satisfy first response

### AS-10 — Outbound failure is never silent
**Given** an outbound email whose provider returns a transient error
**When** the retry schedule is exhausted
**Then** the job is `abandoned`
**And** the ticket shows the delivery failure on the timeline
**And** the assigned agent and the channel administrator are both notified
**And** the ticket does not appear to the agent as answered

### AS-11 — Channel failure is detected without a human report
**Given** a mailbox whose credentials have expired
**When** the next poll fails
**Then** the account state becomes `failed` within the configured detection interval
**And** the channel administrator is alerted
**And** the health view shows the last successful sync time

### AS-12 — Form submission is structured
**Given** a published form with a required attachment and a required invoice-number field
**When** a customer submits it without the attachment
**Then** submission is refused with the specific missing field named, in the form's display language
**And** on valid submission a ticket is created with the field values stored as custom field values per spec `002` `FR-025`

### AS-13 — Public surfaces resist abuse
**Given** a public form
**When** more than the configured number of submissions arrive from one source within the configured window
**Then** further submissions are refused
**And** the refusals are logged
**And** no ticket is created for the refused attempts

### AS-14 — Chat transfer preserves context
**Given** an active chat handled by agent A
**When** A transfers it to agent B
**Then** B sees the entire transcript so far
**And** the customer is told the conversation has been transferred
**And** the ticket's assignment history records the transfer

### AS-15 — Chat becomes a ticket, and offline becomes a ticket too
**Given** the chat widget is opened but no message is sent
**Then** no ticket exists
**And** given the first customer message, a ticket is created
**And** given the widget is opened outside business hours, the offline form is shown and its submission creates a ticket

## 5. Correlation rules, per channel

Constitution VI requires each rule to be explicit and testable.

| Channel | Correlation key, in priority order | On failure |
|---|---|---|
| `email` | 1. `In-Reply-To` / `References` matching an outbound message id · 2. ticket reference in the subject · 3. single open ticket for this customer in this department within 72h `[CLARIFY-6]` | New ticket, linked `related_to` any open tickets |
| `whatsapp` | 1. open ticket for this WhatsApp contact point in this department · 2. most recent ticket closed within the reopen window | New ticket |
| `sms` | 1. ticket reference in the message body · 2. open ticket for this phone contact point · 3. the ticket that sent the last outbound SMS to this number within 72h | New ticket |
| `chat` | Session identity — a chat is always one ticket | Not applicable |
| `form` | Never correlated; every submission is a new ticket unless it names a reference in a designated field | New ticket |
| `call` | Agent selects the ticket at logging time | Agent creates a ticket |

Where identity resolution fails on any channel, behaviour follows
`[CLARIFY-2]`.

## 6. Functional requirements

| ID | Requirement | Level | Traces |
|---|---|---|---|
| `FR-001` | The system MUST poll or receive from a configured mailbox and create or append tickets without human forwarding. | MUST | `CH-01` |
| `FR-002` | An agent MUST be able to send an email reply from the ticket; the customer MUST receive it as a normal threaded email with the account's branding and signature. | MUST | `CH-02` |
| `FR-003` | Inbound correlation MUST follow the rules in section 5, MUST store the key used, and MUST NOT discard any message — every message reaches a ticket or the unresolved queue. | MUST | `CH-03`, constitution VI |
| `FR-004` | Outbound mail MUST originate from the configured branded domain with SPF, DKIM and a return path that routes bounces back into the system. | MUST | `CH-04` |
| `FR-005` | The system MUST identify and suppress auto-submitted mail, out-of-office replies and bounce reports; suppressed messages MUST remain visible as system events and MUST NOT affect SLA measurement. | SHOULD | `CH-05` |
| `FR-006` | The system MUST send and receive on the WhatsApp Business API for each configured number. | MUST | `CH-06` |
| `FR-007` | WhatsApp media — image, document, audio, video, location — MUST be received onto the ticket and sendable from it, subject to spec `010` limits. | SHOULD | `CH-07` |
| `FR-008` | Before a free-form WhatsApp send, the system MUST evaluate the 24-hour service window and, where closed, MUST refuse and offer the approved templates for that account in the customer's preferred language. | SHOULD | `CH-08` |
| `FR-009` | Administrators MUST be able to register approved WhatsApp templates with Arabic and English variants and named parameters. | SHOULD | `CH-09`, constitution I |
| `FR-010` | A chat widget MUST be embeddable on the website and portal; a ticket MUST be created at the first customer message, not at widget open. | MUST | `CH-10` |
| `FR-011` | Chat routing MUST consider agent presence, skill and language, and MUST queue rather than assign when no eligible agent is available. | SHOULD | `CH-11` |
| `FR-012` | An agent MUST be able to transfer a chat, with the full transcript visible to the receiving agent and a notice to the customer. | SHOULD | `CH-12` |
| `FR-013` | Outside business hours the widget MUST present an offline form whose submission creates a ticket. | SHOULD | `CH-13` |
| `FR-014` | On chat end the transcript MUST be stored on the ticket and MAY be emailed to the customer where an email contact point exists and consent permits. | SHOULD | `CH-14` |
| `FR-015` | The system MUST send and receive SMS through a configured gateway. | SHOULD | `CH-15` |
| `FR-016` | Inbound SMS MUST correlate per section 5 and append to the originating ticket where identified. | SHOULD | `CH-16` |
| `FR-017` | Administrators MUST be able to define forms with typed fields, validation, required flags, required attachments, and Arabic and English labels; submissions MUST create tickets with field values stored as custom field values. | MUST | `CH-17`, constitution I |
| `FR-018` | A form MUST be publishable both as an embeddable component and as a standalone link. | SHOULD | `CH-18` |
| `FR-019` | Public forms and the chat widget MUST apply a challenge and per-source rate limiting; refused attempts MUST be logged and MUST NOT create tickets. | SHOULD | `CH-19` |
| `FR-020` | The ticket MUST present one timeline containing every message, on every channel, plus internal notes and system events, ordered by occurrence, each labelled with its channel and author. | MUST | `CH-20`, constitution VI |
| `FR-021` | An agent MUST be able to reply on a channel different from the one the ticket arrived on, where a contact point and consent exist for it, without leaving the ticket. | SHOULD | `CH-21` |
| `FR-022` | The system MUST expose per-account channel health with state, last successful sync and recent failures, and MUST alert the channel administrator on transition to `failed`. | SHOULD | `CH-22` |
| `FR-023` | An agent MUST be able to log a call with direction, duration, participants and notes, appearing on the timeline as an interaction. | SHOULD | `CH-23` |
| `FR-024` | Each channel account MUST carry business hours and an optional acknowledgement in both languages. An acknowledgement MUST NOT satisfy first response, per `[CLARIFY-4]`. | SHOULD | `CH-24`, constitution I |
| `FR-025` | Every outbound message MUST pass through a queue with bounded retries and exponential backoff; exhaustion MUST mark the job `abandoned`, surface the failure on the ticket, and notify the assigned agent and the channel administrator. | SHOULD | `CH-25` |
| `FR-026` | Inbound processing MUST be idempotent on the provider message id; a redelivered message MUST NOT duplicate content. | MUST | constitution VI |
| `FR-027` | Every inbound and outbound event MUST write a history entry per constitution II, including the correlation key and outcome. | MUST | constitution II |

## 7. Edge cases and failure behaviour

| # | Situation | Required behaviour |
|---|---|---|
| E-01 | Inbound address matches two customers | Message goes to the unresolved queue naming both candidates. Never guessed. |
| E-02 | Inbound address matches no customer | Per `[CLARIFY-2]`: create an unverified customer, or hold for triage. |
| E-03 | Customer emails from a new address about an existing ticket, quoting the reference | Appended; the new address is offered to the agent as a contact point to add, not added silently. |
| E-04 | Reply arrives on a merged ticket | Appended to the surviving ticket (spec `002` `E-09`). |
| E-05 | Reply arrives after the reopen window | New ticket, linked `related_to`, evaluated on `sent_at` not `received_at`. |
| E-06 | Provider redelivers a message after an outage | Idempotent per `FR-026`. |
| E-07 | Message arrives while the ticket is being merged | Serialised; the message lands on the survivor. |
| E-08 | Attachment exceeds the channel's provider limit on outbound | Refused before sending, with the limit named and a link offered instead. |
| E-09 | Attachment fails virus scanning | Not stored; the ticket records a rejected attachment with the scan result; the customer is told their attachment could not be accepted. |
| E-10 | WhatsApp template rejected by the provider after registration | The template is marked unusable; agents are not offered it; the administrator is alerted. |
| E-11 | Customer sends only an emoji, a sticker or an empty body | A ticket or append still occurs; the body is recorded as sent. Not an error. |
| E-12 | Chat customer closes the tab mid-conversation | The session ends; the ticket remains with its transcript and enters the queue. |
| E-13 | No agent available for chat and the queue exceeds the configured wait | The customer is offered the offline form; the session becomes a ticket. |
| E-14 | Two agents claim the same queued chat | One wins; the other is told it was taken, naming who took it. |
| E-15 | Business-hours calendar missing for a branch | Account cannot be enabled; configuration is refused, not defaulted. |
| E-16 | Mailbox contains 10,000 unread on first connection | Processed with a configured start date; earlier mail is not imported without an explicit instruction. |
| E-17 | Provider webhook signature invalid | Rejected, logged as a security event, not processed. |
| E-18 | Outbound send succeeds at the provider but the response is lost | Retry is suppressed by the idempotency key so the customer is not messaged twice. |
| E-19 | Channel account disabled with jobs queued | Jobs hold rather than fail; the administrator is told the count held. |
| E-20 | Form field removed after submissions exist | Existing values retained and readable; the field is retired. |

## 8. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| `NFR-001` | Inbound message to visible on the ticket | ≤ 60s at p95 |
| `NFR-002` | Chat message delivery latency | ≤ 1s at p95 |
| `NFR-003` | Channel failure detection | ≤ 5 minutes from first failure |
| `NFR-004` | Outbound retry schedule | ≥ 5 attempts across ≥ 6 hours before abandonment |
| `NFR-005` | Correlation accuracy | ≥ 98% correct on a sampled audit |
| `NFR-006` | Messages lost | 0 — every inbound message is accounted for by an outcome |

## 9. Bilingual and localisation requirements

| Surface | Arabic | English | RTL notes |
|---|---|---|---|
| Acknowledgement templates | Required | Required | Selected by customer `preferred_language` |
| WhatsApp templates | Required | Required | Registered separately with the provider |
| Form labels, help text, validation | Required | Required | Whole form mirrors; numeric and email inputs stay LTR |
| Chat widget interface and prompts | Required | Required | Widget mirrors, including its launcher position |
| Offline form | Required | Required | — |
| Outbound email signature and furniture | Required | Required | Direction follows message language |
| Channel and status names in the health view | Required | Required | — |
| Delivery-failure notices to agents | Required | Required | — |
| Message bodies | Free, mixed permitted | Free | Direction detected per message; a mixed thread renders each correctly |

## 10. Permissions

| Action | CUST | AGT | LEAD | MGR | ADM | AUD |
|---|---|---|---|---|---|---|
| Send customer-visible reply on any channel | own ticket | ✓ | ✓ | ✓ | — | — |
| Send WhatsApp template outside the window | — | ✓ | ✓ | ✓ | — | — |
| Accept / transfer a chat | — | ✓ | ✓ | ✓ | — | — |
| Log a call | — | ✓ | ✓ | ✓ | — | — |
| Work the unresolved queue | — | ✓ | ✓ | ✓ | ✓ | — |
| Configure a channel account | — | — | — | — | ✓ | — |
| Register WhatsApp templates | — | — | — | — | ✓ | — |
| Define / publish forms | — | — | — | ✓ | ✓ | — |
| Set business hours and acknowledgements | — | — | — | — | ✓ | — |
| View channel health | — | — | ✓ | ✓ | ✓ | ✓ |
| Replay / cancel an outbound job | — | — | — | — | ✓ | — |
| Read inbound processing log | — | — | ✓ | ✓ | ✓ | ✓ |

## 11. Audit requirements

| Event | Recorded fields |
|---|---|
| Inbound received | channel account, external id, from address, sent at, received at, size, attachment count |
| Identity resolved | resolution outcome, customer matched, contact point used, or the reason it failed |
| Correlation performed | key used, rule that matched, outcome, ticket id |
| Message suppressed | reason (`auto_reply` / `bounce` / `duplicate` / `rate_limited` / `invalid_signature`) |
| Placed in unresolved queue | reason, candidate customers or tickets considered |
| Outbound queued / sent / failed / abandoned | actor, channel, to address, attempt count, provider response, last error |
| Template used | actor, template identity, language, parameters supplied |
| Service window refusal | actor, ticket, hours since the customer's last message |
| Chat started / assigned / transferred / ended | participants, timestamps, queue wait |
| Call logged | actor, direction, duration, participants |
| Channel account state changed | previous state, new state, cause, last success at |
| Configuration changed | actor, account, field, before, after |
| Rate limit triggered | source, account, count in window |

## 12. Contracts

| Operation | Purpose | Scope predicate |
|---|---|---|
| `receive inbound` (provider webhook / poll) | Ingest | signature verified; writes the account's branch and department |
| `send message` | Outbound on any channel | actor permitted on the ticket; consent checked per spec `001` `FR-022` |
| `list channel accounts` | Configuration and health | branch ∈ scope AND department ∈ scope |
| `configure channel account` | Setup | admin only |
| `list / register WhatsApp templates` | Template management | admin only |
| `list unresolved` | Triage queue | branch ∈ scope AND department ∈ scope |
| `resolve unresolved item` | Attach to a ticket or customer | actor scoped to the target ticket |
| `open / accept / transfer chat` | Live chat | agent presence and scope |
| `log call` | Manual interaction | actor scoped to the ticket |
| `submit form` (public) | Intake | unauthenticated; rate-limited and challenged |
| `get channel health` | Monitoring | lead and above |
| `replay outbound job` | Recovery | admin only |

## 13. Clarifications needed

- [ ] `[CLARIFY-1]` **Which channels ship in phase one?** Five channels is five integrations, five correlation rules and five failure modes. Email plus web form is a credible launch. — *blocks* the scope of this entire spec — *ask* client + delivery lead
- [ ] `[CLARIFY-2]` **When identity cannot be resolved from an inbound message, do we create an unverified customer or hold the message for triage?** This decides `E-02` and the size of the unresolved queue. — *blocks* `FR-003`, `AS-03` — *ask* client operations
- [ ] `[CLARIFY-3]` Which WhatsApp Business Solution Provider, and is the number already approved? Template approval is outside our control and has a lead time that affects the delivery date. — *blocks* `FR-006`, `FR-009` — *ask* client + provider
- [ ] `[CLARIFY-4]` **Does an automatic acknowledgement satisfy first response?** This spec assumes not. The answer changes every compliance figure in spec `009`. — *blocks* `FR-024`, and spec `005` `FR-001` — *ask* client management
- [ ] `[CLARIFY-5]` Which mail platform and SMS gateway, and do we control the DNS needed for SPF and DKIM? — *blocks* `FR-004`, `FR-015` — *ask* client IT
- [ ] `[CLARIFY-6]` Is the 72-hour single-open-ticket fallback in section 5 acceptable, or must ambiguous mail always go to triage? The fallback trades a small mis-threading risk against queue volume. — *blocks* `FR-003`, `AS-03` — *ask* client operations

## 14. Success metrics

| Metric | Source | Target |
|---|---|---|
| Correct threading | Sampled manual audit | > 98% |
| Duplicate tickets from one conversation | Merge count | < 1% |
| Channel downtime detected before a human reports it | Health log vs. first report | 100% |
| Undetected outbound failures | Provider status vs. ticket state | 0 |
| Unresolved queue depth at end of day | Queue state | < 10 |
| Messages with no recorded outcome | Reconciliation | 0 |

## 15. Review checklist

- [x] No implementation detail
- [x] Every requirement testable, using MUST / SHOULD / MAY
- [x] No unfailable adjectives
- [x] Every requirement traces to a story ID or constitution principle
- [x] Every acceptance scenario has a matching requirement, and vice versa
- [x] Edge cases cover empty, duplicate, concurrent, hostile and out-of-order input
- [x] Bilingual requirements stated for every user-visible surface
- [x] Permission matrix complete for every action
- [x] Audit entries defined for every mutation
- [x] Constitution VI satisfied — a correlation rule and a failure behaviour exist for every channel (section 5)
- [ ] **Zero `[NEEDS CLARIFICATION]` markers remaining — 6 open, `/plan` is blocked**
- [x] Constitution gates satisfied and named

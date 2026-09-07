# Spec 008 — Customer Portal

> **المفروض الحاجة دي تشتغل إزاي بالظبط؟**

| | |
|---|---|
| **Number** | `008` |
| **Story** | [`stories/008-customer-portal/story.md`](../../stories/008-customer-portal/story.md) |
| **Status** | Draft — clarifying |
| **Constitution gates** | **I (bilingual and RTL)**, II (attributable), IV (a customer sees only their own), VI (one thread) |
| **Blocking clarifications** | 6 |

---

## 1. Scope

**In scope.** Customer authentication and registration, ticket submission,
status and history views, replying with attachments, organisation-level
visibility, knowledge base access, satisfaction feedback, reopening, notification
preferences, profile self-service, withdrawal, ticket summary export,
announcements, the complaint path, and portal branding.

**Out of scope.**

- Knowledge base content and authoring — spec `006`
- The AI chatbot in the portal — spec `007`
- Live chat transport — spec `003`; this spec hosts the widget
- Ticket lifecycle behaviour — spec `002`
- Customer-managed user administration (a corporate contact granting colleagues access) — `FR-006` reads a permission set by staff
- Payments, invoices and ordering — the ERP owns these; spec `011` may surface them read-only
- A native mobile application — spec `012`

## 2. Domain language

| Term | Means exactly |
|---|---|
| **Portal identity** | A customer's authenticated session, bound to exactly one customer record from spec `001`. |
| **Verified contact point** | A contact point whose ownership has been demonstrated. Required to authenticate. |
| **Organisation visibility** | A permission, granted by staff, letting one person see tickets raised by other members of their organisation. |
| **Own ticket** | A ticket whose customer is the signed-in identity, or, where organisation visibility is granted, a ticket of a fellow member. |
| **Expected response time** | What the portal shows the customer about timing. Content pending `[CLARIFY-2]`. |
| **Withdrawal** | A customer cancelling their own request before resolution. Maps to spec `002` status `cancelled`. |
| **Reopen window** | The period after closure during which a customer may reopen. Owned by spec `002` `FR-022`. |
| **Complaint** | A request the customer designates as dissatisfaction. Treated per `[CLARIFY-5]`. |
| **Announcement** | A staff-published notice shown to customers, independent of any ticket. |
| **Feedback** | A satisfaction rating and optional comment tied to one resolved ticket. |

## 3. Key entities

### Portal identity

| Attribute | Type | Rules |
|---|---|---|
| `customer_id` | ref Customer | Required, exactly one |
| `auth_method` | `otp_email` \| `otp_phone` \| `password` \| `sso` | Per `[CLARIFY-1]` |
| `verified_contact_point_id` | ref | Required |
| `locale` | `ar` \| `en` | Defaults from the customer's `preferred_language` |
| `organisation_visibility` | `none` \| `own_org` | Granted by staff only (`FR-006`) |
| `state` | `active` \| `locked` \| `disabled` | Lockout per spec `010` `FR-007` |

### Feedback

| Attribute | Type | Rules |
|---|---|---|
| `ticket_id` | ref Ticket | Required, unique — one rating per ticket |
| `score` | scale per `[CLARIFY-3]` | Required |
| `comment` | text | Optional, free language |
| `submitted_at` | timestamp | Immutable |
| `window_expired` | boolean | Set when the response window closed unanswered |

### Notification preference, Announcement, Submission form binding
Standard shapes. A notification preference is per customer, per event kind, per
channel, and is constrained by the consent records in spec `001` `FR-022`.

## 4. Acceptance scenarios

### AS-01 — Sign-in binds to exactly one customer
**Given** a phone number that is a verified contact point of exactly one customer
**When** the customer requests a one-time code and submits it correctly
**Then** they are signed in as that customer
**And** given the same number is a contact point of two customers, sign-in is refused with a neutral message and the ambiguity is raised to staff — the customer is never asked to choose

### AS-02 — A customer sees only their own
**Given** customer A signed in, and a ticket belonging to customer B
**When** A requests B's ticket by its reference or its identifier
**Then** the response is not-found, not forbidden
**And** B's ticket never appears in A's list, count or search
**And** the attempt is recorded as a security event

### AS-03 — Organisation visibility is granted, never assumed
**Given** two people in one organisation, neither granted organisation visibility
**When** each views their tickets
**Then** each sees only their own
**When** staff grant one of them `own_org`
**Then** that person sees both, and the grant is recorded with the granting actor
**And** the other person's view is unchanged

### AS-04 — Submission is structured and confirmed
**Given** a customer submitting a request with a required category and an attachment
**When** they submit
**Then** a ticket is created with source `portal`, in the customer's branch and department
**And** the reference is shown immediately and also sent on their preferred notification channel
**And** the attachment is subject to spec `010` scanning; a rejected attachment refuses submission with the reason named

### AS-05 — Status is honest
**Given** a ticket in status `pending_customer`
**When** the customer views it
**Then** they see the customer-facing label for that status in their language
**And** they see that we are waiting for them, and what we are waiting for
**And** they see timing information per `[CLARIFY-2]`
**And** they do not see the assigned agent's identity unless spec `002` `[CLARIFY-6]` permits it

### AS-06 — Internal content never appears
**Given** a ticket with two customer replies, three internal notes and an AI summary
**When** the customer views it, or exports a summary, or receives an email update
**Then** they see two messages
**And** no internal note, no AI summary and no automation log appears in any of the three

### AS-07 — Reply joins the same thread
**Given** an open ticket
**When** the customer replies from the portal with an attachment
**Then** the message appends to that ticket, visible to the agent in the unified timeline
**And** the assigned agent is notified
**And** no new ticket is created

### AS-08 — Feedback is collected once, and its absence is recorded
**Given** a ticket transitioned to `resolved`
**When** the configured delay elapses
**Then** the customer is invited to rate it on their preferred channel
**And** they may submit exactly one rating
**And** attempting a second is refused, showing the rating they gave
**And** where the response window closes unanswered, the ticket is recorded as not rated rather than silently omitted from spec `009` `FR-005`

### AS-09 — Reopen or restart, per the window
**Given** a ticket closed 5 days ago with a 14-day window
**When** the customer reopens it from the portal
**Then** the same ticket returns to an active status, keeping its reference
**And** given the same action at day 20, a new ticket is created linked `related_to` the original, and the customer is told a new request was raised

### AS-10 — Arabic is a first-class layout
**Given** a customer whose locale is Arabic
**When** they use any portal screen
**Then** the layout is mirrored, including navigation, form fields, tables and the chat launcher
**And** ticket references, phone numbers and dates render left-to-right within the mirrored layout
**And** a ticket thread containing both Arabic and English messages renders each message in its own direction
**And** switching to English mirrors the whole interface back without a reload losing their place

### AS-11 — Notification preferences are respected and consent-bounded
**Given** a customer who disables SMS updates but keeps email
**When** their ticket changes status
**Then** they receive email only
**And** where consent for a channel is absent per spec `001` `FR-022`, that channel is not offered as a preference at all

### AS-12 — Withdrawal stops the work
**Given** an open ticket the customer no longer needs
**When** they withdraw it
**Then** the status becomes `cancelled`, the assigned agent is notified, and the SLA clocks are cancelled per spec `005` `AS-19`
**And** given the ticket is already resolved, withdrawal is not offered

### AS-13 — Mobile parity
**Given** a customer on a phone browser
**When** they submit a ticket with an attachment, reply, and rate a resolved ticket
**Then** all three complete successfully
**And** attachment capture from the device camera is available

## 5. Functional requirements

| ID | Requirement | Level | Traces |
|---|---|---|---|
| `FR-001` | A customer MUST be able to authenticate against a verified contact point by the methods agreed in `[CLARIFY-1]`, binding the session to exactly one customer record. Ambiguous identity MUST refuse sign-in with a neutral message and raise the ambiguity to staff. | MUST | `CP-01` |
| `FR-002` | A customer MUST be able to submit a request with category, description and attachments, receiving the reference immediately and on their preferred notification channel. | MUST | `CP-02` |
| `FR-003` | The ticket view MUST show a customer-facing status label, the owning team, and timing information per `[CLARIFY-2]`. | MUST | `CP-03` |
| `FR-004` | A customer MUST be able to reply with attachments; the reply MUST append to the existing ticket and notify the assigned agent. | MUST | `CP-04`, constitution VI |
| `FR-005` | A customer MUST be able to list, search and filter all their own requests, open and closed. | MUST | `CP-05` |
| `FR-006` | Where staff have granted organisation visibility, a customer MUST see tickets raised by fellow organisation members. Visibility MUST default to none and MUST be grantable only by staff. | SHOULD | `CP-06`, constitution IV |
| `FR-007` | A customer MUST be able to browse and search knowledge content visible at their level, per spec `006` `FR-005`. | MUST | `CP-07` |
| `FR-008` | A customer MUST be able to submit exactly one rating and optional comment per resolved ticket. Where the response window closes unanswered, the ticket MUST be recorded as not rated. | MUST | `CP-08` |
| `FR-009` | A customer MUST be able to reopen a ticket within the window from spec `002` `FR-022`; beyond it a new linked ticket MUST be created and the customer told so. | SHOULD | `CP-09` |
| `FR-010` | A customer MUST be able to choose which event kinds they are notified about and on which channels. Channels lacking consent MUST NOT be offered. | MUST | `CP-10` |
| `FR-011` | The portal MUST be fully usable in Arabic and English, switchable at any time, with correct right-to-left layout, mirrored navigation and controls, and per-message direction in mixed threads. | MUST | `CP-11`, constitution I |
| `FR-012` | Every customer task MUST be completable on a phone browser, including attachment capture from the device. | MUST | `CP-12` |
| `FR-013` | A customer MUST be able to view and edit their own contact points, preferred language and preferred channel, each edit writing a history entry attributed to them per spec `001` `FR-017`. | SHOULD | `CP-13` |
| `FR-014` | A customer MAY withdraw their own request before resolution, transitioning it to `cancelled` and notifying the assigned agent. | MAY | `CP-14` |
| `FR-015` | A customer MAY download or print a ticket summary containing only customer-visible content. | MAY | `CP-15` |
| `FR-016` | Staff MAY publish announcements shown to customers in both languages, with a display period, optionally scoped to a branch or department. | MAY | `CP-16` |
| `FR-017` | A customer MUST be able to designate a request as a complaint; its handling follows `[CLARIFY-5]`. | SHOULD | `CP-17` |
| `FR-018` | Administrators MUST be able to set the portal logo, colours, favicon, domain and custom static pages, per spec `012` `FR-010`. | SHOULD | `CP-18` |
| `FR-019` | No internal note, AI output, automation log, assignment detail or agent identity beyond what spec `002` permits MUST appear on any portal surface, export or notification. | MUST | constitution IV |
| `FR-020` | Every portal action MUST write a history entry attributed to the customer, distinguishable from a staff action. | MUST | constitution II |

## 6. Edge cases and failure behaviour

| # | Situation | Required behaviour |
|---|---|---|
| E-01 | Contact point matches two customers | Sign-in refused with a neutral message; ambiguity raised to staff; the customer is never asked which they are (`AS-01`). |
| E-02 | Contact point matches no customer | Registration is offered per `[CLARIFY-1]`, or the customer is directed to contact us. Never a message revealing whether the address is known. |
| E-03 | One-time code requested repeatedly | Rate-limited per source and per contact point; refusals logged; the message does not reveal whether the address exists. |
| E-04 | Session held while staff merge the customer record | The session follows to the surviving record; the customer is not signed out. |
| E-05 | Session held while the customer record is erased | Session is terminated; further sign-in is refused. |
| E-06 | Customer views a ticket that is merged while open | The view follows to the surviving ticket, showing the reference they know as an alias. |
| E-07 | Customer replies to a `cancelled` ticket | A new ticket is created, linked `related_to`, and the customer is told. |
| E-08 | Customer replies to a `resolved` ticket within the reopen window | The ticket reopens per `FR-009`. |
| E-09 | Attachment fails virus scanning | Submission or reply refused, naming the file, without disclosing scan internals. |
| E-10 | Attachment exceeds the size limit | Refused before upload completes, with the limit stated. |
| E-11 | Organisation visibility granted then revoked | Previously visible tickets disappear from the list immediately; any open detail view returns not-found on next request. |
| E-12 | Customer belongs to an organisation whose other members are in a different branch | Organisation visibility is bounded by the granting staff member's scope; cross-branch visibility requires an explicit grant. |
| E-13 | Rating submitted after the window closed | Refused, stating the window has closed; the ticket remains recorded as not rated. |
| E-14 | Customer withdraws while an agent is composing a reply | Withdrawal succeeds; the agent is told and their draft is preserved. |
| E-15 | Announcement published in one language only | Not displayed to customers of the other locale; the author is warned at publish time (constitution I). |
| E-16 | Portal domain certificate expires | Treated as a spec `013` availability incident, alerting per `NFR-007` there. |
| E-17 | Customer switches locale mid-form | Form values are preserved; labels and validation messages switch language. |
| E-18 | Ticket thread contains an attachment with an Arabic filename | Filename renders correctly and downloads with its name intact. |

## 7. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| `NFR-001` | Portal page render on a mid-range phone over 4G | ≤ 3s at p95 |
| `NFR-002` | Ticket list and history | ≤ 2s at p95 |
| `NFR-003` | Knowledge search from the portal | ≤ 1s at p95 (spec `006` `NFR-001`) |
| `NFR-004` | One-time code delivery | ≤ 30s at p95 |
| `NFR-005` | Portal availability | Matches spec `013` `FR-003` |
| `NFR-006` | Accessibility | WCAG 2.1 AA, no level-A failures (spec `012` `FR-012`) |
| `NFR-007` | Mobile task completion parity with desktop | Within 5 percentage points |

## 8. Bilingual and localisation requirements

| Surface | Arabic | English | RTL notes |
|---|---|---|---|
| Every portal screen, control and menu | Required | Required | Full mirror including navigation side and chat launcher position |
| Customer-facing status labels | Required | Required | Sourced from spec `002` status labels, not re-authored here |
| Category names in the submission form | Required | Required | Tree mirrors |
| Form labels, help text, validation messages | Required | Required | Inputs for email, phone and reference stay LTR |
| Notification content, all channels | Required | Required | Follows the customer's locale, not the agent's |
| Feedback prompt and scale labels | Required | Required | Scale order mirrors; numeric labels do not reverse |
| Announcements | Required | Required | Single-language announcements are not shown to the other locale (`E-15`) |
| Ticket summary export | Required | Required | Document direction follows locale; per-message direction preserved |
| Dates and numbers | Locale-formatted; Hijri per spec `012` `FR-003` | Locale-formatted | — |
| Attachment filenames | Rendered as stored | Rendered as stored | Arabic filenames must not be mangled (`E-18`) |

## 9. Permissions

Only two actors reach this surface. The value of this matrix is what it refuses.

| Action | Anonymous | Signed-in customer |
|---|---|---|
| Read `public` knowledge content | ✓ | ✓ |
| Read `customer` knowledge content | — | ✓ |
| Submit a ticket | per `[CLARIFY-1]` | ✓ |
| View own ticket, status and thread | — | ✓ |
| View fellow organisation members' tickets | — | only with `own_org` granted |
| Reply to own ticket | — | ✓ |
| Attach files | — | ✓ |
| Reopen own ticket within the window | — | ✓ |
| Withdraw own ticket before resolution | — | ✓ |
| Rate own resolved ticket | — | ✓, once |
| Edit own contact points and preferences | — | ✓ |
| Export own ticket summary | — | ✓ |
| View announcements | ✓ | ✓ |
| See internal notes, AI output, automation log | — | **never** |
| See assigned agent identity | — | per spec `002` `[CLARIFY-6]` |
| See SLA target or breach state | — | per `[CLARIFY-2]` |
| See any other customer's data | — | **never** |

## 10. Audit requirements

| Event | Recorded fields |
|---|---|
| Sign-in attempted / succeeded / failed / refused-ambiguous | contact point, method, timestamp, IP, outcome |
| One-time code requested / verified / rate-limited | contact point, timestamp, IP, attempt count |
| Session created / expired / terminated | identity, timestamp, cause |
| Ticket submitted | customer, timestamp, category, attachments, source `portal` |
| Reply posted | customer, ticket, timestamp, attachment count |
| Ticket reopened / withdrawn | customer, ticket, timestamp, days since closure where applicable |
| Feedback submitted / window expired | customer, ticket, score, timestamp |
| Profile field changed | customer, field, before, after, timestamp |
| Notification preference changed | customer, event kind, channel, before, after |
| Organisation visibility granted / revoked | granting staff actor, customer, scope, timestamp |
| Cross-customer access attempted | identity, target, timestamp, IP — **security event** |
| Ticket summary exported | customer, ticket, timestamp |
| Announcement published / withdrawn | staff actor, timestamp, locales, scope, display period |

## 11. Contracts

Every operation applies `customer = session identity`, widened only by a
granted `own_org`. This is the single most important predicate in the spec.

| Operation | Purpose | Scope predicate |
|---|---|---|
| `request otp` / `verify otp` / `sso callback` | Authentication | rate-limited per source and per contact point; neutral responses |
| `get my profile` / `update my profile` | Self-service | `customer = session` |
| `list my tickets` | History | `customer = session` OR (`own_org` AND organisation = session organisation) |
| `get ticket` | Detail | same; out-of-scope returns not-found |
| `submit ticket` | Intake | writes `customer = session`, source `portal` |
| `post reply` | Conversation | ticket ∈ session scope AND status not terminal |
| `upload attachment` | Evidence | ticket ∈ session scope; scan gate |
| `reopen ticket` / `withdraw ticket` | Lifecycle | ticket ∈ session scope; window and status validated |
| `submit feedback` | Satisfaction | ticket ∈ session scope; one per ticket |
| `list / update notification preferences` | Contactability | `customer = session`; bounded by consent |
| `search knowledge` | Self-service | visibility ≤ `customer` (spec `006`) |
| `list announcements` | Notices | locale match; branch or department scope |
| `export ticket summary` | Record | ticket ∈ session scope; customer-visible content only |

## 12. Clarifications needed

- [ ] `[CLARIFY-1]` **Is authentication one-time code, password, or the client's SSO — and may a customer submit a ticket without an account at all?** Anonymous submission changes identity resolution, the permission matrix and the abuse surface. — *blocks* `FR-001`, `FR-002`, `E-02` — *ask* client operations + IT
- [ ] `[CLARIFY-2]` **What does the portal show a customer about timing: the SLA target, a computed estimate, or nothing?** Showing a target we then miss is worse than showing nothing, and this decision is visible to every customer. — *blocks* `FR-003`, `AS-05` — *ask* client management
- [ ] `[CLARIFY-3]` Is satisfaction CSAT, NPS or both, on what scale, and after what delay is it requested? Shared with spec `009` `[CLARIFY-2]`. — *blocks* `FR-008` — *ask* client management
- [ ] `[CLARIFY-4]` Who decides which colleagues a corporate contact may see, and may that visibility cross branches? — *blocks* `FR-006`, `E-12` — *ask* client operations
- [ ] `[CLARIFY-5]` Is a complaint a distinct ticket type with its own SLA and escalation, or a flag on an ordinary ticket? — *blocks* `FR-017` — *ask* client management
- [ ] `[CLARIFY-6]` Which domain hosts the portal, who controls its DNS and certificate, and is a service-status page in scope for launch? — *blocks* `FR-016`, `FR-018`, `E-16` — *ask* client IT

## 13. Success metrics

| Metric | Source | Target |
|---|---|---|
| Chase contacts referencing an open ticket | Contact classification | −40% in one quarter |
| Portal share of ticket intake | Ticket source | > 30% by month six |
| Feedback response rate on resolved tickets | Feedback records | > 25% |
| Arabic task completion | Usability test, Arabic-first users | > 90% |
| Mobile submission completion vs. desktop | Funnel analysis | within 5 points |
| Cross-customer data ever visible | Penetration test | 0 |
| Internal content ever visible on a portal surface | Sampled audit of every surface and export | 0 |

## 14. Review checklist

- [x] No implementation detail
- [x] Every requirement testable, using MUST / SHOULD / MAY
- [x] No unfailable adjectives
- [x] Every requirement traces to a story ID or constitution principle
- [x] Every acceptance scenario has a matching requirement, and vice versa
- [x] Edge cases cover empty, duplicate, concurrent, hostile and out-of-order input
- [x] Bilingual requirements stated for every surface, including exports and notifications
- [x] Permission matrix complete, and states what is **never** visible
- [x] Audit entries defined, including cross-customer access as a security event
- [x] Constitution IV satisfied — every contract carries `customer = session`
- [ ] **Zero `[NEEDS CLARIFICATION]` markers remaining — 6 open, `/plan` is blocked**
- [x] Constitution gates satisfied and named

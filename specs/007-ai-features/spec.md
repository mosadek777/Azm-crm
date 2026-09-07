# Spec 007 — AI Features

> **المفروض الحاجة دي تشتغل إزاي بالظبط؟**

| | |
|---|---|
| **Number** | `007` |
| **Story** | [`stories/007-ai-features/story.md`](../../stories/007-ai-features/story.md) |
| **Status** | Draft — clarifying |
| **Constitution gates** | **V (AI proposes, a human disposes, and it is labelled)**, I (bilingual), II (attributable), IV (scope) |
| **Blocking clarifications** | 7 |

---

## 1. Scope

**In scope.** Thread summarisation, grounded reply suggestion, automatic
categorisation and prioritisation with confidence routing, solution suggestion
with citations, the customer-facing chatbot and its human handoff, sentiment and
language detection, theme clustering, similar-ticket detection, quality-review
assistance, the AI audit log, redaction and departmental opt-out, article
drafting from tickets, breach-risk prediction, and AI labelling.

**Out of scope.**

- Autonomous resolution — constitution V forbids it
- Voice AI, speech recognition and IVR — not in the source feature list
- Training a bespoke model on customer data — this spec assumes a hosted model with retrieval over our own content
- The knowledge base itself — spec `006`
- Publishing AI drafts without review — an AI draft enters the spec `006` workflow
- Sentiment as an agent performance metric — `FR-010` routes attention, it does not score people
- The SLA engine — `FR-019` predicts risk; spec `005` remains the only source of actual durations (constitution III)

## 2. Domain language

| Term | Means exactly |
|---|---|
| **Grounding set** | The exact, enumerable content an AI feature is permitted to draw on. Named per feature in section 4. |
| **Grounded output** | Output for which every factual claim is traceable to a citation in the grounding set. |
| **Citation** | A reference to a specific article version or ticket that supports a claim, resolvable by the reader. |
| **Confidence** | A model-reported score, calibrated against observed accuracy, used only for routing decisions. |
| **Confidence threshold** | The score below which a decision is routed to a human instead of applied. |
| **Suggestion** | AI output offered to a staff member. Never applied without acceptance. |
| **Acceptance** | A human sending, applying or saving a suggestion. Recorded as `accepted`, `edited` or `rejected`. |
| **Containment** | A chatbot conversation ending without a ticket and without a human. |
| **Handoff** | Transfer of a chatbot conversation to a human, carrying the full transcript. |
| **Decline** | The chatbot stating it cannot answer, rather than answering from outside its grounding set. |
| **Redaction** | Removal or masking of personal data before content leaves the system boundary for a model. |
| **Opt-out** | A department-level setting disabling named AI features for its tickets entirely. |
| **AI label** | The visible marker identifying content as machine-generated. |
| **AI audit entry** | The record of one AI invocation: feature, inputs referenced, grounding set, output, confidence, human disposition. |

## 3. Key entities

### AI feature configuration

| Attribute | Type | Rules |
|---|---|---|
| `feature` | enum | One of the features in section 4 |
| `enabled` | boolean | Per department (`FR-017`) |
| `grounding_set` | enumerated definition | Required; MUST NOT be open-ended |
| `confidence_threshold` | proportion | Required where the feature routes on confidence |
| `redaction_profile_id` | ref | Required where content leaves the boundary |
| `languages` | set of `ar` \| `en` | Which languages the feature is approved for (`[CLARIFY-7]`) |
| `monthly_ceiling` | integer | Optional cost bound (`[CLARIFY-2]`) |

### AI invocation (append-only)

| Attribute | Type | Rules |
|---|---|---|
| `feature`, `ticket_id`, `actor_id` | — | Actor is the human who triggered it, or `system` |
| `input_refs` | set of ref | What was read — never the raw content duplicated |
| `redaction_applied` | ref profile | Required where applicable |
| `output` | text | Retained for audit |
| `citations` | set of ref | Required for grounded features |
| `confidence` | proportion | Where reported |
| `disposition` | `accepted` \| `edited` \| `rejected` \| `expired` \| `not_offered` | Required for suggestion features |
| `cost_units` | number | For ceiling enforcement |
| `latency_ms` | integer | For `NFR` measurement |

### Chatbot session, Redaction profile, Theme cluster
Standard shapes. A chatbot session records every turn, every decline, the
containment outcome and the handoff instant.

## 4. AI features, their grounding sets and their human gates

Constitution V requires all four answers per feature. This table is the
governing statement; the requirements in section 6 elaborate it.

| Feature | Grounding set | Low confidence | Human gate | Labelled to |
|---|---|---|---|---|
| Thread summary (`FR-001`) | This ticket's messages only | Summary withheld, thread shown | Agent reads; nothing sent | Agent |
| Escalation summary (`FR-002`) | This ticket's messages only | Withheld | Receiving agent reads | Agent |
| Reply suggestion (`FR-003`) | Published KB variants visible to the customer + resolved tickets in the same category | Not offered | **Agent must send** | Agent, and customer per `FR-020` |
| Categorisation (`FR-005`) | This ticket's subject and first message + the category tree | Left uncategorised for a human | None — reversible, audited | Agent (as AI-derived) |
| Solution suggestion (`FR-006`) | Published KB variants + resolved tickets | Not offered | Agent verifies via citations | Agent |
| Chatbot (`FR-007`) | `public` and `customer` KB variants only. Ticket history only per `[CLARIFY-4]` | **Declines and offers handoff** | Handoff on request or on decline | **Customer** |
| Sentiment (`FR-010`) | This ticket's customer messages | No flag raised | None — routes attention only | Agent |
| Language detection (`FR-011`) | Inbound message text | Routes by the channel account default | None | Not required |
| Translation (`FR-012`) | The message being translated | Not offered | Agent reviews before sending | Agent and customer |
| Theme clustering (`FR-013`) | Ticket subjects and categories in range | Cluster not reported | Manager interprets | Manager |
| Similar tickets (`FR-014`) | Open and recent tickets in scope | Not offered | Agent decides on merge | Agent |
| Quality scoring (`FR-015`) | Sampled conversations | Not scored | **Manager reviews; never automatic** | Manager, and the agent scored |
| Article draft (`FR-018`) | The source ticket | Not offered | Enters spec `006` review as `draft` | Reviewer |
| Breach risk (`FR-019`) | Ticket attributes + spec `005` clock state | Not shown | Manager interprets | Manager |

## 5. Acceptance scenarios

### AS-01 — Summary is grounded and labelled
**Given** a ticket with 40 messages
**When** an agent requests a summary
**Then** a summary is produced from that ticket's messages only
**And** it is visibly labelled as AI-generated
**And** it is not sent to the customer and cannot be sent without the agent composing a reply
**And** the invocation is recorded with the feature, the ticket and the actor

### AS-02 — Suggested reply is editable and cited
**Given** an agent on a ticket with two relevant published articles
**When** they request a reply suggestion
**Then** a draft appears in the composer, editable, unsent
**And** each factual claim carries a resolvable citation
**And** sending requires the agent's explicit action
**And** the invocation records whether they sent it unchanged, edited it, or discarded it

### AS-03 — Suggestion refuses rather than invents
**Given** a ticket whose subject is covered by no article and no resolved ticket
**When** an agent requests a suggestion
**Then** no suggestion is offered, with the reason stated
**And** the system does not produce an ungrounded answer
**And** the non-offer is recorded as `not_offered`

### AS-04 — Categorisation routes on confidence
**Given** a confidence threshold of 0.80
**When** an inbound ticket is categorised at 0.91
**Then** the category is applied with `priority_source = ai`, visible as AI-derived and reversible by any agent
**And** given a score of 0.62, the ticket is left in the channel account's default category and appears in a triage list
**And** both outcomes are recorded with their scores

### AS-05 — Chatbot stays inside its grounding set
**Given** a customer asks the chatbot about a topic with no published article
**When** the bot responds
**Then** it declines, stating it cannot answer
**And** it offers a human handoff or a ticket
**And** it does not answer from general knowledge
**And** the decline is recorded with the query, so it feeds spec `006` `FR-011`

### AS-06 — Handoff carries everything
**Given** a chatbot conversation of eight turns
**When** the customer asks for a person, or the bot declines twice
**Then** a ticket exists carrying the full transcript
**And** an agent receives it with the transcript and an AI summary
**And** the customer is told they are now with a person
**And** the bot does not re-engage on that conversation

### AS-07 — Customers can tell it is a machine
**Given** a customer interacting with the chatbot
**When** the conversation begins and at every bot turn
**Then** the bot is identified as automated per `[CLARIFY-6]`
**And** where an AI-drafted reply is sent by an agent after editing, labelling follows `[CLARIFY-6]` — this spec does not assume it is labelled to the customer once a human has taken responsibility

### AS-08 — Redaction happens before the boundary
**Given** a ticket containing a national ID, a phone number and a card fragment
**When** any AI feature is invoked
**Then** those values are masked before leaving the system boundary
**And** the invocation records which redaction profile applied
**And** the output, when it references the customer, uses the name available inside the boundary, not the masked token

### AS-09 — Opt-out is total
**Given** a department with AI opted out
**When** a ticket in that department is created, viewed or replied to
**Then** no AI feature is offered or invoked on it
**And** no content from it leaves the boundary for a model
**And** the ticket is excluded from theme clustering and quality sampling

### AS-10 — Sentiment routes, it does not judge
**Given** a customer message detected as strongly negative
**When** the detection completes
**Then** the ticket is flagged and, where configured, escalated per spec `005`
**And** the flag is visible to the agent and the lead
**And** the score does not appear in any agent performance report in spec `009`

### AS-11 — Similar-ticket detection proposes, never merges
**Given** a new ticket resembling two open tickets
**When** it is created
**Then** both are offered to the agent as possible duplicates with a similarity indication
**And** no merge occurs without the agent's action under spec `002` `FR-017`

### AS-12 — The audit answers whether it helped
**Given** 30 days of AI activity
**When** an auditor opens the AI log
**Then** they see, per feature: invocations, acceptance, edit and rejection rates, decline rate, mean confidence, mean latency and cost units
**And** they can open any single invocation and see its inputs referenced, its grounding set, its output and its human disposition

### AS-13 — Cost ceiling degrades gracefully
**Given** a monthly ceiling configured for reply suggestion
**When** the ceiling is reached
**Then** the feature stops being offered, with the reason visible to administrators
**And** every other feature continues
**And** no ticket becomes unworkable

### AS-14 — Unavailability is never a blocker
**Given** the model provider is unreachable
**When** an agent opens a ticket and requests a summary
**Then** the ticket is fully workable
**And** the summary area states the feature is unavailable
**And** categorisation falls back to the channel default and the ticket appears in triage

## 6. Functional requirements

| ID | Requirement | Level | Traces |
|---|---|---|---|
| `FR-001` | Agents MUST be able to obtain a summary of a ticket thread, grounded in that ticket's messages only, labelled as AI-generated. | MUST | `AI-01` |
| `FR-002` | On escalation or transfer, the system SHOULD generate a summary for the receiving party, under the same grounding and labelling. | SHOULD | `AI-02` |
| `FR-003` | Agents MUST be able to obtain a reply suggestion grounded in published knowledge variants visible to that customer and in resolved tickets in the same category, delivered into the composer as editable unsent text with resolvable citations. Sending MUST require an explicit human action. | MUST | `AI-03`, constitution V |
| `FR-004` | Suggestions SHOULD be produced in the customer's preferred language and in an administrator-configured tone, subject to `[CLARIFY-7]`. | SHOULD | `AI-04` |
| `FR-005` | Inbound tickets MUST be categorised and prioritised with a reported confidence; at or above the threshold the value is applied with source `ai` and remains reversible; below it the ticket MUST be left at the channel default and surfaced for human triage. | MUST | `AI-05` |
| `FR-006` | Solution suggestions MUST carry citations resolvable to a specific article version or ticket. A suggestion without a citation MUST NOT be shown. | MUST | `AI-06`, constitution V |
| `FR-007` | The chatbot MUST answer customers on the portal, website and WhatsApp from `public` and `customer` knowledge variants only. Access to the customer's own ticket history is governed by `[CLARIFY-4]`. | MUST | `AI-07` |
| `FR-008` | The chatbot MUST offer a human handoff at any turn on request, and MUST offer one automatically after the configured number of declines. Handoff MUST create or attach to a ticket carrying the full transcript. | MUST | `AI-08`, constitution V |
| `FR-009` | The chatbot MUST decline rather than answer outside its grounding set. Declines MUST be recorded with the query and MUST feed the failed-search analytics in spec `006` `FR-011`. | MUST | `AI-09`, constitution V |
| `FR-010` | The system SHOULD detect negative sentiment on customer messages and flag or escalate per spec `005`. Sentiment MUST NOT appear in any agent performance measure. | SHOULD | `AI-10` |
| `FR-011` | The system SHOULD detect the language of inbound messages and inform routing; on low confidence it MUST fall back to the channel account default. | SHOULD | `AI-11` |
| `FR-012` | Agents MAY translate inbound and outbound messages; a translated outbound message MUST be reviewed by the agent before sending and MUST be labelled. | MAY | `AI-12` |
| `FR-013` | The system SHOULD cluster tickets into themes over a selectable period and report cluster size, trend and representative examples. | SHOULD | `AI-13` |
| `FR-014` | On creation the system SHOULD surface similar open or recent tickets in scope with a similarity indication. It MUST NOT merge automatically. | SHOULD | `AI-14` |
| `FR-015` | The system MAY score a sample of conversations against administrator-defined criteria. Scores MUST be presented to a manager for review and MUST NOT be published or used in a performance record without human confirmation. | MAY | `AI-15` |
| `FR-016` | Every AI invocation MUST write an append-only audit entry recording feature, actor, inputs referenced, grounding set, redaction profile, output, citations, confidence, latency, cost units and human disposition. | SHOULD | `AI-16`, constitution II |
| `FR-017` | Personal data MUST be redacted before content leaves the system boundary for a model, per a configurable profile. Departments MUST be able to opt out of named AI features entirely; opted-out tickets MUST NOT have content sent to any model, and MUST be excluded from clustering and sampling. | SHOULD | `AI-17` |
| `FR-018` | Agents MAY request an AI-drafted knowledge article from a resolved ticket. The draft MUST enter the spec `006` workflow in state `draft` and MUST NOT publish automatically. | MAY | `AI-18` |
| `FR-019` | The system MAY report predicted breach risk on open tickets, presented as a prediction distinct from the actual clock state supplied by spec `005`. | MAY | `AI-19`, constitution III |
| `FR-020` | Every AI-generated output MUST be labelled to staff. Labelling to customers MUST follow `[CLARIFY-6]`; the chatbot MUST always be identified as automated. | SHOULD | `AI-20`, constitution V |
| `FR-021` | No AI feature MAY change a ticket status, close a ticket, commit to a remedy, or send a customer-visible message without a human action. | MUST | constitution V |
| `FR-022` | Every AI feature MUST degrade to full manual operation when the provider is unavailable or a cost ceiling is reached. No ticket may become unworkable. | MUST | constitution VII |
| `FR-023` | Retrieval MUST respect the caller's scope and the article visibility rules; an AI feature MUST NOT surface content the human it serves could not read directly. | MUST | constitution IV |

## 7. Edge cases and failure behaviour

| # | Situation | Required behaviour |
|---|---|---|
| E-01 | Model returns a claim with no citation | The output is withheld, not shown with a warning. Recorded as a grounding failure. |
| E-02 | Model returns a citation that does not resolve | Same as E-01; the invalid citation is logged for review. |
| E-03 | Grounding set is empty for this ticket | Feature not offered, reason stated. Never an ungrounded answer. |
| E-04 | Two agents request a suggestion simultaneously | Both served; each invocation recorded separately. |
| E-05 | Suggestion cites an article archived between generation and sending | Sending is permitted; the sent message retains the cited version (spec `006` `E-05`); the agent is warned. |
| E-06 | Confidence is reported but demonstrably miscalibrated | Thresholds are configuration; a calibration review is a standing operational task, and the audit log supplies the evidence. |
| E-07 | Chatbot is asked something harmful, abusive or off-topic | Declines and offers handoff. Abuse is recorded and rate-limited per spec `003` `FR-019`. |
| E-08 | Customer attempts to extract other customers' data from the chatbot | Retrieval is scoped to that customer only (`FR-023`); the attempt is logged as a security event. |
| E-09 | Chatbot handoff occurs outside business hours | A ticket is created with the transcript; the customer is told when a person will respond, consistent with spec `005` `FR-017`. |
| E-10 | Customer messages in a language the feature is not approved for | The feature is not offered; the message is routed to a human. Never answered in an unapproved language. |
| E-11 | Redaction removes the very value needed to answer | The feature is not offered rather than answering from a redacted input. Recorded so the profile can be reviewed. |
| E-12 | Department opts out mid-conversation | Features stop immediately for that ticket; prior invocations remain in the audit. |
| E-13 | Cost ceiling reached mid-conversation with a customer | The chatbot completes the current turn, then hands off. It does not stop mid-sentence. |
| E-14 | Model latency exceeds the `NFR` budget | Request is abandoned and the feature reports unavailable. The agent never waits beyond the budget. |
| E-15 | Provider changes model behaviour without notice | Acceptance and decline rates are monitored; a threshold change triggers an administrator alert. |
| E-16 | AI-drafted article is published without review by a permission misconfiguration | Prevented by `FR-018` requiring `draft` state; if observed, treated as a security defect. |
| E-17 | Sentiment flags a ticket that is merely written bluntly | The flag is advisory; no automatic action beyond configured escalation, which a lead can reverse. |
| E-18 | Theme clustering produces a cluster containing one ticket | Not reported. |
| E-19 | Breach-risk prediction disagrees with the actual clock | The actual clock always governs display and reporting (constitution III); the prediction is labelled a prediction. |

## 8. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| `NFR-001` | Summary generation | ≤ 5s at p95, abandoned at 10s |
| `NFR-002` | Reply suggestion | ≤ 5s at p95, abandoned at 10s |
| `NFR-003` | Categorisation on inbound | ≤ 30s from arrival; must not delay ticket creation |
| `NFR-004` | Chatbot turn response | ≤ 3s at p95 |
| `NFR-005` | Categorisation accuracy above threshold | ≥ 85%, measured against agent corrections |
| `NFR-006` | Ungrounded claims reaching a customer | 0 |
| `NFR-007` | AI audit completeness | 100% of invocations recorded |
| `NFR-008` | Availability impact | 0 — every feature degrades to manual (`FR-022`) |

## 9. Bilingual and localisation requirements

| Surface | Arabic | English | RTL notes |
|---|---|---|---|
| Chatbot interface, prompts, decline and handoff text | Required | Required | Widget mirrors |
| Chatbot answers | Only where approved per `[CLARIFY-7]` | Required | Direction per turn |
| Summaries | Required in the agent's interface language | Required | Regardless of the thread's language mix |
| Reply suggestions | Only where approved per `[CLARIFY-7]` | Required | Rendered in the composer in the customer's direction |
| AI labels | Required | Required | Must be legible in both directions |
| Confidence and triage interface | Required | Required | — |
| Theme cluster names | Required | Required | Clusters must not merge languages without stating it |
| Audit log interface | Required | Required | — |

An Arabic-language AI feature is only enabled where its quality has been
measured in Arabic. Enabling by default because English works is forbidden by
`FR-004` and `[CLARIFY-7]`.

## 10. Permissions

| Action | CUST | AGT | LEAD | MGR | KBA | ADM | AUD |
|---|---|---|---|---|---|---|---|
| Use the chatbot | ✓ | — | — | — | — | — | — |
| Request a thread summary | — | ✓ | ✓ | ✓ | — | ✓ | — |
| Request a reply suggestion | — | ✓ | ✓ | ✓ | — | — | — |
| Send an AI-drafted reply | — | ✓ | ✓ | ✓ | — | — | — |
| See AI-derived category and change it | — | ✓ | ✓ | ✓ | — | ✓ | — |
| Work the low-confidence triage list | — | ✓ | ✓ | ✓ | — | ✓ | — |
| Use translation | — | ✓ | ✓ | ✓ | — | — | — |
| See sentiment flags | — | ✓ | ✓ | ✓ | — | ✓ | — |
| View theme clusters | — | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Run / view quality scoring | — | — | — | ✓ | — | ✓ | ✓ |
| Request an AI article draft | — | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| View breach-risk predictions | — | — | ✓ | ✓ | — | ✓ | — |
| Configure features, thresholds, grounding sets | — | — | — | — | — | ✓ | — |
| Configure redaction profiles | — | — | — | — | — | ✓ | — |
| Set departmental opt-out | — | — | — | ✓ | — | ✓ | — |
| Set cost ceilings | — | — | — | — | — | ✓ | — |
| Read the AI audit log | — | own only | own team | ✓ | — | ✓ | ✓ |

## 11. Audit requirements

Every entry is append-only per constitution II and retained per `[CLARIFY-2]`.

| Event | Recorded fields |
|---|---|
| Invocation | feature, actor, ticket, timestamp, inputs referenced, grounding set identity, redaction profile, language, confidence, latency, cost units |
| Output produced | output text, citations, whether withheld and why |
| Disposition | `accepted` / `edited` / `rejected` / `expired` / `not_offered`, actor, timestamp, and the diff where edited |
| Grounding failure | feature, ticket, reason (`no_citation` / `unresolvable_citation` / `empty_grounding_set`) |
| Chatbot turn | session, turn index, customer query, answer or decline, citations, confidence |
| Chatbot decline | session, query, decline count in session |
| Handoff | session, cause (`requested` / `declines_exceeded` / `ceiling` / `unavailable`), ticket created, transcript length |
| Categorisation applied / withheld | ticket, category proposed, confidence, threshold, outcome |
| Category corrected by a human | ticket, from, to, actor — the accuracy signal for `NFR-005` |
| Sentiment flag raised / cleared | ticket, score, action taken, actor who cleared |
| Redaction applied | profile, field kinds masked, count |
| Feature enabled / disabled / opted out | actor, timestamp, department, feature, before, after |
| Threshold or grounding set changed | actor, timestamp, before, after |
| Cost ceiling reached | feature, month, ceiling, invocations at cut-off |
| Provider unavailable | feature, duration, invocations refused |
| Quality score generated / confirmed / discarded | manager, agent, conversation, score, disposition |

## 12. Contracts

| Operation | Purpose | Scope predicate |
|---|---|---|
| `summarise ticket` | Thread summary | ticket ∈ caller scope AND department not opted out |
| `suggest reply` | Composer draft | same; retrieval limited to variants visible to that customer |
| `suggest solution` | Cited solutions | same; citations must resolve for the caller |
| `categorise ticket` (internal) | Inbound triage | channel account department not opted out |
| `chatbot turn` | Customer conversation | customer identity only; retrieval limited to `public` + `customer` variants and, per `[CLARIFY-4]`, that customer's own tickets |
| `chatbot handoff` | Escalate to a person | creates or attaches a ticket in the account's department |
| `detect sentiment` / `detect language` (internal) | Routing signals | department not opted out |
| `translate message` | Agent assist | ticket ∈ caller scope |
| `find similar tickets` | Duplicate assist | results restricted to caller scope |
| `get theme clusters` | Management insight | branch ∈ scope AND department ∈ scope |
| `score conversations` | Quality assist | manager; team ∈ scope |
| `draft article from ticket` | Knowledge capture | creates spec `006` draft only |
| `get breach risk` | Prediction | ticket ∈ caller scope; labelled as prediction |
| `manage AI configuration` | Features, thresholds, grounding, redaction, ceilings | admin only |
| `get AI audit` | Governance | manager, admin or auditor; agents see only their own |

## 13. Clarifications needed

- [ ] `[CLARIFY-1]` **Which model, hosted where?** `FR-017` and spec `010` `FR-020` collide if customer data must remain in-jurisdiction while the model is a foreign API. Until this is answered, no feature in this spec can be planned. — *blocks* this entire spec — *ask* client legal + IT
- [ ] `[CLARIFY-2]` What is the acceptable cost per AI action, the monthly ceiling per feature, and the audit retention period? — *blocks* `FR-003`, `FR-007`, `FR-016`, `AS-13` — *ask* client finance
- [ ] `[CLARIFY-3]` What confidence threshold routes a ticket to a human? A single number per feature is required before `FR-005` is testable. — *blocks* `FR-005`, `AS-04` — *ask* client operations
- [ ] `[CLARIFY-4]` **May the chatbot read the customer's own ticket history, or only published articles?** History makes it far more useful and materially widens the disclosure surface if identity is ever wrong. — *blocks* `FR-007`, `E-08` — *ask* client legal + operations
- [ ] `[CLARIFY-5]` Which departments may opt out of AI entirely, and who decides? — *blocks* `FR-017` — *ask* client management
- [ ] `[CLARIFY-6]` **How must AI content be labelled to customers?** A badge on the message, a sentence in the signature, or only for the chatbot? This spec labels the chatbot always and defers the rest. — *blocks* `FR-020`, `AS-07` — *ask* client legal + marketing
- [ ] `[CLARIFY-7]` **Does Arabic output quality meet the bar for customer-facing text, or is Arabic agent-assist only at launch?** Enabling Arabic because English works is forbidden; this needs measurement before launch. — *blocks* `FR-004`, `FR-007`, `E-10` — *ask* client + delivery lead

## 14. Success metrics

| Metric | Source | Target |
|---|---|---|
| Suggestion acceptance (accepted or lightly edited) | AI audit | > 50% |
| Categorisation accuracy above threshold | Agent corrections | > 85% |
| Chatbot containment on after-hours contacts | Session outcomes | > 30% |
| Handoffs carrying full context | Sampled review | 100% |
| Ungrounded claims reaching a customer | Agent and customer reports | 0 — each triggers a grounding review |
| Handling time on threads over 20 messages | Before and after | −30% |
| Invocations missing an audit entry | Reconciliation | 0 |
| Tickets rendered unworkable by AI unavailability | Incident review | 0 |

## 15. Review checklist

- [x] No implementation detail
- [x] Every requirement testable, using MUST / SHOULD / MAY
- [x] No unfailable adjectives
- [x] Every requirement traces to a story ID or constitution principle
- [x] Every acceptance scenario has a matching requirement, and vice versa
- [x] Edge cases cover empty, duplicate, concurrent, hostile and out-of-order input
- [x] Bilingual requirements stated, including the rule that Arabic is not enabled by default (section 9)
- [x] Permission matrix complete for every action
- [x] Audit entries defined for every invocation and every disposition
- [x] **Constitution V satisfied — section 4 states the grounding set, the low-confidence behaviour, the human gate and the labelling for all fourteen features; `FR-021` forbids autonomous action**
- [ ] **Zero `[NEEDS CLARIFICATION]` markers remaining — 7 open, `/plan` is blocked. `[CLARIFY-1]` blocks the whole spec, not one requirement.**
- [x] Constitution gates satisfied and named

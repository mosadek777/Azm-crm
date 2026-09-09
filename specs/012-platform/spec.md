# Spec 012 — Platform

> **المفروض الحاجة دي تشتغل إزاي بالظبط؟**

| | |
|---|---|
| **Number** | `012` |
| **Story** | [`stories/012-platform/story.md`](../../stories/012-platform/story.md) |
| **Status** | Draft — clarifying |
| **Constitution gates** | **I (bilingual is architecture)**, IV (branch and department are the scope dimensions) |
| **Blocking clarifications** | 6 open · 1 answered provisionally (developer, 2026-09-07, unratified) |

---

## 1. Scope

**In scope.** The bilingual content model and language switching; right-to-left
layout and Arabic typography; locale formatting including Hijri display;
translation of configurable content; responsive and mobile behaviour; push
notification delivery; the department and branch models; cross-boundary ticket
transfer; branding; entity isolation; accessibility; dark presentation; and
in-app guidance.

**Out of scope.**

- Permission enforcement — spec `010`; this spec defines the department and branch entities that scoping applies to
- A native iOS or Android application — `FR-006` is satisfiable by an installable web application; a native build is a separate decision
- Machine translation of user content — `FR-004` is human-authored parallel content; message translation is spec `007` `FR-012`
- Reselling the platform to third parties — `FR-011` supports the client's own entities
- Hosting, infrastructure and network topology — a plan-phase decision
- Performance and availability targets — spec `013`

## 2. Domain language

| Term | Means exactly |
|---|---|
| **Peer languages** | Arabic and English hold equal status. Neither is the source of the other; neither substitutes for the other. |
| **Localised value** | A stored value holding one entry per language. The unit of every user-visible configurable string. |
| **Interface language** | The language a staff user reads the application in. Independent of any customer's language. |
| **Content language** | The language of a customer-authored or agent-authored message. Detected per message. |
| **Direction** | `rtl` or `ltr`. A property of a rendering context, derived from interface or content language. |
| **Direction-neutral value** | A value that must always render left-to-right regardless of context: ticket references, phone numbers, email addresses, identifiers, numerals, times and durations. |
| **Department** | A functional unit owning queues, categories, SLA policies and reporting. |
| **Branch** | A geographic or organisational unit owning a business calendar, holidays, data scope and reporting. |
| **Entity** | A fully isolated tenant. Distinct from a branch. In scope only per `[CLARIFY-6]`. |
| **Cross-boundary transfer** | Moving a ticket between departments or branches, with context and SLA consequences. |
| **Brand** | The client-controlled presentation: logo, colours, favicon, email furniture, portal domain and custom pages. |

## 3. Key entities

### Localised value
The atomic bilingual container. Every user-visible configurable string in every
other spec is one of these.

| Attribute | Type | Rules |
|---|---|---|
| `ar`, `en` | text | **Both required at save time** for any string a customer or agent will read. A single-language save is refused, not warned (`FR-004`) |
| `updated_by`, `updated_at` | ref, timestamp | Per language, so a stale translation is detectable |

Configurable strings governed by this rule, by owning spec: segment and custom
field labels (`001`); status, category, priority, ticket type, resolution code
and root cause labels (`002`); acknowledgement text, form labels and WhatsApp
templates (`003`); quick reply titles and bodies (`004`); SLA policy, rule,
escalation and breach reason names (`005`); KB category names, formats and
templates (`006`); AI labels and decline text (`007`); announcements (`008`);
metric names **and definitions** (`009`); role names and notification templates
(`010`); delivery status labels (`011`).

### Department

| Attribute | Type | Rules |
|---|---|---|
| `name` | localised value | Both languages required |
| `parent_department_id` | ref | Optional; one level of nesting only, per `[CLARIFY-3]` |
| `default_team_id` | ref | Required |
| `active` | boolean | Deactivation, never deletion (spec `010` `E-05`) |

### Branch

| Attribute | Type | Rules |
|---|---|---|
| `name` | localised value | Both languages required |
| `timezone` | text | Required; drives period boundaries in spec `009` `E-19` |
| `business_calendar_id` | ref | Required; shared with specs `003` and `005` |
| `holiday_set_id` | ref | Required |
| `default_locale` | `ar` \| `en` | Drives defaults for records created here |
| `active` | boolean | Deactivation, never deletion |

### Brand configuration, Push registration, Guidance item
Standard shapes. A brand configuration may be global or per entity per
`[CLARIFY-6]`.

## 4. Acceptance scenarios

### AS-01 — Language switch is complete and immediate
**Given** a staff user reading the application in English on the ticket list, with filters applied
**When** they switch to Arabic
**Then** every string in the interface renders in Arabic, including navigation, buttons, table headers, empty states, validation messages and tooltips
**And** the layout mirrors entirely
**And** their filters, scroll position and open ticket are preserved
**And** no string remains in English

### AS-02 — Configurable content is refused in one language
**Given** an administrator creating a status, a category, a quick reply and a metric definition
**When** they supply only the English value for any of them
**Then** the save is refused, naming the missing Arabic value
**And** this applies identically to a missing English value on an Arabic-first save

### AS-03 — No language fallback, anywhere
**Given** a configurable label somehow holding only an English value through legacy data
**When** an Arabic-reading user encounters it
**Then** it renders as an explicit missing-translation marker visible to administrators
**And** it does **not** silently render the English text
**And** it appears in the untranslated-strings report

### AS-04 — Direction-neutral values never reverse
**Given** an Arabic interface displaying ticket reference `TKT-2026-04471`, phone `+201001234567`, an email address, a duration of `2h 15m` and a date
**When** each is rendered inside Arabic text, in a table, and in an exported PDF
**Then** each reads left-to-right and in the correct character order in all three
**And** none is visually reversed or has its punctuation displaced

### AS-05 — Mixed-direction threads render correctly
**Given** a ticket thread with an Arabic customer message, an English agent reply, and a message mixing both
**When** an agent views it in either interface language
**Then** each message renders in its own direction
**And** the mixed message renders each run in its correct direction
**And** the same holds in the customer portal and in an emailed transcript

### AS-06 — Arabic typography is legible
**Given** any Arabic screen
**When** it renders
**Then** Arabic text uses a typeface with correct joining, diacritic positioning and numeral form
**And** line height accommodates ascenders and descenders without clipping
**And** Arabic text is not rendered in a Latin-only fallback face

### AS-07 — Locale formatting follows the reader
**Given** an Arabic-reading user and an English-reading user viewing the same ticket
**When** each views its dates, numbers and currency
**Then** each sees their own locale's formatting
**And** Hijri display appears per `[CLARIFY-4]`
**And** the underlying value is identical for both

### AS-08 — Mobile parity for agents
**Given** an agent on a phone browser
**When** they work their queue, read a ticket, reply with a quick reply, attach a photo from the camera, change status and escalate
**Then** all six complete successfully
**And** the SLA countdown remains visible
**And** the same holds in Arabic with a mirrored layout

### AS-09 — Departments are genuinely separate
**Given** two departments with different categories, SLA policies and status sets
**When** an agent in one creates a ticket
**Then** only their department's categories are offered
**And** only their department's SLA policies can select
**And** reporting can be produced for each department alone

### AS-10 — Branches carry their own time
**Given** branch B in one timezone with Friday and Saturday as its weekend, and branch C in another with Saturday and Sunday
**When** a ticket is created in each at the same instant
**Then** each SLA clock starts against its own branch calendar per spec `005` `FR-017`
**And** a report grouped by day assigns each to its own branch's day per spec `009` `E-19`

### AS-11 — Cross-boundary transfer is deliberate
**Given** a ticket in branch B, department Support, with a running resolution clock
**When** a lead transfers it to branch C, department Technical
**Then** the transfer requires a reason
**And** the full thread, attachments and history travel with it
**And** the SLA consequence follows `[CLARIFY-5]` — recalculated against the new branch calendar, or preserved — and the choice is recorded
**And** the previous owning team loses access unless separately scoped

### AS-12 — Branding reaches the customer, not the staff
**Given** a configured logo, colour set, favicon, email furniture and portal domain
**When** a customer opens the portal, receives an email and receives a WhatsApp template
**Then** all three carry the client's brand
**And** an agent's interface reflects the brand without compromising contrast requirements from `FR-012`

### AS-13 — Accessibility is measured, not asserted
**Given** the agent workspace and the customer portal
**When** each is assessed against WCAG 2.1 AA
**Then** there are no level-A failures
**And** every action is reachable by keyboard
**And** every control has an accessible name in the active interface language
**And** contrast holds in both light and dark presentation

### AS-14 — An action's outcome is confirmed in the interface
**Given** an Arabic interface and an action the server refuses
**When** the refusal is returned
**Then** the message shown is the Arabic text the server sent, not a client-side translation
**And** it remains visible until dismissed
**And** it is announced to assistive technology without moving keyboard focus

## 5. Functional requirements

| ID | Requirement | Level | Traces |
|---|---|---|---|
| `FR-001` | The entire interface MUST be available in Arabic and English and switchable at any time without losing the user's context, filters or position. No string may remain untranslated. | MUST | `PLT-01`, constitution I |
| `FR-002` | Arabic rendering MUST mirror layout, navigation, controls, tables, form fields and iconography where direction is meaningful, and MUST use a typeface with correct Arabic joining, diacritic positioning and numerals. Direction-neutral values MUST always render left-to-right in the correct order, in every context including exports. | MUST | `PLT-02`, constitution I |
| `FR-003` | Dates, numbers, currency and durations MUST be formatted for the reader's locale. Hijri display MUST be provided per `[CLARIFY-4]`. | SHOULD | `PLT-03` |
| `FR-004` | Every user-visible configurable string MUST be stored as a localised value with both languages, and a save supplying only one MUST be **refused**. The system MUST NOT substitute one language for another under any condition, and MUST report untranslated strings to administrators. | MUST | `PLT-04`, constitution I |
| `FR-005` | Every agent task MUST be completable on a phone or tablet browser, in both languages, including attachment capture from the device. | MUST | `PLT-05` |
| `FR-006` | The system SHOULD deliver push notifications through an installable web application or a native application, per `[CLARIFY-7]`, honouring the preferences in spec `004` `FR-013` and the out-of-hours decision in its `[CLARIFY-4]`. | SHOULD | `PLT-06` |
| `FR-007` | The system MUST support multiple departments, each owning its own queues, category subtree, SLA policies, status set, teams and reporting boundary. | MUST | `PLT-07` |
| `FR-008` | The system MUST support multiple branches, each owning a timezone, business calendar, holiday set, default locale, data scope and reporting boundary. | MUST | `PLT-08` |
| `FR-009` | A ticket MUST be transferable across a department or branch boundary with a required reason, carrying its full thread, attachments and history. The SLA consequence MUST follow `[CLARIFY-5]` and MUST be recorded. | SHOULD | `PLT-09` |
| `FR-010` | Administrators MUST be able to configure logo, colour set, favicon, email header and footer, portal domain and custom static pages. Branding MUST NOT be able to violate the contrast requirements of `FR-012`. | SHOULD | `PLT-10` |
| `FR-011` | The system MAY support fully isolated entities on one deployment, with no data path between them, per `[CLARIFY-6]`. Where supported, isolation MUST be enforced at the same layer as spec `010` `FR-004`. | MAY | `PLT-11`, constitution IV |
| `FR-012` | The agent workspace and the customer portal MUST meet WCAG 2.1 AA with no level-A failures: full keyboard operability, accessible names in the active language, visible focus, and sufficient contrast in every presentation mode. | SHOULD | `PLT-12` |
| `FR-013` | The system MAY provide a dark presentation, meeting the same contrast requirements. | MAY | `PLT-13` |
| `FR-014` | The system MAY provide in-app guidance and role-based training content, authored in both languages. | MAY | `PLT-14`, constitution I |
| `FR-015` | Departments and branches MUST be deactivatable but MUST NOT be deletable while any record references them; historical records MUST retain their reference per spec `009` `FR-023`. | MUST | spec `010` `E-05` |
| `FR-016` | The agent workspace and the customer portal MUST both confirm the outcome of a user-initiated action in the interface. A failure MUST render the refusal message the server returned rather than a client-authored string. Confirmations MUST dismiss themselves; failures MUST persist until dismissed. Every such message MUST be dismissible by keyboard and announced to assistive technology, and MUST NOT convey its kind by colour alone. | SHOULD | `PLT-15` |

## 6. Edge cases and failure behaviour

| # | Situation | Required behaviour |
|---|---|---|
| E-01 | A localised value exists with only one language, from import or legacy data | Rendered as an explicit missing-translation marker to administrators; never silently substituted (`AS-03`); listed in the untranslated report. |
| E-02 | A new configurable string is added by a release without Arabic | Release-blocking defect. Caught by the untranslated-strings scan in the success metrics. |
| E-03 | Customer name is in Latin script while the interface is Arabic | Rendered in its own script and direction; not transliterated. |
| E-04 | Attachment filename is Arabic | Renders correctly and downloads with its name intact (spec `008` `E-18`). |
| E-05 | Ticket reference appears at the start of an Arabic sentence | Renders left-to-right without displacing surrounding punctuation. |
| E-06 | Arabic text is exported to CSV | Encoding preserves the text; a spreadsheet opening it shows Arabic, not mojibake. |
| E-07 | Arabic text is rendered in a generated PDF | The embedded face supports Arabic joining; text is selectable and correctly ordered. |
| E-08 | User switches language mid-form | Values preserved; labels and validation messages switch (spec `008` `E-17`). |
| E-09 | Branch has no calendar configured | Dependent features refuse configuration rather than defaulting to 24/7 (spec `005` `E-07`). |
| E-10 | Department deactivated with open tickets | Refused until tickets are transferred or closed. |
| E-11 | Branch deactivated with active users scoped to it | Refused until users are rescoped. |
| E-12 | Ticket transferred to a branch whose calendar makes the target already breached | Permitted; the breach is recorded with cause `transfer` so spec `009` can report it separately. |
| E-13 | Transfer to a department lacking the ticket's category | Refused unless a target category is supplied in the same action. |
| E-14 | Transfer to a department with a different status set, where the current status does not exist | Refused unless a valid target status is supplied in the same action. |
| E-15 | Two branches in the same timezone with different weekends | Supported; the weekend belongs to the calendar, not the timezone. |
| E-16 | Branding colour set fails contrast | Refused at save, naming the failing pair (`FR-010`). |
| E-17 | Push registration invalid or expired | Falls back to in-app and email; the failure is logged (spec `004` `E-10`). |
| E-18 | Entity isolation enabled and a record somehow references another entity | Treated as a security defect, not a data-quality issue. |
| E-19 | Hijri and Gregorian dates disagree at a boundary | The stored instant is authoritative; both renderings derive from it; neither is stored separately. |
| E-20 | Several confirmations are produced in quick succession | They stack without overlapping and without moving the page beneath them; the newest is nearest the screen edge it is anchored to. |

## 7. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| `NFR-001` | Language switch completion | ≤ 1s, context preserved |
| `NFR-002` | Untranslated user-visible strings in either language | 0, verified by automated scan per release |
| `NFR-003` | Mobile agent task completion parity | 100% of the defined agent task list |
| `NFR-004` | Accessibility | WCAG 2.1 AA, 0 level-A failures |
| `NFR-005` | RTL layout defects at release | 0 blocking, verified by full-product Arabic review |
| `NFR-006` | Records visible outside their branch, department or entity | 0 (spec `010` `FR-004`) |
| `NFR-007` | Arabic rendering fidelity in exports (CSV, PDF, print) | 0 encoding or shaping defects |

## 8. Bilingual and localisation requirements

This spec *is* the bilingual requirement for the whole system. The table below
is the checklist every other spec inherits.

| Surface class | Requirement |
|---|---|
| Interface chrome | Both languages; full mirror; no untranslated string (`FR-001`) |
| Configurable labels | Localised value, both required at save (`FR-004`) |
| Customer notifications, every channel | Both languages; selected by the customer's `preferred_language`, never the agent's |
| Staff notifications | Selected by the recipient's interface language |
| User-authored content (messages, notes, articles, comments) | Free language; direction detected per item; never translated automatically |
| Direction-neutral values | Always LTR in every context including exports (`FR-002`) |
| Exports (CSV, Excel, PDF, print) | Both languages; correct encoding and shaping (`E-06`, `E-07`) |
| Machine surfaces (API and webhook payloads) | English field names only — deliberately excluded (spec `011` section 8) |
| Metric definitions | Both languages; prose, not only names (spec `009` `FR-021`) |
| Error, refusal and empty states | Both languages; must name the specific cause |

## 9. Permissions

| Action | AGT | LEAD | MGR | ADM | AUD |
|---|---|---|---|---|---|
| Switch own interface language | ✓ | ✓ | ✓ | ✓ | ✓ |
| Switch own presentation mode | ✓ | ✓ | ✓ | ✓ | ✓ |
| View departments and branches in scope | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create / edit / deactivate a department | — | — | — | ✓ | — |
| Create / edit / deactivate a branch | — | — | — | ✓ | — |
| Set a branch timezone, calendar and holidays | — | — | — | ✓ | — |
| Transfer a ticket across departments | — | ✓ | ✓ | ✓ | — |
| Transfer a ticket across branches | — | — | ✓ | ✓ | — |
| Choose the SLA consequence of a transfer | — | — | ✓ | ✓ | — |
| Configure branding | — | — | — | ✓ | — |
| Configure entities and isolation | — | — | — | ✓ | — |
| Author in-app guidance | — | — | ✓ | ✓ | — |
| View the untranslated-strings report | — | — | ✓ | ✓ | ✓ |
| Register own push device | ✓ | ✓ | ✓ | ✓ | ✓ |

Cross-branch transfer is deliberately manager-level: it moves data across a
scope boundary and changes the SLA basis.

## 10. Audit requirements

| Event | Recorded fields |
|---|---|
| Department created / edited / deactivated | actor, timestamp, before, after, records referencing it |
| Branch created / edited / deactivated | actor, timestamp, before, after, timezone and calendar changes |
| Branch calendar or holiday set changed | actor, timestamp, before, after — affects clocks started afterwards only (spec `005` `E-06`) |
| Localised value saved | actor, timestamp, entity, language, before, after — per language, so a stale translation is detectable |
| Single-language save refused | actor, timestamp, entity, missing language |
| Cross-boundary transfer | actor, ticket, from branch and department, to branch and department, reason, SLA consequence chosen, category and status substitutions |
| Branding changed | actor, timestamp, field, before, after, contrast check result |
| Entity created / isolation configured | actor, timestamp, configuration |
| Cross-entity reference detected | records involved, timestamp — **security event** |
| Push registration added / removed / failed | user, device, timestamp, outcome |
| Interface language changed | user, timestamp, from, to |
| Guidance item published | actor, timestamp, languages, roles targeted |

## 11. Contracts

| Operation | Purpose | Scope predicate |
|---|---|---|
| `get / set interface language` | Reader preference | self only |
| `get / set presentation mode` | Light or dark | self only |
| `list departments` / `list branches` | Selection and filtering | branch ∈ scope AND department ∈ scope |
| `manage department` / `manage branch` | Structure | admin; within own scope (spec `010` `FR-021`) |
| `manage branch calendar / holidays` | Working time | admin; shared with specs `003` and `005` |
| `save localised value` | Any configurable string | both languages required; refusal names the missing one |
| `get untranslated report` | Translation debt | manager and above |
| `transfer ticket across boundary` | Reassignment | lead for department, manager for branch; target category and status validated |
| `manage branding` | Presentation | admin; contrast validated at save |
| `manage entity / isolation` | Tenancy | admin only; enforced at the spec `010` layer |
| `register / remove push device` | Notification delivery | self only |
| `manage guidance` | Onboarding | manager and above; both languages required |

## 12. Clarifications needed

- [ ] `[CLARIFY-1]` **Are Arabic and English peer languages, or is one primary with the other a translation?** This spec assumes peers throughout, which is the more expensive and more correct reading. **This is the single most consequential open question in the project** — it changes the data model of every configurable label, the search index, the KB workflow and every layout. — *blocks* `FR-001`, `FR-004`, and spec `006` `[CLARIFY-1]` — *ask* client executive sponsor
- [~] `[CLARIFY-2]` **How many departments and how many branches, named?** And how isolated must branches be — scoped access or full isolation? Shared with spec `010` `[CLARIFY-1]`. Deciding late means rewriting the permission layer. — *blocks* `FR-007`, `FR-008`, `FR-011` — *ask* client operations
  - **ANSWERED PROVISIONALLY — developer, 2026-09-07 — pending client confirmation, NOT ratified.** Scoped access, not multi-tenancy. One deployment; branches and departments are ordinary records. `FR-011` (isolated entities) is dropped. The counts and the names are still owed by client operations. See [`docs/decisions-pending.md`](../../docs/decisions-pending.md).
- [ ] `[CLARIFY-3]` Do departments nest, and to what depth? This spec assumes at most one level. — *blocks* `FR-007` — *ask* client operations
- [ ] `[CLARIFY-4]` **Is Hijri date display required, and where — display only, or input as well?** Input means dual calendar pickers on every date field. — *blocks* `FR-003`, `E-19` — *ask* client operations
- [ ] `[CLARIFY-5]` **On cross-branch transfer, is the SLA recalculated against the new branch calendar or preserved?** Recalculation can breach a ticket on arrival; preservation measures against a calendar nobody in the new branch works. — *blocks* `FR-009`, `AS-11`, `E-12` — *ask* client management
- [ ] `[CLARIFY-6]` Is `FR-011` (isolated entities) a real requirement or an aspiration? It is the difference between scoping and multi-tenancy, and it must be answered before the permission layer is built, not after. — *blocks* `FR-011`, and spec `010` `FR-004` — *ask* client executive sponsor
- [ ] `[CLARIFY-7]` Is a native mobile application expected, or is an installable web application acceptable? And is there a formal accessibility standard the client is obliged to meet beyond WCAG 2.1 AA? — *blocks* `FR-006`, `FR-012` — *ask* client IT + legal

## 13. Success metrics

| Metric | Source | Target |
|---|---|---|
| Untranslated user-visible strings | Automated scan, both languages, per release | 0 |
| RTL layout defects | Full-product Arabic review before each release | 0 blocking |
| Arabic task completion | Usability test with Arabic-first agents and customers | > 90% |
| Agent tasks completable on a phone browser | Against the defined task list | 100% |
| Records visible outside their branch, department or entity | Penetration test | 0 |
| WCAG 2.1 AA level-A failures | Accessibility audit | 0 |
| Arabic rendering defects in exports | Export review, CSV, Excel, PDF, print | 0 |
| Single-language configurable labels in existence | Configuration audit | 0 |

## 14. Review checklist

- [x] No implementation detail
- [x] Every requirement testable, using MUST / SHOULD / MAY
- [x] No unfailable adjectives
- [x] Every requirement traces to a story ID or constitution principle
- [x] Every acceptance scenario has a matching requirement, and vice versa
- [x] Edge cases cover legacy single-language data, mixed direction, export encoding, transfer conflicts and deactivation
- [x] **Constitution I satisfied — `FR-004` refuses single-language saves, `AS-03` forbids fallback, section 3 enumerates every governed string by owning spec**
- [x] Permission matrix complete; cross-branch transfer deliberately elevated
- [x] Audit entries defined, per language, so stale translations are detectable
- [x] Section 8 serves as the bilingual checklist the other twelve specs inherit
- [ ] **Zero `[NEEDS CLARIFICATION]` markers remaining — 6 open, `/plan` is blocked; `[CLARIFY-2]` answered provisionally by the developer on 2026-09-07 pending client confirmation. `[CLARIFY-1]` is the project's most consequential unanswered question and remains open. Note that constitution I already settles the *data model* — a value per language — so `localized-text.schema.js` is built against the principle, not against this marker; what is unconfirmed is the client's agreement that neither language is the source of the other.**
- [x] Constitution gates satisfied and named

# Spec 006 — Knowledge Base

> **المفروض الحاجة دي تشتغل إزاي بالظبط؟**

| | |
|---|---|
| **Number** | `006` |
| **Story** | [`stories/006-knowledge-base/story.md`](../../stories/006-knowledge-base/story.md) |
| **Status** | Draft — clarifying |
| **Constitution gates** | **I (bilingual peer content)**, II (attributable), IV (visibility enforced server-side) |
| **Blocking clarifications** | 5 |

---

## 1. Scope

**In scope.** Article authoring and structure, the Arabic/English translation
pair, the draft-review-publish workflow, visibility levels, versioning and
rollback, review dates, search for customers and agents, in-ticket insertion,
FAQ as a distinct format, ratings and analytics, and article permalinks.

**Out of scope.**

- The AI chatbot reading this base — spec `007`
- AI-drafted articles — spec `007` (`AI-18`); a draft arrives here and enters this workflow
- The portal shell presenting articles — spec `008`
- Insertion into the reply composer — spec `004` `FR-008`; this spec defines what may be inserted and by whom
- Document management for internal contracts and policies — not this product
- Community forums and customer-authored content — not in the source feature list
- Machine translation — `FR-003` requires human-authored parallel articles

## 2. Domain language

| Term | Means exactly |
|---|---|
| **Article** | One unit of published guidance. Exists in up to two language variants, which are peers, not original and copy. |
| **Variant** | The Arabic or English rendering of an article. Each has its own body, title, workflow state and version history. |
| **Translation pair** | The link between the two variants of one article. Either may exist alone. |
| **Format** | `faq` (short question and answer), `article` (explanatory), `guide` (ordered steps). |
| **Visibility** | `public` (no sign-in), `customer` (signed-in customers), `internal` (staff), `restricted` (named roles). |
| **Workflow state** | `draft` → `in_review` → `published` → `archived`. Also `changes_requested`. |
| **Version** | An immutable snapshot of a variant at publication or save. Never edited. |
| **Review date** | The date by which a published variant must be re-examined. |
| **Stale** | Published and past its review date. Still visible; flagged to authors, not to customers. |
| **Deflection** | A session in which a customer viewed one or more articles and did not create a ticket within the attribution window. |
| **Failed search** | A query returning no result, or returning results none of which was opened. |
| **Suggestion** | An article offered to a customer during ticket composition (`FR-009`) or to an agent inside a ticket (`FR-010`). |

## 3. Key entities

### Article

| Attribute | Type | Rules |
|---|---|---|
| `format` | `faq` \| `article` \| `guide` | Required |
| `category_id` | ref KB category | Required; own tree, distinct from the ticket tree |
| `tags` | set of text | May be empty |
| `owner_id` | ref User | Required — an author accountable for it |
| `department_id` | ref | Required; drives `internal` visibility scoping |
| `ticket_category_ids` | set of ref | Optional; drives in-ticket relevance (`FR-010`) |
| `related_article_ids` | set of ref | Manual links |
| `slug` | text | Unique, immutable once published (`FR-017`) |

### Article variant

| Attribute | Type | Rules |
|---|---|---|
| `article_id`, `language` | ref, `ar` \| `en` | Unique together |
| `title`, `body` | text | Required; body supports rich content and attachments |
| `visibility` | enum | Required; MUST NOT be looser than the article's most restrictive published peer, per `E-06` |
| `state` | workflow state | Required |
| `current_version` | integer | — |
| `published_at`, `review_due_at` | timestamp | `review_due_at` required when published |
| `approver_id` | ref User | Required to reach `published` where `FR-004` applies |

### Version, Rating, Search event, View event
Standard shapes. Versions are immutable. Search events record the query, the
result count, the language, whether a result was opened, and the actor kind
(customer, agent or bot).

## 4. Acceptance scenarios

### AS-01 — Peer languages, independently publishable
**Given** an article with an English variant published and an Arabic variant in `draft`
**When** an English-preferring customer searches
**Then** the English variant is returned
**And** an Arabic-preferring customer searching the same terms receives no result for this article, and the failed search is recorded
**And** the Arabic variant is not shown in English as a fallback

### AS-02 — Visibility is enforced, not merely hidden
**Given** an article variant with visibility `internal`
**When** a signed-in customer requests it by its permalink, and an unauthenticated visitor requests the same URL
**Then** both receive not-found, not forbidden
**And** it does not appear in either party's search results
**And** an agent in the owning department receives it

### AS-03 — Review workflow blocks premature publication
**Given** a variant in `draft` and a workflow requiring approval
**When** its author attempts to publish it
**Then** publication is refused and the variant moves to `in_review`
**And** the configured approver is notified
**And** on approval it becomes `published` with `published_at` set and `review_due_at` computed
**And** on `changes_requested` it returns to the author with the reviewer's comment

### AS-04 — Rollback restores exactly
**Given** a variant at version 7 whose version 5 was correct
**When** an author rolls back to version 5
**Then** the live body and title match version 5 exactly
**And** a new version 8 is created holding that content — version 5 is not mutated
**And** history records the rollback, the actor and the source version

### AS-05 — Stale content is flagged to authors only
**Given** a published variant whose `review_due_at` passed yesterday
**When** an author views the content list, and a customer views the article
**Then** the author sees it flagged stale with the days overdue
**And** the customer sees the article with no staleness indication
**And** the owner and the approver were notified ahead of the due date

### AS-06 — Arabic search tolerates real typing
**Given** an Arabic article titled "كيفية إعادة تعيين كلمة المرور"
**When** a customer searches "كيفيه اعادة تعيين كلمه المرور" — differing in hamza, alef and taa marbuta
**Then** the article is returned
**And** searching with a single-character transposition also returns it
**And** an English search for "reset password" returns the English variant if published

### AS-07 — Suggestions during composition
**Given** a customer typing the subject "I cannot log in to the portal"
**When** three or more words have been entered
**Then** up to five relevant articles of visibility `public` or `customer` are offered
**And** opening one and abandoning the form records a deflection
**And** submitting anyway records the suggestion as not deflected

### AS-08 — In-ticket insertion respects visibility
**Given** an agent on a ticket, and two matching articles, one `customer` and one `internal`
**When** they insert the `customer` article into a customer-visible reply
**Then** it is inserted, as a link or full body at the agent's choice
**When** they attempt to insert the `internal` article into a customer-visible reply
**Then** insertion is refused, naming the visibility
**And** insertion of that same article into an internal note is permitted

### AS-09 — Analytics answer what to write next
**Given** 30 days of search activity
**When** a manager opens knowledge analytics
**Then** they see views per article, helpful and not-helpful counts, deflection rate, and the ranked list of failed searches by language
**And** each failed-search term can be turned into a draft article in one action

### AS-10 — Published URLs do not break
**Given** a published article with a permalink
**When** its title is edited, its category is moved, or it is archived
**Then** the permalink continues to resolve
**And** an archived article resolves to a page stating it is no longer current, offering related articles, rather than to not-found

### AS-11 — FAQ is a distinct format
**Given** ten `faq` items in a category
**When** a customer opens that category in the portal
**Then** the FAQ items appear as question-and-answer pairs, expanded or expandable, above longer articles
**And** each remains individually searchable and linkable

## 5. Functional requirements

| ID | Requirement | Level | Traces |
|---|---|---|---|
| `FR-001` | Authors MUST be able to create and edit variants with rich text, headings, lists, tables, images, links and attachments, subject to spec `010` scanning and limits. | MUST | `KB-01` |
| `FR-002` | Articles MUST be organisable in a category tree, distinct from the ticket category tree, and MUST support free tags. | MUST | `KB-02` |
| `FR-003` | An article MUST support an Arabic and an English variant as peers, each independently authored, stated, versioned and published. Neither MUST be substituted for the other; a missing variant MUST behave as absent, not fall back. | MUST | `KB-03`, constitution I |
| `FR-004` | The system MUST support a `draft` → `in_review` → `published` workflow with a named approver and a `changes_requested` return path. Whether approval is mandatory MUST be configurable per visibility level, per `[CLARIFY-3]`. | SHOULD | `KB-04` |
| `FR-005` | Each variant MUST carry a visibility of `public`, `customer`, `internal` or `restricted`. Visibility MUST be enforced server-side on read and on search; a request for a variant the caller may not see MUST return not-found. | MUST | `KB-05`, constitution IV |
| `FR-006` | Every save and publication MUST create an immutable version. Rollback MUST create a new version carrying the restored content and MUST NOT mutate the source version. | SHOULD | `KB-06` |
| `FR-007` | A published variant MUST carry a review due date; the owner and approver MUST be notified ahead of it and again when it passes. Staleness MUST be visible to authors and MUST NOT be shown to customers. | SHOULD | `KB-07` |
| `FR-008` | Search MUST cover title, body and tags; MUST support Arabic with insensitivity to diacritics, alef, hamza and taa marbuta variants; MUST support English case-insensitively; MUST tolerate at least one character of error; and MUST apply the caller's visibility. | MUST | `KB-08` |
| `FR-009` | During ticket composition in the portal, the system MUST suggest up to five relevant articles once at least three words are entered, and MUST record whether a suggestion led to abandonment. | SHOULD | `KB-09` |
| `FR-010` | Agents MUST be able to search from within a ticket, ranked by the ticket's category and language, and insert an article as a link or as full body text. Insertion MUST be refused where the target message visibility would exceed the article's. | MUST | `KB-10` |
| `FR-011` | The system MUST report views, ratings, deflection rate and failed searches by language, and MUST allow a failed-search term to be converted into a draft in one action. | SHOULD | `KB-11` |
| `FR-012` | Readers MUST be able to rate an article helpful or not helpful and optionally comment; comments MUST reach the article owner and MUST NOT be publicly visible. | SHOULD | `KB-12` |
| `FR-013` | The `faq` format MUST render as ordered question-and-answer pairs, presented above other formats within a category, each individually searchable and linkable. | MUST | `KB-13` |
| `FR-014` | Articles MAY carry manual related links, and the system MAY compute related articles from content and co-viewing. | MAY | `KB-14` |
| `FR-015` | Variants with visibility `public` MUST be readable without authentication. | SHOULD | `KB-15` |
| `FR-016` | Authors MAY start from administrator-defined templates per format. | MAY | `KB-16` |
| `FR-017` | Each article MUST have an immutable slug and a stable permalink that survives title changes, category moves and archival. An archived article MUST resolve to a superseded notice with related articles, never to not-found. | MAY | `KB-17` |
| `FR-018` | Every state change, publication, rollback and visibility change MUST write a history entry per constitution II. | MUST | constitution II |

## 6. Edge cases and failure behaviour

| # | Situation | Required behaviour |
|---|---|---|
| E-01 | Only one language variant exists | The article is usable in that language; the other behaves as absent. No fallback, no machine translation (`FR-003`). |
| E-02 | Two authors edit one variant concurrently | Second save is refused with the conflict shown; the loser's text is preserved as a draft for manual merge. Never silently overwritten. |
| E-03 | Article published then its category is deleted | Article moves to the parent category and the owner is notified. It never becomes unreachable. |
| E-04 | Article referenced by a quick reply is archived | The quick reply is flagged for its owner; insertion of an archived article is refused. |
| E-05 | Article inserted into a sent reply is later edited | The sent message retains the version that was inserted. Editing an article never alters a sent message. |
| E-06 | Arabic variant `public` while the English peer is `internal` | Refused. Both variants of one article must not straddle the staff/customer boundary; the looser setting is refused with the conflict named. |
| E-07 | Reviewer is deactivated with an item in review | Reassigns to the configured fallback approver; an administrator is alerted. |
| E-08 | Approver is the author | Refused where approval is mandatory; permitted where the visibility level does not require approval, per `[CLARIFY-3]`. |
| E-09 | Search query is empty or one character | No search runs; no error. |
| E-10 | Search matches only variants the caller may not see | Zero results, with no indication that hidden matches exist. |
| E-11 | Attachment inside a `public` article fails virus scanning | Publication is blocked, naming the attachment. |
| E-12 | A rating arrives from an unauthenticated reader | Accepted, rate-limited per source, and marked as unauthenticated in analytics. |
| E-13 | Rollback target version references a deleted image | Rollback proceeds; the missing asset is reported to the owner rather than blocking. |
| E-14 | Review date set in the past | Accepted and immediately stale. |
| E-15 | Deflection attribution window overlaps a ticket about a different subject | Attribution is by session and window only; the metric is reported with its definition stated, not inferred. |
| E-16 | Article body contains mixed Arabic and English paragraphs | Each block renders in its own direction; the page direction follows the variant's language. |

## 7. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| `NFR-001` | Search results returned | ≤ 1s at p95, both languages |
| `NFR-002` | Composition-time suggestions returned | ≤ 500ms at p95 |
| `NFR-003` | Article page render | ≤ 1.5s at p95 |
| `NFR-004` | Index freshness after publication | ≤ 60s |
| `NFR-005` | Version retention | All versions retained for the life of the article |
| `NFR-006` | Public article availability | Matches the spec `013` `FR-003` uptime target |

## 8. Bilingual and localisation requirements

| Surface | Arabic | English | RTL notes |
|---|---|---|---|
| Article titles and bodies | Independent variant | Independent variant | Page direction follows the variant; mixed blocks render per block |
| KB category names | Required | Required | Tree mirrors |
| Tags | Free, per script | Free | Search matches within a script; no cross-script transliteration |
| Format labels and templates | Required | Required | — |
| Search interface, empty and error states | Required | Required | Input mirrors; the query itself is not mirrored |
| Rating prompt and comment box | Required | Required | — |
| Superseded and archived notices | Required | Required | — |
| Analytics interface | Required | Required | Failed-search lists are reported per language, never merged |
| Author workflow interface | Required | Required | — |

## 9. Permissions

| Action | Anon | CUST | AGT | LEAD | MGR | KBA | ADM | AUD |
|---|---|---|---|---|---|---|---|---|
| Read `public` variant | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read `customer` variant | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read `internal` variant | — | — | own dept | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read `restricted` variant | — | — | named roles only | named | named | ✓ | ✓ | ✓ |
| Search | public only | public + customer | per above | ✓ | ✓ | ✓ | ✓ | ✓ |
| Rate / comment | ✓ (limited) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Create draft | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Edit own draft | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Edit any draft | — | — | — | ✓ | ✓ | ✓ | ✓ | — |
| Submit for review | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Approve / publish | — | — | — | — | ✓ | ✓ | ✓ | — |
| Set visibility to `public` | — | — | — | — | ✓ | ✓ | ✓ | — |
| Roll back a version | — | — | — | — | ✓ | ✓ | ✓ | — |
| Archive | — | — | — | — | ✓ | ✓ | ✓ | — |
| Manage categories and templates | — | — | — | — | — | ✓ | ✓ | — |
| Read analytics | — | — | own usage | ✓ | ✓ | ✓ | ✓ | ✓ |
| Read version history | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## 10. Audit requirements

| Event | Recorded fields |
|---|---|
| Article created | actor, timestamp, format, category, department, slug |
| Variant created | actor, timestamp, language, initial visibility |
| Variant saved | actor, timestamp, version created, fields changed |
| Submitted for review | actor, timestamp, approver notified |
| Approved / changes requested / published | actor, timestamp, version published, comment where present |
| Visibility changed | actor, timestamp, before, after — retained permanently as a disclosure record |
| Rolled back | actor, timestamp, source version, new version |
| Archived / restored | actor, timestamp, reason |
| Review date set / passed | actor or system, timestamp, due date |
| Rating submitted | actor kind (authenticated or not), timestamp, article, version, score, comment id |
| Search performed | actor kind, timestamp, query, language, result count, whether a result was opened |
| Article inserted into a ticket | actor, timestamp, ticket, article, version, link or full text, target message visibility |
| Analytics exported | actor, timestamp, range, destination |

Visibility changes are the security-relevant event in this spec: a variant
briefly public is a disclosure, and the audit must show exactly when.

## 11. Contracts

| Operation | Purpose | Scope predicate |
|---|---|---|
| `search articles` | Customer, agent and bot search | visibility ≤ caller's level AND (`internal` ⇒ department ∈ scope) |
| `get article by slug` | Permalink resolution | same; archived resolves to a superseded notice |
| `suggest articles` | Composition-time and in-ticket | same, plus relevance by ticket category |
| `create / update variant` | Authoring | author, or lead and above for others' drafts |
| `submit for review` / `decide review` | Workflow | approver named by configuration |
| `publish variant` | Go live | manager, author role or admin; `public` requires the elevated right |
| `list versions` / `rollback` | Version control | manager, author role or admin |
| `set visibility` | Disclosure control | manager, author role or admin; audited permanently |
| `archive / restore` | Lifecycle | manager, author role or admin |
| `rate article` | Feedback | any reader; rate-limited per source |
| `get analytics` | What to write next | lead and above |
| `create draft from failed search` | Content gap closure | author role and above |
| `manage KB categories / templates` | Structure | author role or admin |

## 12. Clarifications needed

- [ ] `[CLARIFY-1]` **Are Arabic and English peer articles, or is one the original and the other a translation?** This spec assumes peers (`FR-003`), which is the more expensive and more correct reading. It changes the content model, the workflow and the search index. — *blocks* `FR-003`, `FR-008`, `AS-01` — *ask* client + spec `012` `[CLARIFY-1]`
- [ ] `[CLARIFY-2]` **Who authors the initial content, and how many articles must exist in both languages at go-live?** An empty base makes the portal (spec `008`) and the chatbot (spec `007`) useless on day one. This is a resourcing question, not a technical one. — *blocks* launch readiness — *ask* client operations
- [ ] `[CLARIFY-3]` Is approval mandatory for every visibility level, or only for `public` and `customer`? May an author approve their own internal article? — *blocks* `FR-004`, `E-08` — *ask* client operations
- [ ] `[CLARIFY-4]` Is any content public and search-engine indexable, or is everything behind sign-in? This decides whether `FR-015` and `FR-017` are in scope at all. — *blocks* `FR-015`, `FR-017` — *ask* client marketing + operations
- [ ] `[CLARIFY-5]` What is the review cycle length, and is it uniform or per category? — *blocks* `FR-007` — *ask* client operations

## 13. Success metrics

| Metric | Source | Target |
|---|---|---|
| Deflection rate | Portal sessions with an article view and no ticket | > 20% by month six |
| Failed searches | Search log, per language | < 10% of queries |
| Agent replies containing an article | Message metadata | > 30% |
| Variants overdue for review | Review dates | < 5% at any time |
| Top 20 ticket categories with a published article in both languages | Coverage audit | 100% |
| Variants ever readable outside their visibility | Penetration test | 0 |

## 14. Review checklist

- [x] No implementation detail
- [x] Every requirement testable, using MUST / SHOULD / MAY
- [x] No unfailable adjectives
- [x] Every requirement traces to a story ID or constitution principle
- [x] Every acceptance scenario has a matching requirement, and vice versa
- [x] Edge cases cover empty, duplicate, concurrent, hostile and out-of-order input
- [x] Bilingual requirements stated for every user-visible surface
- [x] Permission matrix complete for every action, across eight actor kinds
- [x] Audit entries defined for every mutation, with visibility changes retained permanently
- [x] Constitution I satisfied — `FR-003` forbids language fallback
- [ ] **Zero `[NEEDS CLARIFICATION]` markers remaining — 5 open, `/plan` is blocked**
- [x] Constitution gates satisfied and named

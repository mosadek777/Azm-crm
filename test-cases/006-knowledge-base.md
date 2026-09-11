# Test cases — 006 Knowledge base

**17 cases.** Articles agents search and attach to a request, and that customers
read for themselves.

**Coverage:** 0 automated · 0 partial · 0 manual · 17 not testable yet

---

## Before you start

⛔ **Nothing in this module is built.**

**Two questions must be answered before it can be**, and neither is effort:

| Question | Why it cannot be deferred |
|---|---|
| **Does an article belong to a branch, like every other record here, or is it deliberately shared across all of them?** | Shared content would be the **first exception** to the access rule in the entire system. Every other record is filtered by branch and department; an article that ignores that is a deliberate decision, not an implementation convenience. It changes the data model, so it cannot be retrofitted. |
| **May an article exist in one language only?** | Administrator-authored labels may not — both languages or the save is refused. An article is longer and written by a person, so the same rule may be impractical. But the answer decides whether KB-03 is "linked translations" or "two independent articles", which are different models. |

**Who writes these.** The persona `KBA` is a knowledge author — not necessarily
an agent. Whether that is a separate role or a right granted to agents is part
of the unbuilt role work.

**What connects to this module.** An agent inserting an article into a reply is
in the agent workspace; turning a resolved request into a draft is in the ticket
module; the customer reading articles is in the portal. All three wait here.

---

## KB-01 — Guidance clear enough to follow unaided

> *As a* **knowledge author** *I want to* **a rich editor with images, tables
> and attachments** *so that* **guidance is clear enough to follow unaided.**

**Requirement:** `006 FR-001` (Must)

**Preconditions**
- Knowledge-author access.

**Steps**
1. Create an article with headings, a numbered list, a table and an image.
2. Attach a file.
3. Save, then view it as a reader.
4. Write the same in Arabic and check the layout mirrors.

**Expected result**
- What the reader sees matches what the author wrote.
- Step 4: the article mirrors correctly, and any image containing text is not
  silently flipped.

**Status:** ⛔ **Not testable yet.** Attachments are also unbuilt on every
surface.

---

## KB-02 — Found by browsing as well as searching

> *As a* **knowledge author** *I want to* **categories and tags** *so that*
> **content is found by browsing as well as searching.**

**Requirement:** `006 FR-002` (Must)

**Preconditions**
- Several articles.

**Steps**
1. Put articles into categories.
2. Tag several across categories.
3. Browse by category.
4. Browse by tag.

**Expected result**
- Both routes reach the article. Somebody who does not know the word to search
  for can still find it.

**Status:** ⛔ **Not testable yet.**

---

## KB-03 — Every reader gets the same answer in their language

> *As a* **knowledge author** *I want to* **write in Arabic and English, linked
> as translations** *so that* **every reader gets the same answer in their
> language.**

**Requirement:** `006 FR-003` (Must)

**Preconditions**
- An article in English.

**Steps**
1. Add its Arabic translation and link the two.
2. Read it with the interface in Arabic.
3. Read it with the interface in English.
4. Publish an update to the English version only.
5. Check what an Arabic reader sees.

**Expected result**
- Steps 2 and 3 each show the right language.
- **Step 4 is the case that decides the design.** An Arabic reader must not
  silently receive the English text — this product refuses language fallback
  everywhere else. Either the Arabic version is marked out of date, or the
  update is blocked until translated. Both are defensible; doing neither is not.

**Status:** ⛔ **Not testable yet.** Step 5 is one of the two open questions at
the top of this file.

---

## KB-04 — Wrong information cannot reach customers unreviewed

> *As a* **knowledge author** *I want to* **draft, review and publish with an
> approver** *so that* **wrong information cannot reach customers unreviewed.**

**Requirement:** `006 FR-004` (Should)

**Preconditions**
- An author and a separate approver.

**Steps**
1. As the author, write an article and submit it for review.
2. Confirm it is not visible to customers.
3. As the author, try to approve your own article.
4. As the approver, approve and publish it.
5. Confirm it is now visible, and that the history records both people.

**Expected result**
- Step 3 is refused — self-approval defeats review.
- Step 5 names both the author and the approver.

**Status:** ⛔ **Not testable yet.** Step 3 needs a "not the same person as"
rule, which the access model does not currently express — the same gap noted for
approval of sensitive resolutions in `005`.

---

## KB-05 — Internal procedure never leaks onto the public site

> *As a* **knowledge author** *I want to* **visibility per article: public,
> customer, internal, role** *so that* **internal procedure never leaks onto the
> public site.**

**Requirement:** `006 FR-005` (Must)

**Preconditions**
- Four articles, one at each visibility level.

**Steps**
1. As an anonymous visitor, search and browse. Note which articles appear.
2. As a signed-in customer, repeat.
3. As an agent, repeat.
4. As an agent, try to insert the internal article into a customer-visible
   reply.
5. Search for a distinctive phrase from the internal article as an anonymous
   visitor.

**Expected result**
- Each audience sees only what it should, and the progression is cumulative.
- Step 4 is refused or warned clearly.
- Step 5 finds nothing — an internal article must not be discoverable through
  search results, excerpts or suggestions, even if the article itself is
  protected.

**Status:** ⛔ **Not testable yet.** Step 5 is the failure mode worth designing
for: visibility that protects the page but leaks the content through search is a
common and serious mistake.

---

## KB-06 — A bad edit is a five-second fix

> *As a* **knowledge author** *I want to* **version history and rollback** *so
> that* **a bad edit is a five-second fix.**

**Requirement:** `006 FR-006` (Should)

**Preconditions**
- A published article.

**Steps**
1. Edit and publish it three times.
2. Open the version history.
3. Compare two versions.
4. Roll back to the first.
5. Check the rollback is itself a version, not an erasure.

**Expected result**
- Step 5: rolling back adds a version rather than deleting the ones after it.
  The record of what was published, and when, survives.

**Status:** ⛔ **Not testable yet.**

---

## KB-07 — The base does not quietly become wrong

> *As a* **knowledge author** *I want to* **a review date, and a reminder when
> it passes** *so that* **the base does not quietly become wrong.**

**Requirement:** `006 FR-007` (Should)

**Preconditions**
- An article with a review date in the past.

**Steps**
1. Set a review date.
2. Let it pass.
3. Check the author is reminded.
4. Check whether a reader can tell the article is overdue for review.

**Expected result**
- The author is told.
- Step 4 is a judgement to make deliberately: an article visibly marked "not
  reviewed since 2024" may be more honest than one that looks current.

**Status:** ⛔ **Not testable yet.** Depends on notifications.

---

## KB-08 — Find it even when I spell it badly

> *As a* **customer** *I want to* **search with typo tolerance in Arabic and
> English** *so that* **I find it even when I spell it badly.**

**Requirement:** `006 FR-008` (Must)

**Preconditions**
- Articles in both languages.

**Steps**
1. Search an English title with a letter transposed.
2. Search an Arabic title **with** diacritics, then **without**.
3. Search an Arabic word with a common spelling variant.
4. Search a word that appears in no article.

**Expected result**
- Steps 1–3 all find the article.
- Step 2 returns the same result both ways. Arabic is written with and without
  diacritics interchangeably.
- Step 4 returns nothing — a search that returns everything would satisfy the
  earlier steps for the wrong reason.

**Status:** ⛔ **Not testable yet.** Note the same diacritic requirement is
already unmet in request search, where it is the one clause of that requirement
not built.

---

## KB-09 — I may not need to submit a ticket at all

> *As a* **customer** *I want to* **likely articles shown as I type my ticket
> subject** *so that* **I may not need to submit a ticket at all.**

**Requirement:** `006 FR-009` (Should)

**Preconditions**
- KB-08 working, and the portal request form.

**Steps**
1. Begin typing a subject in the portal.
2. Watch for suggestions.
3. Open one and confirm you can still submit if it did not help.
4. Confirm only articles **visible to that customer** are suggested.

**Expected result**
- Suggestions appear without submitting.
- Step 3: the path to a human is never removed. Deflection that traps somebody
  is worse than no deflection.
- Step 4: suggestions must respect visibility — this is where an internal
  article most easily leaks.

**Status:** ⛔ **Not testable yet.**

---

## KB-10 — Reply fast with approved wording

> *As an* **agent** *I want to* **search from inside the ticket and insert the
> answer** *so that* **I reply fast with approved wording.**

**Requirement:** `006 FR-010` (Must)

**Preconditions**
- KB-01 working, and a request.

**Steps**
1. Search the knowledge base from inside the request.
2. Insert an article as a link.
3. Insert another as full text.
4. Confirm the inserted text arrives in the customer's language.

**Expected result**
- Both insert forms work without leaving the request.
- Step 4: the language follows the customer's preference, not the agent's
  interface.

**Status:** ⛔ **Not testable yet.** This is the agent-workspace side of the
module and is what makes the base worth writing — an unread base is a cost.

---

## KB-11 — Know what to write next from evidence

> *As a* **support manager** *I want to* **views, failed searches, helpful
> votes, deflection rate** *so that* **I know what to write next from
> evidence.**

**Requirement:** `006 FR-011` (Should)

**Preconditions**
- A base in use.

**Steps**
1. Open the knowledge report.
2. Read views per article, votes, and deflection rate.
3. Read the list of **searches that returned nothing**.

**Expected result**
- Step 3 is the most valuable number here: it is a list of articles somebody
  should write, generated by customers rather than guessed at.

**Status:** ⛔ **Not testable yet.** Depends on reporting.

---

## KB-12 — Authors learn whether it actually helped

> *As a* **customer** *I want to* **rate an article and say why** *so that*
> **authors learn whether it actually helped.**

**Requirement:** `006 FR-012` (Should)

**Preconditions**
- A published public article.

**Steps**
1. Read the article as a customer and rate it unhelpful with a comment.
2. Confirm the author can see the rating and the comment.
3. Rate it again and confirm one person's rating is not counted twice.

**Expected result**
- The comment reaches the author. A score without a reason tells them the
  article is wrong but not how.

**Status:** ⛔ **Not testable yet.**

---

## KB-13 — Common questions answered above the fold

> *As a* **knowledge author** *I want to* **FAQs as a distinct short-answer
> format** *so that* **common questions are answered above the fold.**

**Requirement:** `006 FR-013` (Must)

**Preconditions**
- Knowledge-author access.

**Steps**
1. Create an FAQ entry — a question and a short answer.
2. Confirm it is visibly a different format from a full article.
3. Search and confirm FAQs surface above longer articles where both match.

**Expected result**
- A reader with a one-line question gets a one-line answer, not a page.

**Status:** ⛔ **Not testable yet.**

---

## KB-14 — A reader who lands nearby still gets there

> *As a* **knowledge author** *I want to* **related articles, manual and
> automatic** *so that* **a reader who lands nearby still gets there.**

**Requirement:** `006 FR-014` (Could)

**Preconditions**
- Several articles on adjacent topics.

**Steps**
1. Link two manually.
2. Confirm automatic suggestions appear on an article with none set.
3. Confirm suggestions respect the reader's visibility level.

**Expected result**
- Manual links always win over automatic ones.
- Step 3 again: related-article lists are a second place visibility leaks.

**Status:** ⛔ **Not testable yet.**

---

## KB-15 — Getting help has no barrier in front of it

> *As a* **customer** *I want to* **read public articles without logging in**
> *so that* **getting help has no barrier in front of it.**

**Requirement:** `006 FR-015` (Should)

**Preconditions**
- A published public article.

**Steps**
1. Open the article's address in a browser with no session.
2. Read it.
3. Try the same with a customer-only article.
4. Check the refusal in step 3 does not reveal the article's title or content.

**Expected result**
- Step 2 works with no sign-in.
- Step 3 refuses, and step 4: the refusal discloses nothing about what is
  behind it — consistent with how every other out-of-reach record behaves here.

**Status:** ⛔ **Not testable yet.** This is the first thing in the product that
would be **readable without any authentication at all**, which makes it the
first surface exposed to the open internet. It should not be built before the
rate limiting and abuse protection that the portal also currently lacks.

---

## KB-16 — Consistently structured without effort

> *As a* **knowledge author** *I want to* **step-by-step guide and solution
> templates** *so that* **articles are consistently structured without
> effort.**

**Requirement:** `006 FR-016` (Could)

**Preconditions**
- KB-01 working.

**Steps**
1. Start a new article from a step-by-step template.
2. Confirm the structure is pre-filled.
3. Confirm the template exists in both languages.

**Expected result**
- Structure comes for free; the author writes content, not headings.

**Status:** ⛔ **Not testable yet.**

---

## KB-17 — Answers can be linked from anywhere

> *As an* **administrator** *I want to* **stable, shareable, search-indexable
> article URLs** *so that* **answers can be linked from anywhere.**

**Requirement:** `006 FR-017` (Could)

**Preconditions**
- A published public article.

**Steps**
1. Note the article's address.
2. Rename the article's title and check the address still works.
3. Share the address and open it in a fresh browser.
4. Confirm public articles are indexable and non-public ones are not.

**Expected result**
- Step 2: renaming does not break links people have already sent to customers.
- Step 4: an internal article must never be indexable, which is a different
  control from being unreadable.

**Status:** ⛔ **Not testable yet.**

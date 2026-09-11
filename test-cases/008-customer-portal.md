# Test cases — 008 Customer portal

**18 cases.** The customer-facing side: signing in, raising a request, following
it, and replying — without telephoning anyone.

**Coverage:** 1 automated · 6 partial · 0 manual · 11 not testable yet

---

## Before you start

This is the **most thoroughly proven** module in the product. The portal was
built with three rules held throughout, and the automated suite asserts all
three rather than assuming them:

- A customer sees **only their own** requests, enforced in the database query
  rather than filtered afterwards in the interface.
- **No internal note ever reaches a portal surface** — asserted to appear in no
  part of any portal response, not merely to be hidden.
- **Every portal action is audited as the customer**, distinguishable from an
  agent acting on their behalf.

**Accounts.** `npm run seed:demo` prints them.

| Role | Who |
|---|---|
| Customer | Layla Mansour — `demo.customer@azmsquad.com` |
| Agent | Sara Ahmed — replies to her |

**Two deliberate shortcuts you will meet**, both recorded as ratified decisions
rather than oversights:

| Shortcut | Where it shows |
|---|---|
| Sign-in uses a **password**, not the one-time code the story asks for | CP-01 |
| The request view omits the **owning team**, because no team concept exists | CP-03 |

**Language.** Run every case in both Arabic and English. The portal mirrors
fully under Arabic and this has been verified by screenshot at desktop and phone
widths.

---

## CP-01 — My requests tied to me without another password

> *As a* **customer** *I want to* **sign in by email or phone one-time code, or
> SSO** *so that* **my requests are tied to me without another password.**

**Requirement:** `008 FR-001` (Must) — a customer authenticates against a
verified contact point by the agreed method.

**Preconditions**
- A customer with a portal sign-in — Layla Mansour in the demo data.

**Steps**
1. Open the portal sign-in page.
2. Enter the correct credentials and sign in.
3. Sign out, and try a wrong password.
4. Try an email address that does not exist.
5. Try an address that exists as a customer but has no portal sign-in.
6. Compare the three refusal messages from steps 3, 4 and 5.
7. Try to use the staff sign-in page with these credentials.

**Expected result**
- Step 2 signs in and lands on the customer's own requests.
- **Steps 3, 4 and 5 produce identical refusals** — same wording, same status.
  A different message for an unknown address would tell an attacker which email
  addresses are real customers.
- Step 7 fails. Staff and customer identities are separate populations and a
  token from one is refused by the other.

**Status:** ⚠ **Partial.** Automated, and thoroughly —
`backend/tests/portal.test.js`, sections *"FR-001 / AS-01: sign-in binds to
exactly one customer"*, *"E-02: the refusal discloses nothing about whether an
address is known"* (which asserts the refusal bodies are **byte-identical**),
and *"the two token populations do not mix"*.
**Missing:** the story asks for a **one-time code**, and sign-in currently uses
a password. That is a ratified demonstration shortcut, not a misreading — the
portal was built so that replacing the sign-in step changes nothing else. Single
sign-on is not built either.

---

## CP-02 — Raise an issue without phoning anyone

> *As a* **customer** *I want to* **submit a ticket with category, description
> and attachments** *so that* **I raise an issue without phoning anyone.**

**Requirement:** `008 FR-002` (Must)

**Preconditions**
- Signed in to the portal as Layla Mansour.

**Steps**
1. Choose **New request**.
2. Fill in a subject, a description and a category.
3. Submit.
4. Note the reference you are given.
5. As Sara Ahmed, find that request in the staff interface.
6. Check its source, status, priority and assignee.
7. Try to submit a request while also setting a priority, an assignee or a
   status.

**Expected result**
- Step 4: a reference is returned immediately, so the customer has something to
  quote.
- Step 6: the source records **portal**, the status is new, the priority is the
  default — not one the customer chose — and it is unassigned, waiting in the
  queue.
- The description became the first message of the conversation, authored by the
  customer.
- **Step 7 is refused, and the refusal names each field that was not permitted.**
  Silently ignoring them would let a customer believe they had set a priority.

**Status:** ⚠ **Partial.** Automated — `backend/tests/portal.test.js`, sections
*"FR-002 / AS-04: the customer submits a request"* and *"002 §9: a customer may
not set what is not theirs"*, which asserts all four forbidden fields are
refused **by name**, and includes a valid submission afterwards so the refusals
cannot pass vacuously.
**Missing:** **attachments.** Not built on any surface.

---

## CP-03 — Not chasing to find out if anything is happening

> *As a* **customer** *I want to* **see status, owning team and expected
> response time** *so that* **I do not chase to find out if anything is
> happening.**

**Requirement:** `008 FR-003` (Must)

**Preconditions**
- A request belonging to the signed-in customer.

**Steps**
1. Open the request in the portal.
2. Read the status.
3. Look for the owning team.
4. Look for expected response time.
5. Compare the status wording with what staff see internally.

**Expected result**
- Step 2 shows a **customer-facing** status label — the customer sees progress,
  not internal workflow vocabulary.
- Step 4 shows timing, or says plainly that it is unavailable.
- Step 5: the two need not be identical, but the customer's version must not
  misrepresent the internal one.

**Status:** ⚠ **Partial.** Automated: status is shown, and timing is **read**
from the shared duration component rather than computed in the portal —
`backend/tests/portal.test.js`, *"spec 002 FR-034 / constitution III: no
duration is computed"*. It currently reports unavailable, correctly, because the
service-level engine is not built.
**Missing:** **the owning team.** No team concept exists in the system, so the
field cannot be shown. Recorded as a ratified deviation.

---

## CP-04 — The conversation lives in one place I can revisit

> *As a* **customer** *I want to* **reply and add attachments from the portal**
> *so that* **the conversation lives in one place I can revisit.**

**Requirement:** `008 FR-004` (Must)

**Preconditions**
- An open request belonging to the signed-in customer, with at least one message.

**Steps**
1. Open the request and read the conversation.
2. Write a reply and send it.
3. Confirm it appears in the same conversation, not a new one.
4. As Sara Ahmed, open the same request and confirm the reply is there.
5. Confirm the reply is attributed to the **customer**, not to a member of
   staff.
6. Try to mark a reply as internal.
7. Reply to a closed request.

**Expected result**
- Step 3: one thread, the reply appended.
- Step 5: the conversation distinguishes who said what.
- **Step 6 is refused.** A customer has no way to create an internal note —
  there is no visibility choice on a portal reply at all.
- Step 7: refused with an explanation, because reopening on reply is not built
  and guessing would be worse than declining.

**Status:** **Automated** — `backend/tests/portal.test.js`, sections *"FR-004 /
AS-07: a reply joins the same thread"* and *"FR-019 again: a reply cannot be
made internal"*.
**Not covered:** attachments (unbuilt), and step 7's reopen behaviour is
deliberately absent rather than wrong.

---

## CP-05 — Point at what happened last time

> *As a* **customer** *I want to* **browse, search and filter all my past
> requests** *so that* **I can point at what happened last time.**

**Requirement:** `008 FR-005` (Must)

**Preconditions**
- A customer with several requests, open and closed.
- **Another** customer with their own requests.

**Steps**
1. Open **My requests**.
2. Count them and compare with what the customer actually has.
3. Confirm closed requests appear as well as open ones.
4. Take the identifier of another customer's request and open it directly by
   address.
5. Open an identifier that does not exist at all.
6. Compare the responses from steps 4 and 5.
7. Search and filter the list.

**Expected result**
- Step 2: exactly their own, no more and no fewer.
- **Steps 4, 5 and 6: both produce the same "not found" response, and the two
  are identical.** Saying "forbidden" for another customer's request would
  confirm it exists.
- Step 7: search and filter narrow the list.

**Status:** ⚠ **Partial.** Automated — `backend/tests/portal.test.js`, sections
*"§11 / FR-005: the customer sees their own, and only their own"* and *"AS-02:
out of scope is NOT FOUND, never forbidden"*, which asserts the two refusal
bodies are identical and that a malformed identifier is also a 404 rather than
an error. The list check explicitly asserts the list is **not empty**, so the
"only their own" check cannot pass vacuously.
**Missing:** step 7 — **search and filter are not built** in the portal. The
list is complete but unsearchable.

---

## CP-06 — Manage requests across my own team

> *As a* **customer** *I want to* **see every ticket my organisation raised,
> where permitted** *so that* **I manage requests across my own team.**

**Requirement:** `008 FR-006` (Should)

**Preconditions**
- An organisation with two customer contacts, each with requests.
- Organisation visibility granted to one of them by staff.

**Steps**
1. Sign in as the customer **with** visibility and confirm both people's
   requests appear.
2. Sign in as the one **without** and confirm only their own appear.
3. Have staff revoke the visibility and confirm the list narrows immediately.

**Expected result**
- Visibility is granted by staff, never claimed by the customer.
- Step 3 takes effect at once, not at next sign-in.

**Status:** ⛔ **Not testable yet.** The portal identity record carries the
field that would control this, defaulting to own-requests-only, and the query
that reads it is written to widen safely. Nothing sets it and no staff screen
grants it.

---

## CP-07 — Solve it myself at no cost to either of us

> *As a* **customer** *I want to* **browse and search FAQs and articles in the
> portal** *so that* **I solve it myself at no cost to either of us.**

**Requirement:** `008 FR-007` (Must)

**Preconditions**
- A knowledge base with customer-visible articles.

**Steps**
1. Browse the knowledge section of the portal.
2. Search it.
3. Confirm only articles visible at the customer's level appear.
4. Confirm an internal article cannot be found by searching its text.

**Expected result**
- The customer finds answers without raising a request.
- Steps 3 and 4: visibility holds in the results, not only on the page.

**Status:** ⛔ **Not testable yet.** No knowledge base exists.

---

## CP-08 — My opinion reaches someone who can act

> *As a* **customer** *I want to* **rate my experience and comment when
> resolved** *so that* **my opinion reaches someone who can act.**

**Requirement:** `008 FR-008` (Must)

**Preconditions**
- A resolved request belonging to the signed-in customer.

**Steps**
1. Open the resolved request and rate the experience, adding a comment.
2. Try to rate it a second time.
3. Confirm staff can see the rating and the comment.
4. Try to rate a request that is not resolved.

**Expected result**
- Step 2: **exactly one rating per request.** Otherwise the figures mean
  nothing.
- Step 4 is not offered — there is nothing to rate yet.

**Status:** ⛔ **Not testable yet.** Not built. Also note a poor rating's
consequence — whether it reopens the request or alerts a manager — is undecided.

---

## CP-09 — Not re-explaining everything from nothing

> *As a* **customer** *I want to* **reopen a resolved ticket when the problem
> returns** *so that* **I do not re-explain everything from nothing.**

**Requirement:** `008 FR-009` (Should)

**Preconditions**
- A request resolved within the reopen window, and one resolved long ago. The
  window is fourteen calendar days from closure.

**Steps**
1. Open the recently resolved request and reopen it.
2. Confirm it keeps its original reference and its whole conversation.
3. Try the same on the long-closed one.
4. Confirm a new linked request is created instead.

**Expected result**
- Step 2: same reference, same thread — the customer continues rather than
  starting again.
- Step 4: the history is still connected.

**Status:** ⛔ **Not testable yet.** Neither behaviour is built. The portal
currently **refuses** a reply to a closed request with an explanation rather
than guessing which behaviour was intended — the refusal is deliberate and
tested.

---

## CP-10 — Informed without being spammed

> *As a* **customer** *I want to* **choose which updates I get, by email, SMS or
> WhatsApp** *so that* **I stay informed without being spammed.**

**Requirement:** `008 FR-010` (Must)

**Preconditions**
- Notifications working, and more than one channel.

**Steps**
1. Open notification preferences in the portal.
2. Turn off status-change notifications, leave replies on.
3. Have staff change the status and confirm nothing arrives.
4. Have staff reply and confirm something does.
5. Change the preferred channel and repeat.

**Expected result**
- Preferences are per event kind **and** per channel, not one switch.

**Status:** ⛔ **Not testable yet.** No notification of any kind reaches a
customer — there is no outbound channel to carry one.

---

## CP-11 — Genuinely usable in my language

> *As a* **customer** *I want to* **Arabic or English with correct right-to-left
> layout** *so that* **it is genuinely usable in my language.**

**Requirement:** `008 FR-011` (Must)

**Preconditions**
- The portal, in a browser.

**Steps**
1. Sign in and switch the language to Arabic.
2. Confirm the whole interface mirrors — navigation, forms, the conversation.
3. Confirm you did not lose your place when switching.
4. Check a reference number and a date inside Arabic text.
5. Check that no English text remains where Arabic should be.
6. Switch back and repeat.

**Expected result**
- Step 2: a true mirror, not right-aligned English layout.
- Step 3: switching preserves context — it is not a reload to the start.
- Step 4: references, phone numbers and email addresses still read
  left-to-right **inside** the Arabic layout. A reversed reference is unusable.
- Step 5: nothing falls back to English. A missing translation shows as a
  missing translation, never as the other language.

**Status:** ⚠ **Partial.** Verified by screenshot at 1440px and 390px in both
languages, including the conversation and the sign-in page. The dictionary is
checked mechanically for keys missing a language and for duplicates.
**Missing:** none of it is asserted by an automated test. This is **manual**
verification recorded as partial because a screenshot check is not a regression
guard — nothing would catch a later change breaking it.

---

## CP-12 — Raise and track requests from anywhere

> *As a* **customer** *I want to* **use the portal comfortably on my phone** *so
> that* **I raise and track requests from anywhere.**

**Requirement:** `008 FR-012` (Must)

**Preconditions**
- A phone, or a browser at 390px wide.

**Steps**
1. Sign in on a phone-sized screen.
2. Raise a request.
3. Read a conversation and reply.
4. Confirm nothing scrolls sideways.
5. Attach a photograph taken with the device camera.
6. Repeat all of it in Arabic.

**Expected result**
- Every task completable on the phone — not merely visible on it.
- Step 4 holds on every screen.

**Status:** ⚠ **Partial.** Verified: **no portal screen scrolls sideways at
390px in either language**, measured across the sign-in, list, detail and
new-request screens. This was found and fixed after a layout defect was
discovered that made *every* staff screen scroll sideways on a phone.
**Missing:** step 5 — attachment capture is not built. And "comfortably" is not
asserted by anything: no automated check confirms a task can be *completed* on a
phone, only that the layout fits.

---

## CP-13 — My details stay accurate without an agent typing them

> *As a* **customer** *I want to* **view and edit my profile and contact
> preferences** *so that* **my details stay accurate without an agent typing
> them.**

**Requirement:** `008 FR-013` (Should)

**Preconditions**
- Signed in to the portal.

**Steps**
1. Open your own profile.
2. Change a phone number and your preferred language.
3. Save.
4. As staff, confirm the change is visible and that the history says **the
   customer** made it.

**Expected result**
- Step 4: the change is attributed to the customer, distinguishable from staff
  having made it. That distinction matters in a dispute.

**Status:** ⛔ **Not testable yet.** No profile screen exists in the portal.

---

## CP-14 — Nobody spends time on something already resolved

> *As a* **customer** *I want to* **withdraw a request I no longer need** *so
> that* **nobody spends time on something already resolved.**

**Requirement:** `008 FR-014` (Could)

**Preconditions**
- An open request belonging to the signed-in customer.

**Steps**
1. Withdraw the request.
2. Confirm its status becomes cancelled.
3. Confirm the assigned agent is notified.
4. Try to withdraw a request that is already resolved.

**Expected result**
- Step 3: the agent is told, or they will keep working on it.
- Step 4 is not offered — there is nothing to withdraw.

**Status:** ⛔ **Not testable yet.** Cancellation exists on the staff side and
requires a reason; the customer-initiated path does not.

---

## CP-15 — A record for my own files

> *As a* **customer** *I want to* **download or print a ticket summary** *so
> that* **I hold a record for my own files.**

**Requirement:** `008 FR-015` (Could)

**Preconditions**
- A request with a conversation, including at least one internal note.

**Steps**
1. Download or print the summary.
2. Read it.
3. Search it for the internal note's text.
4. Produce the Arabic version and check the layout and typography.

**Expected result**
- **Step 3 finds nothing.** An export is a customer-facing surface like any
  other, and it is the one most easily forgotten when internal content is
  excluded.
- Step 4: Arabic renders correctly in the exported file, which is a separate
  problem from rendering correctly on screen.

**Status:** ⛔ **Not testable yet.** Not built.

---

## CP-16 — Check before submitting a ticket about a known outage

> *As a* **customer** *I want to* **see service announcements and known issues**
> *so that* **I check before submitting a ticket about a known outage.**

**Requirement:** `008 FR-016` (Could)

**Preconditions**
- Staff able to publish an announcement.

**Steps**
1. As staff, publish an announcement in both languages with a display period.
2. As a customer, confirm it appears.
3. Confirm it appears **before** the new-request form, where it can prevent the
   request.
4. Let the display period end and confirm it disappears.

**Expected result**
- Step 3 is the point: an announcement a customer reads after submitting saves
  nobody anything.

**Status:** ⛔ **Not testable yet.**

---

## CP-17 — Serious dissatisfaction not queued behind routine questions

> *As a* **customer** *I want to* **raise a complaint through a distinct path
> with its own escalation** *so that* **serious dissatisfaction is not queued
> behind routine questions.**

**Requirement:** `008 FR-017` (Should)

**Preconditions**
- A complaint path configured.

**Steps**
1. Raise a complaint rather than an ordinary request.
2. Confirm it is visibly distinguished for staff.
3. Confirm it follows its own escalation path.

**Expected result**
- A complaint does not sit in the ordinary queue by creation time.

**Status:** ⛔ **Not testable yet.** How a complaint should be handled is an
open question for the client, so this is blocked on a decision and not only on
effort.

---

## CP-18 — Customers see our organisation, not our vendor

> *As an* **administrator** *I want to* **brand the portal with our logo,
> colours, domain and pages** *so that* **customers see our organisation, not
> our vendor.**

**Requirement:** `008 FR-018` (Should)

**Preconditions**
- Administrator access.

**Steps**
1. Set a logo, a colour set and a favicon.
2. Confirm the portal uses them and the **staff** interface does not.
3. Configure a custom domain and open the portal on it.
4. Add a static page and link it.

**Expected result**
- Step 2 is the distinction worth preserving: branding reaches the customer, and
  staff keep an interface that is recognisably the product they were trained on.

**Status:** ⛔ **Not testable yet.** The two interfaces are already visually
distinguished — the portal and staff shells carry different product labels and
an area pill precisely so nobody mistakes one for the other — but nothing is
configurable.

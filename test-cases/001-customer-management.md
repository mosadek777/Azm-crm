# Test cases — 001 Customer management

**22 cases.** Customer records, their contact details, duplicate handling, and
the screens over them.

**Coverage:** 3 automated · 5 partial · 0 manual · 14 not testable yet

---

## Before you start

**Accounts.** Sign-in details are printed by `npm run seed:demo`. You need:

| Role | Who | What they can do here |
|---|---|---|
| Agent | Sara Ahmed | Create and edit customers in her own branch and department |
| Administrator | Dalia Admin | Everything an agent can, plus create staff |
| Customer | Layla Mansour | Signs in at the customer portal, not the staff interface |

**A word on "in scope".** Every member of staff is attached to one branch and
one department. They see only records belonging to theirs. A record in another
branch does not appear as a partial result or a "no access" message — it comes
back as **not found**, exactly as if it had never existed. That is deliberate:
saying "forbidden" would confirm the record exists, which is the disclosure the
rule prevents. Several cases below depend on this.

**Language.** Every case should be run in both Arabic and English. The interface
switches with the control in the header and nothing is lost when it does.

---

## CM-01 — Create a customer while the caller is on the phone

> *As an* **agent** *I want to* **create a new customer profile mid-call** *so
> that* **I can log a request from someone not yet in the system.**

**Requirement:** `001 FR-001` (Must) — a customer can be created from a display
name plus at least one way of contacting them; everything else is optional.

**Preconditions**
- Signed in as Sara Ahmed.

**Steps**
1. Open **Customers** and choose **New customer**.
2. Enter a display name only — leave every other field empty.
3. Try to save.
4. Add one contact point: a phone number.
5. Save.

**Expected result**
- Step 3 is refused, and the refusal says a contact point is required.
- Step 5 succeeds and the new customer's page opens.
- No other field was required at any point — no national ID, no account
  reference, no organisation.
- Repeating with a contact point but no display name is also refused.

**Status:** **Automated** — `backend/tests/customer.test.js`, sections
*"FR-001: display name + one contact point, nothing else required"* and
*"FR-001: refuses when either is missing"*.

---

## CM-02 — Find the right record while the caller waits

> *As an* **agent** *I want to* **search by name, phone, email or
> national/account ID** *so that* **I find the right record while the caller
> waits.**

**Requirement:** `001 FR-002` (Must) — search matches on display name, any
contact point, national ID and account reference; accepts prefixes of three
characters or more; and normalises phone numbers so a local and an international
form find the same person.

**Preconditions**
- A customer exists with a name, a phone number stored in international form
  (`+201001234567`), an email address, a national ID and an account reference.

**Steps**
1. Search for the first four letters of the customer's name.
2. Search for the phone number in **local** form (`01001234567`).
3. Search for the same number in **international** form (`+201001234567`).
4. Search for the email address.
5. Search for the national ID.
6. Search for the account reference.
7. Search for two characters only.

**Expected result**
- Steps 1–6 all return the same single customer.
- Steps 2 and 3 return the **same** record — the stored form and the typed form
  do not have to match.
- Step 7 returns nothing, or asks for more characters. Two characters is below
  the minimum, deliberately: a two-letter search would return most of the
  database while somebody is waiting on the phone.

**Status:** ⚠ **Partial.** Automated: phone normalisation only —
`backend/tests/customer.test.js`, *"FR-002 / AS-02: local and international
forms normalise alike"*.
**Missing:** nothing asserts that search finds a customer by **name**, by
**national ID**, or by **account reference**, and nothing asserts the
three-character minimum. Four of the six things this story promises are
unproven. Run steps 1 and 4–7 by hand until they are automated.

---

## CM-03 — Everything about the customer on one screen

> *As an* **agent** *I want to* **see contacts, company, segment, language and
> tags on one screen** *so that* **I do not click through tabs while someone is
> talking.**

**Requirement:** `001 FR-003` (Must) — the customer view presents identity, all
contact points, organisation, segments, entitlement, preferred language and tags
without navigating away, and says explicitly when a value could not be found.

**Preconditions**
- A customer with several contact points, an organisation, and a preferred
  language.

**Steps**
1. Open the customer.
2. Without clicking anything else, look for: name, every contact point, the
   organisation, segments, entitlement and service level, preferred language,
   and tags.
3. Note anything that is missing or blank.

**Expected result**
- All of it is visible on the first screen, without a second click.
- Where a value genuinely cannot be determined — entitlement, typically — the
  screen **says so explicitly** rather than showing an empty space. A blank
  cannot be told apart from a value of nothing.

**Status:** ⛔ **Not testable yet.** The screen exists and shows identity,
contact points, organisation and preferred language. **Segments and entitlement
do not exist at all** — there is no segment record type in the system, and
nothing supplies entitlement. Until they do, this case cannot pass. Tracked on
the project board as *missing-entities* and *customer-record-depth*.

---

## CM-04 — Several ways to reach the same person

> *As an* **agent** *I want to* **store several phones, emails and WhatsApp
> numbers** *so that* **I can reach them on whichever channel works.**

**Requirement:** `001 FR-004` (Must) — unlimited contact points across phone,
email and WhatsApp. Each value is unique per channel type by default: a clash
with another active customer is surfaced before saving and needs an explicit
confirmation to proceed.

**Preconditions**
- Signed in as Sara Ahmed.

**Steps**
1. Create a customer with one phone number.
2. Add a second phone number.
3. Add two email addresses.
4. Add a WhatsApp number.
5. Try to add a phone number that already belongs to a different active
   customer.
6. Confirm the clash explicitly and save anyway.

**Expected result**
- Steps 1–4 all succeed. There is no limit on how many.
- Step 5 warns, names the other customer, and does **not** save.
- Step 6 saves, and the record notes that somebody chose to override the warning
  and who.

**Status:** ⚠ **Partial.** Automated: the clash and the override —
`backend/tests/customer.test.js`, *"FR-010 / AS-04: surfaced, named, and NOT
blocked"*.
**Missing:** nothing asserts that **several contact points of the same type**
can be held at once, which is the actual promise of this story. Run steps 1–4 by
hand.

---

## CM-05 — One primary way to reach them, in their language

> *As an* **agent** *I want to* **mark a primary contact and a preferred channel
> and language** *so that* **outbound defaults to the right place and
> language.**

**Requirement:** `001 FR-005` (Should) — at most one contact point per channel
type may be primary; outbound messaging defaults to the primary, and to the
customer's preferred language for content.

**Preconditions**
- A customer with two phone numbers and two email addresses.

**Steps**
1. Mark one phone as primary. Save.
2. Mark one email as primary. Save.
3. Try to mark the **second** phone as primary as well.
4. Set the preferred language to Arabic.

**Expected result**
- Steps 1 and 2 both succeed — one primary per channel *type*, not one primary
  overall.
- Step 3 is refused. A person cannot have two primary phone numbers.
- Step 4 saves, and the preference is visible on the record.

**Status:** ⚠ **Partial.** Automated: the primary rules, both the permitted and
the refused case — `backend/tests/customer.test.js`, *"§3: at most one primary
per channel type"*.
**Missing:** *"outbound defaults to the right place and language"* — the half
this story exists for — cannot be tested at all, because no outbound messaging
channel is built. Automate it with the first channel.

---

## CM-06 — Understand the relationship before speaking

> *As an* **agent** *I want to* **one chronological history of every
> interaction, all channels** *so that* **I understand the relationship before I
> speak.**

**Requirement:** `001 FR-006` (Must) — a single reverse-chronological history
spanning every channel and every request, including logged phone calls and
things the customer did in the portal.

**Preconditions**
- A customer with at least two requests, one portal action, and one logged call.

**Steps**
1. Open the customer.
2. Find the interaction history.
3. Confirm it is one list, newest first, mixing every kind of interaction.

**Expected result**
- One merged timeline, not a list of requests with other things elsewhere.
- Requests, messages on those requests, portal actions and logged calls all
  appear in it, in time order.

**Status:** ⛔ **Not testable yet.** The customer screen lists that customer's
**requests**. That is not this: the story asks for one timeline of everything,
which is a different query and a different screen. Not built. Tracked as
*customer-record-depth*.

---

## CM-07 — Find one specific past conversation

> *As an* **agent** *I want to* **filter that history by channel, date range and
> ticket** *so that* **I can find one specific past conversation.**

**Requirement:** `001 FR-007` (Should) — the interaction history is filterable
by channel type, date range and request.

**Preconditions**
- CM-06 passing. This case cannot run before the history exists.

**Steps**
1. Open a customer's interaction history.
2. Filter to one channel.
3. Filter to a date range.
4. Filter to a single request.

**Expected result**
- Each filter narrows the list, and they combine.

**Status:** ⛔ **Not testable yet.** Depends on CM-06, which is not built.

---

## CM-08 — Notes the customer can never see

> *As an* **agent** *I want to* **add internal notes the customer can never
> see** *so that* **I record context for whoever picks this up next.**

**Requirement:** `001 FR-008` (Must) — internal notes are excluded from every
customer-visible surface and from every export a customer can request.

**Preconditions**
- A customer who can sign in to the portal — Layla Mansour in the demo data.
- One of her requests.

**Steps**
1. As Sara Ahmed, open Layla's request and add an **internal** note containing
   an obviously identifiable phrase.
2. Confirm the note is visible to staff on that request.
3. Sign out. Sign in to the **customer portal** as Layla Mansour.
4. Open the same request.
5. Read the whole conversation, and search the page for the phrase from step 1.

**Expected result**
- Staff see the note in step 2.
- The customer sees the conversation **without** it in step 4.
- The phrase appears **nowhere** on the page — not hidden, not greyed out, not
  present in the page source. It never reaches the customer's browser at all.

**Status:** **Automated** — `backend/tests/portal.test.js`, section *"FR-019 /
AS-06: internal content never reaches a portal surface"*. The automated check
asserts the note appears in no part of any portal response, which is stronger
than checking that it is not displayed.

---

## CM-09 — Files that belong to the customer, not to one request

> *As an* **agent** *I want to* **attach files to the customer, not only to
> tickets** *so that* **contracts and ID copies live with the profile.**

**Requirement:** `001 FR-009` (Must) — attachments can be stored against the
customer independently of any request, subject to the size and type limits set
centrally.

**Preconditions**
- A customer record.

**Steps**
1. Open the customer.
2. Attach a document — a contract, say.
3. Confirm it is listed on the profile.
4. Open one of the customer's requests and confirm the document is **not** an
   attachment on that request.

**Expected result**
- The file belongs to the customer and outlives any individual request.

**Status:** ⛔ **Not testable yet.** No attachment capability exists on any
surface. Tracked as *attachments*, which also covers the rule that every
uploaded file is scanned before it is stored.

---

## CM-10 — Warned before creating the same person twice

> *As an* **agent** *I want to* **be warned before creating a duplicate
> customer** *so that* **the database does not hold the same person three
> times.**

**Requirement:** `001 FR-010` (Should) — on create, an existing customer
matching on any contact point, national ID or account reference is detected and
shown **before** saving. It must not block creation.

**Preconditions**
- An existing customer with a known phone number, in Sara's branch.
- A second existing customer with a different known phone number, in a
  **different** branch.

**Steps**
1. As Sara, begin creating a customer using the phone number of the existing
   customer in her own branch.
2. Read the warning.
3. Choose to proceed anyway.
4. Begin creating another customer using the phone number belonging to the
   customer in the **other** branch.
5. Read that warning.

**Expected result**
- Step 2 warns and **names** the matching customer, so the agent can decide.
- Step 3 succeeds. The warning informs; it does not block — sometimes two people
  really do share a phone.
- Step 5 warns that there is a match, but gives **a count and no names**. The
  matching customer is in another branch and naming them would leak a record the
  agent is not entitled to see.

**Status:** **Automated** — `backend/tests/customer.test.js`, sections
*"FR-010 / AS-04: surfaced, named, and NOT blocked"* and *"§11: an out-of-scope
collision is counted, never named"*.

---

## CM-11 — Merge two records for the same person

> *As a* **team lead** *I want to* **merge duplicates and keep the combined
> history** *so that* **reporting is not split across two versions of one
> customer.**

**Requirement:** `001 FR-011` (Should) — merging moves every request,
interaction, attachment, note, consent record and contact point to the surviving
record; the merged record still resolves to the survivor; and the merge cannot
be undone.

**Preconditions**
- Two customer records that are really the same person, each with at least one
  request.

**Steps**
1. As a team lead, open one of them and choose to merge it into the other.
2. Confirm.
3. Open the surviving record.
4. Open the old record's address or reference.
5. Attempt to undo the merge.

**Expected result**
- Everything from both records is on the survivor — requests, history,
  attachments, notes, contact points.
- Step 4 lands on the survivor rather than a dead end. Anyone holding the old
  reference still arrives somewhere useful.
- Step 5 is not offered. The merge is final by design, and the interface should
  say so before step 2 rather than after.

**Status:** ⛔ **Not testable yet.** The customer record carries the field that
would point a merged record at its survivor, but **no merge operation exists**.
A field implying an operation nobody built is exactly the kind of gap this
folder is meant to make visible.

---

## CM-12 — See everything one company has raised

> *As an* **agent** *I want to* **link a customer to an organisation account**
> *so that* **I see every ticket that company has raised.**

**Requirement:** `001 FR-012` (Should) — a person belongs to at most one
organisation; the organisation view lists every request raised by every member.

**Preconditions**
- An organisation record, and two people who work there.

**Steps**
1. Link the first person to the organisation.
2. Link the second person to the same organisation.
3. Try to link a person to another **person** rather than an organisation.
4. Try to put an organisation inside another organisation.
5. Open the organisation and look for the requests raised by both members.

**Expected result**
- Steps 1 and 2 succeed.
- Steps 3 and 4 are refused — the target of a link must be an organisation, and
  organisations do not nest.
- Step 5 shows every request from every member in one place.

**Status:** ⚠ **Partial.** Automated: the linking rules and both refusals —
`backend/tests/customer.test.js`, *"§3: the organisation-target type check"*.
**Missing:** step 5 — *"I see every ticket that company has raised"* — is the
whole point of the story and there is no organisation view. Not built.

---

## CM-13 — Group customers so rules can treat them differently

> *As a* **support manager** *I want to* **segment by tier, region, branch and
> VIP status** *so that* **routing and SLA rules can treat them differently.**

**Requirement:** `001 FR-013` (Should) — administrators define segments; a
customer may hold many; segments are selectable as conditions in automation
rules.

**Preconditions**
- Administrator access.

**Steps**
1. Define a segment — "VIP", say.
2. Apply it to a customer.
3. Confirm it appears on the customer's profile.
4. Open the automation rules and confirm the segment can be used as a condition.

**Expected result**
- Segments are administrator-defined, not fixed in the code.
- A customer can hold several at once.
- They are usable in routing and service-level rules, which is why they exist.

**Status:** ⛔ **Not testable yet, and worse than merely unbuilt.** The customer
record already **references** a segment record type that does not exist —
nothing to point at, so the reference silently resolves to nothing. Step 4
additionally needs the automation engine, which is not built. Tracked as
*missing-entities*.

---

## CM-14 — Know what service level this customer is owed

> *As an* **agent** *I want to* **see active contract, entitlement and SLA tier
> on the profile** *so that* **I know what service level this customer is
> owed.**

**Requirement:** `001 FR-014` (Should) — entitlement and service tier are shown
read-only, and the screen states explicitly when entitlement could not be
resolved.

**Preconditions**
- A customer whose entitlement is known, and one whose is not.

**Steps**
1. Open the first customer and read the entitlement and service tier.
2. Confirm they cannot be edited from this screen.
3. Open the second customer.

**Expected result**
- Step 1 shows both.
- Step 2: they are read-only. This information comes from elsewhere and editing
  it here would create a second, disagreeing version of the truth.
- Step 3 says explicitly that entitlement **could not be determined** — not a
  blank, not a dash.

**Status:** ⛔ **Not testable yet.** Nothing supplies entitlement. Which system
owns it is an open question tied to the ERP integration, so this is blocked on a
decision as well as on build effort.

---

## CM-15 — Judge the relationship at a glance

> *As an* **agent** *I want to* **see open tickets, lifetime tickets, avg
> satisfaction, last contact** *so that* **I judge the health of the
> relationship at a glance.**

**Requirement:** `001 FR-015` (Could) — the record may display open request
count, lifetime count, mean satisfaction and last contact date.

**Preconditions**
- A customer with several requests, at least one resolved and rated.

**Steps**
1. Open the customer.
2. Read the four figures.
3. Open the request list filtered to that customer and count the open ones by
   hand.

**Expected result**
- The four figures are visible without navigating away.
- The count in step 2 matches the count in step 3. A summary figure that
  disagrees with the list behind it is worse than no figure.

**Status:** ⛔ **Not testable yet.** Not built. Mean satisfaction additionally
depends on the customer rating feature, which is also not built.

---

## CM-16 — Handle someone carefully without being told

> *As an* **agent** *I want to* **flag a customer as sensitive or escalated**
> *so that* **colleagues handle them carefully without being told.**

**Requirement:** `001 FR-016` (Could) — a customer may be flagged sensitive, and
the flag is visible on **every surface where the customer's name appears** to
staff.

**Preconditions**
- A customer with at least one request.

**Steps**
1. Flag the customer as sensitive.
2. Open the customer list and find them.
3. Open one of their requests.
4. Open the request list and find that request.
5. Search for the customer and look at the results.

**Expected result**
- The flag is visible in **all four** places. The story's promise is that a
  colleague does not have to be told — which fails if the flag shows only on the
  profile page they might not open.

**Status:** ⛔ **Not testable yet.** The field exists on the record; nothing
displays it, and nothing tests it. Note that the difficult half is not the flag
but its **ubiquity** — every surface, which is four separate screens.

---

## CM-17 — Keep my own details current without phoning anyone

> *As a* **customer** *I want to* **update my own contact details in the
> portal** *so that* **my information stays current without phoning anyone.**

**Requirement:** `001 FR-017` (Should) — a signed-in customer can edit their own
contact points, preferred language and preferred channel through the portal, and
each edit writes a history entry attributed to the customer.

**Preconditions**
- Signed in to the customer portal as Layla Mansour.

**Steps**
1. Open your own details.
2. Change your phone number.
3. Change your preferred language.
4. Save.
5. As a member of staff, open the same customer and check the change history.

**Expected result**
- The changes save and are visible to staff immediately.
- The history says **the customer** made the change, distinguishable from a
  member of staff having made it on their behalf. That distinction matters in a
  dispute.

**Status:** ⛔ **Not testable yet.** The portal has no screen for a customer's
own details.

---

## CM-18 — Capture business-specific data without a code change

> *As an* **administrator** *I want to* **define custom fields on the customer
> record** *so that* **we capture business-specific data without a code
> change.**

**Requirement:** `001 FR-018` (Should) — administrators define custom fields
(text, number, date, single-select, multi-select, boolean) with optional
required flags, supplying an Arabic and an English label for each.

**Preconditions**
- Administrator access.

**Steps**
1. Define a new text field, giving both an Arabic and an English label.
2. Try to save it with only one language filled in.
3. Define a single-select field with three options.
4. Mark one field required.
5. Open a customer and confirm the new fields appear.
6. Try to save a customer leaving the required field empty.

**Expected result**
- Step 2 is **refused**. A label in one language only would appear untranslated
  to half the staff, and the product does not permit that anywhere.
- Steps 1, 3, 4 succeed; step 5 shows the fields; step 6 is refused.

**Status:** ⛔ **Not testable yet.** No custom-field capability exists. Tracked
as *missing-entities* and *admin-configuration*.

---

## CM-19 — Migrate existing data on day one

> *As an* **administrator** *I want to* **import customers in bulk from Excel or
> the ERP** *so that* **we can migrate existing data on day one.**

**Requirement:** `001 FR-019` (Must) — bulk import validates every row before
committing any, creates only valid rows, and returns a per-row error report
naming the row number and the reason.

**Preconditions**
- Administrator access, and a spreadsheet of 100 customers in which rows 7 and
  42 are deliberately invalid.

**Steps**
1. Import the file.
2. Read the result report.
3. Check how many customers were created.
4. Fix rows 7 and 42 and import only those.

**Expected result**
- The report names **row 7** and **row 42** specifically, and says what is wrong
  with each. "Import failed" without row numbers is useless against a hundred
  rows.
- 98 customers are created — the valid rows are not discarded because two rows
  were bad, and the two bad rows are not partially created.
- Step 4 completes the migration.

**Status:** ⛔ **Not testable yet.** No import capability exists.

---

## CM-20 — Settle a data dispute with evidence

> *As an* **auditor** *I want to* **see who changed which field and when** *so
> that* **I can settle a data dispute with evidence.**

**Requirement:** `001 FR-020` (Must) — every field change writes a history entry
carrying who, when, which field, the value before and the value after. The
history cannot be edited or deleted.

**Preconditions**
- A customer record, and an auditor account.

**Steps**
1. As Sara, change the customer's display name from one value to another.
2. As an auditor, open the change history for that customer.
3. Find the entry for step 1.
4. Read: who made the change, when, which field, the old value and the new
   value.
5. Attempt to edit or delete the entry.

**Expected result**
- Step 4 shows all five things. **The old value is the important one** — a
  history saying only "the name was changed" settles no dispute.
- Step 5 is impossible. Not merely not offered in the interface — refused
  outright.

**Status:** ⚠ **Partial.** Automated: entries are written for every change, and
`npm run audit:reconcile` proves no change exists without one and no entry
without a change.
**Missing:** **nothing reads a field change back.** No automated check confirms
the old value and the new value are retrievable afterwards, which is the entire
promise of this story. This is the same gap as `TM-09` in `002`. Run steps 2–4
by hand.

---

## CM-21 — Honour a data-protection request

> *As an* **auditor** *I want to* **anonymise or delete personal data on
> request** *so that* **we honour data-protection obligations.**

**Requirement:** `001 FR-021` (Should) — erasure replaces every identifying
attribute, contact point, attachment and free-text field with non-identifying
placeholders, while preserving request and interaction **counts** for reporting.

**Preconditions**
- A customer with requests, contact points and free-text notes.

**Steps**
1. Note how many requests the customer has.
2. Erase the customer.
3. Look for the name, the phone number, the email address and any free text.
4. Run a report covering the period and check the request count.

**Expected result**
- Nothing identifying survives step 3 — including inside old messages.
- The **counts** in step 4 are unchanged. Erasure removes who it was, not that it
  happened; otherwise every historical report changes retroactively whenever
  somebody exercises their rights.

**Status:** ⛔ **Not testable yet, and blocked on a decision rather than
effort.** Which data-protection regime applies, and how long each kind of record
must be kept, are open questions for the client. Building erasure before those
are answered would produce the wrong erasure.

---

## CM-22 — Do not send a message we have no permission to send

> *As an* **agent** *I want to* **see consent status per channel before
> messaging** *so that* **I do not send a message we have no permission to
> send.**

**Requirement:** `001 FR-022` (Should) — consent is recorded per channel and per
purpose, appended to rather than overwritten, with the source and time of each
entry; outbound sends are refused where consent is absent or withdrawn.

**Preconditions**
- A customer who has consented to email but not to WhatsApp.

**Steps**
1. Open the customer and read the consent status per channel.
2. Attempt to send an email.
3. Attempt to send a WhatsApp message.
4. Withdraw email consent and attempt to send an email again.
5. Look at the consent history.

**Expected result**
- Step 1 shows consent per channel and per purpose, not one overall setting.
- Step 2 succeeds; step 3 is refused; step 4 is refused.
- Step 5 shows the withdrawal **added** to the record, with when and how it was
  received. The earlier consent is still visible. Consent history is appended
  to, never overwritten, because proving what was true at the time is the point.

**Status:** ⛔ **Not testable yet.** No consent record type exists and no
outbound channel exists, so there is nothing to record and nothing to refuse.
Also blocked on the same open client question as CM-21.

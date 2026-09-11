# Test cases — 012 Platform

**15 cases.** Bilingual working, right-to-left layout, multiple branches and
departments, accessibility, branding.

**Coverage:** 1 automated · 6 partial · 0 manual · 8 not testable yet

---

## Before you start

This module is not a feature area. It is the set of decisions every other screen
inherits, and most of it was settled before any screen was built — deliberately,
because each one is a rewrite if taken late and a convention if taken first.

**Three rules run through every case here:**

**Arabic and English are peers.** Not a base language and a translation. Either
can be the working language, switched at any moment without losing your place.
**Nothing ever falls back** to the other language: a missing translation shows as
a missing translation.

**The layout mirrors; it is not corrected.** Spacing and alignment are expressed
as "start" and "end" rather than "left" and "right" throughout, and direction is
set once at the root. There is no right-to-left stylesheet, because a second
stylesheet is a second place to forget.

**Some values never reverse.** Reference numbers, phone numbers, email addresses
and durations always read left-to-right, including inside Arabic text. A
reversed reference is unusable.

**Language.** Every case in **every** file should be run in both languages. Here
that is the subject rather than the method.

---

## PLT-01 — Work in the language I think in

> *As an* **agent** *I want to* **the whole interface in Arabic or English,
> switchable at will** *so that* **I work in the language I think in.**

**Requirement:** `012 FR-001` (Must) — switchable at any time **without losing
context, filters or position**. No string may remain untranslated.

**Preconditions**
- Signed in as an agent.

**Steps**
1. Open the request list and apply two filters.
2. Switch language.
3. Check the filters, the page and the scroll position.
4. Walk every screen in the new language looking for untranslated text.
5. Open a screen, start typing into a form, and switch language mid-entry.
6. Reload the page and confirm the language persisted.

**Expected result**
- Step 3: filters and position survive. Switching is not a reload to the start.
- Step 4: no English text anywhere in the Arabic interface, and none of the
  reverse.
- Step 5: what you typed is still there.

**Status:** ⚠ **Partial.** The dictionary is checked mechanically — every key
carries both languages, and duplicate keys are detected, which has caught a real
fault before. Switching is instantaneous rather than a rebuild, because the
language is held in application state rather than compiled per language.
**Missing:** no automated test asserts step 3 or step 5. Walk them by hand.

---

## PLT-02 — The Arabic interface is designed, not translated

> *As an* **agent** *I want to* **correct right-to-left layout, mirrored icons,
> Arabic typography** *so that* **the Arabic interface is designed, not
> translated.**

**Requirement:** `012 FR-002` (Must)

**Preconditions**
- The interface in Arabic.

**Steps**
1. Compare each screen against its English counterpart — navigation, tables,
   forms, buttons.
2. Confirm the layout is a **mirror**, not right-aligned English.
3. Check directional icons point the correct way.
4. Read Arabic text and check letters join correctly and diacritics sit right.
5. Find a reference number, a phone number, an email address and a date inside
   Arabic text.
6. Check a password field while typing.

**Expected result**
- Step 4: Arabic is set in a typeface designed for Arabic, not a Latin face
  falling back to whatever Arabic glyphs it carries.
- Step 5: each still reads left-to-right.
- **Step 6: what you type and what you see must match.** A password containing a
  neutral character at the end once rendered it at the visual start, so the
  typed value and the displayed value disagreed and sign-in failed.

**Status:** ⚠ **Partial.** Verified by screenshot in both languages across the
sign-in pages, the lists, the detail screens and the portal. Step 6 is fixed and
was verified by measurement and screenshot: the password field is pinned
left-to-right on both interfaces, with the reveal control on the same edge as
the reserved space in both languages.
**Missing:** all of it is **screenshot-verified, not test-asserted**. Nothing
would catch a later change breaking it. Step 3 has never been audited
systematically.

---

## PLT-03 — Information reads the way I expect

> *As a* **customer** *I want to* **dates, numbers and currency in my locale,
> Hijri where required** *so that* **information reads the way I expect.**

**Requirement:** `012 FR-003` (Should) — Hijri display where required; the
stored instant is authoritative and both renderings derive from it.

**Preconditions**
- Content with dates, numbers and currency.

**Steps**
1. Read a date in English, then in Arabic.
2. Read a number and a currency amount in both.
3. Enable Hijri display and read the same date.
4. Check a date that falls on a boundary between the two calendars.

**Expected result**
- Step 4: the two renderings derive from one stored instant. Neither is stored
  separately, so they cannot drift apart.

**Status:** ⛔ **Not testable yet.** Dates render in the reader's locale;
**Hijri display is not built** and currency does not appear anywhere yet.

---

## PLT-04 — Nothing falls back to a language the reader cannot read

> *As an* **administrator** *I want to* **translate configurable content:
> categories, statuses, replies, templates, forms, articles** *so that*
> **nothing falls back to a language the reader cannot read.**

**Requirement:** `012 FR-004` (Must) — every user-visible configurable string is
stored as a localised value with both languages, and a save missing one is
refused.

**Preconditions**
- Administrator access.

**Steps**
1. Create a branch supplying only an English name. Try to save.
2. Create one supplying only an Arabic name. Try to save.
3. Supply both and save.
4. Confirm the refusals in steps 1 and 2 carry both languages themselves.

**Expected result**
- **Both step 1 and step 2 are refused.** Not warned — refused. The rule is
  symmetrical: Arabic-only is exactly as unacceptable as English-only, which is
  what "peer languages" means in practice.
- Step 4: even the refusal is bilingual.

**Status:** **Automated** — `backend/tests/scope.test.js`, section *"spec 012
AS-02: a single-language save is REFUSED, not warned"*, which asserts **both
directions**. Testing only the English-only case would have let an
Arabic-only save through and still passed.

---

## PLT-05 — Respond while away from my desk

> *As an* **agent** *I want to* **the system usable on a tablet or phone
> browser** *so that* **I respond while away from my desk.**

**Requirement:** `012 FR-005` (Must) — every agent task completable on a phone
or tablet, in both languages, including attachment capture from the device.

**Preconditions**
- A phone, or a browser at 390px wide.

**Steps**
1. Sign in on a phone-sized screen.
2. Find a request, open it, read the conversation and reply.
3. Change a status and assign it.
4. Create a customer and a request.
5. Confirm **no screen scrolls sideways**.
6. Attach a photograph taken with the device camera.
7. Repeat all of it in Arabic.

**Expected result**
- Every task **completable**, not merely visible.
- Step 5 holds everywhere.

**Status:** ⚠ **Partial.** Step 5 is **verified across all ten screens in both
languages at 390px** — twenty measurements, no sideways scroll.

**This was not always true, and the discovery is worth recording.** Every staff
screen scrolled sideways on a phone: the content was 466 pixels wide in a 390
pixel window because the top navigation was one non-wrapping row. Nobody had
reported it, no test covered it, and it is invisible at desktop width. It
surfaced only by accident, because a new element positioned relative to the
window appeared in the wrong place.
**Missing:** step 6 (no attachments), and nothing asserts that a task can be
**completed** on a phone — only that the layout fits. There is no automated
guard against the sideways-scroll defect returning.

---

## PLT-06 — An escalation reaches me away from a screen

> *As an* **agent** *I want to* **push notifications from a mobile or installed
> web app** *so that* **an escalation reaches me away from a screen.**

**Requirement:** `012 FR-006` (Should)

**Preconditions**
- Notifications working.

**Steps**
1. Install the application from the browser.
2. Grant notification permission.
3. Trigger an escalation and confirm a push arrives with the application closed.
4. Deny permission and confirm the system falls back to in-app and email.

**Expected result**
- Step 4: refusing push does not mean receiving nothing.

**Status:** ⛔ **Not testable yet.** **Nothing notifies staff of anything** —
neither in-app, nor email, nor push. Note the fallback in step 4 is already
specified elsewhere, which presupposes an in-app channel; the in-app feedback
that does exist is for the user's own actions, not for events.

---

## PLT-07 — Each department keeps its process on one platform

> *As an* **administrator** *I want to* **multiple departments with separate
> queues, categories, SLAs, reporting** *so that* **each department keeps its
> process on one platform.**

**Requirement:** `012 FR-007` (Must)

**Preconditions**
- Two departments and staff in each.

**Steps**
1. Create a second department.
2. Put an agent in each.
3. Confirm each sees only their own department's requests and customers.
4. Confirm a department can be deactivated but not deleted while records
   reference it.
5. Confirm reporting can be filtered per department.

**Expected result**
- Step 3 holds on every list, count and search.
- Step 4: deactivation, never deletion — deleting a department would strand
  every record in it behind a filter that can no longer match.

**Status:** ⚠ **Partial.** Automated: departments exist, are bilingual, and the
access rule applies department-by-department, not merely branch-by-branch —
`backend/tests/scope.test.js`, *"§11: list users applies branch AND department
scope"*, which catches the case where a caller is correctly in the branch and
wrongly in the department.
**Missing:** steps 4 and 5. Deactivation exists on the record; **no deletion
path is offered anywhere**, which satisfies the requirement by omission rather
than by a guard. Per-department reporting does not exist.

---

## PLT-08 — Geography handled properly, not ignored

> *As an* **administrator** *I want to* **multiple branches with scoped data,
> hours, holidays, reporting** *so that* **geography is handled properly, not
> ignored.**

**Requirement:** `012 FR-008` (Must) — each branch owns a timezone, business
calendar, holiday set and default locale.

**Preconditions**
- Two branches in different time zones.

**Steps**
1. Create a second branch with its own timezone and default language.
2. Confirm records created there default to its language.
3. Confirm an agent in one branch cannot see the other's data.
4. Configure the branch's business hours and holidays.
5. Confirm timings are measured in the branch's own working time.

**Expected result**
- Steps 2 and 3 hold.
- Step 5: a branch is not late because another branch's office was open.

**Status:** ⚠ **Partial.** Automated: branches exist with a timezone and default
locale, the access rule applies per branch, and the default language propagates
to records created there.
**Missing:** **steps 4 and 5 cannot be done at all.** The branch record
references a business calendar and a holiday set, and **neither record type
exists** — they were specified, referenced in code, and never built. Until they
do, a branch has a timezone and nothing else about when it is open.

---

## PLT-09 — Cross-organisation handoffs clean and fairly measured

> *As an* **agent** *I want to* **transfer across departments or branches with
> context and recalculated SLA** *so that* **cross-organisation handoffs are
> clean and fairly measured.**

**Requirement:** `012 FR-009` (Should) — a required reason, carrying context,
with the service clock recalculated.

**Preconditions**
- Two departments, and a request in one.

**Steps**
1. Transfer the request to the other department without a reason.
2. Transfer with a reason.
3. Confirm the whole conversation and history travel with it.
4. Confirm the receiving department sees it and the sending one no longer does.
5. Confirm the service clock is recalculated against the receiving department's
   policy.
6. Read the history and find who transferred it and why.

**Expected result**
- Step 1 refused — a transfer without a reason is a request appearing from
  nowhere.
- Step 5: the receiving team is measured against their own commitment, not one
  made by somebody else.

**Status:** ⛔ **Not testable yet.** No transfer path exists across departments
or branches; assignment works only within a scope. Step 5 additionally needs the
service-level engine.

---

## PLT-10 — The system looks like ours to people outside it

> *As an* **administrator** *I want to* **our logo, colours, favicon, email
> furniture and portal domain** *so that* **the system looks like ours to people
> outside it.**

**Requirement:** `012 FR-010` (Should)

**Preconditions**
- Administrator access.

**Steps**
1. Set a logo, colours and a favicon.
2. Confirm the **portal** uses them.
3. Confirm the **staff** interface does not.
4. Configure a portal domain and email furniture.

**Expected result**
- Step 3 is the distinction worth keeping: branding reaches the customer, and
  staff keep an interface recognisably the product they were trained on.

**Status:** ⛔ **Not testable yet.** Nothing is configurable. The two interfaces
are already visually distinguished — different product labels and an area
badge — but by code, not by configuration.

---

## PLT-11 — Host a subsidiary without a second installation

> *As an* **administrator** *I want to* **separate entities with isolated data
> on one deployment** *so that* **we host a subsidiary without a second
> installation.**

**Requirement:** `012 FR-011` (Could)

**Preconditions**
- Two entities configured.

**Steps**
1. Create records in each.
2. Confirm no path exists between them — not in lists, search, reports or the
   audit trail.
3. Confirm an administrator of one cannot reach the other.

**Expected result**
- Total isolation, with no shared surface at all.

**Status:** ⛔ **Not testable yet, and deliberately not supported.** This was
decided rather than deferred: the requirement is optional, no story asks for it,
and **the business fact that would make it necessary — whether a subsidiary
exists — is unknown**. If one appears, this decision is what to reopen.

---

## PLT-12 — Colleagues with disabilities can do this job

> *As an* **agent** *I want to* **keyboard navigation, screen-reader labels,
> adequate contrast** *so that* **colleagues with disabilities can do this
> job.**

**Requirement:** `012 FR-012` (Should) — the agent workspace **and** the
customer portal meet WCAG 2.1 AA with no level-A failures, fully operable from
the keyboard.

**Preconditions**
- Both interfaces, a keyboard, and a screen reader.

**Steps**
1. Complete a full task using only the keyboard — sign in, find a request, read
   it, reply, change its status.
2. Confirm focus is always visible and never trapped.
3. Confirm every control has an accessible name in the active language.
4. Check contrast on text, buttons and status indicators.
5. Confirm no meaning is carried by colour alone.
6. **Repeat all of it in Arabic**, checking that focus order and arrow-key
   movement mirror with the layout.
7. Repeat on the portal.

**Expected result**
- A colleague using a keyboard or a screen reader can do the whole job.
- Step 6 is the one most likely to be missed: a layout can mirror visually while
  focus still moves in the original direction.

**Status:** ⛔ **Not testable yet.** **Ten screens have been hand-built without
a component library and not one has had an accessibility or keyboard audit in
either language.** Individual controls have been done carefully — the password
reveal carries a proper label and reports its state, and the in-app feedback
messages are announced without stealing focus — but nothing has been audited
systematically, and careful individual controls are not an audit.

---

## PLT-13 — A nine-hour shift is easier on my eyes

> *As an* **agent** *I want to* **a dark interface** *so that* **a nine-hour
> shift is easier on my eyes.**

**Requirement:** `012 FR-013` (Could) — meeting the same contrast requirements.

**Preconditions**
- The interface.

**Steps**
1. Switch to the dark presentation.
2. Walk every screen.
3. Check contrast against the same standard as the light one.
4. Confirm the choice persists across sessions.

**Expected result**
- Step 3: a dark theme that fails contrast has traded one accessibility problem
  for another.

**Status:** ⛔ **Not testable yet.** Not built. The colour palette is defined as
tokens in one place, which is what would make it feasible.

---

## PLT-14 — A new agent is productive in days, not weeks

> *As an* **agent** *I want to* **in-app guidance and role-based training
> content** *so that* **a new agent is productive in days, not weeks.**

**Requirement:** `012 FR-014` (Could)

**Preconditions**
- The interface.

**Steps**
1. Sign in as a new agent and confirm guidance appears.
2. Confirm it differs by role.
3. Dismiss it and confirm it stays dismissed.
4. Confirm it exists in both languages.

**Expected result**
- Guidance is role-appropriate and does not nag.

**Status:** ⛔ **Not testable yet.**

---

## PLT-15 — Know whether my work was saved

> *As an* **agent** *I want to* **immediate confirmation in the interface that
> what I just did succeeded or failed, in the language I am working in** *so
> that* **I know whether my work was saved without re-reading the screen to
> check.**

**Requirement:** `012 FR-016` (Should)

**Preconditions**
- Signed in, on either interface.

**Steps**
1. Create a request and watch for a confirmation.
2. Read what it says and confirm it names the request.
3. Attempt an action the server refuses — as an administrator, post a
   customer-visible reply.
4. Read the failure message.
5. Confirm the confirmation in step 1 clears itself and the failure in step 3
   does not.
6. Dismiss the failure with the keyboard.
7. Repeat in Arabic and confirm the message appears on the mirrored side.
8. Repeat at 390px and confirm it appears at the bottom without covering
   anything.

**Expected result**
- Step 4 shows **the server's own message**, in the working language — not a
  client-written guess at what went wrong.
- Step 5: a confirmation clears itself; a failure waits to be read. A message
  that removes itself before it is read is worse than none.
- Step 7: the whole thing mirrors, and several stack without overlapping or
  moving the page.

**Status:** ⚠ **Partial.** Verified end to end through the interface: an agent
posting an internal note receives the Arabic confirmation, and an administrator
attempting a customer-visible reply receives **the server's own Arabic
refusal** — *"مرفوض: الرد المرئي للعميل يتطلب صلاحية موظف دعم أو قائد فريق أو
مدير"* — still on screen six seconds later. Placement, mirroring, stacking order
and reduced-motion behaviour were verified by screenshot at 1440px and 390px in
both languages.
**Missing:** none of it is asserted by an automated test. The requirement is
newly ratified and the verification is manual.

# Test cases — 011 Integrations

**17 cases.** The API other systems build against, webhooks, the ERP link,
provider credentials, bulk import and export.

**Coverage:** 0 automated · 1 partial · 0 manual · 16 not testable yet

---

## Before you start

⛔ **Almost nothing in this module is built**, with one real exception: the API
is **documented**, browsable and exercisable today, even though nothing about
authentication for third parties exists. See INT-04.

**What blocks the ERP half, and it is not effort.** No ERP product has been
named, no endpoint supplied and no field mapping agreed — including the question
that matters most: **which system holds the authoritative customer record when
both have one.** Until that is settled, an integration would be guessing at both
the connection and the direction of truth.

**One decision is already made and should not be relitigated.** This CRM is the
system of record; the ERP is read-only reference. There are no writes from here
to there. That is why INT-07 is a "could" and why INT-06 was downgraded.

**A note on INT-06.** The story itself carries its downgrade: two-way
synchronisation with conflict resolution was replaced by a **divergence
report** — drift is detected and reported, never resolved automatically. The
case below tests the report, not the sync, and the original wording is preserved
so the change is visible.

---

## INT-01 — Build against the CRM without reverse engineering

> *As a* **developer** *I want to* **a documented REST API for customers,
> tickets, comments, attachments, articles, users** *so that* **we build against
> the CRM without reverse engineering.**

**Requirement:** `011 FR-001` (Must)

**Preconditions**
- The API documentation.

**Steps**
1. Open the documentation and find each resource.
2. Read the request and response shape of each operation.
3. Confirm error responses are documented, not only success.
4. Confirm the "not found" behaviour for out-of-scope records is documented
   prominently.
5. Look for resources the documentation does not cover.

**Expected result**
- Step 3 matters as much as step 2: an integrator handles errors more often than
  successes.
- **Step 4 is essential.** An integrator who reads "404" as "deleted" will
  delete their own copy of a record that exists and is merely out of their reach.
- Step 5: undocumented routes are **absent** from the documentation rather than
  described from guesswork.

**Status:** ⛔ **Not testable yet as written** — attachments and articles do not
exist, so a third of the resources named cannot be documented. Customers,
tickets, comments and users **are** documented; see INT-04.

---

## INT-02 — Secure and predictable under load

> *As a* **developer** *I want to* **OAuth2 or scoped API keys under published
> rate limits** *so that* **integration is secure and predictable under load.**

**Requirement:** `011 FR-002` (Must)

**Preconditions**
- API credentials working.

**Steps**
1. Create a credential with a narrow scope.
2. Call within the scope, then outside it.
3. Exceed the rate limit.
4. Read the response and confirm it says when to retry.
5. Confirm the limits are published in the documentation.

**Expected result**
- Step 2: an API credential is scoped exactly like a person — it does not get a
  wider view because it is a machine.
- Step 4: a rate-limit response that does not say when to retry produces clients
  that hammer the endpoint.

**Status:** ⛔ **Not testable yet.** No API credentials exist. The only
authentication is a human sign-in, and there is no rate limiting anywhere.

---

## INT-03 — External systems react in real time and can trust the payload

> *As a* **developer** *I want to* **webhooks for created, updated,
> status-changed, breached, resolved, with retries and signatures** *so that*
> **external systems react in real time and can trust the payload.**

**Requirement:** `011 FR-003` (Must)

**Preconditions**
- A receiving endpoint.

**Steps**
1. Subscribe to request-created.
2. Create a request and confirm the webhook arrives.
3. Verify its signature.
4. Alter the payload and confirm the signature no longer verifies.
5. Make the receiver fail and confirm delivery is retried on a published
   schedule.
6. Confirm repeated failure raises an alert rather than being abandoned
   silently.
7. Confirm a webhook carries only data the subscription is entitled to.

**Expected result**
- Steps 3 and 4: the signature is what makes the payload trustworthy; without it
  a receiver cannot tell a real event from anything that can reach its address.
- Step 6: silent abandonment is the failure mode this requirement exists to
  prevent.
- Step 7: a webhook is a read, and reads are scoped.

**Status:** ⛔ **Not testable yet.**

---

## INT-04 — Integration work is self-service

> *As a* **developer** *I want to* **interactive API docs and a sandbox to
> call** *so that* **integration work is self-service.**

**Requirement:** `011 FR-004` (Should)

**Preconditions**
- The running system.

**Steps**
1. Open the interactive documentation in a browser.
2. Sign in from within it.
3. Call an endpoint directly from the page and read the real response.
4. Import the collection into an API client and run a request.
5. Confirm the documentation matches the running code.

**Expected result**
- An integrator can make a first successful call without asking anybody.
- Step 5: the documentation is generated from annotations that live beside the
  routes, so a route and its documentation are edited together.

**Status:** ⚠ **Partial, and the only thing in this module that exists.**
Interactive documentation is served by the running system, exported to a
machine-readable file, converted into an importable collection, and published.
Signing in from the documentation stores the token automatically for subsequent
calls.
**Missing:** there is **no sandbox** — the documentation calls the real system
with a real account, so step 3 creates real records. That is fine for a
developer with their own environment and wrong for a third party.

---

## INT-05 — Answer billing without opening another system

> *As an* **agent** *I want to* **ERP contract, invoice and order data on the
> ticket** *so that* **I answer billing without opening another system.**

**Requirement:** `011 FR-005` (Must)

**Preconditions**
- An ERP connection, and a customer with orders.

**Steps**
1. Open a request from that customer.
2. Read their contract, recent invoices and orders beside the conversation.
3. Disconnect the ERP and reload.
4. Read what is shown in its place.

**Expected result**
- Step 2: the agent does not open a second system.
- **Step 4 is the case worth designing first.** When the ERP is unreachable, the
  request must still open and the panel must say the data is **unavailable** —
  not show an empty contract, which an agent will read as "no contract".

**Status:** ⛔ **Not testable yet.** No ERP named. The customer record already
carries an optional join key for one, and unlinked customers are a normal state
rather than an error.

---

## INT-06 — Master data divergence is visible, though not prevented

> *As an* **administrator** *I want to* ~~customer and account sync with the ERP
> under explicit conflict rules~~ — **downgraded 2026-09-07** to a scheduled
> **divergence report**: drift is detected and reported, never resolved
> automatically — *so that* **master data divergence is visible, though not
> prevented.**

**Requirement:** `011 FR-006` (Should)

**Preconditions**
- An ERP connection, and records that differ between the two systems.

**Steps**
1. Run the divergence report.
2. Read which records differ and in which fields.
3. Confirm **nothing was changed** in either system.
4. Correct one by hand and re-run.
5. Confirm it no longer appears.

**Expected result**
- Step 3 is the substance of the downgrade. Automatic resolution needs agreed
  conflict rules, and agreeing them needs somebody to say which system wins per
  field. Reporting the difference needs neither and delivers most of the value.
- The report names records and fields, not a count.

**Status:** ⛔ **Not testable yet.** The original wording is kept above so the
downgrade stays visible rather than being quietly rewritten into the weaker
form.

---

## INT-07 — A handoff is not an email and a hope

> *As an* **agent** *I want to* **raise a follow-up ERP transaction from the
> ticket** *so that* **a handoff is not an email and a hope.**

**Requirement:** `011 FR-007` (Could)

**Preconditions**
- An ERP connection permitting writes.

**Steps**
1. From a request, raise a transaction in the ERP.
2. Confirm it appears there.
3. Confirm the request records what was raised and its reference.
4. Confirm the action is audited here.

**Expected result**
- The link is two-way and traceable from either side.

**Status:** ⛔ **Not testable yet, and it contradicts a settled decision.** This
CRM is the system of record and the ERP is **read-only reference** — there are
no writes from here to there. This case cannot be built without reopening that
decision, which is why the requirement is a "could" rather than a "should".

---

## INT-08 — Not locked to one vendor's pricing

> *As an* **administrator** *I want to* **configure email, SMS and WhatsApp
> credentials and swap providers** *so that* **we are not locked to one vendor's
> pricing.**

**Requirement:** `011 FR-008` (Should)

**Preconditions**
- Two providers for one channel.

**Steps**
1. Configure the first and send a message.
2. Swap to the second without a release.
3. Send again.
4. Confirm history from the first provider is still readable.

**Expected result**
- Step 4: swapping a provider does not orphan the messages sent through the old
  one.

**Status:** ⛔ **Not testable yet.** No channels.

---

## INT-09 — Know whether the customer received my reply

> *As an* **agent** *I want to* **sent, delivered, read and failed status shown
> on the ticket** *so that* **I know whether the customer received my reply.**

**Requirement:** `011 FR-009` (Should)

**Preconditions**
- A channel reporting delivery status.

**Steps**
1. Send a reply and watch its status change from sent to delivered.
2. Send to an address that will fail and confirm the failure shows **on the
   message**.
3. Confirm the agent is told about the failure rather than having to notice.
4. Confirm a channel that cannot report "read" does not display a false one.

**Expected result**
- Step 3 is the story's promise. An agent who believes they answered a customer
  and did not is the failure this prevents.
- Step 4: absence of a capability is shown as absence, not as a guess.

**Status:** ⛔ **Not testable yet.**

---

## INT-10 — Joiners and leavers handled without manual steps

> *As an* **administrator** *I want to* **users provisioned automatically from
> the identity provider** *so that* **joiners and leavers are handled without
> manual steps.**

**Requirement:** `011 FR-010` (Could)

**Preconditions**
- An identity provider with provisioning.

**Steps**
1. Add a person in the provider and confirm an account appears here.
2. Confirm their branch and department are mapped correctly.
3. Remove them in the provider and confirm the account is **deactivated**, not
   deleted.
4. Confirm their sessions end.

**Expected result**
- Step 3: deletion is never the outcome — the audit trail names them.

**Status:** ⛔ **Not testable yet.** No identity provider has been named, which
also blocks single sign-on.

---

## INT-11 — Voice fits the same workflow as everything else

> *As an* **agent** *I want to* **screen pop on inbound call, click to dial,
> link to the recording** *so that* **voice fits the same workflow as everything
> else.**

**Requirement:** `011 FR-011` (Could)

**Preconditions**
- A telephony integration.

**Steps**
1. Receive a call from a known customer and confirm their record opens.
2. Receive one from an unknown number.
3. Click to dial from a request.
4. Open the recording linked on the request.
5. Confirm the recording respects the same access rules as the request.

**Expected result**
- Step 2 offers to create a customer rather than failing.
- Step 5: a recording is customer data and is scoped like any other.

**Status:** ⛔ **Not testable yet.**

---

## INT-12 — Support data joins the rest of the business

> *As a* **support manager** *I want to* **CRM data pushed to our data
> warehouse** *so that* **support data joins the rest of the business.**

**Requirement:** `011 FR-012` (Should)

**Preconditions**
- A warehouse destination.

**Steps**
1. Configure the export.
2. Run it and confirm the data arrives.
3. Confirm it runs on a schedule.
4. Confirm personal data handling matches the retention policy.
5. Confirm the export is audited.

**Expected result**
- Step 4: pushing data to a warehouse moves it outside this system's access
  controls, which is exactly where retention and jurisdiction rules get lost.

**Status:** ⛔ **Not testable yet.**

---

## INT-13 — Migrations and mass corrections are safe to attempt

> *As an* **administrator** *I want to* **bulk import and export with validation
> and an error report** *so that* **migrations and mass corrections are safe to
> attempt.**

**Requirement:** `011 FR-013` (Must)

**Preconditions**
- A file of records, some deliberately invalid.

**Steps**
1. Import the file.
2. Read the per-row error report.
3. Confirm valid rows were created and invalid ones were not.
4. Confirm no row was **partially** created.
5. Export, edit, and re-import to make a mass correction.
6. Confirm the import respects the importer's own scope.

**Expected result**
- Step 2 names row numbers and reasons — "import failed" is useless against a
  thousand rows.
- Step 4: a half-created record is worse than a rejected one, because nobody
  looks for it.
- Step 6: bulk import is not a way to write into another branch.

**Status:** ⛔ **Not testable yet.** No import or export exists. This is also
`001`'s bulk-import story, and it is the one most likely to be needed on day one
of a real deployment.

---

## INT-14 — A broken sync is recoverable, not a mystery

> *As an* **administrator** *I want to* **integration monitoring with failures,
> payloads and manual replay** *so that* **a broken sync is recoverable, not a
> mystery.**

**Requirement:** `011 FR-014` (Should)

**Preconditions**
- An integration that can fail.

**Steps**
1. Break it and let some operations fail.
2. Open the monitoring view and read the failures.
3. Inspect a failed payload.
4. Fix the cause and replay the failed operations.
5. Confirm replay does not duplicate anything that already succeeded.

**Expected result**
- Step 5 is the hard part: replay must be safe to run twice.
- Payloads are inspectable, and identifying data within them is handled as
  carefully as anywhere else.

**Status:** ⛔ **Not testable yet.**

---

## INT-15 — Our integration does not break without warning

> *As a* **developer** *I want to* **a versioned API with a deprecation policy**
> *so that* **our integration does not break without warning.**

**Requirement:** `011 FR-015` (Should)

**Preconditions**
- The API in use by a third party.

**Steps**
1. Read the published deprecation policy.
2. Confirm a version is identifiable in every request.
3. Deprecate an endpoint and confirm callers are warned in the response.
4. Confirm the old version keeps working for the published period.

**Expected result**
- Step 3: a caller learns of a deprecation from the responses they already
  receive, not from a page nobody reads.

**Status:** ⛔ **Not testable yet.** The API is unversioned. Worth settling
**before** a third party integrates rather than after, since versioning
retrofitted to live callers is a breaking change in itself.

---

## INT-16 — Support reaches other departments where they already are

> *As an* **administrator** *I want to* **escalation notices into Teams or
> Slack** *so that* **support reaches other departments where they already
> are.**

**Requirement:** `011 FR-016` (Could)

**Preconditions**
- A workspace connection.

**Steps**
1. Configure the destination.
2. Escalate a request and confirm the notice arrives.
3. Confirm it contains no customer-identifying detail beyond what is agreed.
4. Confirm a failure to deliver is visible here.

**Expected result**
- Step 3: a notice into a general channel is readable by people with no access
  to the request itself.

**Status:** ⛔ **Not testable yet.** Escalation is unbuilt.

---

## INT-17 — A new integration adapts without development

> *As an* **administrator** *I want to* **field mapping between CRM and external
> systems in a UI** *so that* **a new integration adapts without development.**

**Requirement:** `011 FR-017` (Could)

**Preconditions**
- An integration with mappable fields.

**Steps**
1. Open the mapping screen.
2. Map an external field to one here.
3. Confirm a type mismatch is refused at mapping time.
4. Run the integration and confirm the mapping applies.

**Expected result**
- Step 3: a mismatch caught when mapping is a message; caught at runtime it is a
  silently corrupted record.

**Status:** ⛔ **Not testable yet.**

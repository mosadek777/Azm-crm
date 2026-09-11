# Test cases — 013 Cross-cutting requirements

**10 cases.** Performance, capacity, uptime, monitoring, releases, and the
published legal terms.

**Coverage:** 0 automated · 1 partial · 0 manual · 9 not testable yet

---

## Before you start

⛔ **Nothing in this module is built**, and like the agent workspace it had **no
card on the project board at all** until a requirement-by-requirement audit
found it. The reason it disappeared is worth naming: **these are not features,
so there was no module to hang a card on.**

**These cases become urgent at a specific moment** — when somebody outside the
project relies on the system. None of them matters for a demonstration. All of
them matter before real customer data exists.

---

## ⚠ A correction, kept rather than quietly removed

An earlier revision of the coverage audit claimed these ten stories were the
only ones in the repository that **no requirement traced back to**, and called
it a traceability break.

**That was wrong, and it was a fault in the analysis rather than in the specs.**

Spec `013` is the only one of the thirteen whose requirement table carries a
fifth column — `| ID | Requirement | Level | Traces | Status |`. The extractor
read the **last** cell as the traces column, so for this spec alone it read
*Status* and found no story identifiers. Every other spec ends at Traces.

**All ten stories are correctly traced**, to `013 FR-001` through `FR-010`
respectively. There is no traceability break. What is true is far more ordinary:
none of it is built.

The correction is recorded rather than edited away, because a document that
silently changes its own findings is worth no more than no document.

---

## ⚠ Most of these cannot be verified without an agreed number

Six of the ten measure something against a target, and **the targets do not
exist**. How many agents at once, how many requests a month, what uptime is
promised, how much data may be lost, how long recovery may take — none has been
agreed with the client.

That is not an excuse for deferring the cases. It is the reason to write them:
each one names the number it needs, so the conversation can happen once rather
than six times.

---

## NFR-01 — The tool is never the reason I am slow

> *As an* **agent** *I want to* **ticket lists and searches to return in under
> two seconds at full volume** *so that* **the tool is never the reason I am
> slow.**

**Requirement:** `013 FR-001` (Must) — lists within two seconds, search within
three, customer search within one, **measured at the 95th percentile**.

**Preconditions**
- The system loaded to the agreed target volume.

**Steps**
1. Load the system to the agreed volume of customers, requests and messages.
2. Open the request list with filters applied, a hundred times.
3. Record the 95th-percentile response time.
4. Repeat for full-text search and for customer search.
5. Repeat with a large branch and a small one.

**Expected result**
- Each figure is within its budget.
- Step 3: the **95th percentile**, not the average. An average hides the one
  request in twenty that takes eight seconds, and that is the one an agent
  remembers.

**Status:** ⛔ **Not testable yet.** Nothing measures response time, and **the
target volume has not been agreed**, so "at full volume" has no meaning yet.
The indexes that would matter are in place and one of them was found, early on,
to have been silently not applied — so the groundwork has had attention even
though the measurement has not.

---

## NFR-02 — Growth does not force a re-platform

> *As an* **administrator** *I want to* **the agreed concurrent agents and
> monthly volume held, with headroom** *so that* **growth does not force a
> re-platform.**

**Requirement:** `013 FR-002` (Must) — with at least 50% headroom.

**Preconditions**
- Agreed figures for concurrent agents and monthly volume.

**Steps**
1. Simulate the agreed number of agents working simultaneously.
2. Confirm response times stay within their budgets.
3. Increase to 150% of the agreed figure.
4. Confirm it still holds.
5. Record where it begins to degrade, and what degrades first.

**Expected result**
- Step 4 is the requirement — headroom, so that ordinary growth is not a
  crisis.
- Step 5 is the more useful output: knowing **what** breaks first is what makes
  the next decision cheap.

**Status:** ⛔ **Not testable yet.** No agreed figures, and no load testing of
any kind.

---

## NFR-03 — I can answer whether it is us or them

> *As a* **support manager** *I want to* **a stated uptime target and a public
> status page** *so that* **I can answer whether it is us or them.**

**Requirement:** `013 FR-003` (Must)

**Preconditions**
- A deployed environment.

**Steps**
1. Read the stated uptime target.
2. Open the status page as somebody outside the organisation.
3. Confirm it reflects current state rather than being updated by hand.
4. Take a component down and confirm the page shows it.
5. Confirm the page is readable when the main system is not.

**Expected result**
- Step 5 is the whole point. A status page hosted on the system it reports is
  unavailable exactly when it is needed.

**Status:** ⛔ **Not testable yet.** No uptime target agreed and no status page.
Note the target is a commercial commitment; the page is not, and could be built
without it.

---

## NFR-04 — The conversation feels live, not posted

> *As a* **customer** *I want to* **chat messages and notifications within a
> second** *so that* **the conversation feels live, not posted.**

**Requirement:** `013 FR-004` (Should)

**Preconditions**
- Live chat and notifications working.

**Steps**
1. Send a chat message and measure until it appears for the agent.
2. Measure a notification from event to arrival.
3. Repeat under load.

**Expected result**
- Both within a second at the 95th percentile.

**Status:** ⛔ **Not testable yet.** Neither chat nor notifications exist.

---

## NFR-05 — Storage and page load stay under control

> *As an* **administrator** *I want to* **attachment size limits, deduplication
> and fast delivery of large files** *so that* **storage and page load stay
> under control.**

**Requirement:** `013 FR-005` (Should)

**Preconditions**
- Attachments working.

**Steps**
1. Upload a file over the limit and confirm it is refused.
2. Upload the same file to two requests and confirm it is stored once.
3. Download a large file and measure.
4. Confirm a page with many attachments does not load them all eagerly.

**Expected result**
- Step 2: deduplication is by content, so the same document attached fifty times
  costs one copy.
- Step 4: a request with thirty attachments opens as fast as one with none.

**Status:** ⛔ **Not testable yet.** No attachments anywhere.

---

## NFR-06 — Support of the tool itself has a defined boundary

> *As an* **administrator** *I want to* **know exactly which browsers and
> versions are supported** *so that* **support of the tool itself has a defined
> boundary.**

**Requirement:** `013 FR-006` (Should) — the supported browsers and minimum
versions are stated, and **every acceptance scenario across all specs passes on
each of them**.

**Preconditions**
- A stated support matrix.

**Steps**
1. Read the published list of supported browsers and minimum versions.
2. Run this entire folder's cases on each.
3. Run them in both languages on each.
4. Confirm an unsupported browser says so rather than failing oddly.

**Expected result**
- Step 2 is what makes the statement real. A support list nobody tests against
  is a guess.

**Status:** ⛔ **Not testable yet.** **No support matrix has been stated.**
Verification so far has been on one browser engine only. This requirement is
also the upstream reason this folder exists in the form it does — "every
acceptance scenario across all specs" needs the scenarios to be written down,
which they now are.

---

## NFR-07 — We find out before the customers tell us

> *As an* **administrator** *I want to* **monitoring and alerting on error
> rates, queue depth, integration failures** *so that* **we find out before the
> customers tell us.**

**Requirement:** `013 FR-007` (Must) — error rate, request latency, queue depth,
integration failure and channel health.

**Preconditions**
- A deployed environment.

**Steps**
1. Open the monitoring view and read each measure.
2. Cause errors and confirm the rate rises visibly.
3. Break an integration and confirm it is reported.
4. Confirm somebody is **alerted**, not merely that a dashboard changed.
5. Confirm an alert reaches somebody outside working hours.

**Expected result**
- Steps 4 and 5: the promise is "we find out", not "it is visible". A dashboard
  nobody opens on a Friday evening satisfies neither.

**Status:** ⛔ **Not testable yet.** Nothing is monitored and nothing alerts. A
failure is currently noticed when somebody reports it.

---

## NFR-08 — Shipping a fix is routine, not an event

> *As a* **developer** *I want to* **CI with zero-downtime releases and
> reversible migrations** *so that* **shipping a fix is routine, not an event.**

**Requirement:** `013 FR-008` (Must) — releases are zero-downtime; migrations
are reversible **with the reversal verified before release**; rollback is
possible.

**Preconditions**
- A deployed environment and a release pipeline.

**Steps**
1. Push a change and confirm the automated checks run without being asked.
2. Confirm a failing check blocks the release.
3. Release and confirm no request is refused during it.
4. Release a change with a data migration.
5. Reverse the migration and confirm the reversal was **tested before** the
   release, not written afterwards.
6. Roll a release back.

**Expected result**
- Step 2 is the point of automation: a check that can be ignored is decoration.
- Step 5: a reversal written under pressure during an incident is the one most
  likely to be wrong.

**Status:** ⚠ **Partial, and the partial half is the important half.**

There **is** a complete automated check suite — 245 checks across six suites,
plus a reconciliation command that proves no change exists without an audit
record — and it passes. Running it is one command.

**Missing: nothing runs it automatically.** No pipeline, no check on push, no
check on a pull request. The suite protects nothing unless somebody remembers to
run it, which makes this the cheapest high-value item in the whole file. There
is also no deployment, so steps 3 to 6 have nowhere to happen.

---

## NFR-09 — Reports are not undermined by half-empty records

> *As an* **administrator** *I want to* **required fields and validation
> enforced at the data layer** *so that* **reports are not undermined by
> half-empty records.**

**Requirement:** `013 FR-009` (Should) — enforced at the data layer, applying
equally to every route in.

**Preconditions**
- The API, and any other write path.

**Steps**
1. Create a record through the interface omitting a required field — refused.
2. Create the same record through the API directly — refused.
3. Attempt to write an invalid value for an enumerated field.
4. Attempt to reference a record that does not exist.
5. Attempt each of the above through a bulk import.

**Expected result**
- **Every route is refused identically.** Validation held only in the interface
  is validation an API call walks straight past.

**Status:** ⛔ **Not testable yet as written**, though much of it holds already.
Required fields, permitted value sets and uniqueness are enforced at the data
layer rather than in the screens, so steps 1 to 3 behave correctly today and are
covered by the existing suites. Step 4 is uneven: some references are checked
and **three point at record types that do not exist at all**. Step 5 has no
bulk import to test.

---

## NFR-10 — The legal basis for holding this data is documented

> *As an* **auditor** *I want to* **privacy policy, terms and consent capture in
> both languages** *so that* **the legal basis for holding this data is
> documented.**

**Requirement:** `013 FR-010` (Must)

**Preconditions**
- A deployed portal.

**Steps**
1. Open the privacy policy from the portal, in English.
2. Open it in Arabic.
3. Open the terms in both.
4. Confirm consent is captured where required, with when and how.
5. Confirm a customer can read both **before** signing in.

**Expected result**
- Both documents exist in both languages, reachable without an account.
- Step 4: consent capture records the moment and the method, not merely a flag.

**Status:** ⛔ **Not testable yet.** **Neither document exists**, and the portal
has already been demonstrated to an audience.

This is a legal obligation rather than a feature, and it is the kind of
requirement that gets noticed at the worst possible moment. The content is the
client's to supply or approve; publishing it is not blocked by anything
technical. Consent capture additionally waits on the open question of which
data-protection regime applies.

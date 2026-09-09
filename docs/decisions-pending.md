# Decisions — answered provisionally, and still open

Nothing in this file is client-ratified. Per the constitution's Governance
section, a marker is properly resolved only by getting the answer from the named
owner, amending the spec, recording who answered and when, and deleting the
marker. The three below are answered **by the developer**, pending client
confirmation, and their markers are therefore annotated rather than deleted.

---

## 0. RATIFIED by the developer, 2026-09-07 — evidence-backed

These five are **decided**, not provisional. Each was ratified after an evidence
review against `specs/` and `stories/`, and each entry names the evidence it
rests on. They are recorded here rather than in `specs/` because `specs/` is not
edited by implementation — the one exception being the `010 [CLARIFY-2]`
correction, separately authorised on 2026-09-07.

**A standing caveat on all of them.** The source document,
*Customer Support CRM · Core Features* (2 pp.), is **not present in this
repository**. It is cited by section number in 13 story headers and in the
constitution's amendment log, but `find` for `*.pdf`, `*.doc*`, `*.xls*` and
`*.txt` across the repo returns only a font licence. So no decision here is
traceable to the client's own words — only to derived material that the README
itself describes as *"Nothing here is client-approved."*

| # | Decision | Rests on |
|---|---|---|
| 1 | **Isolated entities: NOT supported.** `012 FR-011` is dropped. | `stories/012 PLT-11` priority **Could** (lowest tier); `FR-011` level **MAY**; `012` §2 *"In scope only per [CLARIFY-6]"*. No source states that a subsidiary exists or is planned — that absence is what makes `Could` safe to act on. |
| 2 | **Departments are FLAT.** No `parent_department_id`, no ancestor walk. | **No story asks for nesting** — `grep -rni 'nest' stories/` returns nothing. `stories/012 PLT-07` (**Must**) says *"multiple departments with separate queues, categories, SLAs, reporting"* and stops there. `012 [CLARIFY-3]` records the spec's own assumption: *"This spec assumes at most one level."* Under constitution VIII a nesting capability had no upstream reason. |
| 3 | **Ticket reference: unique, immutable, never reused. Format TBD.** | `002 FR-002` (**MUST**) states exactly those three properties and nothing about shape. The only format anywhere is `012 AS-04`'s illustration, `TKT-2026-04471` — an example in another spec's RTL scenario, explicitly **not** adopted as the format. |
| 4 | **Category tree: multi-level required, depth UNBOUNDED.** The earlier "fixed depth 3" is withdrawn as invented. | `stories/002 TM-04` (**Must**): *"categorise down a **multi-level** tree"* — excludes depth 1. `002 FR-005` (**MUST**): *"inherited by **descendants**"* — implies ≥ 2. `002 FR-004` (**MUST**): a ticket references a **leaf**. Nothing supports any specific number. |
| 5 | **SSO required as a capability; local password permitted alongside.** | `010 FR-006` (**MUST**), `stories/010 SEC-06` (**Must**), against `FR-007` (**MUST**, password policy) and `E-07` (break-glass local admin). See §1 for the withdrawn answer this replaces. |

**Consequences already recorded elsewhere:** #1 and #2 unblocked `010 FR-004` and
were built (§4). #4 means `FR-004`'s leaf constraint is enforceable but no depth
validation should exist. #5 leaves `FR-006` an **uncovered MUST** — see
`docs/trace.md`.

### Second batch — ratified 2026-09-07, after the evidence review

| # | Decision | Marker | Basis |
|---|---|---|---|
| 6 | **CRM is the system of record; ERP is read-only reference.** No CRM→ERP writes. | `001 [CLARIFY-1]`, `011 [CLARIFY-1]` — **RESOLVED** | Option A1. `001` §3 optional join key; `011 E-03` unlinked is normal; `011` §9 linking is a `LEAD`+ act; `001` §13 migration metric; `CM-19` (**Must**) import |
| 7 | **No single identity key.** Replaced by a ranked match list + a separate ERP join key. | `001 [CLARIFY-2]` — **CLOSED AS MALFORMED** | Option B1. §3 makes all four candidates optional; `FR-001` guarantees only a contact point; `FR-002`/`FR-004`/`FR-010` already describe ranked matching |
| 8 | **Status list: the spec's nine, admin-editable.** | `002 [CLARIFY-1]` — **PARTIALLY resolved; pause flags still open** | Option C1. `FR-007` makes the set *administrator-defined*, so a wrong label is configuration |
| 9 | **No auto-close.** Closure on explicit customer confirmation only, until spec `005` unblocks. | `002 [CLARIFY-2]` — **RESOLVED** | Option C5. A grace period in working days is a business duration, which constitution III requires from the `005` engine; `005 [CLARIFY-2]` is open |
| 10 | **Reopen window: 14 CALENDAR days, from `closed`.** | `002 [CLARIFY-4]` — **RESOLVED** | Option C7 + a chosen length. `FR-022`/`AS-11` over §3; §3 amended to agree |
| 11 | **Reference format `TKT-YYYY-NNNNN`**, 5 digits, annual reset, no branch encoded. | `002 [CLARIFY-3]` — **RESOLVED** | Chosen. Only `012 AS-04`'s illustration exists; omitting branch follows from `FR-002` immutability |
| 12 | **Category depth unbounded; leaf-only selection.** No depth validation. | `002 [CLARIFY-5]` — **RESOLVED** | `TM-04` (**Must**) *"multi-level"*; `FR-005` *"descendants"*; the earlier "depth 3" withdrawn as invented |
| 13 | **`stories/001` corrected**: the ERP question blocks `FR-014`/`FR-019`, not `FR-019`/`FR-020`. | Contradiction 1 — **CLOSED** | `FR-020` is field history and unrelated to ERP ownership; `specs/001` had the correct set |

**Decisions 9, 10 and 11 are the developer's own choices, not readings of the
sources.** Each is annotated as such in the spec, in those words, so that a
reader in two months cannot mistake them for something the specs said. Decisions
6, 7, 8, 12 and 13 rest on quoted evidence.

**Marker bookkeeping changed with this batch.** Resolved markers are marked
`- [x]` and **retained**, not deleted. The constitution's Governance section says
to delete a marker on resolution; deleting these would erase the decision and its
basis, which conflicts with constitution II's attributability and with the reason
this review happened at all. The consequence is that the repo's headline gate
command over-counts. Use the unresolved-only form, which `README.md` already
documents:

```bash
grep -rEn '^- \[ \] .\[CLARIFY-[0-9]' specs/ | wc -l    # unresolved markers only
```

Current state: **72 unresolved**, 7 resolved, 3 provisional.

### Third batch — ratified 2026-09-07, after reviewing the statuses one at a time

| # | Decision | Marker | Basis |
|---|---|---|---|
| 14 | **`pauses_sla` ratified for all ten statuses.** Pausing: `pending_customer`, `pending_supplier`, `resolved`. Not pausing: `new`, `assigned`, `in_progress`, `pending_internal`. Terminal statuses keep `—`, not a boolean. | `002 [CLARIFY-1]` — **RESOLVED IN FULL**; `005 [CLARIFY-4]` — **RESOLVED** | Governing question: *while a ticket sits here, is the customer waiting on us?* Per-status reasoning is in `specs/002` §12. |
| 15 | **`pending_third_party` SPLIT** into `pending_supplier` (pauses) and `pending_internal` (does not). | Part of #14 | The original meant *"a supplier **or another department**"* — not equivalent. A customer contracted with the company, not the department. `FR-019` sub-tasks already carry internal work without an SLA. |
| 16 | **Shared contact points permitted.** `FR-004` relaxed from unconditional uniqueness to unique-by-default, overridable with explicit recorded confirmation. | Defect, not a marker — see §11 | Option D2. Matches the posture `FR-010` (*"MUST NOT block creation"*) and `AS-04` already take. |
| 17 | **Outbound on a shared contact point REFUSED.** New `001 E-15`. Fails closed; no fallback to any one customer's consent. | Consequence of #16; gated on `001 [CLARIFY-5]` | `FR-022` records consent per customer per channel per purpose. Sending under one customer's consent would send to the others without theirs. |

**Terminal statuses keeping `—` rather than `no` is not cosmetic.** Writing `no`
would assert *"the clock runs"* on a status where nothing should run — a defect
waiting to be implemented against.

**#14 unblocked `005 FR-004`.** Spec `005` is still blocked overall on its own
`[CLARIFY-1]` (the SLA hours and minutes) and `[CLARIFY-2]` (working hours and
holidays per branch).

**#14 also created an obligation that has not been met yet.** `pending_customer`
is open to abuse — a token question parks a ticket and stops the clock — and
nothing in `002` or `005` guards against it. A new requirement for spec `009` has
been **drafted and is awaiting review**; it is not yet added. It has no upstream
story, so a story is being written with it rather than the requirement being
smuggled in. See §12.

### Fourth batch — ratified 2026-09-07, during step 4 review point 1

| # | Decision | Marker | Basis |
|---|---|---|---|
| 18 | **`nationalId` and `accountRef` uniqueness is scoped to ACTIVE customers.** A merged or erased holder does not block a live record. Implemented as partial unique indexes filtered on `status: 'active'`. | None — spec silence | **JUDGEMENT, not a reading.** See below. |

**Decision 18 is the developer's own choice.** Spec `001` §3 says only
*"Optional, unique when present"* for both fields, and names no population. It
does not say *"across active customers"*.

**The reasoning — an analogy to `FR-004`.** `FR-004` does state a population for
the comparable constraint on contact points: each value is unique *"per channel
type **across active customers**"*. Reading the same population across to §3's
fields is consistent with the spec's own treatment of its only other uniqueness
rule.

**Why the alternative is wrong in practice.** An unscoped unique index — or a
`sparse` one, which is the naive equivalent — enforces uniqueness over merged
and erased records too. A customer merged away in 2024 would then permanently
block that national ID from ever being used again by a live record, including by
the surviving customer of the very merge that retired it. `FR-011` makes merge
irreversible, so there would be no way back. And `FR-021` erasure replaces
identifying attributes with placeholders, so an erased record holds no national
ID to collide with anyway — leaving merged records as the only population the
unscoped form would wrongly protect.

**Verified:** a `nationalId` frees up once its holder's `status` becomes
`merged`, and two *active* customers still cannot share one.

**Reversal cost: low.** Two index definitions in `customer.model.js`, plus a
reindex. No application code reads the filter.

### Thirteenth batch — ratified 2026-09-09, the security-policy values

| # | Decision | Kind | Marker | Basis |
|---|---|---|---|---|
| 40 | **The five `010 FR-007` values are set: password minimum 12 with no composition rule; idle timeout 30 minutes; absolute session lifetime 12 hours; lockout after 10 failed attempts for 15 minutes, self-releasing; 3 concurrent sessions, oldest evicted** | **The project owner's.** Explicitly **not** a reading — all thirteen specs were searched and **none states any figure** | No marker. `FR-007` requires the values be *configurable* and supplies none | **`010 FR-007` (MUST):** *"The system MUST enforce a **configurable** password policy, session timeout, absolute session lifetime, failed-attempt lockout and concurrent-session limit."* The only related text anywhere is **`008 §3`**, which gives a portal identity a `locked` state and points back at `FR-007` for what causes it, and **`010 §9`**, which marks the sign-in endpoints *"rate-limited; lockout per `FR-007`"*. Both establish that lockout must exist. Neither supplies a number, and no other spec does |

**Ratified by the project owner 2026-09-09**, on a proposal from the developer.
The reasoning the owner singled out, recorded because it is the reasoning rather
than the numbers that will matter when these are revisited:

- **No composition rule.** Length beats character classes. Mandating "one
  capital, one digit, one symbol" reliably produces a small, guessable family of
  shapes — `Password1!` and its cousins — while length is what actually costs an
  attacker. The mixed-case, digit and symbol switches exist in
  `config/security-policy.js` and are **off**; they are there for a client whose
  own policy mandates them, not as a recommendation.
- **Ten attempts, not five.** Five is the reflex. It is also a denial-of-service
  anybody can trigger against a known email address: a handful of deliberate
  wrong guesses locks a real person out. Ten still stops online guessing dead,
  and the lock **self-releases** after fifteen minutes so a mistyped password
  never becomes a support ticket.

**These are now the code defaults and nothing overrides them.** The
`PASSWORD_MIN_LENGTH=11` override that existed for one day — because the demo
password was eleven characters — has been **deleted**, and the demo password
lengthened to twelve instead. The override is recorded here rather than
forgotten, because the reason it was refused is the general rule: *a policy
weakened to fit a demo password is exactly the kind of thing that becomes
permanent unnoticed.*

**Reversal cost: nil.** Every value is a `.env` line. That is the point of
`FR-007`'s word *configurable*, and it is why the mechanism could be built and
tested before the numbers were settled.

### Twelfth batch — ratified 2026-09-09, the mention conflict

| # | Decision | Kind | Marker | Basis |
|---|---|---|---|---|
| 39 | **A mention may only name a colleague who already holds scope on that ticket.** The mention notifies them; it grants nothing. `004 FR-009`'s granting clause is **declined**, and the requirement is met in the only form that does not contradict `010 FR-002` | **The developer's.** Both readings are available and the specs do not choose between them | No marker exists. Recorded as spec defect §13 | **`010 FR-002` (MUST):** *"Permissions MUST be assigned through roles only. **Per-user permission overrides MUST NOT exist.**"* against **`004 FR-009` (MUST):** *"the mention ... MUST grant them access to that ticket only"*. A grant to one named person over one named record is a per-user permission override on any reading, so the two MUSTs cannot both be honoured. `010 §3` supplies no shape for it either: `RoleAssignment` carries `branch_ids`, `department_ids` and `team_ids` and has no record-level dimension |

**Why this option and not the other two.** Three ways out were put to the
project owner:

1. **Add a record-level grant.** A new entity, and a second thing the scope
   predicate consults on every read — weakening the single strongest invariant
   in the system in exchange for a convenience feature.
2. **Notify without granting.** Satisfies the notify clause, breaches the access
   clause, and sends the colleague to a 404.
3. **Restrict who may be mentioned** — chosen. Both MUSTs hold, the predicate is
   untouched, and the feature keeps the part that matters: a colleague who can
   already see the ticket is told their attention is wanted.

Ratified by the project owner 2026-09-09, on the reasoning that *a per-record
exception to the one invariant that has never been compromised, traded for a
convenience feature, is a bad deal.*

**What is given up, stated plainly.** The spec's version lets an agent pull in
somebody outside the ticket's branch or department — a specialist in another
department, say. Under decision 39 that is impossible: the specialist must first
be granted a role covering that scope, through the normal audited route. That is
slower, and it is the cost of the invariant. **If the client later says
cross-scope mentions are a real need, this decision is what to reopen** — and
option 1 is what it reopens into, with the predicate change costed properly
rather than smuggled in behind a notification feature.

**Reversal cost: low, and it rises.** Nothing is built yet. The restriction is a
validation on the mention endpoint. Reversing it later means the record-level
grant of option 1, which is a change to the scope predicate and therefore to
every read and write in the system.

**This resolves spec defect §13 rather than deferring it.** §13 stays on the
record — an erased defect is unattributable — and is marked RESOLVED.

### Eleventh batch — ratified 2026-09-08, credential rendering

| # | Decision | Kind | Marker | Basis |
|---|---|---|---|---|
| 38 | **A password input is a direction-neutral value and is pinned `dir="ltr"` unconditionally** — both languages, staff and portal | **The developer's**, not a reading. `012 §3` does not name passwords | No marker. `012` has none open on this | **The rule exists and passwords are outside its stated extension.** `012 §3` defines a *direction-neutral value* as *"a value that must always render left-to-right regardless of context: ticket references, phone numbers, email addresses, identifiers, numerals, times and durations"*, and `012 FR-002` (**MUST**) requires that they *"always render left-to-right in the correct order, in every context"*. `012 AS-04` exercises the rule over a reference, a phone number, an email address, a duration and a date. **A password is in none of those lists.** The developer decided it belongs to the same class, on the reasoning that a password is a value the user must reproduce character for character and therefore must never be visually reordered |

**Why this is recorded as the developer's and not as a reading.** The
enumeration in `012 §3` could be read either way — as the definition's whole
extension, or as examples of a defining property (*"must always render
left-to-right regardless of context"*) that a password would also satisfy. The
project's own rule is that an unstated case is not filled from inference, so
this is attributed rather than presented as what the spec already said.

**It was a real defect, not a theoretical one.** In an Arabic interface a
password ending in `_` rendered with the underscore at the visual start: a
trailing neutral character takes the surrounding paragraph direction under the
bidirectional algorithm. What the user typed and what they saw disagreed, and
the sign-in that followed was refused. Masking does not avoid it — the caret and
the insertion point follow the field's direction whether the glyphs are dots or
characters, and the Show control reveals the reordered value outright.

**An earlier revert is superseded.** `dir="ltr"` had been placed on the input
alone, then removed because it broke the layout: the reveal button is positioned
with `end-0`, which resolves against the **page** direction and moved to the
left edge in Arabic, while the input's own `padding-inline-end` stayed on the
right — padding on one edge, icon on the other, value under the glyph. That
revert traded a correctness defect for a layout one. The fix is to pin the
**wrapper**, so the input, its padding and the button share a single direction
context and agree in both languages.

**Reversal cost: one attribute.** `dir="ltr"` on the wrapper in
`password-field.html`. Nothing else reads it.

**Verified**, both languages and both interfaces: computed `direction` is `ltr`
on all four fields with the page at `dir="rtl"`, padding and button on the same
edge, and `Example-2026_` screenshotted rendering with the underscore at the end.

### Tenth batch — ratified 2026-09-08, the portal write path

| # | Decision | Kind | Marker | Basis |
|---|---|---|---|---|
| 37 | **`source` is stored on the Ticket entity**, enumerated `ui / email / whatsapp / sms / chat / form / api / portal`, immutable, defaulting to `ui` | **Reading** — the value set is quoted, not invented | A cross-spec gap, not a marker | **`002 §10` already enumerates the values**, for the audit entry: *"Ticket created \| actor, timestamp, **source** (`ui` / `email` / `whatsapp` / `sms` / `chat` / `form` / `api` / `portal`), customer, category, …"*. **`008 AS-04`** requires the record itself to carry one: *"a ticket is created with **source `portal`**"*. What no spec provided is a `source` attribute on the Ticket entity in **`002 §3`**. The values and the obligation are both specified; only the storage was missing |

**Why this is a gap fill and is recorded as one.** Nothing was invented: the
enumeration is copied from `002 §10` verbatim, and the requirement to persist it
comes from `008 AS-04`. What was decided is only *where it lives* — on the
Ticket entity rather than in the audit entry alone. Recorded because `002 §3`
should carry the attribute and does not, and the next person reading §3 will not
find it there.

**Immutable and defaulted, both deliberately.** Where a request arrived from is a
fact about its past, so nothing may rewrite it. `default: 'ui'` means tickets
created before the field existed read as what they were — every one came through
the staff API, and each carries an audit entry that already recorded
`source: 'ui'` at creation, so the default is supported by the trail rather than
assumed.

**What a customer may not set, and why it is refused rather than ignored.**
`008 FR-002` (**MUST**) is the whole of what a customer supplies: *"submit a
request with category, description and attachments"*. `002 §9` gives the
customer column `—` for *Assign / self-assign*, and footnotes *Change status*
with *"A customer may confirm resolution, reopen within the window, and cancel
their own ticket before resolution. **Nothing else.**"* So the portal's submit
body is an allow-list of `subject`, `description`, `category`, and anything else
— `priority`, `status`, `assignedAgentId`, `owningTeamId`, `customerId`,
`source`, `tags` — is **refused by name with a 400**.

Silently dropping them was the alternative and is worse: a customer who sends
`priority: 'urgent'` and receives a 201 has been told they escalated their own
request, and we would be unable to tell a hostile caller from a confused
integration. The refusal names the fields and cites §9.

**A customer reply cannot be made internal.** `visibility` is not a parameter on
the portal reply route — a customer message is `visibility: 'customer'` by
construction — so `FR-019`'s guarantee cannot be inverted by a crafted body.
Sending `visibility` is refused by name like any other field that is not theirs.

**Two things NOT built here, refused rather than guessed.** `008 E-08` says a
reply to a `resolved` ticket within the reopen window should reopen it
(`FR-009`), and `E-07` says a reply to a `cancelled` ticket should create a new
linked ticket. Both are piece `F3`. A terminal ticket therefore refuses a reply
with a 409 rather than doing either. `resolved` is not terminal, so a reply to a
resolved ticket is accepted and simply does not reopen it yet.

### Ninth batch — ratified 2026-09-08, demo shortcuts for the management demonstration

**These are deviations, not answers.** Each names the requirement it breaks and
what it costs to undo. Approved individually by Mohamed Sadek (developer, acting
as decision authority) — the delivery team, not the client — for a demonstration
to management, explicitly *"demonstrable, not production-ready"*.

**Three things were held and are NOT deviated**, because they were named
non-negotiable: the **scope predicate** (`008 §11`'s `customer = session`,
constitution IV), the **audit writer** (`008 FR-020` — every portal action writes
an entry attributed to the customer), and **internal notes never reaching a
customer** (`008 FR-019`, `AS-06`). Where a shortcut would have bypassed any of
the three, the piece is omitted from the demo instead.

**Throwaway vs debt** is the column that matters when the demo is over.
*Throwaway* means nothing wrong was built and deleting the demo data ends it.
*Debt* means something incorrect exists and will keep being true until reversed.

| # | Deviation | Breaks | Undo cost | Throwaway or debt |
|---|---|---|---|---|
| 31 | **Customer signs in with the shared demo password, not a one-time code** | `008 FR-001` (**MUST**) — *"authenticate against a verified contact point by the methods agreed in `[CLARIFY-1]`"*. **Deviates from decision 26, ratified the same day** — see the note below | Portal identity, session issuance and the `customer = session` predicate all survive; only the credential check is replaced. `R3` in `remaining.md`: 3–4 be | **Throwaway** while the demo database is discarded. **Debt from the moment one real customer account exists under it** |
| 32 | **No verified contact point** | `008 FR-001`; `008 §2` — *"Required to authenticate"*; `008 §3` `verified_contact_point_id` **Required** | `P1`: 1.5–2 be, plus backfilling `verifiedAt` for any identity created without it | **Debt.** A security property, not a feature — the difference between *this address is theirs* and *someone typed this address* |
| 33 | **No rate limiting or abuse protection on the portal** | `008 E-03`; `008 §3` `state: locked` (lockout per `010 FR-007`) | Additive middleware, ~0.5 be | **Throwaway on one condition: the demo is never internet-facing.** If it is ever deployed publicly this stops being debt and becomes a live vulnerability |
| 34 | **No attachments at all** — not attachments without scanning | `008 FR-002`, `FR-004` (both **MUST**); `002 FR-015`; `008 E-09`, `E-10` | `A8`: 2–3 be, 1–1.5 fe | **Throwaway.** Omitting a feature leaves no wrong code. A working upload path with no scanning would have been worse than an absent one, and demos get kept |
| 35 | **The portal ticket view omits the owning team** | `008 FR-003` (**MUST**) — *"MUST show a customer-facing status label, **the owning team**, and timing information"* | `R2` (Team, decision 30), after which the field appears | **Debt, but pre-existing.** Decision 20 already owns it; this extends it to one more surface |
| 36 | **Three demo accounts share one password from `.env`** — an administrator, an agent, and a customer record | **Nothing in `specs/`.** No spec covers demo seeding. `010 §1` scopes *"session and password policy"* but none is built, so there is nothing yet to violate. Revisit when it is | Delete the accounts — `npm run seed:demo:clear` | **Throwaway**, provided the password stays in `.env` and never in a tracked file |

**⚠ Decision 31 is a temporary deviation from decision 26, not a revision of
it.** Both stand, and they say different things on purpose:

- **Decision 26 is the target and is unchanged.** Customer authentication is a
  one-time code to a verified email or phone; no password. That was read from
  `008 AS-01`, `E-03`, `NFR-004` and `stories/008 CP-01`, and none of that
  evidence has changed.
- **Decision 31 is a demo shortcut measured against it**, in force only for the
  management demonstration.

Nobody should read 31 as the project changing its mind about one-time codes. The
`auth_method` enum in `008 §3` still records `otp_email` and `otp_phone` as the
launch methods per decision 26. When the shortcut is reversed (`R3`), decision 31
is closed and decision 26 is simply implemented — no decision needs revisiting.

**What the demo therefore demonstrates honestly, and what it does not.** Steps 2,
3 and 4 of the five-step flow are real: a ticket is assigned with a required
reason, an agent and the ticket exchange customer-visible and internal messages,
and the status moves through a validated transition graph. Step 1 is performed by
an agent on the customer's behalf, which `002 §9` permits (`AGT` **✓** *Create
ticket*). **Step 5 — the customer seeing it resolved — is absent**, because the
portal does not exist. The rehearsal script (`docs/demo-script.md`) says so
rather than substituting something.

### Eighth batch — ratified 2026-09-08, the customer-portal flow

All five by **Mohamed Sadek (developer, acting as decision authority) — a
decision made by the delivery team rather than the client**, in the words
Governance requires. The `Kind` column separates a **reading** the specs already
argue for from a **judgement** supplied where the specs are silent, so a later
reader can tell an evidenced answer from an owned choice. Full working in
`docs/portal-plan.md` §5.

| # | Decision | Kind | Marker | Basis |
|---|---|---|---|---|
| 26 | **Customer authentication is a one-time code to a verified email or phone. No password.** SSO is not excluded later; it is not the launch method | **Reading** | `008 [CLARIFY-1]` (method half) — **RESOLVED** | `008 AS-01` describes the mechanism (*"requests a one-time code and submits it correctly"*); `E-03` exists only for it; `NFR-004` sets it a delivery target (*"One-time code delivery ≤ 30s at p95"*); `stories/008 CP-01` (**Must**): *"one-time code, or SSO \| **without another password**"*. `password` appears only in §3's enum |
| 27 | **No anonymous ticket submission. Accounts only.** | **Judgement** — the specs are silent | `008 [CLARIFY-1]` (anonymous half) — **RESOLVED** | Nothing in `specs/` or `stories/` leans either way. `008 §9` defers the anonymous cell (*"Submit a ticket \| per `[CLARIFY-1]`"*); `E-02` offers both paths without choosing. An owned choice, not an inference |
| 28 | **The portal shows nothing about timing. PROVISIONAL** — reopen when spec `005` unblocks | **Reading**, forced by constitution III | `008 [CLARIFY-2]` — **RESOLVED PROVISIONALLY** | The other two options are business durations; constitution III: *"Any feature that displays … remaining time reads from that one implementation"*, which is spec `005`, unbuilt. **⚠ Answers the marker, does NOT satisfy `FR-003`** — that stays an uncovered MUST |
| 29 | **A customer never sees an individual agent's identity — only the owning team.** Including the replier | Team-only: **reading**. Replier: **judgement** | `002 [CLARIFY-6]` — **RESOLVED**; closes the last open marker in `002` | `008 FR-003` (**MUST**) names *"the **owning team**"*, not the agent; `stories/008 CP-03` asks for the same three fields; the marker routes to *"client operations + **HR**"*, the only marker in either spec involving HR. The replier half settles `002 §9` footnote ²'s *"beyond the replier"*, which parses two ways and which the spec does not resolve |
| 30 | **`Team` is owned by spec `012`, belongs to exactly one Department, and is independent of Branch (T1). Membership rides on `RoleAssignment` (M1).** Partially reverses decision 20 | Ownership: **reading**. T1 and M1: **judgement** | The `Team` spec defect (§7) — **RESOLVED IN PART**; the entity is defined, the lead rule is not | **Ownership:** `012 §1` — *"this spec defines the department and branch entities that scoping applies to"* — against `010 §1` — *"scoping by department, branch and team"*. 012 defines organisational entities, 010 scopes by them. Decisive: `012 §3` Department already carries `default_team_id \| ref \| **Required**`, a required key to an entity 012 never defines. **T3 (branch-bound) is excluded by the specs, not by preference:** `default_team_id` is a single ref and Department carries no branch reference, so a department in three branches could name only one branch's team. **T1 over T2 on reversal asymmetry** (below). **M1 over M2** because M1 inherits `010 AS-04` (*a granting admin cannot exceed their own scope*), already built and tested; M2 would need its own overreach rule and **no spec provides one**, so it would have to be invented |

**Why T1 over T2, stated as the argument that decided it.** Both are consistent
with the scope predicates. The asymmetry is in reversal cost: **T2 → T1** later
requires giving every existing team a department and re-checking every ticket's
`owning_team_id` against its `department_id` — cheap at zero ticket volume,
expensive after. **T1 → T2** is near-free. Supporting evidence for T1 beyond the
asymmetry: `012 AS-09` makes categories department-scoped (*"only their
department's categories are offered"*) and `002 FR-005` gives each category a
default owning team, so those teams already sit inside a department.

**⚠ The gap decision 30 leaves, recorded loudly.**

`002 E-12` says *"the ticket returns to the owning team queue as unassigned and
**the team lead** is notified"* — singular, definite. Under M1 a "team lead" is
the `LEAD` role scoped to that team, which means a team may have **zero leads or
several**, and **no spec states what happens in either case**:

- With zero, `E-12`'s notification has no recipient and a deactivated agent's
  tickets return to a queue nobody is told about.
- With several, `E-12` does not say whether all are notified or one is chosen,
  and `005`'s escalation *"level 1 after 2h unassigned to the team lead"* has the
  same ambiguity.

**No rule has been invented here.** This is recorded as an open requirement, not
resolved, and it is a prerequisite for piece `E1` (auto-assignment) in
`docs/portal-plan.md` §6 — `005 FR-009` requires that *"where none are eligible
the ticket MUST remain unassigned and **the lead** MUST be notified"*, which
cannot be implemented against an undefined recipient. It needs either a stated
rule in `012` alongside the Team entity, or an explicit `lead_user_id` attribute
(option L2), and that is a decision not yet taken.

**Consequences already recorded elsewhere.** #26 and #27 unblock `008 FR-001`
and `FR-002` for planning; #28 leaves `008 FR-003` an uncovered MUST — see
`docs/trace.md`. #29 closes the last open marker in spec `002`, taking it to
**0 open · 6 resolved**. #30 supersedes the *scoping out* half of decision 20
but not its consequence: `owningTeamId` is still absent from every existing
ticket, and backfilling it is piece `B5`.

### Seventh batch — ratified 2026-09-08, demo data

| # | Decision | Kind | Undo cost |
|---|---|---|---|
| 25 | **`seed:demo:clear` may delete records and their audit entries**, bypassing both the no-delete rule and the append-only rule. Development-only, local databases only | **Deliberate, bounded violation** of spec 001 §3 and spec 010 `FR-008`/`AS-08` | Delete the script; demo data then accumulates or is cleared by dropping the database |

**This is the only place in the codebase permitted to break these two rules, and
it is recorded here rather than only in a code comment so that anyone auditing
the constitution finds it.**

**What it violates.**

- **Spec 001 §3** — a customer *"Lives forever; is never deleted, only erased or
  merged away."* No service exposes a delete path for customers, by design.
  This script deletes them.
- **Spec 010 `FR-008` / `AS-08`** — audit entries are append-only, enforced by
  mongoose hooks that refuse every update and delete. This script removes the
  demo records' audit entries through the **raw driver collection**, which
  bypasses those hooks entirely.

**Why deleting the audit entries is the right call, and leaving them is not.**
The alternative was considered and rejected. If the domain records are deleted
and their audit entries are left behind, `npm run audit:reconcile` reports every
one of them as an **ORPHANED ENTRY** — an audit entry whose record does not
exist. That is not a cosmetic complaint: it is the precise signal meaning *"a
mutation failed after its audit entry was written"*, the one residual failure
mode the atomic-audit work (decision, §10) was unable to eliminate by
construction. Filling that report with dozens of entries of deliberate noise
teaches whoever reads it to skim past the exact line that catches real
corruption. A report nobody trusts is worse than no report.

**What bounds it.**

1. **One line.** The hook-bypassing deletion is a single `deleteMany` on the raw
   `auditentries` collection, in one file, commented as the rule-breaking line.
   It is not repeated anywhere and must not be.
2. **Local databases only.** The script refuses to run when `MONGO_URI` does not
   point at `localhost` or `127.0.0.1`, and masks credentials in the refusal:
   `REFUSED: seed:demo:clear only runs against a local database.`
3. **Marked data only.** It touches nothing without a demo marker — customers by
   `accountRef` prefix `DEMO-`, tickets by the `demo` tag, users by the `demo.`
   email prefix, branch and department by name. The break-glass administrator
   survives a clear, verified.

**What it is not.** It is not a precedent for a delete endpoint, an audit
correction tool, or anything that ships. Spec 010 `FR-008` still stands: in the
application, an audit entry is never edited or deleted, and a correction is an
**append** of a compensating entry made by a person who has understood the
discrepancy.

**Also in this batch, not a violation but worth recording:** the demo agent
password moved from a literal in `seed-demo.js` to `DEMO_AGENT_PASSWORD` in
`.env`. The seed **refuses to run** without it rather than falling back to a
default, because a default in a tracked file is a known credential on every
machine that ever runs the seed. `.env.example` carries the key with no value.

### Sixth batch — ratified 2026-09-07, UI component library

| # | Decision | Kind | Undo cost |
|---|---|---|---|
| 24 | **No component library. The UI is Tailwind CSS v4 only.** PrimeNG was installed, evaluated, and removed the same day | **Judgement**, forced by a vendor licensing change discovered during Phase 1 | Reinstalling means either buying a PrimeUI licence or accepting the version wall below |

**⚠ DO NOT REINSTALL PRIMENG WITHOUT READING THIS.** The obvious future move —
"this UI is plain, let's add a component library, PrimeNG is the Angular
standard" — walks into the same wall. The evidence, gathered from the installed
packages rather than from documentation:

**PrimeNG v22 requires a paid licence for every component.** `primeng@22.0.0`
(published 2026-07-15) added a dependency on `@primeui/license-manager`, which
`primeng@21.1.9` does not have:

```
npm view primeng@22.0.0 dependencies   ->  ..., "@primeui/license-manager": "^1.0.0"
npm view primeng@21.1.9 dependencies   ->  tslib, @primeuix/{utils,motion,styled,styles}
```

Without a valid key, every component renders an unremovable banner.
`node_modules/primeng/fesm2022/primeng-basecomponent.mjs:245` calls it from
`ngAfterViewInit`, so it fires for *any* component, including ones that were
free under MIT for years (`Button`, `Card`, `InputText`):

```js
if (this.config?.verified() === false) { showInvalidLicenseBanner(); }
```

And `primeng-license.mjs` is explicit that it is built to resist removal — the
banner lives in a **closed** shadow root, with `all:initial` on the host and a
deliberately unmemorable id, "slowing down trivial hide-by-selector attempts".
It is not a console warning; it is a red box over the running application.
Verified rendering on the login page at the time of the decision.

**The v21 escape route is blocked by Angular.** `primeng@21.1.9` — the last
licence-free release — peer-depends on Angular 21:

```
npm view primeng@21.1.9 peerDependencies
  ->  "@angular/core": "^21.0.7", "@angular/cdk": "^21.0.0", ...
```

This app is on Angular **22.1.5**. Installed with `--legacy-peer-deps`, the
banner still appeared *and* components broke rather than merely warning — the
submit button rendered as an empty input. So the choice was: downgrade the
entire Angular framework by a major version to keep a component library, buy a
licence for a project whose scope is not settled, or drop the library.

**What was chosen and why.** Tailwind alone. The page shell, layout, palette,
type scale and RTL behaviour were already working in Tailwind before PrimeNG
was wired in, and the components actually needed here are tables, inputs and
buttons — a few hours of styling, not a framework. The cost of the alternative
was hours of version-matrix archaeology for a red banner and a missing button.

**What this costs.** Data tables, date pickers, multi-selects and overlays are
hand-built. The first two are already written as plain tables; a date picker
and a proper combobox are the two places this will be felt, and both are
`<input type="date">` and a filtered list respectively for now.

**If a component library is revisited**, the live options are: a PrimeUI
licence (cost unknown, needs a scope decision first); Angular Material, which
is first-party and versioned in lockstep with Angular; or staying with Tailwind
and adding headless primitives (Angular CDK is already installed as a
transitive dependency and provides overlays, focus traps and a11y helpers
without any styling opinion).

### Fifth batch — ratified 2026-09-07, delivery compression

The user required working software on GitHub the same day and authorised two
simplifications. Recorded as **deliberate deviations**, not as resolved
questions. Each names what would have to change to undo it.

| # | Decision | Kind | Undo cost |
|---|---|---|---|
| 19 | **`DEFAULT_COUNTRY_CODE=+20`** for phone normalisation | **Judgement.** No spec names a country. Read from the worked examples: `AS-02`'s `+201001234567` with local forms `01001234567` / `0100 123 4567`, and its Egyptian national ID `29001011234567`. Configurable in `.env` | One env var. Existing `normalisedValue`s would need a re-normalise pass |
| 20 | **`Team` SCOPED OUT.** Tickets assign directly to an agent. `owningTeamId` is absent | **Deviation.** `002` §3 marks `owning_team_id` **Required**. The `Team` defect in §7 is **NOT resolved** — it is stepped around | Add the entity, a `teamIds` set on `RoleAssignment`, the third dimension in `scope.js#assignmentCovers`, and backfill every ticket |
| 21 | **Category is a flat string**, not a tree | **Deviation from `FR-004` (MUST):** *"Categories MUST form a tree; a ticket MUST reference a leaf node; non-leaf nodes MUST NOT be selectable."* Also drops `FR-005` inheritance and `E-07`'s tree-as-at-creation rule | A Category model, a migration mapping strings to leaf nodes, and `009` rollups |
| 22 | **A default status-transition graph** was authored | **Judgement.** `FR-008` makes transitions administrator-defined and **no spec supplies a default set**. Refusing every transition would break `FR-008`; allowing every transition would break `AS-03`. A default graph was written and is admin-editable in principle | Edit the graph; it is data, in one place |
| 23 | **`requiresResolutionFields` is `false` on every status**, so `FR-029`/`AS-13` are unenforced | **Scoped out.** The root-cause and resolution-code lists are admin-authored bilingual entities (`002` §8) that were not built today | Build the two list entities, then flip the flag |

**What was NOT compromised, because it was named non-negotiable:** the scope
predicate (`FR-033`, constitution IV) applies to every ticket and customer read
and write, and every mutation writes an audit entry through `utils/audit.js`
inside a transaction (`FR-013`, constitution II, `E-11`).

**Out of scope today, by instruction:** email, WhatsApp, SMS, chat, SLA,
knowledge base, customer portal, reports, ERP, AI, merge, attachments.

### Downgrades and N/A markings this batch created

| Item | Was | Now |
|---|---|---|
| `stories/011 INT-06` (**Should**) | *"customer and account sync with the ERP under explicit conflict rules"* | A scheduled **divergence report** — drift detected and reported, never resolved automatically |
| `011 FR-006` | Two-way sync with conflict rules | The divergence report. `FR-005` and `FR-007` unaffected |
| `011 E-10` (sync loop) | A live edge case | **N/A by construction** — no CRM→ERP writes, so no echo is reachable. Retained with its original behaviour quoted, in case the decision is revisited |
| `002 FR-031` | Confirmation **or** grace-period auto-close | **Half-covered** — confirmation path in scope, grace path deferred to spec `005` |
| `002` §3 `resolved` row | *"reopen window open"* | Amended: the window runs from `closed` |

## 1. Answered provisionally — specs 010 and 012

Answered by: Mohamed Sadek (developer) · Date: 2026-09-07 · Status: **pending
client confirmation**

### `010 [CLARIFY-1]` = `012 [CLARIFY-2]` — branches and departments

**Answer.** Scoped access, not multi-tenancy. One deployment. Branches and
departments are ordinary records. The predicate applied server-side in the data
layer on every read and write is `branch ∈ scope AND department ∈ scope`. Spec
`012` `FR-011` (fully isolated entities) is dropped.

**Unblocks.** `010` `FR-004`, `FR-005`, `FR-021` · `012` `FR-007`, `FR-008`

**Risk if the client reverses it.** Low-to-moderate. Moving from scoping to true
multi-tenancy would mean re-siting the predicate, not rewriting the modules —
but the README calls this the decision that "costs a rewrite if answered late",
so confirm it early rather than at step 4.

### `010 [CLARIFY-3]` — the role list

**Answer.** Five staff roles: `AGT`, `LEAD`, `MGR`, `ADM`, `AUD`. Plus `CUST`
for the portal when spec `008` enters scope. One break-glass local
administrator is permitted for when SSO is unavailable, and its use is a
high-severity audit event.

**Rationale.** All thirteen specs' §9 permission matrices already use exactly
these five consistently. This ratifies what is written, it does not invent a
list.

**Unblocks.** `010` `FR-002`, `E-07`, and the §9 matrix in all twelve other
specs.

**Risk if the client reverses it.** Low if roles are added; moderate if the
*shape* changes (e.g. per-person overrides demanded, which `FR-002` forbids
outright).

### `010 [CLARIFY-2]` — identity provider and MFA — **ANSWER WITHDRAWN 2026-09-07**

> **This entry's original answer was wrong. It is kept below, struck through in
> substance, because an erased mistake is unattributable.**

**WITHDRAWN.** The original answer read: *"No SSO in phase one. Local email +
password sign-in with bcrypt. MFA deferred to phase two."*

**Why it was wrong.** `[CLARIFY-2]` asks *which* provider, *whose* MFA, and
*mandatory or optional*. It does not ask **whether** to have SSO. The withdrawn
answer contradicted:

- `010 FR-006`, level **MUST**: *"The system MUST support SSO via SAML or OIDC
  and MUST support requiring MFA"*
- `stories/010 SEC-06`, priority **Must**: *"SSO through SAML or OIDC, with
  optional MFA"*
- `stories/010` out of scope: *"this epic covers manual administration **and SSO
  login**"*

And the sources offer explicit phasing questions for six other capabilities —
channels, chat, Arabic AI output, report formats, time tracking, refund
approvals — while offering **none for SSO**.

**THE EVIDENCED READING, ratified by the developer 2026-09-07.** SSO via SAML or
OIDC is **required as a capability**. Local password sign-in is **permitted
alongside it**, on the authority of `FR-007` (**MUST** — a configurable password
policy, failed-attempt lockout and session limits presuppose local passwords)
and `E-07` (the break-glass local administrator). `FR-006`'s own wording,
*"Where SSO is mandatory"*, presupposes that it may not be.

**What this means for what is already built.** Nothing is invalidated. The login
screen, bcrypt hashing and JWT issuance are legitimate under `FR-007` and
`E-07` — a first-class part of the spec, not a workaround. Two consequences
follow:

1. `FR-006` is an **uncovered MUST**. No SAML or OIDC path exists. Recorded in
   `docs/trace.md`.
2. If the client answers that SSO is *mandatory*, `FR-006` requires local
   password sign-in to be **refused for ordinary users**. `E-07`'s break-glass
   administrator survives in every case, so the bcrypt and password
   infrastructure is never wasted.

**The marker remains OPEN.** Its three actual questions are unanswered.

### Superseded record — the withdrawn answer as originally written

**Answer.** No SSO in phase one. Local email + password sign-in with bcrypt.
MFA deferred to phase two.

**⚠ Risk if the client reverses it — this is the one that costs real rework.**
Spec `010` `FR-006` says that where SSO is mandatory, local password sign-in
MUST be **refused**. If the client says SSO is mandatory:

- `auth.service.js` local sign-in is deleted, not extended
- the JWT issuer is replaced by a SAML/OIDC callback and provider-issued claims
- the password policy work under `FR-007` becomes dead code
- `E-07` (provider unavailable) and `E-08` (subject matching no user) become
  live requirements that do not exist in a local-password build

Flagged to the client this week. Step 2 is being built knowing this.

---

### `012 [CLARIFY-1]` — peer languages

Answered by: Mohamed Sadek (developer) · Date: 2026-09-07 · Status: **pending
client confirmation**

**Answer.** Arabic and English are **peer languages**. Neither is the source of
the other; neither substitutes for the other.

**Rationale.** Spec `012` assumes peers throughout, and constitution I already
decided the data model ("stores a value per language"). This ratifies both
rather than choosing between them.

**Unblocks.** `012 FR-001` (interface in both languages, switchable at any time)
and `012 FR-004` (single-language saves refused). Which in turn unblocks the
login screen and every screen after it.

**Consequences now legal to build.** A runtime language mechanism with no
reload, honouring `NFR-001` (switch ≤ 1s, context preserved) and `AS-01` (no
string remains in the other language). `AS-03` still applies absolutely: no
fallback, ever — a missing translation renders as an explicit marker, never as
the other language.

**Risk if the client reverses it.** Moderate-to-high, and asymmetric. If they
say "English primary, Arabic a translation", the *mechanism* survives — both
values still exist — but the authoring workflow, the KB review flow (`006`) and
the search index change. Building peers and downgrading is cheap; building
primary-plus-translation and upgrading is the rework constitution I calls the
most expensive mistake available to this project.

### `012 [CLARIFY-6]` — isolated entities

Answered by: Mohamed Sadek (developer) · Date: 2026-09-07 · Status: **pending
client confirmation**

**Answer.** Aspiration, not a requirement. `012 FR-011` is **dropped**. One
deployment, scoped access, no cross-entity isolation layer.

**Rationale.** Consistent with the answer already given to `010 [CLARIFY-1]`.
`FR-011` is a `MAY`, and the marker itself frames it as "a real requirement or
an aspiration".

**Unblocks.** `010 FR-004` — the scope predicate — which this marker blocked by
name.

**Risk if the client reverses it.** **High. This is the expensive one.** True
multi-tenancy is not a wider predicate, it is a different enforcement layer:
every collection needs a tenant key, every index needs it as a prefix, and the
predicate has to be impossible to omit rather than merely applied. Retrofitting
it means revisiting every read and write in the system.

### `012 [CLARIFY-3]` — department nesting

Answered by: Mohamed Sadek (developer) · Date: 2026-09-07 · Status: **pending
client confirmation**

**Answer.** Departments are **flat**. No nesting, no `parent_department_id`, no
ancestor walk.

**Rationale.** The spec already "assumes at most one level"; flat is that
assumption at its simplest. It keeps `department ∈ scope` a set-membership test
and keeps spec `009`'s reporting rollups from needing a tree traversal.

**Unblocks.** `012 FR-007`, and with it the department half of
`010 FR-004`.

**Risk if the client reverses it.** Low-to-moderate. `department ∈ scope`
becomes a closure over descendants, which is one function in
`src/utils/scope.js` plus a materialised ancestor path on the Department
document. Contained, because the predicate was deliberately built in one place.

## 1b. RATIFIED 2026-09-09 — the five `010 FR-007` values (decision 40)

**✅ Built and ratified 2026-09-09. The mechanism is delivered and tested; the
numbers below were ratified as proposed — see decision 40 for the reasoning and
the attribution.** The table is kept in its original form because it is the
proposal that was accepted. `FR-007` requires a *configurable* password policy, session timeout,
absolute session lifetime, failed-attempt lockout and concurrent-session limit.
**No spec states any figure** — all thirteen were searched. So the requirement is
met by the mechanism, and the values below are the developer's recommendation
awaiting the project owner's word. Every one is overridable from `.env` without
a code change, which is what makes "configurable" true rather than nominal.

| # | Setting | Proposed | Why this number |
|---|---|---|---|
| 1 | Password minimum length | **12 characters**, no composition rule | Length is what costs an attacker; composition rules ("one capital, one digit, one symbol") reliably produce a small set of predictable shapes. This follows current guidance rather than the older habit. Mixed-case, digit and symbol rules exist and are **off**, kept only for a client whose own policy mandates them |
| 2 | Idle session timeout | **30 minutes** | Long enough not to interrupt an agent mid-ticket, short enough that an unlocked machine at lunch is not an open session all afternoon |
| 3 | Absolute session lifetime | **12 hours** | Covers a full shift including overrun, and forces a fresh sign-in daily no matter how active the session was. Replaces the old 8-hour token expiry, which was the only session control that existed |
| 4 | Failed-attempt lockout | **10 attempts, 15-minute lock** | Five is the reflex and it is too low: it generates support load, and it is a denial-of-service anybody can trigger against a known email address. Ten still stops online guessing dead. The lock **expires on its own** — an administrator-only unlock turns every mistyped password into a ticket |
| 5 | Concurrent sessions | **3** | Desk browser, laptop, phone. Exceeding it revokes the **oldest**, never the newest: refusing the new session locks somebody out of the device in front of them because of one they abandoned elsewhere |

**⚠ One conflict, surfaced rather than absorbed — now CLOSED.** The value in
`DEMO_PASSWORD` was **eleven** characters, one short of twelve, and the demo seed
refused to run the moment the policy landed. That was the policy working. Rather
than lower the default to fit, a `PASSWORD_MIN_LENGTH=11` override was set in
`.env` with the reason beside it. **Resolved 2026-09-09 the other way:** the demo
password was lengthened to twelve characters and the override **deleted**, so the
ratified value of 12 is the only one in play. All four accounts were re-verified
signing in, and the previous password confirmed refused.

**Verified, not asserted.** `backend/tests/security.test.js` proves each of the
five **refuses**: a short password is rejected by name, the correct password is
refused after ten failures *and the refusal is byte-identical to a wrong-password
refusal* (`010 §8`), a still-valid token is refused once its session goes idle,
an **active** session is refused past its absolute ceiling, and the oldest
session is evicted when a fourth is opened. The suite found two real faults on
its first run.

**A constitutional consequence, recorded.** `auth.service.js` used to carry a
comment explaining that it deliberately used no transaction, because a sign-in
wrote nothing — and ending: *"If a future change adds a database write to this
file — a lockout counter under FR-007, a session record — it MUST open a session
and pass it to both."* Both were added. Sign-in is now transactional on both the
staff and portal paths, and `E-11` holds by atomicity rather than by ordering.

---

## 2. Recommended but **not applied** — with the client

Kept on record as reasoning, not as decisions. No code depends on any of these.

| Marker | Question | Recommendation, and why |
|---|---|---|
| `001 [CLARIFY-1]` | Does the CRM or the ERP own customer master data? | **CRM owns it in phase one**; ERP entitlement is a read-only panel that shows "unavailable" when it cannot resolve (`001` `E-07`). If the ERP wins, `FR-001` and `FR-017` become read-only for synced fields and spec `001` changes materially — which is exactly why it is not being assumed. |
| `001 [CLARIFY-2]` | Which attribute is the unique identity key? | **National ID when present, else normalised primary phone (E.164).** Duplicate detection probes national ID, phone, email and account ref. Blocks `FR-002` search and `FR-010` duplicate detection. |
| `002 [CLARIFY-1]` | The status list, and which statuses pause the clock? | **Ratify the nine-status set already proposed in spec `002` §3 unchanged** — `new`, `assigned`, `in_progress`, `pending_customer`*, `pending_third_party`*, `resolved`*, `closed`, `merged`, `cancelled` (* pauses SLA). It is written and internally consistent; it needs a signature, not a redesign. Blocks `FR-007`, `FR-008` and all of spec `005`. |
| `002 [CLARIFY-2]` | Resolved versus closed, who decides, what grace period? | Every quality metric in spec `009` rests on this. No recommendation without operations. |
| `002 [CLARIFY-3]` | Reference format? | **`TKT-YYYY-NNNNN`, no branch or department encoded**, so the reference survives a cross-branch transfer (`012` `FR-009`). |
| `002 [CLARIFY-4]` | Reopen window? | **14 days.** |
| `002 [CLARIFY-5]` | Category tree depth? | ~~Fixed depth 3~~ **WITHDRAWN 2026-09-07 — the number was invented.** `stories/002 TM-04` (**Must**) requires *"categorise down a **multi-level** tree"* and `FR-005`'s *"inherited by descendants"* implies ≥ 2 levels, so multi-level is evidenced. Nothing in any source supports **three**. Ratified instead: multi-level required, **depth unbounded**. |

---

## 3. Environment and infrastructure

### MongoDB replica set — RESOLVED 2026-09-07, transactions work

Converted from standalone to a **single-node replica set** on 2026-09-07. A
single-node replica set is an ordinary replica set with one member: it has an
oplog, which is the thing multi-document transactions actually require, without
needing a second server.

**What was changed.** Two lines appended to
`C:\Program Files\MongoDB\Server\8.3\bin\mongod.cfg`:

```yaml
replication:
  replSetName: rs0
```

then `replSetInitiate` with the member pinned to `localhost:27017`. The host is
pinned deliberately — left to itself mongod registers the member under the
machine's own name (`SADEK:27017`), and every client then has to resolve that
name to reach the set. On a dev machine that works until a VPN, a DNS change or
a container makes it stop.

`MONGO_URI` is now `mongodb://localhost:27017/?replicaSet=rs0`. The parameter is
not decoration: without it the driver may treat this as a lone server and
transactions fail at runtime, and with it a misconfigured or uninitiated set
fails loudly at connect instead.

**Verified.** Set name `rs0`, member `PRIMARY`, oplog present, and `azmCrm`
survived the conversion with all five collections intact. A multi-document
transaction was proven to **commit** (audit entry + record together) and to
**roll back** (audit entry written, mutation failed, neither persisted).

**Reversible.** `mongod.cfg.standalone-backup` sits next to the config. Restore
it, restart the service, and the instance is standalone again — the replica-set
metadata in `local` is ignored by a standalone.

**Before production:** a single-node set has no redundancy. It satisfies the
transaction requirement and nothing else — `FR-017` (backup, restore, RPO/RTO)
is a separate and still-blocked matter, and production wants three members.

### Superseded: the standalone limitation

*Recorded for history; no longer true as of 2026-09-07.*

Local MongoDB 8.3.8 on `127.0.0.1:27017` was standalone, so multi-document
transactions were unavailable.

**What this blocks.** Any operation that must be atomic across two or more
documents:

- spec `002` `FR-017` **ticket merge** — moves messages, marks the source
  `merged`, stops its clock. A partial merge is data corruption.
- spec `001` `FR-011` **customer merge** — same shape, `AS-05` requires all-or-
  nothing.
- spec `002` `FR-018` split, `FR-011` bulk update
- arguably every audited mutation, since constitution II + `010` `E-11` require
  that a mutation whose audit entry cannot be written is **refused** — which is
  a two-document atomic write

**Needed before step 4/5.** Either a local single-node replica set
(`mongod --replSet`) or MongoDB Atlas. Not needed for steps 2–3, where each
mutation touches one document plus its audit entry.

### `.env` deviation

The authorised deviation: `MONGO_URI` and `PORT` are read from `backend/.env`
rather than hardcoded in the snippets. `index.js` gained one line —
`import 'dotenv/config'` — because ES module imports evaluate in declaration
order, and `connection.db.js` reads `process.env.MONGO_URI` at module-evaluation
time. Without that first line the URI would be `undefined`.

### DB failure takes ~30 seconds to surface

`checkDBconnection` now logs the real error and exits with code 1, as asked.
But the MongoDB driver's default `serverSelectionTimeoutMS` is 30 000 ms, so a
wrong URI or a stopped `mongod` hangs for 30 seconds before failing. Setting
`serverSelectionTimeoutMS: 5000` on the `MongoClient` options would make it fail
in 5. Not applied — it is a change to a verbatim snippet.

---

## 4. Blocked: the scope predicate — UNBLOCKED 2026-09-07 by §1

**`010 FR-004` — "every read and write MUST apply a scope predicate over branch,
department and team" — cannot be built, and two open markers say so.**

- **`012 [CLARIFY-6]`** blocks `010 FR-004` *by name*: "It is the difference
  between scoping and multi-tenancy, and **it must be answered before the
  permission layer is built, not after**." The provisional answer to
  `010 [CLARIFY-1]` drops `012 FR-011`, which strongly implies the answer here
  is "aspiration" — but `[CLARIFY-6]` is a separate marker and it is open.
- **`012 [CLARIFY-3]`** (do departments nest, and to what depth?) blocks
  `012 FR-007`. It decides whether `department ∈ scope` is flat set membership
  or an ancestor walk. Those are different predicates, and picking one is
  guessing.

**What this cost step 2.** `RoleAssignment` ships with `role` only. Spec `010`
§3 gives it `branch_ids`, `department_ids` and `team_ids`; they are absent
because the predicate that reads them is blocked. `FR-021` (a granter may not
exceed their own scope) is unimplemented because no scope is granted for it to
constrain. The audit entry's `scopeContext` field exists and stays `{}`.

**Resolved 2026-09-07** by the provisional answers in §1. The scope half was
built: `src/utils/scope.js` holds the predicate, `authorizeOnTarget` enforces it
per record, and `resolveGrantedScope` enforces `FR-021` at grant time. Two of
the three dimensions — see §7 for why team is absent.

**Recommended answers, for the client conversation.**

| Marker | Recommendation |
|---|---|
| `012 [CLARIFY-6]` | **Aspiration — drop `FR-011`.** Consistent with the answer already given to `010 [CLARIFY-1]`: one deployment, scoping only, no cross-entity isolation layer. |
| `012 [CLARIFY-3]` | **No nesting — departments are flat.** The spec already "assumes at most one level"; flat is that assumption at its simplest, it keeps `department ∈ scope` a set-membership test, and it keeps spec `009`'s reporting rollups simple. |

Both are cheap to answer and both block real work. Worth putting in the same
conversation as `001 [CLARIFY-1]` and `010 [CLARIFY-2]`.

## 5. Blocked: the login screen — UNBLOCKED 2026-09-07 by §1

`012 FR-001` — "the entire interface MUST be available in Arabic and English and
switchable at any time without losing the user's context" — is blocked by
`012 [CLARIFY-1]` (peer languages, or one primary and one translation).

A login screen's labels are interface chrome, so they are `FR-001`. The auth
service, token interceptor and route guard contain no user-visible strings and
were built; the screen's markup was not. Question put to the developer
2026-09-07, awaiting an answer.

Note that the *API* side is already bilingual and needed no marker answered:
every refusal returns `{ message: { ar, en } }`, per spec `010` §8 and spec
`012` §8, on the authority of constitution I. So whatever client mechanism is
chosen, server-supplied messages need no client-side dictionary.

## 6. Open constitutional question — RESOLVED 2026-09-07

The constitution's Governance section says the gate is per **spec**: "A spec
carrying any `[NEEDS CLARIFICATION]` marker may not be planned, tasked or
implemented."

After the three provisional answers above, spec `010` still carries four open
markers — `[CLARIFY-4]` (privacy regime and retention), `[CLARIFY-5]` (RPO and
RTO), `[CLARIFY-6]` (impersonation notification), `[CLARIFY-7]` (data
residency). None of the four blocks any requirement in steps 2 or 3: they block
`FR-015`, `FR-017`, `FR-018`, `FR-019` and `FR-020`, all of which are out of
those steps.

**Resolved.** The constitution was amended to **0.2.0** on 2026-09-07, narrowing
the clarification gate from per-spec to per-requirement, with the reason recorded
in the amendment log. Principles I–VIII untouched. The absolute part — that a
marker's answer is never invented — is unchanged.

## 7. Spec defect — `Team` is referenced as a scope dimension and defined nowhere

**Found while building the scope predicate, 2026-09-07. Reported, not fixed.**

`Team` is referenced as:

| Where | As |
|---|---|
| spec `010` §3, Role assignment | `team_ids` — a set, one of the three scope dimensions |
| spec `010` `FR-004` | "a scope predicate over branch, department **and team**" |
| spec `010` §11 | `get ticket` — "`... AND (team ∈ scope OR role ≥ lead)`" |
| spec `012` §3, Department | `default_team_id` — **Required** |
| spec `002` §3, Ticket | `owning_team_id` — `ref Team`, **Required** |
| specs `005`, `007`, `009` §11 | `team ∈ scope` in contract predicates |

`grep -rn '### Team' specs/` returns nothing. No spec gives Team attributes, an
owning spec, or rules. It is the only scope dimension with no entity definition,
and spec `012` marks a *required* reference to it on an entity that is built.

**What was done instead of inventing it.** `FR-004` is implemented over branch
and department. `team_ids` is absent from `role-assignment.model.js` and
`Department.defaultTeamId` is absent from `department.model.js` — absent rather
than nullable, so nothing depends on a field whose meaning is unknown. Both
files say why in a comment. `src/utils/scope.js` names the gap at the top.

**What it costs to close.** Team is a third set-membership dimension in
`assignmentCovers` and a third array on the assignment. Contained, because the
predicate lives in one file. It needs an entity definition first: which spec
owns it, whether a team belongs to one department or several, and whether
`Ticket.owning_team_id` makes it required before tickets can exist.

### RECORDED AS A SPEC DEFECT — ratified by the developer 2026-09-07

Not a clarification marker. A marker would imply a question awaiting a client
answer; this is a **hole the clarification gate cannot detect**, because nobody
marked it. `grep -rn 'CLARIFY' specs/` never mentions Team.

**The upstream need is evidenced, and it is `Must` priority.**

| Story | Priority | Text |
|---|---|---|
| `SEC-04` | **Must** | *"scope data by department, branch and **team** \| one branch cannot read another branch's customers"* |
| `TM-09` | **Must** | *"assign or reassign to an agent or **team** with a reason"* |
| `AD-16` | **Must** | *"the **team** queue by unassigned, oldest, at-risk and agent"* |
| `RP-03` | **Must** | *"SLA compliance for response and resolution by **team**, agent, tier"* |
| `RP-11` | **Must** | *"filter every report by date, department, branch, **team**, agent, channel, segment"* |
| `CP-03` | **Must** | *"see status, **owning team** and expected response time"* |

**Two required fields point at nothing.**

| Spec | Field | Marked |
|---|---|---|
| `012` §3, Department | `default_team_id` | **Required** |
| `002` §3, Ticket | `owning_team_id ref Team` | **Required** |

**Some relationships ARE specified**, so this is a missing entity definition
rather than a missing concept:

- `012 FR-007`: a department owns *"queues, category subtree, SLA policies,
  status set, **teams** and reporting boundary"* — **a team belongs to a
  department.**
- `002` §2: a ticket *"Has exactly one customer, one owning team, and at most one
  assigned agent."*
- `002 E-12`: *"the ticket returns to the owning team queue as unassigned and the
  **team lead** is notified"* — a team has a lead.
- `005` §2: *"**Eligible agent** \| An agent who is active, in the owning team,
  ..."* — a team has members.

**What is absent.** No `### Team` section in any of the thirteen specs. No
attributes, no owning spec, no rules. The only `### .*Team` match in the
repository is `specs/004`'s scenario title *"AS-10 — Team queue is a working
tool"*.

**What was built instead of guessing.** `FR-004` covers branch and department —
two of the three dimensions it names. `team_ids` is absent from
`role-assignment.model.js` and `defaultTeamId` is absent from
`department.model.js` — **absent rather than nullable**, so nothing depends on a
field whose meaning is unknown. Both files carry the reason in a comment;
`src/utils/scope.js` names the gap at the top.

**Still open, and it is a spec-authoring question rather than a client one:**
which spec owns the Team entity, whether a team belongs to exactly one
department (`FR-007` implies yes, nothing states it), whether an agent belongs to
one team or several (`SEC-05` — *"one user with different roles in different
teams"* — implies several), and whether a team carries its own scope or inherits
its department's.

**Blocks step 4/5 work that touches tickets**, because `002` §3 makes
`owning_team_id` required on Ticket.

## 8. Consequences of the break-glass root's unrestricted scope

Spec `010` §3 says an empty scope set means "all within the granting admin's own
scope, never all globally". The break-glass administrator (`E-07`) is the
bootstrap identity and has no enclosing scope to inherit, so it is the one
identity whose scope is unrestricted.

Implemented as an **explicit flag on the assignment** (`unrestricted: true`),
never as an empty array. "Empty means everything" is the classic scoping bug: a
truncated or failed-to-populate list silently becomes global access. With a flag,
an empty array is a validation error instead.

Two consequences worth knowing:

1. `resolveGrantedScope` **refuses** an omitted scope when the granter is
   unrestricted (`explicit_scope_required`). An unrestricted granter has no
   scope to inherit, so defaulting would mean granting everything by omission.
   Every other admin's omitted scope resolves to their own, per `AS-04`.
2. `user.breakGlass` drives **audit severity only**, never scope. Scope has one
   source of truth — the assignment. Two sources would eventually disagree.

## 9. Audit reconciliation — `npm run audit:reconcile`

The false positive described in §10 is no longer theoretical. `npm run
audit:reconcile` reports it, in both directions, and **never repairs anything**
— a correction to the audit log is an append made by a person who has understood
the discrepancy (`FR-008` forbids editing and deleting), so automatic repair
would be the exact thing the append-only rule exists to prevent.

| Direction | Means | Expected |
|---|---|---|
| An audit entry with no record | Was the `E-11` false positive. **As of 2026-09-07 this can no longer be produced by any converted path** — see §10. A non-zero result is now a genuine defect signal, not expected residue. | 0, always |
| A record with no audit entry | **Constitution II violation.** A code path wrote a record without going through `utils/audit.js`. | 0, always |
| A model absent from the check | A gap in the report, not a clean result — the script names unchecked models rather than staying silent about them | 0 |

Verified by injecting one fault of each kind: both were reported with the
record id, the timestamp, what it means and what to do. Attempting to *delete*
the orphaned entry to tidy up was refused by the append-only hooks. Fixtures
were dropped and the dev database re-seeded afterwards.

Exits non-zero on findings, so it can gate a release rather than only inform.

## 10. `E-11` — from ordering to atomicity (CLOSED 2026-09-07)

Spec `010` `E-11`: "if the system cannot write an audit entry, the underlying
action is refused." `NFR-005`: audit write durability 100%.

The natural implementation is a transaction — audit entry and mutation, both or
neither. That needs a replica set. Our MongoDB is standalone, so
`startTransaction()` throws.

**What is implemented is audit-first ordering:** write the audit entry, and only
if it succeeds perform the mutation. Verified by test — with the audit store
forced to fail, `POST /user` created no user and surfaced the error.

**What is NOT guaranteed, stated plainly:** atomicity. If the audit write
succeeds and the mutation then fails, the log holds an entry for something that
did not happen — a false positive. It is detectable by reconciliation and
correctable by appending a compensating entry.

**Why this ordering and not the reverse.** A mutation that succeeds with no audit
entry is undetectable and breaks constitution II absolutely. Over-recording is a
nuisance; under-recording is a violation. The ordering picks the survivable
failure.

**The proper fix** is a replica set. As of 2026-09-07 it is in place and proven
(§3), so the gap is now closable.

### CLOSED 2026-09-07 — the conversion is done and `E-11` is atomic

`recordAudit` takes an optional `session`. Every caller that mutates anything
opens one, starts a transaction on it, and passes it to both the writer and its
own writes. Audit-first ordering was **kept** inside the transaction: atomicity
makes the ordering unnecessary, but it costs nothing and changing one thing at a
time is worth more than the tidiness.

All five call sites, and what each needed:

| Caller | Documents per operation | Session? |
|---|---|---|
| `user.service.js` `createUser` | 1 user + N assignments + 1 audit entry each | **Yes** — the largest win |
| `user.service.js` `setState` | 1 user + 1 audit entry | **Yes** |
| `platform.service.js` | 1 branch or department + 1 audit entry | **Yes** |
| `seed-admin.js` | 1 user + 1 assignment + 2 audit entries | **Yes** — the worst place for a partial write |
| `auth.service.js` | 1 audit entry, no mutation | **No** — reviewed, decision recorded in the file |
| `permission.middleware.js` | 1 audit entry, no mutation | **No, by design** — see below |

The two that need none write a single document and mutate nothing, and MongoDB
is already atomic about a single-document insert. `permission.middleware.js`
must additionally **never** join a caller's transaction: it records refusals,
and a refusal that rolled back with the failed request would erase exactly the
security events §10 requires as evidence.

The largest win was `createUser`. Before, a failure partway through the role
loop left a user holding some of their roles and an audit log claiming all of
them — a user with fewer rights than the record says were granted, which is the
worst direction for that error to go.

The acceptance suite was re-run after **each** caller, so a break would have
named its own cause: 23/23 at every step, five times.

### Is the orphaned-entry direction structurally impossible, or just unlikely?

**Structurally impossible within every converted path. Not yet a system-wide
invariant.** The distinction is worth stating precisely, because "impossible"
and "impossible if we keep doing it right" are different claims.

**What is guaranteed.** Where the audit entry and the mutation share a
transaction, an orphan is not improbable — it cannot occur. The storage engine
will not commit one without the other, and an aborted transaction discards both.
Verified by forcing the mutation to fail *after* its audit entry was written, in
three shapes:

| Case | Forced failure | Result |
|---|---|---|
| `createUser` | second role assignment throws, after the first committed | no user, no assignments, audit count unchanged |
| `createBranch` | branch insert throws | no branch, **no orphaned entry** |
| `deactivateUser` | `user.save` throws | state unchanged, audit count unchanged |

Every one of those left an orphan before the conversion. None does now.

**What is not guaranteed.** The invariant rests on the call site doing the right
thing. Nothing in the code *prevents* a future service from calling
`recordAudit` without a session beside a mutation — it would compile, pass
review if nobody looked, and produce orphans. So the honest statement is:
**structurally impossible where the pattern is followed, and the pattern is a
convention rather than an enforced constraint.**

**One cheap hardening would close that too**, and it is deliberately not applied
because it was not asked for: make `session` a **required** parameter of
`recordAudit` with no default, so a caller must pass `session: null`
explicitly. Omission then becomes a runtime error instead of a silent
non-transactional write, and "I forgot" becomes "I declared". One line, plus
`session: null` at the three standalone call sites. Say the word.

**What this means for the reconciliation check.** Direction 1 changes meaning
rather than becoming redundant. It is no longer measuring an accepted residue;
it is now a defect detector for a call site that omitted a session. Keep running
it — a non-zero result is a bug in the code, not a fact of the storage engine.

---

## 11. Spec defect — `FR-004` forbade shared contact points (RESOLVED 2026-09-07)

**Found during the evidence review, 2026-09-07. Recorded as a defect, not a marker** —
the same category as `Team` in §7. Nobody wrote a `[CLARIFY]` for it, so the
clarification gate could never have raised it.

### The defect as it stood

Three statements in spec `001` combined to forbid something ordinary:

- `FR-004` (**MUST**): each contact point value *"MUST be unique per channel type
  across active customers"*
- `E-05`: a value belonging to another active customer is *"**Refused**"*
- §2: a contact point *"**Belongs to exactly one customer**"*

**Consequence:** a husband and wife sharing one mobile could not both be
customers. Neither could two people behind one office switchboard, nor a family
sharing an email address. In a support CRM that surfaces in the first week of
use.

**And it contradicted the same spec's own posture.** `FR-010` (**SHOULD**) says
duplicate detection *"MUST present it before saving. **It MUST NOT block
creation.**"* `E-01` says *"Both records are created ... **No silent
auto-merge.**"* `AS-04` specifies the confirm-and-proceed interaction in detail.
So `001` hard-refused a contact-point collision while deliberately tolerating a
customer-record collision — arguing with itself.

### The resolution — option D2, ratified 2026-09-07 by Mohamed Sadek (developer, acting as decision authority)

`FR-004` relaxed to **unique per channel type by default, overridable**: a
collision surfaces the other customer, requires explicit confirmation, and
records the override in field history. `E-05` amended from *refused* to
*surfaced*. Both amended in `specs/001` with the change noted inline.

**Options considered and rejected:**

| Option | Why not |
|---|---|
| **D1** — keep uniqueness, model sharing as an organisation | Works for switchboards, fails for households: §3 requires an organisation target to be `type = organisation`, and `FR-012` caps a person at one organisation. Households would stay unrepresentable, and agents would work around it silently. |
| **D3** — a distinct `shared` contact-point type | The only option that faces outbound consent squarely, but it needs `[CLARIFY-5]` answered first and adds a concept to §3, `FR-004`, `FR-005` and `E-05`. Revisitable if D2's refusal proves too blunt. |

### ⚠ The gap D2 leaves, recorded loudly

**D2's weakness is real and is not papered over.** A shared contact point
carries the consent state of two or more customers, and `FR-022` records consent
*per customer, per channel type, per purpose*. An outbound send under one
customer's consent would reach the others without theirs.

**`001 E-15` was added to close it by refusing:** outbound on a shared contact
point **MUST be refused**, naming the sharing as the reason, and **MUST NOT**
fall back to the first, the primary, or the most recently confirmed customer's
consent. Fail closed.

**This is an unbuilt MUST.** No outbound messaging code exists — messaging is
spec `003`, which has six open markers, and contact points arrive with step 4.
So `E-15` is a requirement that step 4 must implement, not a guard already in
place. Recorded in `docs/trace.md` so it is not mistaken for done.

**It clears when `001 [CLARIFY-5]` is answered** — whether a service reply to an
open ticket is exempt from consent, or consent gates all outbound including
replies. Until then, refusing is the only safe behaviour.

---

## 12. AWAITING REVIEW — a new requirement for spec 009, not yet added

Drafted 2026-09-07. **Not applied.** It is reproduced in the session transcript for
review and will be added to `specs/009` and `stories/009` together, or not at
all.

**Why it exists.** Ratifying `pending_customer` as `pauses_sla = yes` (§0 #14)
created an abuse path: an agent behind on their queue can park a ticket with a
token question and stop the clock. Nothing in spec `002` or spec `005` guards
against it, and `009` has no report that would surface it.

**Why it needs a story too.** It originates from this review, not from the source
feature list. Constitution VIII requires every requirement to trace to a story
and every story to *"a numbered need in the source feature list or to an
explicit, dated amendment"*. Adding the requirement alone would make it orphan
work; adding a story that pretends it came from the client would be worse. So
the story is written as an explicit, dated amendment, and says so.

**Shape:** time in `pending_customer` as a share of total handling time, per
agent, per period, against a configurable threshold. **It flags; it does not
block.** A legitimate long wait on a customer is common, so this is a
supervision signal rather than an enforcement mechanism.

---

## 13. Spec defect — `004 FR-009` cannot be satisfied without changing the permission model (RESOLVED 2026-09-09)

**Found by the board audit, 2026-09-09. Reported, not fixed.** The same category
as `Team` in §7 and shared contact points in §11: nobody wrote a `[CLARIFY]` for
it, so the clarification gate could never have raised it. Spec `004` carries five
open markers and this is not among them.

### The requirement

> `004 FR-009` (**MUST**, traces `AD-09`): *"An agent MUST be able to mention a
> colleague in an internal note; the mention MUST notify them and **MUST grant
> them access to that ticket only**, recorded in history."*

### What it collides with

| Source | Statement |
|---|---|
| **Constitution IV** | Scope is enforced server-side per request, evaluated against the target record. Out-of-scope is 404, not 403 |
| `010 FR-004` (**MUST**) | *"Every read and write MUST apply a scope predicate over branch, department and team, evaluated server-side against the target record"* |
| `010 FR-002` (**MUST**) | *"Permissions MUST be assigned through roles only. **Per-user permission overrides MUST NOT exist.**"* |
| `010 §3`, Role assignment | The only grant shape in the system: a role, plus `branch_ids`, `department_ids`, `team_ids` |

**`010 FR-002` is the decisive one.** A mention grants one named person access to
one named record. That is a per-user permission override by any reading, and
`FR-002` forbids per-user overrides in the same **MUST** breath that `FR-009`
requires one. Two MUSTs in two specs, directly opposed.

There is also no shape to express it. `RoleAssignment` scopes by branch,
department and team — it has no record-level dimension, and adding one changes
the predicate that every read and write in the codebase runs through.

### Why this is not an implementation detail

Three ways out, none of which an implementer should pick quietly:

1. **Add a record-level grant** — a new entity, and a second thing the scope
   predicate must consult on every read. It weakens the single strongest
   invariant in the system, in exchange for a convenience feature.
2. **Notify without granting** — the colleague is told they were mentioned and
   gets a 404 if they follow the link. Satisfies the notify clause, breaches the
   access clause, and produces a genuinely confusing experience.
3. **Widen the mentioner's options** — only allow mentioning colleagues who
   already hold scope on that ticket. Satisfies both MUSTs and quietly reduces
   the feature to something the spec did not ask for. Cheapest, and arguably the
   honest reading of what mentions are for.

**✅ RESOLVED 2026-09-09 — decision 39, option 3.** Mentions are restricted to
colleagues who already hold scope on the ticket. Both MUSTs hold and the scope
predicate is untouched. The defect record stays as written above, because the
conflict is real and a future reader needs to see it was found rather than
absent; what changed is that it now has an answer. Full reasoning, what is given
up, and what to reopen if the client needs cross-scope mentions: decision 39,
twelfth batch. Tracked on the board as `agent-mention`.

---

## 14. Spec defect — `002 FR-007` (MUST) depends on `002 FR-008` (SHOULD)

**Found by the board audit, 2026-09-09.** Not a marker; spec `002` carries **zero**
open markers and is the only spec that does, which is exactly why this survived.

### The dependency

> `002 FR-007` (**MUST**): *"A ticket MUST hold exactly one status **from the
> administrator-defined set**; each status MUST carry `pauses_sla` and `terminal`
> flags."*
>
> `002 FR-008` (**SHOULD**): *"Administrators MUST be able to define statuses and
> the legal transitions between them."*

`FR-007` is mandatory and requires the status set to be *administrator-defined*.
The only requirement that provides administrator definition is `FR-008`, which is
merely recommended. **A MUST rests on a SHOULD**, so a compliant implementation
could decline to build `FR-008` and thereby make `FR-007` unsatisfiable.

Note the wording of `FR-008` itself: its *text* says "MUST be able to", while its
*level column* says SHOULD. The row disagrees with itself. This pattern recurs —
`001 FR-005` is levelled SHOULD over text reading *"outbound messaging MUST default
to the primary"* — which suggests the level column was filled in separately from
the requirement text and is not reliable on its own.

### How the shipped code resolves it, and why that is not a resolution

Statuses are a **code constant** in `utils/ticket-status.js`, with a default
transition graph authored under decision 22 because `FR-008` supplies none. That
satisfies `FR-007`'s "exactly one status" and its two flags, and fails its
"administrator-defined" clause outright. It was the right call for delivery and it
is not compliance.

**No decision is requested here.** Unlike §12 this needs no judgement — it needs
the administrator configuration work, which is now tracked as `admin-configuration`
on the board and additionally carries `010 FR-011`, itself an unblocked **MUST**.
Recorded so that the defect is attributable to the spec rather than looking like an
implementation shortcut.

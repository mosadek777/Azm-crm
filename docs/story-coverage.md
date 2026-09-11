# story-coverage.md — every story mapped to the test that proves it

**Date:** 2026-09-09 · **Against:** `backend/tests/` — 5 suites, 245 checks
**Direction:** story → requirement → test. The suites are organised the other
way round, by requirement, so this view has never existed before.

---

## Why the direction matters

A spec test proves the endpoint accepted the input and answered 200. A story
test proves the thing the story asked for actually happened and is still there
afterwards. **The first can pass while the second fails**, and the worked
example below is not hypothetical — it is live in this repository today.

---

## Method

**Population.** Every table row in all thirteen `stories/*/story.md` whose first
cell is a story id: **253 stories**. Every `FR`/`NFR` row in all thirteen specs,
with its `Traces` column: this gives requirement → story.

⚠ **Read the Traces column by HEADER POSITION, not as the last cell.** Spec
`013` has a fifth `Status` column and the first extractor silently read that
instead — see the `013` section for what it cost.

**The mapping is 1:1 throughout.** Every story traces to exactly one
requirement, and almost every requirement to exactly one story. That is
convenient and slightly misleading — it means the chain has no redundancy, so a
single untested requirement leaves its story wholly unproven.

**Three levels, assigned by reading the checks, not by matching identifiers:**

| Level | Meaning |
|---|---|
| **Proven** | A check asserts the story's outcome *including its "so that" clause*. A regression that satisfied the endpoint but broke the promise would fail. |
| **Partial** | The mechanism is exercised — the call is made, the refusal fires — but the story's promise is not asserted. The endpoint could keep answering 200 while the user need silently stopped being met. |
| **None** | No check touches it. |

**⚠ A mechanical map was built first and it was wrong twice.** Both errors are
recorded rather than quietly corrected, because they are the reason this
document is hand-checked:

1. The first classifier read `.length` on a `Set`, which is `undefined` and
   never `0`, so **every one of the 253 stories was reported as covered** —
   including specs with no code at all. Obviously wrong, and only obvious
   because the answer was implausible on its face.
2. Matching on identifiers alone **undercounts and miscounts**. It undercounts
   because many checks prove a requirement without naming it. It miscounts
   because a suite can name the wrong one — see the mislabel below.

---

## ⚠ Two defects found while mapping

### 1. `ticket.test.js:123` claims a requirement it does not test

```
console.log('\n--- FR-005: roles compose per record, they do not union ---')
```

In a suite that otherwise covers spec `002`, a bare `FR-005` reads as
**`002 FR-005`** — *"each category node MUST support a default priority, owning
team and SLA policy"*. That is not built at all (category is a flat string,
deviation 21).

What the section actually tests is **`010 FR-005`** — *"a user MUST be able to
hold several role assignments with different scopes; effective permissions MUST
be evaluated per request against the target record"*. The test is good and the
label is wrong, and the label is what a coverage map reads. **A coverage tool
run against this repository today would report `002 FR-005` as covered.**

Fix: qualify the spec in every cross-spec section header.

### 2. `TM-09` — the worked example, confirmed live

> `TM-09` (**Must**): *As an* `AGT` *I want to* **assign or reassign to an agent
> or team with a reason** *so that* **nobody wonders later why**.

`002 FR-009` (**MUST**): *"Assignment and reassignment MUST record actor,
previous holder, new holder **and a reason**"*.

What `ticket.test.js` asserts:

| Check | What it proves |
|---|---|
| `assign with no reason refused (AS-06)` → 400 | a reason is **required** |
| `AGT assigns an unassigned ticket to a colleague` → 200 | the call **succeeds** with one |
| `and the assignee really is them` | the **assignee** persisted |

**Nothing reads the reason back.** No check confirms `'Hana owns billing'` is
retrievable afterwards. Delete the `reason` field from the audit entry and all
seven checks in that section still pass.

**This is a test gap, not a code gap** — verified: `ticket.service.js:344`
writes `reason: String(reason).trim()` into the audit entry. The behaviour is
correct and unproven, which is the worst combination, because the next person to
refactor it has no signal.

`TM-09` is therefore **Partial**, and it is the template for what a story test
adds: *read the reason back and assert it is the one that was sent.*

---

## The mapping

### Summary

| | Stories | Proven | Partial | None |
|---|---|---|---|---|
| **Built modules** (`001`, `002`, `008`, `010`, `012`) | **107** | **21** | **17** | **69** |
| **Unbuilt modules** (`003`–`007`, `009`, `011`) | **136** | 0 | 0 | 136 |
| **`013` cross-cutting** | **10** | 0 | 0 | 10 |
| **Total** | **253** | **21** | **17** | **215** |

**21 of 253 stories are proven end to end — 8%.** Of the 107 stories in modules
that are actually built, 21 are proven and 17 are partial.

The 136 unbuilt-module stories are *correctly* uncovered: there is no code to
test, and every one of those modules has a board card. They are listed for
completeness, not as a gap.

### `001` Customer management — 22 stories · 3 proven · 4 partial

| Story | Req | Level | Note |
|---|---|---|---|
| `CM-01` create mid-call | `FR-001` | **Proven** | minimal create, and refused without a name or a contact point |
| `CM-02` search four ways | `FR-002` | Partial | phone normalisation proven; search by name / national ID / account ref and the 3-character prefix rule are not asserted |
| `CM-03` everything on one screen | `FR-003` | None | `segments` and `entitlement` do not exist — see the board audit |
| `CM-04` many contact points | `FR-004` | Partial | primary rules proven; "unlimited across three channel types" not asserted |
| `CM-05` primary + preferred | `FR-005` | Partial | one-primary-per-type proven both ways; "outbound defaults to the primary" has no outbound to test |
| `CM-06` one interaction history | `FR-006` | None | not built |
| `CM-07` filter that history | `FR-007` | None | not built |
| `CM-08` notes the customer never sees | `FR-008` | **Proven** | proven in `portal.test.js`, not the customer suite — *"the internal note appears NOWHERE in the response"* |
| `CM-09` attach files to a customer | `FR-009` | None | not built |
| `CM-10` warned before a duplicate | `FR-010` | **Proven** | 409 names the match, override creates and is recorded, out-of-scope match counted but not named |
| `CM-11` merge duplicates | `FR-011` | None | field exists, operation does not |
| `CM-12` link to an organisation | `FR-012` | Partial | linking and its two refusals proven; "the organisation view lists every member's tickets" is unbuilt |
| `CM-13` segments | `FR-013` | None | entity missing |
| `CM-14` entitlement and SLA tier | `FR-014` | None | not built |
| `CM-15` lifetime counters | `FR-015` | None | not built |
| `CM-16` sensitive flag | `FR-016` | None | field exists, untested, and the story's promise is that it shows *everywhere the name appears* |
| `CM-17` customer edits own details | `FR-017` | None | not built |
| `CM-18` custom fields | `FR-018` | None | not built |
| `CM-19` bulk import | `FR-019` | None | not built |
| `CM-20` who changed which field | `FR-020` | Partial | audit entries are written and reconciled; **nothing reads a field change back** — same shape as `TM-09` |
| `CM-21` erasure | `FR-021` | None | gated by `001 [CLARIFY-4]` |
| `CM-22` consent per channel | `FR-022` | None | gated by `001 [CLARIFY-5]` |

### `002` Ticket management — 32 stories · 6 proven · 6 partial

| Story | Req | Level | Note |
|---|---|---|---|
| `TM-01` create from a few fields | `FR-001` | **Proven** | creates, and refuses incomplete |
| `TM-02` short human reference | `FR-002` | Partial | a reference is returned; **uniqueness, immutability and never-reused are not asserted** |
| `TM-03` opened from email/form | `FR-003` | None | no channel exists |
| `TM-04` multi-level category | `FR-004` | None | deviation 21 |
| `TM-05` category defaults | `FR-005` | None | **falsely credited by the mislabel above** |
| `TM-06` priority and its source | `FR-006` | Partial | `prioritySource` is stored; no check reads it back |
| `TM-07` status lifecycle | `FR-007` | **Proven** | legal transitions, and an undefined one refused with the reachable set named |
| `TM-08` configure transitions | `FR-008` | Partial | refusal proven; the administrator-defines-them half is unbuilt |
| `TM-09` assign with a reason | `FR-009` | Partial | **the worked example — reason required, never read back** |
| `TM-10` pull from a shared queue | `FR-010` | **Proven** | self-assign, and the assignee is verified afterwards |
| `TM-11` bulk actions | `FR-011` | None | |
| `TM-12` escalate with a note | `FR-012` | None | |
| `TM-13` immutable history | `FR-013` | Partial | every mutation is audited and reconciled; append-only is enforced by model hooks but **no check attempts an edit and is refused** |
| `TM-14` notes separate from replies | `FR-014` | **Proven** | proven twice — in the ticket suite and again from the customer's side |
| `TM-15` attachments | `FR-015` | None | |
| `TM-16` link tickets | `FR-016` | None | |
| `TM-17` merge tickets | `FR-017` | None | fields exist, operation does not |
| `TM-18` split a ticket | `FR-018` | None | |
| `TM-19` sub-tasks | `FR-019` | None | |
| `TM-20` free tags | `FR-020` | Partial | stored; the "available as a report dimension" half is unbuilt |
| `TM-21` follow-up date | `FR-021` | **Proven** | permitted only on a clock-pausing status |
| `TM-22` reply reopens | `FR-022` | None | documented as unbuilt in three places |
| `TM-23` snooze | `FR-023` | None | |
| `TM-24` colleague typing | `FR-024` | None | |
| `TM-25` custom fields per category | `FR-025` | None | |
| `TM-26` saved shared views | `FR-026` | None | carries a constitution IV clause |
| `TM-27` full-text search | `FR-027` | Partial | filters proven; Arabic diacritic-insensitivity not built |
| `TM-28` time logging | `FR-028` | None | |
| `TM-29` root cause and resolution | `FR-029` | None | decision 23 |
| `TM-30` ticket to KB draft | `FR-030` | None | |
| `TM-31` closure on confirmation | `FR-031` | None | decision 9 |
| `TM-32` ticket types | `FR-032` | None | |

### `008` Customer portal — 18 stories · 6 proven · 3 partial

The strongest suite in the repository, and the closest to story-level already.

| Story | Req | Level | Note |
|---|---|---|---|
| `CP-01` sign in by code or SSO | `FR-001` | Partial | sign-in and every refusal proven and proven *identical*; but by **password**, not the one-time code the story asks for (decision 31) |
| `CP-02` submit with attachments | `FR-002` | Partial | submission proven thoroughly, including that unpermitted fields are refused **by name**; attachments absent (decision 34) |
| `CP-03` status, owning team, timing | `FR-003` | Partial | status and timing proven; owning team absent (decision 35) |
| `CP-04` reply with attachments | `FR-004` | **Proven** | reply appends, is attributed to the customer, and staff see it |
| `CP-05` list and filter my requests | `FR-005` | **Proven** | own-only, count-exact, and **explicitly non-vacuous** |
| `CP-06` organisation visibility | `FR-006` | None | |
| `CP-07` browse knowledge | `FR-007` | None | |
| `CP-08` rate a resolved ticket | `FR-008` | None | |
| `CP-09` reopen within the window | `FR-009` | None | |
| `CP-10` choose notifications | `FR-010` | None | |
| `CP-11` Arabic and English | `FR-011` | Partial | verified by screenshot, not by test |
| `CP-12` complete on a phone | `FR-012` | None | now measured for layout overflow, not for task completion |
| `CP-13` edit my own details | `FR-013` | None | |
| `CP-14` withdraw a request | `FR-014` | None | |
| `CP-15` download a summary | `FR-015` | None | |
| `CP-16` announcements | `FR-016` | None | |
| `CP-17` mark as a complaint | `FR-017` | None | |
| `CP-18` portal branding | `FR-018` | None | |
| — | `FR-019` | **Proven** | internal content excluded, asserted to appear **nowhere** |
| — | `FR-020` | **Proven** | every portal action attributed to the customer |

### `010` Security and administration — 20 stories · 5 proven · 2 partial

| Story | Req | Level | Note |
|---|---|---|---|
| `SEC-01` create/deactivate users | `FR-001` | Partial | creation proven; **deactivation terminating sessions is not tested** |
| `SEC-02` permissions via roles only | `FR-002` | **Proven** | |
| `SEC-04` scope predicate | `FR-004` | **Proven** | the most thoroughly proven thing in the repository — including that the two 404 bodies are byte-identical |
| `SEC-05` several role assignments | `FR-005` | **Proven** | the union bug, proven through the API |
| `SEC-06` SSO and MFA | `FR-006` | None | uncovered MUST |
| `SEC-07` password and session policy | `FR-007` | **Proven** | all five controls proven to **refuse**, each able to fail |
| `SEC-08` audit everything | `FR-008` | **Proven** | written inside the transaction, reconciled, append-only |
| `SEC-09`–`SEC-20` | various | None | audit viewer, encryption, backups, retention, impersonation, sandbox — see the board |

### `012` Platform — 15 stories · 1 proven · 2 partial

| Story | Req | Level | Note |
|---|---|---|---|
| `PLT-01` bilingual interface | `FR-001` | Partial | dictionary completeness is checked by script, not by suite |
| `PLT-02` correct RTL | `FR-002` | Partial | screenshot-verified in both languages; no automated assertion |
| `PLT-04` translate configurable content | `FR-004` | **Proven** | `AS-02` — a single-language label is refused, both ways round |
| `PLT-07` departments | `FR-007` | Partial | exercised as scope fixtures rather than asserted as a capability |
| `PLT-08` branches | `FR-008` | Partial | same |
| `PLT-15` action feedback | `FR-016` | None | added today; verified by browser, not by suite |
| others | | None | mobile, push, transfer, branding, isolation, accessibility, dark, guidance |

### Unbuilt modules — 136 stories, all None, all carded

Listed for completeness. No code exists, so no test can exist; each module has a
board card naming what blocks it.

| Spec | Stories |
|---|---|
| `003` channels | `CH-01`–`CH-25` |
| `004` agent dashboard | `AD-01`–`AD-18` |
| `005` SLA & automation | `SLA-01`–`SLA-18` |
| `006` knowledge base | `KB-01`–`KB-17` |
| `007` AI | `AI-01`–`AI-20` |
| `009` reports | `RP-01`–`RP-21` |
| `011` integrations | `INT-01`–`INT-17` |

### `013` cross-cutting — 10 stories, all traced, none tested

**⚠ CORRECTION, 2026-09-09.** An earlier revision of this document claimed
`NFR-01`–`NFR-10` were the only stories no requirement traced back to, and
called it a traceability break under constitution VIII. **That was wrong, and it
was my parser's fault, not the specs'.**

Spec `013` is the only one of the thirteen whose requirement table carries a
fifth column — `| ID | Requirement | Level | Traces | Status |`. The extractor
read the **last** cell as Traces, so for `013` it read *Status* and found no
story ids. Every other spec ends at Traces, which is why only this one was
affected.

**All ten stories are correctly traced**, to `013 FR-001`–`FR-010`
respectively. There is no traceability break and nothing to record. What is true
is much more ordinary: all ten are **None** — nothing is built and nothing is
tested, which the board now tracks as `cross-cutting-operations`.

The correction is kept rather than silently edited, because a coverage document
that quietly changes its own findings is worth no more than no document at all.

---

## Answer to "reorganise, or a layer alongside?"

**A layer alongside. Do not reorganise `backend/tests/`.**

Three reasons, in order of weight.

**1. They test different things, and the existing suites test the right thing
well.** The current suites are *contract* tests: does this endpoint accept,
refuse, scope and audit correctly. That is exactly what you want organised by
requirement, because a requirement is what an endpoint implements. Reorganising
them by story would scatter the scope-predicate checks across a dozen files and
make the strongest thing in the repository harder to read.

**2. The mapping is 1:1, so a story layer would duplicate almost everything.**
Every story traces to exactly one requirement. Reorganised by story, the files
would contain the same checks under different headings — 245 checks moved, zero
added, and the diff would be unreviewable.

**3. The gap is not coverage, it is depth.** The 17 Partial stories are not
missing tests; they are missing *one more assertion* — read the reason back,
read the field change back, attempt the illegal edit. A story layer adds those
assertions. Reorganisation adds none of them.

**The risk you named is real and this avoids it.** Two structures testing the
same thing is what you get if a story layer re-tests endpoints. It must not.

---

## Proposed structure

Your instinct — one file per story file, checks named with the story id and the
story's own words — is right, with one amendment.

### Layout

```
backend/tests/
  scope.test.js  customer.test.js  ticket.test.js  portal.test.js  security.test.js
  stories/
    001-customer.story.test.js
    002-ticket.story.test.js
    008-portal.story.test.js
    010-security.story.test.js
    012-platform.story.test.js
```

Five files, not thirteen: a file per **built** module. The other eight would be
empty and an empty file reads as an oversight.

### What a story check looks like

```js
story('TM-09', 'assign or reassign with a reason', 'so nobody wonders later why', async () => {
  const before = await audit.count('ticket.assigned')
  await call('PATCH', `/ticket/${T}/assign`,
    { token: lead, body: { assignedAgentId: hana, reason: 'Hana owns billing' } })

  // The story's promise: retrievable AFTERWARDS, by someone who was not there.
  const entry = await audit.latest('ticket.assigned', T)
  chk('the reason is recorded', entry.after.reason, 'Hana owns billing')
  chk('with who did it', String(entry.actorId), String(leadId))
  chk('and who it moved between', entry.after.assignedAgentId, hana)
  chk('one entry, not none and not two', await audit.count('ticket.assigned') - before, 1)
})
```

A failure reads: **`TM-09 — assign or reassign with a reason — the reason is
recorded: undefined (want 'Hana owns billing')`**. That names the user need, not
an endpoint.

### The amendment: three outcomes, not two

A story check declares one of three things, and the declaration is part of the
output:

| Declaration | Meaning | Output |
|---|---|---|
| `story(...)` | proven here | runs the assertions |
| `storyCoveredBy('TM-14', 'ticket.test.js — FR-014/AS-07, and portal.test.js')` | **already fully proven** — do not write a second one | prints `COVERED` and asserts nothing |
| `storyUnbuilt('TM-17', 'merge is not built — board card ticket-merge')` | nothing to test | prints `UNBUILT` |

`storyCoveredBy` is how the no-duplication rule is enforced mechanically rather
than by discipline. And the three counts together make the suite a **living
version of this document** — it prints how many stories are proven, referenced
and unbuilt on every run, so this file cannot drift from reality the way
`state.md` did.

### Anti-vacuity, built into the helper

The portal suite already does this by hand — *"and is not empty — otherwise
every check below passes vacuously"* — and it should be the rule, not a habit:

- `story()` **fails** if it runs zero assertions.
- Any check reading a collection **fails** on an empty collection unless
  emptiness is the assertion.
- Every refusal check must be paired with the matching success in the same
  story, so a blanket-deny regression cannot pass.

### Proving each new check can fail

Same method as the `AS-03` tautology and the `FR-007` suite: for each new story
check, reintroduce the fault it exists to catch and confirm it fails. For
`TM-09` that is deleting `reason` from the audit payload — a one-line mutation
that must turn the check red. I would run this for every check in the first
batch and record the result, not assert it.

### Suggested first batch — the 17 Partial stories

Highest value per line, because the fixtures already exist and each needs one
assertion rather than a new scenario:

`TM-09`, `CM-20`, `TM-13`, `TM-02`, `TM-06`, `SEC-01`, `CM-02`, `CM-04`,
`CM-05`, `CM-12`, `TM-08`, `TM-20`, `TM-27`, `CP-01`, `CP-02`, `CP-03`, `CP-11`

Then the `storyCoveredBy` references for the 21 Proven, then `storyUnbuilt` for
the rest — which produces the full 253-story roll-call as executable output.

### Estimate

| Piece | Effort |
|---|---|
| Helper (`story`, `storyCoveredBy`, `storyUnbuilt`, audit read-back, anti-vacuity) | 0.5 day |
| The 17 Partial stories, each mutation-proven | 1.5 days |
| References and unbuilt declarations for the remaining 236 | 0.5 day |
| Fix the `FR-005` mislabel and audit the other headers for the same fault | 0.25 day |

**Roughly 2.75 days.** No new suite replaces anything; 245 checks stay exactly
where they are.

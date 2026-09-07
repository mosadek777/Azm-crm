# AZM Squad Customer Support CRM — Constitution

**Version:** 0.4.0 (ratified: TBD · last amended: 2026-09-07)
**Status:** DRAFT — not yet client-approved

The constitution holds the rules that outrank any individual spec. When a spec
contradicts a principle here, the principle wins and the spec is wrong. Amending
a principle requires a version bump and a note in the amendment log.

---

## I. Bilingual is architecture, not configuration

Arabic and English are **peer languages**, not a primary plus a translation.
Every user-visible string — including configurable content authored by admins
(categories, statuses, quick replies, templates, form labels, articles) — stores
a value per language. Right-to-left layout, mirrored iconography and Arabic
typography are acceptance criteria on every UI story, not a later theme.

*Rationale:* retrofitting RTL and dual-value content models is the single most
expensive mistake available to this project. Anything built monolingual is
rework.

**Test:** no spec may ship a user-visible string with one value.

## II. Every state change is attributable

Every mutation of a ticket, customer, user, permission or configuration record
writes an immutable history entry carrying actor, timestamp, before value and
after value. History is append-only; there is no edit and no delete.
Automated actions record the rule that fired, not just the outcome.

*Rationale:* sections 2, 5 and 10 of the feature list all depend on this, and
audit trails cannot be added retroactively to data already changed.

**Test:** for any field a spec makes editable, the spec states what the history
entry contains.

## III. The SLA clock is a first-class domain object

Elapsed time is never computed as `now - created_at`. It is computed against a
business calendar (working hours, weekends, per-branch holidays) and a pause
ledger (intervals where the clock was stopped and why). Any feature that
displays, sorts by, reports on or alerts against remaining time reads from that
one implementation.

*Rationale:* two implementations of elapsed time guarantee two different numbers
in the agent view and the manager report, and the report will be the one shown to
the client.

**Test:** no spec computes duration itself.

## IV. Data scope is enforced server-side, per request

Department, branch, team and role scoping is applied in the data layer on every
read and write. The UI hides what a user may not see as a courtesy; the API
refuses it as the control. A permission check that exists only in the client
does not exist.

*Rationale:* multi-department and multi-branch operation means a scoping bug is
a cross-customer data leak, not a cosmetic defect.

**Test:** every endpoint contract names the scope predicate it applies.

## V. AI proposes, a human disposes — and it is labelled

No AI output reaches a customer without a human accepting it, except the chatbot
operating inside an explicit, restricted knowledge boundary. Every AI feature
must state: its permitted sources, its behaviour when confidence is low, its
escape hatch to a human, and what personal data is redacted before the model
sees anything. All AI-generated content is labelled as such to agents and
customers alike.

*Rationale:* a confidently wrong answer about a customer contract is worse than
no answer, and unlabelled machine text destroys trust once discovered.

**Test:** every spec in epic 007 answers all four questions above.

## VI. One conversation, one thread

A customer contacting us five ways about one problem has one ticket. Channel is
an attribute of a message, never of a conversation. Threading rules are
specified per channel and are testable.

*Rationale:* the promised value of a unified inbox is entirely in the threading,
which is also the hardest part and the part usually deferred.

**Test:** every channel spec states its inbound correlation rule and its failure
behaviour when correlation fails.

## VII. Specs are testable or they are not done

A functional requirement uses MUST, SHOULD or MAY, describes observable
behaviour, and can be failed by a test. Words that cannot be failed — fast,
intuitive, user-friendly, robust, seamless — are defects in a spec. Unknowns are
marked `[NEEDS CLARIFICATION: question]` and block the plan phase rather than
being guessed.

**Test:**

```bash
grep -rEn '^- \[ \] .\[CLARIFY-[0-9]' specs/ | wc -l    # must be 0 before /plan
```

*Amended 0.4.0 (2026-09-07). The previous test read
`grep -rn "NEEDS CLARIFICATION" specs/`, which never matched the `[CLARIFY-n]`
markers the specs actually carry — it matched only §14 checklist prose, so it
returned hits for every spec regardless of state and zero for none. This
principle was therefore untestable from 0.1.0, and a principle whose test never
fires is worse than no principle. The form above counts unresolved markers only,
consistent with Governance's keep-resolved-markers rule.*

## VIII. No orphan work

Every task traces to a functional requirement; every requirement traces to a
story; every story traces to a numbered need in the source feature list or to an
explicit, dated amendment. Work with no upstream reason is removed, not
justified.

---

## Governance

- **Numbering is permanent.** `001`–`013` are assigned for the life of the
  project. A retired epic keeps its number and is marked superseded. New epics
  take `014` onward.
- **Story and spec share a number.** `stories/007-*` is the need;
  `specs/007-*` is the behaviour that satisfies it. They are amended together.
- **Order of authority:** this constitution → the approved spec → the plan →
  the implementation. A disagreement is resolved upward, never downward.
- **Clarification gate.** A requirement carrying an open `[NEEDS CLARIFICATION]`
  marker may not be planned, tasked or implemented. A spec may proceed on its
  unblocked requirements. A marker's answer is never invented — it comes from the
  client, or the requirement stays blocked.
- **Resolved markers are marked, not deleted.** A resolved marker is changed from
  `- [ ]` to `- [x]` and **retained**, together with the answer, who decided it,
  the date, and the evidence it rests on. Deleting it would erase the decision
  and its basis, which defeats attributability (principle II) and makes a
  guessed answer indistinguishable from an evidenced one a year later. A decision
  made by the delivery team rather than the client is recorded as such, in those
  words. The gate therefore counts unresolved markers only:

  ```bash
  grep -rEn '^- \[ \] .\[CLARIFY-[0-9]' specs/ | wc -l    # must be 0 before /plan
  ```

## Amendment log

| Version | Date | Change |
|---|---|---|
| 0.1.0 | 2026-09-06 | Initial draft derived from *Customer Support CRM · Core Features* (2 pp.). Principles I–VIII proposed, pending client ratification. |
| 0.2.0 | 2026-09-07 | Clarification gate narrowed from per-spec to per-requirement. **Reason:** under the per-spec reading no code could be written until all 82 markers closed, including markers on requirements nobody was building — spec `010` could not begin its user and audit work because its data-residency and RPO markers were open. That makes the gate an obstacle rather than a safeguard. The part that matters — that a marker's answer is never invented — is unchanged and remains absolute. Principles I–VIII untouched. |
| 0.3.0 | 2026-09-07 | Resolved markers are marked `[x]` and retained rather than deleted, and the gate command becomes the unresolved-only form. **Reason:** an evidence review of eleven decisions found one recorded answer that contradicted a `MUST` requirement, and one whose number had been invented rather than sourced. Both were only findable because the answers were still on the page. Deleting a marker on resolution destroys exactly the record that makes such a review possible, and leaves a guessed answer indistinguishable from an evidenced one. Principles I–VIII untouched. **Known inconsistency, fixed in 0.4.0:** principle VII's test line read `grep -rn "NEEDS CLARIFICATION" specs/`, which never matched the `[CLARIFY-n]` markers the specs actually use. |
| 0.4.0 | 2026-09-07 | **Principle VII's test amended** to the working unresolved-only form. **Reason:** the previous command searched for the literal string `NEEDS CLARIFICATION`, which appears in the specs only inside §14 checklist prose and never as a marker — so it returned hits for every spec regardless of clarification state, and could never reach zero. Principle VII has therefore been untestable since 0.1.0, and a principle whose test never fires is worse than no principle: it gives the appearance of a gate without the function of one. The principle's text is otherwise unchanged; only its test is corrected. Principles I–VI and VIII untouched. |

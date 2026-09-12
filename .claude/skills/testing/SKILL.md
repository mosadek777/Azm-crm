---
name: testing
description: How to write a check in this repo that can actually fail, and the five specific faults that have already cost us a passing suite that proved nothing. Read this BEFORE writing or changing anything under backend/tests, any *.spec.ts, any CI workflow, or any browser-verification script. Triggers on: test, check, assert, suite, npm test, ng test, CI, verify, prove, coverage, regression, scope test, audit check, mutation.
---

# Testing — azm-crm

One rule, and four ways we have already broken it.

## A check that cannot fail is not a check

Before you keep a new check, **reintroduce the fault it exists to catch and
confirm it turns red.** Comment out the guard, flip the comparison, delete the
scope predicate — then run it. If it still passes, you have written a tautology,
not a test.

This is not theoretical. When sessions, lockout and the password policy were
added, all 210 existing checks passed. That proved the new code broke nothing.
It proved nothing whatever about whether the controls worked. That is why
`backend/tests/security.test.js` exists separately, and why its header says every
check in it fails if its control is removed.

The same shape appeared as the `AS-03` tautology and as the four faults below.
They are all one fault: the check had no way to come out wrong.

## Never compare two restricted users and call it a scope test

The scoped-vs-scoped fault. A scope check compared `demo.admin` against a
branch-scoped administrator and passed — but `demo.admin` is **itself** attached
to one branch. Two restricted users saw one branch each, and the check was
satisfied by two things being equally wrong.

**Compare against an unrestricted caller.** The break-glass administrator sees
everything, so the comparison has a direction: 8 branches unrestricted, 1
scoped. Without the unrestricted number there is no evidence that anything was
filtered at all.

This is the same shape as the AUD check that ran under the admin token: the
privileged identity made the restriction invisible, so the assertion was about
nothing. Whenever a check is about a *restriction*, one side of the comparison
must be unrestricted.

## Pair every refusal with a success

A check that only asserts 403 passes just as happily against a server that
refuses everyone, including a regression that broke authentication outright.
Assert the refusal **and** that the permitted caller still succeeds, in the same
section. `security.test.js` does this throughout: the agent is refused a branch
create, a deactivation and a user create — and the break-glass administrator's
create in the same run is what proves the endpoint works at all.

Corollary: after asserting a refusal, assert the **state did not change**. "The
branch was not deactivated behind those refusals" is the check that would catch
a 403 returned after the write.

## Nothing passes on empty data unless emptiness is the assertion

A query returning zero rows satisfies `every()`, `some()`-negations, "no
out-of-scope records appeared", and most filter assertions. Assert a non-zero
count first, then assert the property over it.

Two real cases: the audit query that returned zero entries and looked like a
constitution II violation (`entityId` is `Mixed` and held an ObjectId; the query
passed a string — the entries existed and the *query* was wrong); and the
several list checks that would have passed against an empty database. Note also
that the runner **drops the database**, so demo data must be re-seeded after a
test run before any browser verification.

## Verify the file on disk, not what you typed into a shell

The CI secrets-guard pattern was "tightened", verified by running the regex in a
shell, and pushed. The edit had never landed on disk. The shell proved the
pattern was right; nothing proved the file contained it.

`cat` the file, or `git diff`, after every edit you are about to rely on. The
same applies to browser verification: read the rendered DOM, not the template
you believe you wrote.

Related: a guard that cries wolf is a guard somebody disables. The same secrets
guard fired on `seed-demo.js` *printing* the advice `DEMO_PASSWORD=$(openssl
rand -base64 18)`. Tighten to a literal value rather than adding an exception.

## Non-negotiables this repo tests for

- **Scope**: out-of-scope is **404, never 403**, and byte-identical to a
  genuinely absent record. Assert the bytes, not just the status.
- **Audit**: every mutation writes its entry in the same transaction. Assert the
  entry exists AND that the mutation did — a count that rose proves neither on
  its own.
- **Bilingual refusals**: both `ar` and `en` present, and the value never echoed
  back (a password refusal must not contain the password).

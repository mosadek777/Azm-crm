# Test cases — 010 Security and administration

**20 cases.** Who exists, what they may see and do, what is recorded, and how
the system is configured and recovered.

**Coverage:** 5 automated · 2 partial · 1 manual · 12 not testable yet

---

## Before you start

This module contains the two rules the project treats as non-negotiable, and
both are proven rather than asserted:

**The access rule.** Every read and every write is filtered, on the server, to
the branch and department the caller holds a role in. Anything outside it
returns **not found** — never "forbidden", because "forbidden" confirms the
record exists. This is the most thoroughly tested thing in the product.

**The audit rule.** Every change writes a permanent record, saved in the same
all-or-nothing operation as the change itself. There is no moment where one
exists without the other, and no way to save one without the other.

**A word on what is missing, because it is uncomfortable and should be.** Most
of this module is unbuilt, and the gaps are not features — they are
**encryption, backups and the administration interface**. The system is
currently administered entirely through direct API calls. See SEC-11.

**Accounts.** `npm run seed:demo`, plus the emergency administrator whose
credentials live in the environment file.

---

## SEC-01 — Access matches employment without a ticket to IT

> *As an* **administrator** *I want to* **create, deactivate and reactivate
> accounts** *so that* **access matches employment without a ticket to IT.**

**Requirement:** `010 FR-001` (Must) — deletion is never offered; deactivation
terminates sessions within the configured interval and returns assigned work.

**Preconditions**
- Administrator access, and an agent with open requests and an active session.

**Steps**
1. Create a new agent, giving them a role and a scope.
2. Confirm they can sign in.
3. Look for a way to **delete** a user.
4. Deactivate them.
5. With their existing session still open in another browser, make a request.
6. Try to sign in as them.
7. Check what happened to the requests they were assigned.
8. Reactivate them and confirm access returns.

**Expected result**
- Step 3: deletion is **not offered anywhere**. Deleting a person who appears
  throughout the audit trail would break the record; deactivation is the only
  disposal.
- **Step 5: the existing session stops working on its very next request** — not
  when its token happens to expire.
- Step 7: their open work is visibly dealt with, not silently orphaned.

**Status:** ⚠ **Partial.** Automated: creation with a role and scope, and the
refusal when an administrator tries to grant beyond their own scope —
`backend/tests/scope.test.js`, *"spec 010 AS-04: a granting admin cannot exceed
their own scope"*.
**Missing:** steps 4–8 entirely. **Deactivation terminating a live session is
not asserted anywhere**, and it is a security property rather than a
convenience. Step 7 is worse than untested — what happens to a deactivated
person's open requests is **undefined**, deliberately: the specification does
not say whether they go to the lead, to unassigned, or stay put, and each answer
changes what the audit trail must record. That is a client decision.

---

## SEC-02 — People see and do exactly what their job requires

> *As an* **administrator** *I want to* **define roles with granular
> permissions** *so that* **people see and do exactly what their job
> requires.**

**Requirement:** `010 FR-002` (Must) — permissions are assigned through roles
only. **Per-user overrides must not exist.**

**Preconditions**
- Administrator access.

**Steps**
1. Assign a role to a user.
2. Look for any way to grant one person an extra permission directly, outside a
   role.
3. Confirm an agent cannot perform a lead's action.
4. Confirm an auditor can read but not write.

**Expected result**
- **Step 2 finds nothing, and that is the requirement.** A per-person exception
  is untrackable: it does not show up when somebody reviews who holds what.
- Steps 3 and 4 behave by role.

**Status:** **Automated** — `backend/tests/scope.test.js`, sections *"spec 010
AS-05: dangerous actions are separately held"* and the role checks around it;
`backend/tests/ticket.test.js` asserts an auditor is read-only on the request
path.

**Note.** This requirement is the reason a feature elsewhere was changed rather
than built as written: mentioning a colleague was specified to **grant** them
access to one request, which is a per-user override and is forbidden here. The
conflict was recorded as a spec defect and resolved by restricting who may be
mentioned.

---

## SEC-03 — Dangerous actions held by few hands

> *As an* **administrator** *I want to* **control who may delete, merge, close,
> refund and export** *so that* **the dangerous actions are held by few hands.**

**Requirement:** `010 FR-003` (Should) — action-level and field-level rights,
with the dangerous ones separately grantable.

**Preconditions**
- An agent, a lead and an administrator.

**Steps**
1. As an agent, attempt each dangerous action.
2. As a lead, repeat.
3. Grant one dangerous right to a role and confirm only that one changes.
4. Confirm a field-level restriction hides a field rather than refusing the
   whole record.

**Expected result**
- Each right is held separately — being able to close is not being able to
  export.

**Status:** ⚠ **Partial.** Automated: the actions that exist are separately
held, and an agent cannot perform a lead's reassignment —
`backend/tests/scope.test.js`, *"spec 010 AS-05"*, and the composition check in
`backend/tests/ticket.test.js`.
**Missing:** rights are currently **fixed in the code**, so step 3 is
impossible. Field-level rights do not exist at all. Merge, refund and export are
unbuilt actions, so three of the five have nothing to guard.

---

## SEC-04 — One branch cannot read another branch's customers

> *As an* **administrator** *I want to* **scope data by department, branch and
> team** *so that* **one branch cannot read another branch's customers.**

**Requirement:** `010 FR-004` (Must) — every read and write applies a scope
predicate evaluated server-side against the target record; out-of-scope records
are indistinguishable from non-existent ones.

**Preconditions**
- Two branches, each with customers and requests. An agent in one of them.

**Steps**
1. As the agent, list customers and confirm only their branch's appear.
2. Open a customer from the other branch directly by identifier.
3. Open an identifier that does not exist at all.
4. **Compare the two responses from steps 2 and 3, byte for byte.**
5. Repeat for requests, users, branches and departments.
6. Attempt to *write* to an out-of-scope record.
7. Confirm the out-of-scope record does not appear in any list, count or search
   result.

**Expected result**
- Steps 2 and 3 are **identical** — same status, same body. Any difference
  reveals that the record exists.
- Step 6 is refused the same way.
- Step 7: not merely hidden from the detail view — absent from lists and counts
  too, or the count discloses what the list hides.

**Status:** **Automated, and the most thoroughly covered requirement in the
product** — `backend/tests/scope.test.js`, sections *"spec 010 AS-01:
out-of-scope is INDISTINGUISHABLE from non-existent"* (which asserts the two
bodies are **byte-identical** and that the refusal is bilingual), *"AS-01: nor
does it appear in any list"*, and *"§11: list users applies branch AND
department scope"*. The write path is covered in the customer, ticket and portal
suites.

---

## SEC-05 — Matrix reporting lines actually supported

> *As an* **administrator** *I want to* **one user with different roles in
> different teams** *so that* **matrix reporting lines are actually
> supported.**

**Requirement:** `010 FR-005` (Must) — a user holds several role assignments
with different scopes; effective permissions are evaluated **per request against
the target record**, and are **not** the union of everything they hold.

**Preconditions**
- One person holding agent in branch B and lead in branch C.

**Steps**
1. As that person, open a request in branch C and perform a lead action.
2. Open a request in branch B and attempt the same lead action.
3. Confirm it is refused.
4. Confirm the request in branch B was not changed behind the refusal.

**Expected result**
- Step 1 succeeds, step 2 is refused. **Holding lead somewhere does not make you
  a lead everywhere** — this is the union bug, and it is the subtlest failure in
  the whole access model.

**Status:** **Automated, twice over** — as a pure function in
`backend/tests/scope.test.js`, *"UNIT: rolesForTarget composes without widening
(spec 010 FR-005)"*, and through the live API in
`backend/tests/ticket.test.js`, *"spec 010 FR-005: roles compose per record,
they do not union"*, which also asserts the record was not modified behind the
refusal. The API-level check exists because the pure function could be correct
while the middleware fed it the wrong record.

---

## SEC-06 — Access follows corporate identity policy

> *As an* **administrator** *I want to* **SSO through SAML or OIDC, with
> optional MFA** *so that* **access follows corporate identity policy.**

**Requirement:** `010 FR-006` (Must) — where single sign-on is mandatory, local
password sign-in must be refused.

**Preconditions**
- An identity provider.

**Steps**
1. Configure the provider.
2. Sign in through it.
3. Confirm the corporate identity maps to a branch and department here.
4. Make single sign-on mandatory and confirm password sign-in is then refused.
5. Confirm the emergency administrator still works.

**Expected result**
- Step 5 is the case that must not be missed: if single sign-on becomes
  mandatory and the provider is unreachable, the emergency account is the only
  way back in.

**Status:** ⛔ **Not testable yet.** An **uncovered mandatory requirement** —
nothing is built. **No identity provider has been named**, so there is no
configuration to build against, no attribute mapping to agree, and no answer on
whether such an account may hold the emergency role. Local password sign-in is
legitimate in the meantime, not a workaround.

---

## SEC-07 — An unattended browser is not an open door

> *As an* **administrator** *I want to* **password policy, session timeout,
> concurrent-session limits** *so that* **an unattended browser is not an open
> door.**

**Requirement:** `010 FR-007` (Must) — a configurable password policy, session
timeout, absolute session lifetime, failed-attempt lockout and concurrent-session
limit.

**Preconditions**
- Administrator access.

**Steps**
1. Create a user with a password shorter than the minimum.
2. Sign in, then leave the session idle past the timeout and make a request.
3. Sign in and stay active past the absolute lifetime, then make a request.
4. Sign in wrongly repeatedly until the account locks; then try the **correct**
   password.
5. Compare the locked refusal with an ordinary wrong-password refusal.
6. Wait for the lock to expire and sign in.
7. Open sessions on more devices than the limit permits.

**Expected result**
- Step 1 is refused, naming the rule that failed and never echoing the password.
- Step 2: the token is still cryptographically valid and is **refused anyway** —
  the session record decides, not the token.
- Step 3: an **active** session is refused past its ceiling.
- Step 4: the correct password is refused while locked.
- **Step 5: identical.** Saying "your account is locked" confirms the address is
  real and lets an attacker measure their progress.
- Step 6: the lock releases itself — an administrator-only unlock turns every
  typo into a support ticket and makes lockout a denial-of-service anybody can
  trigger.
- Step 7: the **oldest** session is ended, not the newest. Refusing the new one
  locks somebody out of the device in front of them.

**Status:** **Automated** — `backend/tests/security.test.js`, five sections
covering each control. Every check proves the control **refuses**, and each was
verified able to fail by reintroducing the fault it guards. The values
themselves are ratified and configurable from the environment file.

---

## SEC-08 — Any incident can be reconstructed

> *As an* **auditor** *I want to* **an immutable log of logins, permission
> changes, exports, deletions, edits, with actor, time and IP** *so that* **any
> incident can be reconstructed.**

**Requirement:** `010 FR-008` (Must)

**Preconditions**
- An auditor account.

**Steps**
1. Sign in, change something, and sign in wrongly once.
2. Find all three events in the trail.
3. Read actor, time, address and what changed.
4. As an administrator, attempt to edit an entry, then to delete one.
5. Arrange for the audit write to fail during a change, and check what happens
   to the change.

**Expected result**
- Steps 2 and 3: everything recorded, including the failed sign-in.
- Step 4: refused for everybody, including administrators.
- **Step 5: the change is abandoned.** If the record cannot be written, the
  action does not happen. This is why the two commit together.

**Status:** **Automated** — append-only enforcement and atomicity are covered in
`backend/tests/ticket.test.js`, *"constitution II: every mutation audited,
non-negotiable"*, and in `backend/tests/security.test.js`, *"constitution II:
the sign-in write and its audit entry are atomic"*. `npm run audit:reconcile`
additionally proves no change exists without an entry and no entry without a
change, across every record type. The tamper attempt in step 4 is asserted in
the story-level suite.

---

## SEC-09 — An investigation is practical, not theoretical

> *As an* **auditor** *I want to* **search and export the audit log by user,
> entity, action, date** *so that* **an investigation is practical, not
> theoretical.**

**Requirement:** `010 FR-009` (Should) — and the export is itself audited.

**Preconditions**
- An auditor account and a populated trail.

**Steps**
1. Open the audit log.
2. Search by actor, by record, by action and by date range.
3. Export the results.
4. Confirm the export is itself recorded in the trail.
5. Confirm an auditor sees only entries within their own access.

**Expected result**
- Step 4: exporting the audit log is itself an auditable event.
- Step 5 is the subtle one: audit entries name records, so an unrestricted audit
  view is a way around the access rule.

**Status:** ⛔ **Not testable yet.** **There is no interface for the audit log
at all** — reading it means querying the database directly. The trail is
complete and reconcilable; nothing reads it back. Step 5 is also why it has not
been built casually: who may read the trail, and with what filters, is
unspecified.

---

## SEC-10 — A stolen disk or sniffed connection yields nothing

> *As an* **administrator** *I want to* **data encrypted in transit and at
> rest** *so that* **a stolen disk or sniffed connection yields nothing.**

**Requirement:** `010 FR-010` (Must) — including attachments and backups.

**Preconditions**
- A deployed environment.

**Steps**
1. Inspect a connection between browser and server.
2. Inspect a connection between server and database.
3. Read the database files directly from disk.
4. Read a backup file directly.

**Expected result**
- Steps 1 and 2 reveal nothing readable.
- Steps 3 and 4 reveal nothing readable.

**Status:** ⛔ **Not testable yet, and this is the most uncomfortable gap in the
file.** Nothing is encrypted: the system runs locally over plain HTTP against an
unencrypted database.

**One fact worth knowing before this is planned.** The free edition of the
database in use **does not offer encryption at rest** — it is a paid feature, or
it comes with a managed hosting service, or it is replaced by encrypting the
whole disk at the operating-system level, which is a different and coarser
control. This is a cost that appears at go-live rather than during development.
It is written up for a non-technical reader in `docs/hosting-decision.md`.

---

## SEC-11 — Routine change does not queue behind a developer

> *As an* **administrator** *I want to* **configure statuses, priorities,
> categories, SLA, hours, holidays, templates, branding from a screen** *so
> that* **routine change does not queue behind a developer.**

**Requirement:** `010 FR-011` (Must)

**Preconditions**
- Administrator access.

**Steps**
1. Add a status and define which moves are legal to and from it.
2. Add a category.
3. Add a priority.
4. Configure business hours and a holiday set.
5. Edit a notification template.
6. Change branding.
7. Confirm each change takes effect without a release.

**Expected result**
- All seven from a screen, by an administrator, with no developer involved.

**Status:** ⛔ **Not testable yet, and it is the largest single piece of unbuilt
work in the product.** **Everything configurable is currently a value in the
code.** Adding a status, a category or a priority is a code change and a
release.

There is no interface for users, roles, branches or departments either — all of
it is API-only. If somebody asks how to add an agent, the honest answer today is
"send an API request".

Nothing blocks this. It is unscheduled rather than gated, which is precisely why
it needs saying.

---

## SEC-12 — What customers receive is consistent and localised

> *As an* **administrator** *I want to* **notification templates per channel and
> language** *so that* **what customers receive is consistent and localised.**

**Requirement:** `010 FR-012` (Should) — per event kind, per channel, per
language, with named placeholders validated at save time.

**Preconditions**
- SEC-11 working, and a channel.

**Steps**
1. Create a template for one event, for one channel, in both languages.
2. Try to save with only one language.
3. Include a placeholder that does not exist and try to save.
4. Send a notification to a customer who prefers Arabic.

**Expected result**
- Step 2 refused — both languages.
- Step 3 refused **at save time**, not discovered when a customer receives
  "Dear {{nmae}},".
- Step 4 uses the Arabic body, chosen from the customer's preference.

**Status:** ⛔ **Not testable yet.** No templates, no notifications, no channel.

---

## SEC-13 — Third-party access cut off in one action

> *As an* **administrator** *I want to* **see, scope and revoke API keys and
> integration credentials** *so that* **third-party access is cut off in one
> action.**

**Requirement:** `010 FR-013` (Should) — created with an explicit scope and
permission set, listed with last use, revoked with effect within the configured
interval.

**Preconditions**
- Administrator access.

**Steps**
1. Create a credential with a narrow scope.
2. Use it and confirm it works within its scope and is refused outside it.
3. List credentials and read when each was last used.
4. Revoke one and confirm it stops working immediately.

**Expected result**
- Step 3's last-use column is what makes an unused credential findable — the
  most dangerous credential is the forgotten one.
- Step 4 takes effect at once.

**Status:** ⛔ **Not testable yet.** No API credentials exist; the only
authentication is a human sign-in.

---

## SEC-14 — The highest-privilege screens are hardest to reach

> *As an* **administrator** *I want to* **restrict administrative access by IP
> range** *so that* **the highest-privilege screens are hardest to reach.**

**Requirement:** `010 FR-014` (May)

**Preconditions**
- SEC-11 working, and a deployed environment.

**Steps**
1. Configure an allowed range.
2. Reach the administration screens from inside it.
3. Attempt from outside it.
4. Confirm the refusal is recorded.

**Expected result**
- Outside the range, administrative screens are unreachable regardless of
  credentials.

**Status:** ⛔ **Not testable yet.**

---

## SEC-15 — Comply with policy and control storage growth

> *As an* **administrator** *I want to* **retention and archival configured per
> record type** *so that* **we comply with policy and control storage growth.**

**Requirement:** `010 FR-015` (Should) — archival preserves retrievability and
historical reportability; destruction requires a separate explicit action.

**Preconditions**
- Administrator access.

**Steps**
1. Set a retention period for one record type.
2. Let records pass it and confirm they are archived, not destroyed.
3. Retrieve an archived record.
4. Run a historical report and confirm archived records still count.
5. Destroy an archived record and confirm it takes a separate, explicit action.

**Expected result**
- Steps 2 and 5: archival and destruction are **different operations**.
  Conflating them is how data disappears that somebody still needed.
- Step 4: archiving must not silently change last year's reports.

**Status:** ⛔ **Not testable yet, and blocked on a decision.** Which
data-protection regime applies, and the retention period per record type, are
open questions for the client.

---

## SEC-16 — An upload cannot become an incident

> *As an* **administrator** *I want to* **attachments virus-scanned, with type
> and size limits** *so that* **an upload cannot become an incident.**

**Requirement:** `010 FR-016` (Must) — every uploaded file, **from every
surface**, is scanned and checked before storage. A rejected file is not stored
and the attempt is recorded.

**Preconditions**
- Attachments working on at least one surface.

**Steps**
1. Upload a clean file from the staff interface.
2. Upload a file of a forbidden type.
3. Upload one over the size limit.
4. Upload a file with a known malicious signature.
5. Confirm the rejected files were **never stored**.
6. Confirm each rejection was recorded.
7. Repeat every step from the **customer portal**.

**Expected result**
- Step 5: rejection happens before storage, not after — a scan that quarantines
  a stored file has already written it to disk.
- **Step 7 is the requirement's real content**: "from every surface". The
  customer portal is the untrusted one.

**Status:** ⛔ **Not testable yet.** No attachments anywhere, which means this
rule currently guards nothing. It must be built **with** the first attachment
surface, not after it.

---

## SEC-17 — We can recover, and we know how far back and how fast

> *As an* **administrator** *I want to* **backups and point-in-time restore
> against a stated RPO and RTO** *so that* **we can recover, and we know how far
> back and how fast.**

**Requirement:** `010 FR-017` (Must) — a restore drill performed before go-live
and at the configured interval, at least quarterly.

**Preconditions**
- A deployed environment.

**Steps**
1. Take a backup.
2. Restore it into a separate copy.
3. Compare the restored data against the original, record type by record type.
4. Restore to a **specific moment in the past**.
5. Time the whole recovery and compare with the agreed target.
6. Confirm the backup is held somewhere other than the database's own disk.

**Expected result**
- Step 3: every record type comes back complete.
- Step 5: recovery fits the agreed time.
- Step 6: a copy on the same machine is not a backup.

**Status:** ⚠ **Manual, and partly done.** Backup and restore scripts exist, and
**a restore has actually been rehearsed**: a full backup was restored into a
scratch database and compared record type by record type — twelve collections,
all matching — then dropped. The drill never touches the live database.

**What is not done**, and each is recorded in the code rather than glossed:
- Steps 4 and 5 cannot be judged: **no recovery point or recovery time has been
  agreed**, so there is no target to measure against. These are commercial
  commitments, not technical preferences.
- Step 6: the backup currently lands on the same disk as the database until
  configured otherwise.
- Point-in-time restore needs continuous capture, which periodic snapshots do
  not provide.
- A snapshot copies record types in sequence, so it can capture a change without
  its audit record — the pairing is never lost in the live system, but a
  restored **copy** can straddle it. This matters more here than in most
  products, and it is carded rather than hidden.

---

## SEC-18 — Changes are proven before they reach live

> *As an* **administrator** *I want to* **a sandbox mirroring production
> configuration** *so that* **changes are proven before they reach live.**

**Requirement:** `010 FR-018` (Should) — mirrors production configuration and
contains **no production personal data**.

**Preconditions**
- A deployed environment.

**Steps**
1. Open the sandbox and compare its configuration with production.
2. Make a configuration change there and confirm production is unaffected.
3. Search the sandbox for real customer names, phone numbers and email
   addresses.

**Expected result**
- Step 3 finds none. A sandbox seeded from a production copy is a second
  production database with weaker access controls.

**Status:** ⛔ **Not testable yet.** There is no deployed environment at all.
Note the demonstration seed already does the right thing here — it generates its
own data rather than copying anything real.

---

## SEC-19 — Reproduce a permissions problem I cannot see

> *As an* **administrator** *I want to* **impersonate a user, logged and
> consented** *so that* **I reproduce a permissions problem I cannot see.**

**Requirement:** `010 FR-019` (May) — time-bounded, recording **both**
identities on every action, never exceeding the impersonated user's own
permissions.

**Preconditions**
- Administrator access.

**Steps**
1. Impersonate an agent.
2. Confirm you see exactly what they see — no more.
3. Perform an action and read the audit entry.
4. Confirm the session ends on its own.
5. Confirm the impersonated person is notified, if that is required.

**Expected result**
- Step 2: impersonation does not stack permissions. An administrator
  impersonating an agent must be **more** restricted, not less.
- Step 3: the entry names both people. "The agent did it" would be false.

**Status:** ⛔ **Not testable yet, and blocked on a decision.** Whether the
impersonated person must be told, and whether they must consent in advance, is
an open question for the client's own HR and legal view.

---

## SEC-20 — Records stay where regulation requires

> *As an* **auditor** *I want to* **control which jurisdiction data is stored
> in** *so that* **records stay where regulation requires.**

**Requirement:** `010 FR-020` (May) — where constrained, **every** dependency
that processes data must honour it.

**Preconditions**
- A deployed environment.

**Steps**
1. Configure a jurisdiction.
2. Confirm the database, backups and attachments are all stored within it.
3. Confirm every third-party service that touches data also operates within it.

**Expected result**
- Step 3 is the hard half. It is easy to place a database and easy to forget a
  processing service.

**Status:** ⛔ **Not testable yet, and it has a consequence worth raising
early.** If data must remain in a named jurisdiction, the planned AI features
may be **ruled out entirely** rather than delayed, because they send message
content to an external service for processing. That is a scope decision
disguised as a technicality, and it is cheapest to discover before anyone plans
around those features. It is written up for a non-technical reader in
`docs/hosting-decision.md`.

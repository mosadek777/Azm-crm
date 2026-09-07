# Spec 010 — Security & Administration

> **المفروض الحاجة دي تشتغل إزاي بالظبط؟**

| | |
|---|---|
| **Number** | `010` |
| **Story** | [`stories/010-security-administration/story.md`](../../stories/010-security-administration/story.md) |
| **Status** | Draft — clarifying |
| **Constitution gates** | **IV (data scope is enforced server-side)**, II (attributable), I (bilingual configuration) |
| **Blocking clarifications** | 5 open · 2 answered provisionally (developer, 2026-09-07, unratified) · `[CLARIFY-2]` reopened after a withdrawn answer |

---

## 1. Scope

**In scope.** Staff accounts, roles and granular permissions; scoping by
department, branch and team; SSO and MFA; session and password policy; the
immutable audit log and its search; encryption; the administration surface for
statuses, categories, SLA, calendars, templates and branding; notification
templates; API credential lifecycle; administrative network restriction;
retention and archival; attachment scanning; backup and restore; the sandbox;
impersonation; and data residency.

**Out of scope.**

- Automatic user provisioning from the identity provider — spec `011` `FR-010`
- Customer authentication for the portal — spec `008` `FR-001`
- AI-specific governance — spec `007`, which inherits this spec's audit machinery
- Penetration testing and certification as deliverables — project activities
- Physical and network security of the hosting environment — a plan-phase decision
- Performance, uptime and monitoring targets — spec `013`

## 2. Domain language

| Term | Means exactly |
|---|---|
| **User** | A staff identity. Distinct from a portal identity (spec `008`). |
| **Role** | A named set of permissions. Assigned to users; never configured per person. |
| **Permission** | An atomic right to perform one action, optionally on one field. |
| **Scope** | The set of branches, departments and teams a user's data access is limited to. |
| **Assignment** | A user holding one role within one scope. A user may hold several assignments. |
| **Effective permission** | The union of permissions across a user's assignments, evaluated per request against the target record's scope. |
| **Scope predicate** | The condition applied server-side on every read and write. Named in every spec's contracts table. |
| **Audit entry** | An append-only record of one security-relevant or data-changing event. |
| **Retention rule** | A per-record-type policy determining how long data is kept live, how long archived, and what happens then. |
| **Archival** | Moving a record out of the working set while keeping it retrievable and reportable. Not deletion. |
| **Impersonation** | Acting as another user to reproduce their view. Always logged, always time-bounded, never silent. |
| **Sandbox** | An environment mirroring production configuration, holding no production personal data. |
| **RPO** | The maximum data loss tolerated, in time. |
| **RTO** | The maximum time to restore service. |

## 3. Key entities

### User

| Attribute | Type | Rules |
|---|---|---|
| `identity_ref` | text | The SSO subject where SSO is in use |
| `display_name`, `email` | text | Required |
| `state` | `active` \| `deactivated` | Deactivation is reversible; deletion is not offered |
| `default_language` | `ar` \| `en` | Drives interface and notification language |
| `skills`, `languages` | sets | Read by spec `005` `FR-009` |
| `capacity` | integer | Concurrent-ticket ceiling; read by spec `005` `FR-009` |
| `mfa_enrolled` | boolean | — |

### Role assignment

| Attribute | Type | Rules |
|---|---|---|
| `user_id`, `role_id` | ref | Required |
| `branch_ids`, `department_ids`, `team_ids` | sets | Empty set means "all within the granting admin's own scope", never "all globally" |
| `granted_by`, `granted_at` | ref, timestamp | Immutable |

### Audit entry (append-only, immutable)

| Attribute | Type | Rules |
|---|---|---|
| `actor_id` | ref User \| portal identity \| `system` \| rule ref | Required |
| `occurred_at` | timestamp | Required, server-assigned |
| `action` | text | Required |
| `entity_type`, `entity_id` | — | Required except for session events |
| `before`, `after` | — | Required for field changes |
| `ip`, `user_agent` | text | Required for user-initiated actions |
| `scope_context` | map | The branch, department and team in effect |

No role, including administrator, may edit or delete an audit entry. An attempt
is itself an audit entry (`FR-008`).

### Retention rule, API credential, Configuration item, Notification template
Standard shapes. Every notification template carries an Arabic and an English
body (constitution I).

## 4. Acceptance scenarios

### AS-01 — Scope is enforced by the server, not the screen
**Given** an agent scoped to branch B, and a ticket, customer and article in branch C
**When** they request each by identifier directly, bypassing the interface
**Then** each returns not-found
**And** none appears in any list, search, count or aggregate available to them
**And** each attempt is recorded with the actor, the target and the IP

### AS-02 — Roles are the unit of configuration
**Given** 40 agents needing an identical change to what they may do
**When** an administrator amends the agent role
**Then** all 40 are affected
**And** no per-person permission override exists to be forgotten

### AS-03 — Multiple assignments compose without widening scope
**Given** a user who is an agent in branch B and a team lead in branch C
**When** they act on a branch B ticket
**Then** they hold agent permissions only
**And** acting on a branch C ticket they hold lead permissions
**And** they never hold lead permissions in branch B

### AS-04 — A granting administrator cannot exceed their own scope
**Given** an administrator scoped to branch B
**When** they create a role assignment
**Then** they may grant scope within branch B only
**And** an attempt to grant branch C is refused
**And** an empty scope set resolves to branch B, never to all branches

### AS-05 — Dangerous actions are separately held
**Given** an agent role without the export, delete, merge or refund permissions
**When** the agent attempts each
**Then** each is refused server-side
**And** each refusal is recorded

### AS-06 — SSO and MFA govern access
**Given** SSO configured with MFA required
**When** a user signs in
**Then** authentication is delegated to the provider and MFA is enforced there or here per `[CLARIFY-2]`
**And** a user deactivated at the provider cannot sign in
**And** a local password sign-in is refused where SSO is mandatory

### AS-07 — Deactivation takes effect immediately and reassigns work
**Given** an agent with 12 assigned tickets and an active session
**When** an administrator deactivates them
**Then** the session is terminated within the configured interval
**And** the 12 tickets return to their team queues as unassigned, with cause `deactivation` per spec `002` `E-12`
**And** their historical figures and audit entries remain intact

### AS-08 — The audit log cannot be rewritten
**Given** any audit entry
**When** any user, including a full administrator, attempts to edit or delete it, through the interface or the API
**Then** the attempt is refused
**And** the attempt is itself recorded with the actor and the target entry

### AS-09 — Audit search is practical
**Given** six months of activity
**When** an auditor searches by actor, entity type, entity identifier, action and date range
**Then** matching entries are returned within the `NFR-002` budget
**And** the result is exportable, and that export is itself recorded

### AS-10 — Configuration change needs no developer
**Given** a request to add a status, add a category, change an SLA target, add a holiday, edit an email template and change the portal logo
**When** an administrator performs all six
**Then** each takes effect without a release
**And** each is recorded with before and after values
**And** each change to a user-visible label is refused unless both language values are supplied

### AS-11 — API credentials are scoped and revocable
**Given** an integration credential scoped to read tickets in branch B
**When** it is used to read a branch C ticket, or to write any ticket
**Then** both are refused
**When** an administrator revokes it
**Then** the next request fails within the configured interval
**And** its historical use remains in the audit log

### AS-12 — Retention archives rather than destroys
**Given** a retention rule archiving closed tickets after 24 months
**When** the rule runs
**Then** matching tickets leave the working set
**And** they remain retrievable and continue to appear in historical reports per spec `009` `FR-023`
**And** they are not deleted unless a separate, explicit erasure rule applies

### AS-13 — Attachments are gated
**Given** an upload containing a known malicious payload
**When** it is submitted from any surface — ticket, customer, portal, article, form
**Then** it is refused and not stored
**And** the attempt is recorded with the scan result and the originating surface

### AS-14 — Restore is proven, not assumed
**Given** the agreed RPO and RTO
**When** a restore drill is performed
**Then** the data loss is within the RPO and the elapsed restore time is within the RTO
**And** the drill result is recorded
**And** the drill is repeated at the configured interval

### AS-15 — Impersonation is visible and bounded
**Given** an administrator with the impersonation permission
**When** they impersonate a user
**Then** the session is time-bounded and terminates automatically
**And** the impersonated user is notified per `[CLARIFY-6]`
**And** every action taken during it records both the impersonator and the impersonated
**And** actions forbidden to the impersonated user remain forbidden

## 5. Functional requirements

| ID | Requirement | Level | Traces |
|---|---|---|---|
| `FR-001` | Administrators MUST be able to create, deactivate and reactivate users. Deletion MUST NOT be offered; deactivation MUST terminate sessions within the configured interval and return assigned tickets to the team queue. | MUST | `SEC-01` |
| `FR-002` | Permissions MUST be assigned through roles only. Per-user permission overrides MUST NOT exist. | MUST | `SEC-02` |
| `FR-003` | The permission model MUST support action-level and field-level rights, with delete, merge, close, refund, export, impersonate and configuration rights separately grantable. | SHOULD | `SEC-03` |
| `FR-004` | Every read and write MUST apply a scope predicate over branch, department and team, evaluated server-side against the target record. Out-of-scope records MUST be indistinguishable from non-existent ones. UI hiding MUST NOT be relied on. | MUST | `SEC-04`, constitution IV |
| `FR-005` | A user MUST be able to hold several role assignments with different scopes; effective permissions MUST be evaluated per request against the target record's scope and MUST NOT be the union across scopes. | SHOULD | `SEC-05` |
| `FR-006` | The system MUST support SSO via SAML or OIDC and MUST support requiring MFA, per `[CLARIFY-2]`. Where SSO is mandatory, local password sign-in MUST be refused. | MUST | `SEC-06` |
| `FR-007` | The system MUST enforce a configurable password policy, session timeout, absolute session lifetime, failed-attempt lockout and concurrent-session limit. | MUST | `SEC-07` |
| `FR-008` | The system MUST write an append-only audit entry for every sign-in, permission change, configuration change, export, deletion, erasure, impersonation and record mutation, carrying actor, timestamp, action, entity, before, after, IP and scope context. No role MAY edit or delete an entry; an attempt MUST be refused and recorded. | MUST | `SEC-08`, constitution II |
| `FR-009` | Auditors MUST be able to search the audit log by actor, entity type, entity identifier, action and date range, and to export results; the export MUST itself be audited. | SHOULD | `SEC-09` |
| `FR-010` | Data MUST be encrypted in transit and at rest, including attachments and backups. | MUST | `SEC-10` |
| `FR-011` | Administrators MUST be able to configure statuses and transitions, categories, ticket types, custom fields, priorities, SLA policies, business calendars and holidays, escalation policies, automation rules, notification and email templates, form definitions, segments, resolution codes and branding, from an administration surface with no release required. Any change to a user-visible label MUST be refused unless both language values are supplied. | MUST | `SEC-11`, constitution I |
| `FR-012` | Notification templates MUST exist per event kind, per channel and per language, with named placeholders validated at save time. | SHOULD | `SEC-12`, constitution I |
| `FR-013` | Administrators MUST be able to create API credentials with an explicit scope and permission set, to list them with their last use, and to revoke them with effect within the configured interval. Historical use MUST remain auditable after revocation. | SHOULD | `SEC-13` |
| `FR-014` | The system MAY restrict administrative and audit access to configured network ranges. | MAY | `SEC-14` |
| `FR-015` | Administrators MUST be able to configure retention and archival per record type. Archival MUST preserve retrievability and historical reportability; destruction MUST require a separate explicit rule and MUST be audited. | SHOULD | `SEC-15` |
| `FR-016` | Every uploaded file, from every surface, MUST be scanned and MUST be subject to type and size restrictions before storage. A rejected file MUST NOT be stored and the attempt MUST be recorded. | SHOULD | `SEC-16` |
| `FR-017` | The system MUST be backed up such that the agreed RPO and RTO are met, MUST support point-in-time restore, and MUST have a restore drill performed before go-live and at the configured interval thereafter, with results recorded. | MUST | `SEC-17` |
| `FR-018` | A sandbox environment MUST mirror production configuration and MUST NOT contain production personal data. | SHOULD | `SEC-18` |
| `FR-019` | Impersonation MAY be permitted to holders of an explicit right; sessions MUST be time-bounded, MUST record both identities on every action, MUST NOT exceed the impersonated user's own permissions, and MUST notify the impersonated user per `[CLARIFY-6]`. | MAY | `SEC-19` |
| `FR-020` | The system MAY constrain data storage and processing to a named jurisdiction. Where constrained, every dependency that processes data — including any AI provider in spec `007` — MUST comply. | MAY | `SEC-20` |
| `FR-021` | A granting administrator MUST NOT be able to grant scope or permissions exceeding their own; an empty scope set MUST resolve to the granter's scope, never to all. | MUST | constitution IV |

## 6. Edge cases and failure behaviour

| # | Situation | Required behaviour |
|---|---|---|
| E-01 | Last administrator is deactivated | Refused. At least one active administrator must remain. |
| E-02 | Administrator removes their own administration permission | Refused. |
| E-03 | Role deleted while users hold it | Refused until every assignment is removed or reassigned. |
| E-04 | Permission removed from a role mid-session | Takes effect on the next request, not at next sign-in. |
| E-05 | Branch, department or team deleted while records reference it | Refused. Deactivation is offered instead; historical records keep the reference (spec `009` `FR-023`). |
| E-06 | User's scope narrows while they hold assigned tickets outside it | Tickets return to their team queues; the lead is notified; the user retains no access. |
| E-07 | SSO provider unavailable | Sign-in fails with a clear message. A configured break-glass local administrator MAY be permitted per `[CLARIFY-3]`, and its use is a high-severity audit event. |
| E-08 | SSO returns a subject matching no user | Sign-in refused. Automatic account creation MUST NOT occur here; provisioning is spec `011` `FR-010`. |
| E-09 | Two administrators edit the same configuration item concurrently | Second save is refused with the conflict shown. No silent overwrite. |
| E-10 | Configuration change would invalidate live data (removing a status in use) | Refused, naming the affected count. Retirement is offered instead. |
| E-11 | Audit storage approaches its limit | Alert at the configured threshold. Audit writes MUST NOT be dropped; if the system cannot write an audit entry, the underlying action is refused. |
| E-12 | Retention rule would archive a record with an open dependency | Skipped and reported, not archived. |
| E-13 | Retention rule conflicts with a legal hold | The hold wins; the conflict is reported. |
| E-14 | Backup fails | Alert immediately per spec `013` `FR-007`; consecutive failures escalate. |
| E-15 | Restore drill fails to meet RTO | Recorded as failed with the elapsed time; treated as a release-blocking defect. |
| E-16 | Sandbox found to contain production personal data | Treated as an incident; data purged; recorded. |
| E-17 | Impersonation session left open | Terminates automatically at the bound. |
| E-18 | Impersonator attempts an action the impersonated may not perform | Refused, and the refusal recorded under both identities. |
| E-19 | API credential used after revocation | Refused; the attempt recorded with the credential identity. |
| E-20 | Attachment scanner unavailable | Uploads are refused, not accepted unscanned. Stated to the uploader. |
| E-21 | Data residency constraint conflicts with a dependency's region | The dependency MUST NOT be enabled. Recorded as a blocked configuration, not a warning. |

## 7. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| `NFR-001` | Permission evaluation overhead per request | ≤ 50ms at p95 |
| `NFR-002` | Audit search over 12 months | ≤ 5s at p95 |
| `NFR-003` | Session termination after deactivation | ≤ 60s |
| `NFR-004` | API credential revocation effect | ≤ 60s |
| `NFR-005` | Audit write durability | 100% — an unwritable audit entry refuses the action (`E-11`) |
| `NFR-006` | Attachment scan latency | ≤ 30s, upload held not accepted |
| `NFR-007` | RPO / RTO | Per `[CLARIFY-5]` — currently unspecified |
| `NFR-008` | Restore drill cadence | Before go-live, then at least quarterly |

## 8. Bilingual and localisation requirements

| Surface | Arabic | English | RTL notes |
|---|---|---|---|
| Administration interface | Required | Required | Full mirror |
| Role and permission names and descriptions | Required | Required | — |
| All configurable labels (statuses, categories, priorities, segments, resolution codes, ticket types, custom fields, form fields, holidays) | Required | Required | `FR-011` refuses a single-language save |
| Notification and email templates | Required | Required | Per channel and per event kind |
| Sign-in, MFA, lockout and session-expiry messages | Required | Required | — |
| Refusal messages for permission and scope | Required | Required | Must not disclose the existence of out-of-scope records |
| Audit log interface and action names | Required | Required | Entity identifiers and IPs stay LTR |
| Audit export | Required | Required | Column order mirrors in Arabic |

## 9. Permissions

Permissions in this spec are self-referential: the right to grant rights.

| Action | AGT | LEAD | MGR | ADM | AUD |
|---|---|---|---|---|---|
| View own profile and scope | ✓ | ✓ | ✓ | ✓ | ✓ |
| View users in own scope | — | ✓ | ✓ | ✓ | ✓ |
| Create / deactivate / reactivate a user | — | — | — | ✓ | — |
| Create / edit a role | — | — | — | ✓ | — |
| Assign a role, within own scope | — | — | — | ✓ | — |
| Assign a role beyond own scope | — | — | — | **never** | — |
| Set user skills, languages, capacity | — | ✓ | ✓ | ✓ | — |
| Configure SSO, MFA, password and session policy | — | — | — | ✓ | — |
| Configure statuses, categories, types, custom fields | — | — | — | ✓ | — |
| Configure SLA policies and escalation | — | — | ✓ | ✓ | — |
| Configure calendars and holidays | — | — | — | ✓ | — |
| Configure automation rules | — | — | — | ✓ | — |
| Configure notification and email templates | — | — | — | ✓ | — |
| Configure branding | — | — | — | ✓ | — |
| Create / revoke API credentials | — | — | — | ✓ | — |
| Configure retention and archival | — | — | — | ✓ | — |
| Configure data residency | — | — | — | ✓ | — |
| Read the audit log, own scope | — | ✓ | ✓ | ✓ | ✓ |
| Read the audit log, all scopes | — | — | — | — | ✓ |
| Export the audit log | — | — | — | ✓ | ✓ |
| Edit or delete an audit entry | — | — | — | **never** | **never** |
| Impersonate a user | — | — | — | with explicit right | — |
| Trigger a restore | — | — | — | ✓ | — |
| Access the sandbox | — | — | ✓ | ✓ | ✓ |

The auditor role is deliberately read-everything, change-nothing, and is the
only role that reads across all scopes.

## 10. Audit requirements

This spec defines the audit mechanism every other spec relies on.

| Event | Recorded fields |
|---|---|
| Sign-in succeeded / failed / locked out | actor or attempted identity, timestamp, IP, user agent, method, MFA outcome |
| Session created / expired / terminated / concurrent limit hit | actor, timestamp, cause |
| Break-glass sign-in used | actor, timestamp, IP, justification — **high severity** |
| User created / deactivated / reactivated | actor, subject, timestamp, before, after, tickets reassigned |
| Role created / edited / deleted | actor, timestamp, permission set before and after |
| Role assignment granted / revoked | actor, subject, role, scope granted, timestamp |
| Permission or scope refusal | actor, action attempted, target, timestamp, IP |
| Out-of-scope access attempted | actor, target type and identifier, timestamp, IP — **security event** |
| Configuration item changed | actor, item, field, before, after, timestamp |
| Notification template changed | actor, event kind, channel, language, before, after |
| API credential created / used / revoked | actor, credential, scope, last use, timestamp |
| Export performed, any entity | actor, entity type, row count, filters, format, destination, timestamp |
| Retention rule run | rule, records archived, records skipped and why |
| Destruction performed | actor, legal basis, record type, count, timestamp |
| Attachment rejected | uploader, surface, filename, size, scan result |
| Backup completed / failed | timestamp, outcome, size, retention point |
| Restore performed / drilled | actor, timestamp, restore point, elapsed, data loss measured, outcome |
| Impersonation started / ended / action taken | impersonator, impersonated, timestamp, bound, every action under both identities |
| Audit edit or delete attempted | actor, target entry, timestamp — **always refused, always recorded** |
| Residency-blocked configuration attempted | actor, dependency, region, timestamp |

## 11. Contracts

| Operation | Purpose | Scope predicate |
|---|---|---|
| `authenticate` / `sso callback` / `verify mfa` | Sign-in | rate-limited; lockout per `FR-007` |
| `list / get users` | Administration | branch ∈ scope AND department ∈ scope |
| `create / deactivate / reactivate user` | Lifecycle | admin; within own scope |
| `list / manage roles` | Permission model | admin; role permission set may not exceed the granter's |
| `grant / revoke role assignment` | Access | admin; scope granted ⊆ granter's scope (`FR-021`) |
| `get effective permissions` | Self-inspection and debugging | self, or admin for users in scope |
| `list / manage configuration items` | Administration surface | admin; both language values required |
| `list / manage notification templates` | Messaging | admin |
| `create / list / revoke API credentials` | Integration access | admin; credential scope ⊆ granter's scope |
| `search audit log` | Investigation | lead and above within scope; auditor across all scopes |
| `export audit log` | Evidence | admin or auditor; itself audited |
| `manage retention rules` | Data lifecycle | admin |
| `run restore` / `record drill` | Recovery | admin; high-severity audit |
| `start / end impersonation` | Support of the system | explicit right only; time-bounded; dual-identity audit |
| `scan attachment` (internal gate) | Upload safety | called by every upload surface without exception |

## 12. Clarifications needed

- [~] `[CLARIFY-1]` **How many departments and branches, and how isolated must they be?** Scoped access and full multi-tenant isolation are very different builds, and deciding late means rewriting the permission layer. Shared with spec `012` `[CLARIFY-2]`. — *blocks* `FR-004`, `FR-005`, and spec `012` `FR-011` — *ask* client operations + delivery lead
  - **ANSWERED PROVISIONALLY — developer, 2026-09-07 — pending client confirmation, NOT ratified.** Scoped access, not multi-tenancy. One deployment; branches and departments are ordinary records; the predicate is `branch ∈ scope AND department ∈ scope`, applied server-side in the data layer. Spec `012` `FR-011` is dropped. See [`docs/decisions-pending.md`](../../docs/decisions-pending.md).
- [ ] `[CLARIFY-2]` Which identity provider, is MFA already enforced there, and is MFA our responsibility or theirs? — *blocks* `FR-006`, `AS-06` — *ask* client IT
  - **STILL OPEN.** The marker's own three questions — which provider, whose MFA, mandatory or optional — are unanswered.
  - **WITHDRAWN AND CORRECTED — 2026-09-07.** An earlier provisional answer recorded here read *"No SSO in phase one; local email + password sign-in with bcrypt; MFA deferred to phase two."* **That answer was wrong and is withdrawn.** It answered a question this marker does not ask, and it contradicted `FR-006` (**MUST** — "The system MUST support SSO via SAML or OIDC") and story `SEC-06` (**Must**). It is recorded rather than deleted, because an erased mistake is unattributable. Ratified by the developer 2026-09-07.
  - **THE EVIDENCED READING, ratified by the developer 2026-09-07.** SSO via SAML or OIDC is **required as a capability** (`FR-006`, `SEC-06`). Local password sign-in is **permitted alongside it**, on the authority of `FR-007` (**MUST** — a configurable password policy, lockout and session limits presuppose local passwords) and `E-07` (the break-glass local administrator). `FR-006`'s own wording, *"Where SSO is **mandatory**"*, presupposes that it may not be. What remains open is the marker's actual question, not whether SSO exists.
  - **Evidence for the correction.** The sources offer an explicit phasing question for channels (`003 [CLARIFY-1]`), chat (`004 [CLARIFY-3]`), Arabic AI output (`007 [CLARIFY-7]`), report formats (`009 [CLARIFY-6]`), time tracking (`stories/002`) and refund approvals (`stories/005`). **No phasing question exists anywhere for SSO.** See [`docs/decisions-pending.md`](../../docs/decisions-pending.md) §1.
  - **Consequence for implementation.** `FR-006` is an uncovered **MUST**: no SAML or OIDC path is built. The local sign-in that exists is legitimate under `FR-007`, not a workaround — but if the client answers that SSO is *mandatory*, `FR-006` requires local password sign-in to be **refused** for ordinary users, while `E-07`'s break-glass administrator survives in every case.
- [~] `[CLARIFY-3]` **What is the exact role list, and who signs off the permission matrix?** Every other spec's matrix depends on this one. Also: is a break-glass local administrator permitted when SSO is down? — *blocks* `FR-002`, `E-07`, and the matrix in all twelve other specs — *ask* client operations + IT
  - **ANSWERED PROVISIONALLY — developer, 2026-09-07 — pending client confirmation, NOT ratified.** Five staff roles: `AGT`, `LEAD`, `MGR`, `ADM`, `AUD`, plus `CUST` for the portal when spec `008` enters scope — this ratifies the list every §9 matrix in all thirteen specs already uses, it does not invent one. One break-glass local administrator is permitted, its use a high-severity audit event (`E-07`). Sign-off still owed by client operations + IT.
- [ ] `[CLARIFY-4]` Which data-protection regime applies, and what is the retention period per record type? Shared with spec `001` `[CLARIFY-4]`. — *blocks* `FR-015` — *ask* client legal
- [ ] `[CLARIFY-5]` **What are the required RPO and RTO?** These are commercial commitments, not technical preferences, and `NFR-007` is empty without them. — *blocks* `FR-017`, `AS-14` — *ask* client executive sponsor
- [ ] `[CLARIFY-6]` Is the impersonated user notified, and must they consent in advance? — *blocks* `FR-019`, `AS-15` — *ask* client HR + legal
- [ ] `[CLARIFY-7]` **Must data remain in a specific jurisdiction?** If yes, this may rule out the AI approach in spec `007` entirely, and a sandbox environment must be funded — without one, `FR-018` is aspiration. — *blocks* `FR-018`, `FR-020`, and spec `007` `[CLARIFY-1]` — *ask* client legal + finance

## 13. Success metrics

| Metric | Source | Target |
|---|---|---|
| Cross-scope access refused server-side | Penetration test against every endpoint | 100% |
| Mutations lacking an audit entry | Reconciliation of history against change counts | 0 |
| Configuration changes requiring a developer | Change log, for the items in `FR-011` | 0 per month |
| Restore drill meeting RPO and RTO | Drill record | Pass, before go-live and quarterly |
| Active accounts for departed staff | Reconciliation against HR | 0 |
| Per-user permission overrides in existence | Model audit | 0 (`FR-002`) |
| Files stored without scanning | Upload audit | 0 |
| Single-language configurable labels | Configuration audit | 0 |

## 14. Review checklist

- [x] No implementation detail
- [x] Every requirement testable, using MUST / SHOULD / MAY
- [x] No unfailable adjectives
- [x] Every requirement traces to a story ID or constitution principle
- [x] Every acceptance scenario has a matching requirement, and vice versa
- [x] Edge cases cover last-administrator, self-demotion, concurrent edit, provider outage and scanner outage
- [x] Bilingual requirements stated, and `FR-011` refuses single-language labels
- [x] Permission matrix complete, including what is **never** permitted to any role
- [x] Audit entries defined — this spec is the audit mechanism the other twelve rely on
- [x] **Constitution IV satisfied — `FR-004` enforces server-side, `FR-021` prevents privilege escalation by grant, `AS-01` proves indistinguishability**
- [ ] **Zero `[NEEDS CLARIFICATION]` markers remaining — 5 open (`[CLARIFY-2]` `[CLARIFY-4]` `[CLARIFY-5]` `[CLARIFY-6]` `[CLARIFY-7]`); 2 answered provisionally by the developer on 2026-09-07. `[CLARIFY-2]` was reopened on 2026-09-07 when its recorded answer was found to contradict `FR-006`; the withdrawal is recorded in §12. The gate is NOT passed. Built work proceeds on a per-requirement reading: none of the 5 open markers blocks `FR-001`, `FR-002`, `FR-004`, `FR-005`, `FR-007`, `FR-008` or `FR-021`. `FR-006` IS blocked and is uncovered. See [`docs/decisions-pending.md`](../../docs/decisions-pending.md) §4.**
- [x] Constitution gates satisfied and named

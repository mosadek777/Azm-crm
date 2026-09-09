# Story 012 — Platform

> **عايزين نعمل إيه؟**
> We want one system that works properly in Arabic and English, on a phone, for
> several departments and several branches at once — and looks like the client,
> not like a vendor.

| | |
|---|---|
| **Number** | `012` |
| **Spec** | [`specs/012-platform/spec.md`](../../specs/012-platform/spec.md) |
| **Source** | *Customer Support CRM · Core Features*, section 12 |
| **Status** | Draft |
| **Owner** | TBD |

---

## The need

The five bullets under *Platform* in the feature list read as settings and are
in fact the shape of the whole build. Bilingual peer languages change the data
model of every configurable label. Multi-branch changes the permission layer.
Right-to-left changes every layout. Taken late, each one is a rewrite; taken
first, each one is a convention.

## Who this is for

| Persona | What they get out of it |
|---|---|
| `AGT` Support agent | Works in the language they think in, on whatever device is to hand |
| `CUST` Customer | An Arabic interface that was designed, not translated |
| `ADM` Administrator | Several departments and branches on one platform, branded as theirs |
| `MGR` Support manager | Per-department process and per-branch reporting without separate installations |

## What we want

After this ships, someone can:

- Use the entire product in Arabic or English and switch at any moment
- Read Arabic in a correctly mirrored layout with proper typography
- See dates, numbers and currency the way their locale writes them
- Author configurable content — categories, statuses, replies, templates, articles — in both languages
- Work from a phone or tablet browser without losing function
- Run several departments with their own queues, categories, SLAs and reporting
- Run several branches with their own hours, holidays, data scope and reporting
- Move a ticket across a department or branch boundary cleanly
- Present the product to customers under the client's own brand and domain

## Why it matters

This epic is the one most likely to be treated as cosmetic and it is the one that
determines whether the other twelve are affordable. Constitution I exists
entirely because of it. The specific trap: building monolingual and adding Arabic
later means revisiting every string, every layout, every configurable record and
every search index — a rewrite disguised as a translation task.

## Stories in this epic

| ID | As a | I want | So that | Priority |
|---|---|---|---|---|
| `PLT-01` | AGT | the whole interface in Arabic or English, switchable at will | I work in the language I think in | Must |
| `PLT-02` | AGT | correct right-to-left layout, mirrored icons, Arabic typography | the Arabic interface is designed, not translated | Must |
| `PLT-03` | CUST | dates, numbers and currency in my locale, Hijri where required | information reads the way I expect | Should |
| `PLT-04` | ADM | translate configurable content: categories, statuses, replies, templates, forms, articles | nothing falls back to a language the reader cannot read | Must |
| `PLT-05` | AGT | the system usable on a tablet or phone browser | I respond while away from my desk | Must |
| `PLT-06` | AGT | push notifications from a mobile or installed web app | an escalation reaches me away from a screen | Should |
| `PLT-07` | ADM | multiple departments with separate queues, categories, SLAs, reporting | each department keeps its process on one platform | Must |
| `PLT-08` | ADM | multiple branches with scoped data, hours, holidays, reporting | geography is handled properly, not ignored | Must |
| `PLT-09` | AGT | transfer across departments or branches with context and recalculated SLA | cross-organisation handoffs are clean and fairly measured | Should |
| `PLT-10` | ADM | our logo, colours, favicon, email furniture and portal domain | the system looks like ours to people outside it | Should |
| `PLT-11` | ADM | separate entities with isolated data on one deployment | we host a subsidiary without a second installation | Could |
| `PLT-12` | AGT | keyboard navigation, screen-reader labels, adequate contrast | colleagues with disabilities can do this job | Should |
| `PLT-13` | AGT | a dark interface | a nine-hour shift is easier on my eyes | Could |
| `PLT-14` | AGT | in-app guidance and role-based training content | a new agent is productive in days, not weeks | Could |
| `PLT-15` | AGT | immediate confirmation in the interface that what I just did succeeded or failed, in the language I am working in | I know whether my work was saved without re-reading the screen to check | Should |

**14 stories** — 6 Must · 5 Should · 3 Could

## How we will know it worked

- **Untranslated strings in either language** — measured by automated scan of all user-visible text, always zero
- **RTL layout defects** — measured by full-product review in Arabic before each release, zero blocking defects
- **Arabic task completion** — measured by usability test with Arabic-first agents and customers, above 90%
- **Mobile function parity** — measured against a defined task list, 100% of agent tasks completable on a phone browser
- **Cross-branch data visibility** — measured by test, zero records visible outside their scope
- **Accessibility** — measured against WCAG 2.1 AA on the agent workspace and portal, no level-A failures

## Explicitly out of scope

- **The permission enforcement itself** — story `010`; this epic defines the department and branch model that scoping applies to
- **A native iOS or Android application** — `PLT-06` is satisfiable by an installable web app; a native build is a separate decision
- **Machine translation of user content** — `PLT-04` is human-authored parallel content; message translation is story `007` (`AI-12`)
- **Reselling the platform to third parties** — `PLT-11` supports the client's own subsidiaries, not a commercial SaaS offering
- **Hosting, infrastructure and network topology** — a plan-phase decision

## Depends on

| Needs | Why |
|---|---|
| None | This epic is a foundation. It should be specified and largely built first. |

## Open questions for the client

- [ ] **Are Arabic and English peer languages, or is one primary with the other a translation?** Peer status means every configurable label stores two values. This is the most consequential open question in the project. — *blocks* `FR-001`, `FR-004`
- [ ] How many departments and how many branches, named? — *blocks* `FR-007`, `FR-008`, and story `010`
- [ ] Do branches operate on different working hours and holiday calendars? — *blocks* `FR-008`, and story `005`
- [ ] Is Hijri date display required, and where — display only, or input too? — *blocks* `FR-003`
- [ ] Is a native mobile app expected, or is an installable web app acceptable? — *blocks* `FR-006`
- [ ] Is `PLT-11` (isolated entities) a real requirement or an aspiration? It is the difference between scoping and multi-tenancy. — *blocks* `FR-011`, and story `010`
- [ ] Is there a formal accessibility standard the client must meet? — *blocks* `FR-012`

# roadmap.md — what is not built, and the deviations taken

Moved out of `README.md` on 2026-09-08, verbatim, so the README leads with what
the product does rather than with what it does not. **Nothing here is retired.**
The record of every deviation stays exactly as it was written.

For the ordered, dependency-aware build order see `docs/remaining.md`. For the
customer-facing flow specifically see `docs/portal-plan.md`. For every ratified
decision with its evidence and undo cost see `docs/decisions-pending.md`.

---

## What's not built

**Deliberately scoped out today**, each with an open ClickUp task naming what
blocks it: email/WhatsApp/SMS/chat, the SLA & automation engine, the knowledge
base, the customer portal, reports, the ERP integration, and AI features (the
last one is not merely deferred — see `docs/decisions-pending.md` for why it
cannot be planned yet).

**Two deliberate deviations from spec**, made to ship a working slice today:

- **`Team` is not implemented.** Tickets assign directly to an agent. Two specs
  make a `Team` reference *required*, and no spec defines the entity — this is
  a documented spec defect, not a design choice, and it is *stepped around*
  here, not resolved.
- **Category is a flat string**, not the tree the spec requires (`FR-004`).

Neither compromise touches scope enforcement or the audit trail — both remain
enforced on every read and write, including on tickets and customers.

---

## What has changed since that was written

The paragraph above is kept word for word. Two of its statements have since been
overtaken, and saying so here is cheaper than editing the record:

- **The customer portal is no longer entirely scoped out.** A customer can sign
  in and follow their own requests read-only (pieces `X1`–`X3`, `X5`, `X7`).
  Raising a request and replying are the remaining pieces. See
  `docs/portal-plan.md`.
- **`Team` now has a decided data model**, though it is still unbuilt: spec
  `012` owns the entity, it belongs to exactly one Department and is independent
  of Branch, and membership rides on `RoleAssignment` (decision 30). The
  *implementation* is still stepped around, so the paragraph above remains true
  of the code. One rule is still missing — `002 E-12`'s singular "the team lead"
  has no stated behaviour for zero or several leads.

The sentence that has **not** changed, and is not expected to: neither
compromise touches scope enforcement or the audit trail.

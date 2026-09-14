// spec 010 FR-011 / spec 002 §8 — the DEFAULT bilingual labels for the ratified
// status and priority keys.
//
// ── WHAT THIS FILE IS, AND WHAT IT IS NOT ──────────────────────────────────
//
// It is NOT the source of truth. These values are seeded into the database once
// and are editable from the administration surface thereafter, which is what
// FR-011 requires: "configure statuses ... and priorities ... from an
// administration surface WITH NO RELEASE REQUIRED". Editing this file changes
// nothing on a system that has already been seeded.
//
// It exists because a first seed has to put something bilingual in the column,
// and constitution I forbids a single-language label — so there is no "seed the
// English and let an administrator add the Arabic later". Both are here, both
// are developer-authored, and both are meant to be corrected by somebody whose
// first language they are.
//
// ── THE KEYS ARE RATIFIED; THE LABELS ARE NOT ──────────────────────────────
//
// The ten status keys are decision 15 and the four priority keys are spec 002
// §3. Neither set is editable from the administration surface, and that is a
// deliberate limit rather than an oversight:
//
//   - A status key is written onto every ticket and into every audit entry.
//     Renaming one orphans history; adding one needs a row and a column in the
//     transition graph, which FR-008 makes administrator-defined and which no
//     spec supplies. Board card: configurable-status-set.
//   - A priority key carries a RANK that the queue ordering uses (E-05's
//     "priority then age"). A new priority has no rank, so the queue could not
//     place it. Board card: configurable-priority-set.
//
// §8 is explicit that the key is the stable thing: status `key` is
// "language-neutral", and the LABEL is what carries `{ar, en}`.

export const STATUS_LABEL_DEFAULTS = {
  new: { ar: 'جديدة', en: 'New' },
  assigned: { ar: 'مُسندة', en: 'Assigned' },
  in_progress: { ar: 'قيد المعالجة', en: 'In progress' },
  pending_customer: { ar: 'بانتظار العميل', en: 'Waiting on the customer' },
  pending_supplier: { ar: 'بانتظار المورِّد', en: 'Waiting on a supplier' },
  pending_internal: { ar: 'بانتظار جهة داخلية', en: 'Waiting on us' },
  resolved: { ar: 'تم الحل', en: 'Resolved' },
  closed: { ar: 'مغلقة', en: 'Closed' },
  merged: { ar: 'مدمجة', en: 'Merged' },
  cancelled: { ar: 'ملغاة', en: 'Cancelled' }
}

export const PRIORITY_LABEL_DEFAULTS = {
  low: { ar: 'منخفضة', en: 'Low' },
  normal: { ar: 'عادية', en: 'Normal' },
  high: { ar: 'مرتفعة', en: 'High' },
  urgent: { ar: 'عاجلة', en: 'Urgent' }
}

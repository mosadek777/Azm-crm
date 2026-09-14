// spec 010 — implements FR-011 (the statuses-and-priorities part), SEC-11;
// spec 002 §8; constitution I, II.
//
// FR-011 (MUST): "Administrators MUST be able to configure statuses and
// transitions, categories, ticket types, custom fields, priorities, SLA
// policies, business calendars and holidays, escalation policies, automation
// rules, notification and email templates, form definitions, segments,
// resolution codes and branding, from an administration surface with no release
// required. ANY CHANGE TO A USER-VISIBLE LABEL MUST BE REFUSED UNLESS BOTH
// LANGUAGE VALUES ARE SUPPLIED."
//
// ── FOURTEEN SURFACES. THIS FILE IS TWO OF THEM. ───────────────────────────
//
// Statuses and priorities, and only their LABELS and `pausesSla`. Everything
// else FR-011 names is either blocked or a subsystem that does not exist, and
// each is carded rather than half-built:
//
//   transitions            FR-008 makes them administrator-defined; decision 22
//                          is the developer default. Editing the graph needs a
//                          reachability check (AS-03 requires a refused move to
//                          name the reachable statuses) — `configurable-transitions`
//   categories             decision 21 stored category as a free STRING on every
//                          ticket. Making it an entity is a data migration of
//                          live records — `configurable-categories`
//   resolution codes       decision 23 disabled FR-029 because the two lists do
//                          not exist — `resolution-code-lists`
//   segments               spec 001, not built — `customer-segments`
//   SLA policies,          spec 005, blocked on [CLARIFY-1] and [CLARIFY-2]
//   calendars, holidays,
//   escalation, automation
//   notification templates spec 003 does not exist — `notification-templates`
//   ticket types,          new subsystems with no consumer — `custom-fields`
//   custom fields, forms
//   branding               cosmetic, unscheduled — `branding-configuration`
//
// ── THE KEYS ARE NOT EDITABLE. THE LABELS ARE. ─────────────────────────────
//
// §8: the status `key` is "language-neutral" and the label carries `{ar, en}`.
// The key is on every ticket and in every audit entry; renaming one orphans
// history. See config/ticket-labels.js.
//
// ── SEEDING IS IDEMPOTENT AND HAPPENS ON READ ──────────────────────────────
//
// A fresh database has no rows, and an empty configuration screen would look
// like a broken one. The first read fills in the ratified keys with their
// developer-authored defaults. It only ever INSERTS MISSING KEYS: an
// administrator's edit is never overwritten by a later seed, so this is safe to
// run on every read and safe to deploy over live data.

import mongoose from 'mongoose'
import { TicketLabel } from '../../DB/models/ticket-label.model.js'
import { recordAudit, redact } from '../../utils/audit.js'
import { STATUSES, STATUS_KEYS, PRIORITIES } from '../../utils/ticket-status.js'
import { STATUS_LABEL_DEFAULTS, PRIORITY_LABEL_DEFAULTS } from '../../config/ticket-labels.js'

const bilingual = (ar, en) => ({ ar, en })
const NOT_FOUND = bilingual('العنصر غير موجود', 'Not found')

const bad = (res, ar, en, fields) =>
  res.status(400).json({ message: { ar, en }, ...(fields ? { fields } : {}) })

/**
 * Insert any ratified key that has no row yet. Never updates an existing one.
 *
 * Not audited. Nothing a person did is being recorded — this is the ratified
 * default arriving for the first time, the same category as a migration, and an
 * audit entry with no actor would say a change was made that nobody made. The
 * first EDIT is audited, and that is the event an auditor is looking for.
 */
export const ensureSeeded = async () => {
  const existing = await TicketLabel.find({}).select('kind key')
  const have = new Set(existing.map(r => `${r.kind}:${r.key}`))

  const wanted = [
    ...STATUS_KEYS.map((key, i) => ({
      kind: 'status',
      key,
      label: STATUS_LABEL_DEFAULTS[key],
      pausesSla: STATUSES[key].pausesSla,
      terminal: STATUSES[key].terminal,
      order: i
    })),
    ...PRIORITIES.map((key, i) => ({
      kind: 'priority',
      key,
      label: PRIORITY_LABEL_DEFAULTS[key],
      pausesSla: null,
      terminal: false,
      // Mirrors the rank the queue ordering uses, so the screen lists
      // priorities the way the queue sorts them rather than alphabetically.
      order: i
    }))
  ].filter(r => !have.has(`${r.kind}:${r.key}`))

  // A missing default would store a single-language label, which constitution I
  // forbids and the schema refuses. Fail loudly at seed time rather than 500
  // on a validation error nobody can place.
  for (const r of wanted) {
    if (!r.label?.ar || !r.label?.en) {
      throw new Error(`ticket-labels.js has no bilingual default for ${r.kind} "${r.key}"`)
    }
  }

  if (wanted.length) await TicketLabel.insertMany(wanted, { ordered: false })
}

const shape = (row) => ({
  ...redact(row),
  // What the administration screen may offer. Said in the payload so a client
  // does not have to hold its own copy of the rule — and the server refuses
  // regardless of what a client believes.
  editable: {
    label: true,
    pausesSla: row.kind === 'status',
    // Structural, and ratified by decision 14. See the model header.
    terminal: false,
    key: false
  }
})

/**
 * GET /config/labels — every staff role.
 *
 * READ IS NOT ADM-ONLY, and that is not a loosening. Every screen in the
 * product renders these labels; gating the read would mean an agent's ticket
 * list could not name its own statuses. Nothing here is scoped or sensitive:
 * it is the same configuration the status dropdown already exposes.
 */
export const listLabels = async (req, res, next) => {
  try {
    await ensureSeeded()
    const rows = await TicketLabel.find({}).sort({ kind: 1, order: 1 })
    return res.json({
      statuses: rows.filter(r => r.kind === 'status').map(shape),
      priorities: rows.filter(r => r.kind === 'priority').map(shape),
      // FR-011's own caveat, in the payload: this surface covers two of the
      // fourteen things the requirement names. The rest are carded.
      covers: ['status_labels', 'priority_labels', 'status_pauses_sla'],
      keysEditable: false
    })
  } catch (err) { return next(err) }
}

/**
 * PATCH /config/labels/:kind/:key — ADM only (010 FR-001).
 *
 * Accepts `label: { ar, en }` and, for a status, `pausesSla`.
 */
export const updateLabel = async (req, res, next) => {
  const session = await mongoose.startSession()
  try {
    await ensureSeeded()

    const { kind, key } = req.params
    const row = await TicketLabel.findOne({ kind, key })
    if (!row) return res.status(404).json({ message: NOT_FOUND })

    const { label, pausesSla } = req.body ?? {}
    const changed = []

    // ── CONSTITUTION I / FR-011: BOTH LANGUAGES OR REFUSE ──────────────────
    //
    // "Any change to a user-visible label MUST be refused unless BOTH language
    // values are supplied." Refused, not merged with what is already stored:
    // accepting `{ en: 'Waiting' }` and keeping the old Arabic would leave the
    // two describing different things, which is the failure the requirement
    // exists to prevent. An administrator who wants to change one must restate
    // the other, and the screen hands them both fields filled in.
    if (label !== undefined) {
      const ar = typeof label?.ar === 'string' ? label.ar.trim() : ''
      const en = typeof label?.en === 'string' ? label.en.trim() : ''
      const missing = [!ar && 'label.ar', !en && 'label.en'].filter(Boolean)
      if (missing.length) {
        return bad(res,
          'يجب إدخال التسمية بالعربية والإنجليزية معًا — لا يُقبل حفظ لغة واحدة',
          'Both the Arabic and the English label must be supplied — a single-language save is refused',
          missing)
      }
      if (ar !== row.label.ar || en !== row.label.en) changed.push('label')
    }

    let nextPauses = row.pausesSla
    if (pausesSla !== undefined) {
      if (kind !== 'status') {
        return bad(res, 'إيقاف مؤقّت لمستوى الخدمة ينطبق على الحالات فقط',
          'pausesSla applies to statuses only', ['pausesSla'])
      }
      // A terminal status has no clock to pause; decision 14 stores null for
      // exactly that reason, and a boolean here would imply a running clock.
      if (row.terminal) {
        return bad(res,
          'الحالات النهائية لا تحمل مؤقّتًا يمكن إيقافه',
          'A terminal status has no clock to pause — decision 14 stores null for these',
          ['pausesSla'])
      }
      if (typeof pausesSla !== 'boolean') {
        return bad(res, 'القيمة يجب أن تكون صحيحة أو خاطئة', 'pausesSla must be true or false', ['pausesSla'])
      }
      if (pausesSla !== row.pausesSla) { nextPauses = pausesSla; changed.push('pausesSla') }
    }

    if (!changed.length) return res.json({ label: shape(row), changed: [] })

    const before = { label: { ...row.label }, pausesSla: row.pausesSla }

    await session.withTransaction(async () => {
      // §10 / FR-008: "configuration change" is one of the named audited
      // actions, with before and after.
      await recordAudit({
        actorId: req.user._id,
        actorRef: req.user._id.toString(),
        action: 'config.label_changed',
        entityType: 'TicketLabel',
        entityId: row._id,
        before,
        after: {
          kind, key,
          label: label !== undefined ? { ar: label.ar.trim(), en: label.en.trim() } : before.label,
          pausesSla: nextPauses,
          changed,
          // ⚠ RECORDED EXPLICITLY, not left to be assumed. A `pausesSla` change
          // is not applied backwards: spec 005's pause ledger is append-only,
          // so time already accounted under the old flag stays accounted that
          // way. An auditor reading this entry must be able to see that the
          // change starts here rather than rewriting history.
          retroactive: false
        },
        req,
        session
      })

      if (label !== undefined) row.label = { ar: label.ar.trim(), en: label.en.trim() }
      row.pausesSla = nextPauses
      await row.save({ session })
    })

    return res.json({ label: shape(await TicketLabel.findById(row._id)), changed })
  } catch (err) {
    return next(err)
  } finally {
    await session.endSession()
  }
}

/** The labels, keyed, for callers that render them — used by /ticket/meta. */
export const labelMap = async () => {
  await ensureSeeded()
  const rows = await TicketLabel.find({})
  const out = { status: {}, priority: {} }
  for (const r of rows) out[r.kind][r.key] = { ar: r.label.ar, en: r.label.en }
  return out
}

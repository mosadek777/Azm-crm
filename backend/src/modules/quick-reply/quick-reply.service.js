// spec 004 — implements FR-006, FR-007 (personal and global), AD-06;
// constitution I, II, IV.
//
// A quick reply is a saved answer with an Arabic body and an English body and
// placeholders substituted at insertion. AD-06: "common answers cost one
// keystroke, not five minutes."
//
// ── WHERE THE RULES LIVE ────────────────────────────────────────────────────
//
// FR-006 has four clauses and each is enforced in exactly one place:
//
//   "named placeholders"        config/placeholders.js — the ONLY definition.
//                               The interface reads it from this module's
//                               /placeholders route rather than keeping a copy,
//                               because two lists drift and the drift surfaces
//                               as a refusal nobody can explain.
//   "an Arabic and an English   the localizedText subdocument, which refuses a
//    body"                      save with one language missing.
//   "insertion MUST select by   `render` picks the body by the CUSTOMER's
//    the customer's preferred    preferred language, not the agent's. The agent
//    language"                   may be reading the interface in Arabic and
//                                writing to an English-speaking customer.
//   "MUST REFUSE rather than    `resolvePlaceholders` is all-or-nothing and
//    insert an unresolved        never returns a partly-substituted body. The
//    placeholder"                refusal names WHICH token failed and why.
//
// ── RENDERING IS A READ OF A TICKET ─────────────────────────────────────────
//
// `render` takes a ticketId and loads it through `scopeFilter`, so a template
// cannot be used to reach a record out of scope — out of scope answers 404,
// byte-identical to absent (constitution IV). Nothing is written, so there is
// no audit entry: constitution II is about mutations, and reading a template
// mutates nothing.

import mongoose from 'mongoose'
import { QuickReply } from '../../DB/models/quick-reply.model.js'
import { Ticket } from '../../DB/models/ticket.model.js'
import { Customer } from '../../DB/models/customer.model.js'
import { Branch } from '../../DB/models/branch.model.js'
import { Department } from '../../DB/models/department.model.js'
import { recordAudit, redact } from '../../utils/audit.js'
import { scopeFilter } from '../../utils/scope.js'
import {
  PLACEHOLDERS, PLACEHOLDER_TOKENS, resolvePlaceholders, unknownTokensIn
} from '../../config/placeholders.js'

const bilingual = (ar, en) => ({ ar, en })

/** The vocabulary, for an editor's autocomplete. One list, read not copied. */
export const listPlaceholders = async (req, res, next) => {
  try {
    return res.json({
      // `resolve` is a function and deliberately not serialised — the interface
      // needs to know what exists, never how it is produced.
      placeholders: PLACEHOLDERS.map(({ token, label }) => ({ token, label })),
      syntax: '{{token}}'
    })
  } catch (err) { return next(err) }
}

// ---------------------------------------------------------------------------
// FR-007 — mine, plus everything global
// ---------------------------------------------------------------------------
export const listQuickReplies = async (req, res, next) => {
  try {
    const replies = await QuickReply.find({
      active: true,
      $or: [
        { scope: 'global' },
        { scope: 'personal', ownerId: req.user._id }
      ]
    }).sort({ scope: 1, updatedAt: -1 })

    return res.json({ quickReplies: replies.map(r => redact(r)) })
  } catch (err) { return next(err) }
}

// ---------------------------------------------------------------------------
// FR-006 / FR-007 — create
// ---------------------------------------------------------------------------
export const createQuickReply = async (req, res, next) => {
  try {
    const { name, body, scope } = req.body ?? {}

    const missing = []
    if (!name?.ar || !name?.en) missing.push('name')
    if (!body?.ar || !body?.en) missing.push('body')
    if (!scope) missing.push('scope')
    if (missing.length) {
      return res.status(400).json({
        message: bilingual(
          `حقول مطلوبة ناقصة: ${missing.join('، ')}`,
          `Required fields are missing: ${missing.join(', ')}`),
        fields: missing
      })
    }

    if (!['personal', 'global'].includes(scope)) {
      return res.status(400).json({
        message: bilingual('النطاق يجب أن يكون شخصيًا أو عامًا', 'Scope must be personal or global'),
        fields: ['scope']
      })
    }

    // FR-007: "team and global MUST be manageable by a lead or above and MUST
    // NOT be editable by an individual agent."
    if (scope === 'global') {
      const roles = new Set((req.assignments ?? []).map(a => a.role))
      const mayManageGlobal = ['LEAD', 'MGR', 'ADM'].some(r => roles.has(r))
      if (!mayManageGlobal) {
        return res.status(403).json({
          message: bilingual(
            'مرفوض: الردود العامة يديرها قائد فريق أو أعلى',
            'Refused: a global quick reply is managed by a team lead or above')
        })
      }
    }

    // AN UNKNOWN TOKEN IS REFUSED AT AUTHORING TIME, not discovered later by
    // whoever tries to use the template. The refusal names each bad token.
    const unknown = [...new Set([...unknownTokensIn(body.ar), ...unknownTokensIn(body.en)])]
    if (unknown.length) {
      return res.status(400).json({
        message: bilingual(
          `عناصر نائبة غير معروفة: ${unknown.join('، ')}`,
          `Unknown placeholders: ${unknown.join(', ')}`),
        fields: ['body'],
        unknownPlaceholders: unknown,
        allowedPlaceholders: PLACEHOLDER_TOKENS
      })
    }

    const id = new mongoose.Types.ObjectId()
    const doc = {
      _id: id,
      name: { ar: name.ar, en: name.en },
      body: { ar: body.ar, en: body.en },
      scope,
      // A global reply belongs to the organisation; a personal one to its author.
      ownerId: scope === 'personal' ? req.user._id : null,
      createdBy: req.user._id,
      active: true
    }

    // Constitution II: the entry and the record commit together or neither does.
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action: 'quick_reply.created',
          entityType: 'QuickReply',
          entityId: id,
          before: null,
          after: redact(doc),
          severity: scope === 'global' ? 'high' : 'normal',
          req,
          session
        })
        await QuickReply.create([doc], { session })
      })
    } finally {
      await session.endSession()
    }

    const created = await QuickReply.findById(id)
    return res.status(201).json({ quickReply: redact(created) })
  } catch (err) { return next(err) }
}

// ---------------------------------------------------------------------------
// Deactivate, never delete — the same rule as branches, departments and users.
// A retired template's wording may be quoted in tickets already sent.
// ---------------------------------------------------------------------------
export const setQuickReplyActive = async (req, res, next) => {
  try {
    const { active } = req.body ?? {}
    if (typeof active !== 'boolean') {
      return res.status(400).json({
        message: bilingual('الحالة يجب أن تكون صحيحة أو خاطئة', 'active must be true or false'),
        fields: ['active']
      })
    }

    const reply = await QuickReply.findById(req.params.id).catch(() => null)
    // A personal reply belonging to somebody else is NOT FOUND, not forbidden:
    // the same indistinguishability the scope predicate applies elsewhere.
    const mine = reply && (reply.scope === 'global' || String(reply.ownerId) === String(req.user._id))
    if (!reply || !mine) {
      return res.status(404).json({ message: bilingual('الرد غير موجود', 'Quick reply not found') })
    }

    if (reply.scope === 'global') {
      const roles = new Set((req.assignments ?? []).map(a => a.role))
      if (!['LEAD', 'MGR', 'ADM'].some(r => roles.has(r))) {
        return res.status(403).json({
          message: bilingual(
            'مرفوض: الردود العامة يديرها قائد فريق أو أعلى',
            'Refused: a global quick reply is managed by a team lead or above')
        })
      }
    }

    if (reply.active === active) {
      return res.json({ quickReply: redact(reply), changed: false })
    }

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action: 'quick_reply.active_changed',
          entityType: 'QuickReply',
          entityId: reply._id,
          before: { active: reply.active },
          after: { active },
          severity: reply.scope === 'global' ? 'high' : 'normal',
          req,
          session
        })
        await QuickReply.updateOne({ _id: reply._id }, { $set: { active } }, { session })
      })
    } finally {
      await session.endSession()
    }

    const updated = await QuickReply.findById(reply._id)
    return res.json({ quickReply: redact(updated), changed: true })
  } catch (err) { return next(err) }
}

// ---------------------------------------------------------------------------
// FR-006 — render a quick reply against a ticket
// ---------------------------------------------------------------------------
export const renderQuickReply = async (req, res, next) => {
  try {
    const { ticketId } = req.body ?? {}
    if (!ticketId) {
      return res.status(400).json({
        message: bilingual('معرّف التذكرة مطلوب', 'ticketId is required'),
        fields: ['ticketId']
      })
    }

    const reply = await QuickReply.findById(req.params.id).catch(() => null)
    const mine = reply && (reply.scope === 'global' || String(reply.ownerId) === String(req.user._id))
    if (!reply || !mine || !reply.active) {
      return res.status(404).json({ message: bilingual('الرد غير موجود', 'Quick reply not found') })
    }

    // THROUGH THE SCOPE PREDICATE. A template must not become a way to read a
    // ticket the caller may not see: out of scope answers 404, identical to
    // genuinely absent (constitution IV, AS-01).
    const ticket = await Ticket.findOne({ _id: ticketId, ...scopeFilter(req.assignments) }).catch(() => null)
    if (!ticket) {
      return res.status(404).json({ message: bilingual('التذكرة غير موجودة', 'Ticket not found') })
    }

    const [customer, branch, department] = await Promise.all([
      Customer.findById(ticket.customerId).catch(() => null),
      Branch.findById(ticket.branchId).catch(() => null),
      Department.findById(ticket.departmentId).catch(() => null)
    ])

    // FR-006: "insertion MUST select by the CUSTOMER's preferred language."
    // Not the agent's. An agent reading the interface in Arabic may be writing
    // to a customer who reads English, and the customer is who receives it.
    const lang = customer?.preferredLanguage === 'en' ? 'en' : 'ar'

    const result = resolvePlaceholders(reply.body[lang], {
      ticket,
      customer,
      branch,
      department,
      // The SENDER, not the assignee — decision 41. A template is written in
      // the voice of whoever is sending it.
      actor: req.user,
      lang
    })

    if (!result.ok) {
      // NAMES WHICH TOKEN FAILED AND WHY, never only that one did. An agent
      // editing a template has to know which token is wrong.
      const named = result.failures.map(f => f.token).join('، ')
      const namedEn = result.failures.map(f => f.token).join(', ')
      return res.status(422).json({
        message: bilingual(
          `تعذّر إدراج الرد: لم تُستبدل هذه العناصر النائبة: ${named}`,
          `The reply was not inserted: these placeholders could not be resolved: ${namedEn}`),
        failures: result.failures,
        allowedPlaceholders: PLACEHOLDER_TOKENS
      })
    }

    return res.json({
      body: result.body,
      // Which language was chosen, and why — so the interface can say so rather
      // than leaving an agent wondering why an Arabic template came out English.
      language: lang,
      languageFrom: 'customer_preference'
    })
  } catch (err) { return next(err) }
}

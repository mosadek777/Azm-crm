// spec 001 — implements CM-01, FR-001, FR-004 (as amended by decision 16),
//            FR-010, FR-020, FR-023, AS-01, AS-04, E-05, E-06; constitution IV
// Step 4, review point 2. POST /customer only — no read, no update, no merge.

import mongoose from 'mongoose'
import { Customer, CUSTOMER_TYPES, LANGUAGES, CHANNEL_TYPES } from '../../DB/models/customer.model.js'
import { ContactPoint } from '../../DB/models/contact-point.model.js'
import { recordAudit, redact } from '../../utils/audit.js'
import { normaliseContactPoint } from '../../utils/contact-point.js'
import { reachableScope, resolveGrantedScope, scopeFilter } from '../../utils/scope.js'

const bad = (res, ar, en, fields) =>
  res.status(400).json({ message: { ar, en }, ...(fields ? { fields } : {}) })

// FR-023 / §11: "create customer — writes caller's branch and department".
// Reuses resolveGrantedScope, which already implements the AS-04 rule that an
// omitted scope resolves to the caller's own and never to "all", and that an
// unrestricted caller must state one explicitly.
const resolveWriteScope = (req) => {
  const requested = req.body?.scope
  const single = (list) => (list.length === 1 ? list : [])
  const scope = reachableScope(req.assignments)

  if (!scope.unrestricted && !requested) {
    // Exactly one branch and one department in scope is unambiguous. More than
    // one is not, and guessing would file the customer in the wrong branch.
    const branchIds = single(scope.branchIds)
    const departmentIds = single(scope.departmentIds)
    if (!branchIds.length || !departmentIds.length) {
      return { ok: false, reason: 'ambiguous_scope', scope }
    }
    return { ok: true, branchIds, departmentIds }
  }

  const resolved = resolveGrantedScope({ granterAssignments: req.assignments, requested })
  if (!resolved.ok) return resolved
  // One record lives in one branch and one department.
  if (resolved.branchIds.length !== 1 || resolved.departmentIds.length !== 1) {
    return { ok: false, reason: 'ambiguous_scope', scope }
  }
  return resolved
}

// FR-010 / §11 `check duplicates`: "returns only in-scope matches; out-of-scope
// collisions return 'unavailable', never the record".
//
// The out-of-scope branch is the subtle half. A collision the caller may not see
// still has to be reported — otherwise FR-004's uniqueness silently does not
// apply across scope boundaries — but reporting it by name would disclose the
// existence of an out-of-scope record, which spec 010 §8 forbids. So it is
// reported as an unnamed count.
const probeCollisions = async ({ contactPoints, nationalId, accountRef, writeScope, session }) => {
  const named = []
  let unnamedCount = 0

  const consider = async (matches, on) => {
    for (const m of matches) {
      const inScope = String(m.branchId) === String(writeScope.branchId)
        && String(m.departmentId) === String(writeScope.departmentId)
      if (inScope) {
        named.push({ id: m._id, displayName: m.displayName, matchedOn: on })
      } else {
        unnamedCount++
      }
    }
  }

  for (const cp of contactPoints) {
    // A contact point with no normalised form is "excluded from normalised
    // matching" (E-06), so it is probed on its literal value only.
    const q = cp.normalisedValue
      ? { channelType: cp.channelType, normalisedValue: cp.normalisedValue }
      : { channelType: cp.channelType, value: cp.value }

    const hits = await ContactPoint.find(q).session(session ?? null)
    if (!hits.length) continue
    const owners = await Customer.find({
      _id: { $in: hits.map(h => h.customerId) },
      status: 'active'
    }).session(session ?? null)
    await consider(owners, `contact_point:${cp.channelType}`)
  }

  if (nationalId) {
    await consider(await Customer.find({ nationalId, status: 'active' }).session(session ?? null), 'national_id')
  }
  if (accountRef) {
    await consider(await Customer.find({ accountRef, status: 'active' }).session(session ?? null), 'account_ref')
  }

  return { named, unnamedCount, any: named.length > 0 || unnamedCount > 0 }
}

export const createCustomer = async (req, res, next) => {
  try {
    const {
      type, displayName, nationalId, accountRef, preferredLanguage,
      preferredChannel, organisationId, sensitiveFlag,
      contactPoints, confirmCollision
    } = req.body ?? {}

    // --- FR-001: display name plus at least one contact point. Nothing else
    // --- is required, and nothing else may be made required here.
    const missing = []
    if (!displayName) missing.push('displayName')
    if (!Array.isArray(contactPoints) || contactPoints.length < 1) missing.push('contactPoints')
    if (missing.length) {
      return bad(res,
        `حقول مطلوبة ناقصة: ${missing.join('، ')}`,
        `Required fields are missing: ${missing.join(', ')}`, missing)
    }

    const customerType = type ?? 'person'
    if (!CUSTOMER_TYPES.includes(customerType)) {
      return bad(res, 'نوع العميل غير صحيح', `type must be one of: ${CUSTOMER_TYPES.join(', ')}`, ['type'])
    }

    // §3: required. AS-01 defaults it to the agent's interface language, which
    // the caller supplies; falling back to the creating user's own default is
    // the server-side equivalent and is never a silent 'en'.
    const language = preferredLanguage ?? req.user.defaultLanguage
    if (!LANGUAGES.includes(language)) {
      return bad(res, 'اللغة المفضلة غير صحيحة', `preferredLanguage must be one of: ${LANGUAGES.join(', ')}`, ['preferredLanguage'])
    }

    if (preferredChannel && !CHANNEL_TYPES.includes(preferredChannel)) {
      return bad(res, 'قناة التواصل المفضلة غير صحيحة', `preferredChannel must be one of: ${CHANNEL_TYPES.join(', ')}`, ['preferredChannel'])
    }

    // --- Normalise every contact point up front (E-06 never throws) ---------
    const normalised = []
    for (const [i, cp] of contactPoints.entries()) {
      if (!CHANNEL_TYPES.includes(cp?.channelType)) {
        return bad(res, `قناة غير صحيحة في العنصر ${i}`, `contactPoints[${i}].channelType must be one of: ${CHANNEL_TYPES.join(', ')}`, [`contactPoints[${i}].channelType`])
      }
      if (!cp?.value) {
        return bad(res, `قيمة مطلوبة في العنصر ${i}`, `contactPoints[${i}].value is required`, [`contactPoints[${i}].value`])
      }
      normalised.push({ ...normaliseContactPoint(cp), channelType: cp.channelType, isPrimary: Boolean(cp.isPrimary) })
    }

    // §3: at most one primary per channel type. Caught here with a clear
    // message rather than as an E11000 from the index.
    const primaries = new Set()
    for (const cp of normalised.filter(c => c.isPrimary)) {
      if (primaries.has(cp.channelType)) {
        return bad(res, `لا يمكن تعيين أكثر من رقم أساسي لنفس القناة: ${cp.channelType}`,
          `Only one contact point per channel type may be primary: ${cp.channelType}`, ['contactPoints'])
      }
      primaries.add(cp.channelType)
    }

    // --- FR-023: scope is written from the caller's, never from the body ----
    const scope = resolveWriteScope(req)
    if (!scope.ok) {
      const detail = scope.reason === 'ambiguous_scope'
        ? { ar: 'يجب تحديد الفرع والقسم صراحةً', en: 'branch and department must be named explicitly when your scope covers more than one' }
        : { ar: 'مرفوض: لا يمكنك الإنشاء خارج نطاقك', en: 'Refused: you cannot create outside your own scope' }
      return res.status(scope.reason === 'exceeds_granter_scope' ? 403 : 400)
        .json({ message: detail, fields: ['scope'] })
    }
    const branchId = scope.branchIds[0]
    const departmentId = scope.departmentIds[0]

    // --- The organisation-target type check, deferred from review point 1 ---
    // §3: "Only when `type = person`; target must be `type = organisation`".
    // It needs a second document read, which is why it lives here and not in a
    // schema validator.
    if (organisationId) {
      if (customerType !== 'person') {
        return bad(res, 'المؤسسة لا يمكن أن تنتمي إلى مؤسسة أخرى',
          'organisationId may only be set when type is "person"', ['organisationId'])
      }
      const target = await Customer.findById(organisationId).catch(() => null)

      // Out of scope is indistinguishable from non-existent (AS-01,
      // constitution IV) — the same 404-shaped answer, so a probe cannot map
      // other branches' records.
      const visible = target
        && String(target.branchId) === String(branchId)
        && String(target.departmentId) === String(departmentId)

      if (!visible) {
        return res.status(404).json({
          message: { ar: 'المؤسسة غير موجودة', en: 'Organisation not found' },
          fields: ['organisationId']
        })
      }
      if (target.type !== 'organisation') {
        return bad(res, 'الهدف يجب أن يكون مؤسسة',
          'organisationId must reference a customer whose type is "organisation"', ['organisationId'])
      }
      // E-04 (circular membership) needs no check: a cycle would require both
      // records to be `person` and `organisation` at once, and `type` is
      // immutable. See customer.model.js.
    }

    // --- FR-010 / FR-004: probe, surface, require confirmation -------------
    // This is what replaces the unique index decision 16 removed.
    const collisions = await probeCollisions({
      contactPoints: normalised,
      nationalId: nationalId || null,
      accountRef: accountRef || null,
      writeScope: { branchId, departmentId },
      session: null
    })

    if (collisions.any && !confirmCollision) {
      // 409, not 400: the request is well formed and the caller may proceed by
      // repeating it with confirmCollision. FR-010: "MUST NOT block creation".
      return res.status(409).json({
        message: {
          ar: 'يوجد عميل مطابق. راجعه ثم أكّد الإنشاء إن كان مختلفًا.',
          en: 'A matching customer already exists. Review it, then confirm to create a separate record.'
        },
        matches: collisions.named,
        // §11: an out-of-scope collision is reported without disclosing the
        // record — a count, never an identity.
        outOfScopeMatches: collisions.unnamedCount,
        confirmWith: { confirmCollision: true }
      })
    }

    // --- Write: customer + contact points + audit, in one transaction ------
    const customerId = new mongoose.Types.ObjectId()
    const doc = {
      _id: customerId,
      type: customerType,
      displayName,
      nationalId: nationalId || null,
      accountRef: accountRef || null,
      preferredLanguage: language,
      preferredChannel: preferredChannel || null,
      organisationId: organisationId || null,
      sensitiveFlag: Boolean(sensitiveFlag),
      branchId,
      departmentId,
      status: 'active'
    }

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        // §10: "Customer created | actor, timestamp, source, initial values,
        // branch, department".
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action: 'customer.created',
          entityType: 'Customer',
          entityId: customerId,
          before: null,
          after: { ...doc, source: 'ui' },
          req,
          session
        })
        await Customer.create([doc], { session })

        for (const cp of normalised) {
          const cpId = new mongoose.Types.ObjectId()
          const cpDoc = {
            _id: cpId,
            customerId,
            channelType: cp.channelType,
            value: cp.value,
            normalisedValue: cp.normalisedValue,
            normalised: cp.normalised,
            isPrimary: cp.isPrimary,
            // The decision-16 override, recorded on the row it applies to.
            collisionConfirmedAt: collisions.any ? new Date() : null,
            collisionConfirmedBy: collisions.any ? req.user._id : null
          }
          // §10: "Contact point added / removed / made primary".
          await recordAudit({
            actorId: req.user._id,
            actorRef: req.user._id.toString(),
            action: 'contact_point.added',
            entityType: 'ContactPoint',
            entityId: cpId,
            before: null,
            after: cpDoc,
            req,
            session
          })
          await ContactPoint.create([cpDoc], { session })
        }

        // §10: "Duplicate warning overridden | actor, timestamp, the record
        // that was shown and dismissed". AS-04: "proceeding records the
        // override in field history".
        if (collisions.any) {
          await recordAudit({
            actorId: req.user._id,
            actorRef: req.user._id.toString(),
            action: 'customer.duplicate_warning_overridden',
            entityType: 'Customer',
            entityId: customerId,
            before: null,
            after: {
              shownAndDismissed: collisions.named,
              outOfScopeMatches: collisions.unnamedCount
            },
            req,
            session
          })
        }
      })
    } finally {
      await session.endSession()
    }

    const created = await Customer.findById(customerId)
    const points = await ContactPoint.find({ customerId })
    return res.status(201).json({
      customer: redact(created),
      contactPoints: points.map(p => redact(p)),
      // E-06: surfaced to the caller so an unnormalised value is visible at the
      // moment it is created, not only in a later data-quality list.
      unnormalised: points.filter(p => !p.normalised).map(p => ({ id: p._id, value: p.value }))
    })
  } catch (err) {
    return next(err)
  }
}

// ===========================================================================
// Review points 3 and 4 — search, detail, update
// ===========================================================================

// Anchored regex, escaped. FR-002 wants prefix matching, not arbitrary regex
// from a caller — an unescaped term would let `.*` scan the collection.
const prefix = (term) => new RegExp('^' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

// spec 001 — implements CM-02, FR-002, FR-023, AS-02, AS-03, E-13
//
// The ranked match list from decision 7, applied: one query per key, results
// merged in key order, so the caller sees why each row matched.
//
// SCOPE (FR-023, constitution IV): scopeFilter is merged into EVERY query, so
// an out-of-scope customer never enters a result, a count or an aggregate —
// AS-03 requires a scope-crossing search to return nothing at all.
export const searchCustomers = async (req, res, next) => {
  try {
    const term = String(req.query.q ?? '').trim()

    // E-13: "Search term is a single character or empty — No search runs; no
    // error." FR-002 sets the floor at 3 characters.
    if (term.length < 3) {
      return res.json({ customers: [], searched: false, minimumLength: 3 })
    }

    const scoped = scopeFilter(req.assignments)
    const active = { ...scoped, status: 'active' }

    const ranked = []
    const seen = new Set()
    const add = (docs, matchedOn) => {
      for (const doc of docs) {
        if (seen.has(String(doc._id))) continue
        seen.add(String(doc._id))
        ranked.push({ ...redact(doc), matchedOn })
      }
    }

    // 1. phone / whatsapp, normalised — so a local form finds an
    //    international record (AS-02). Contact points carry no scope of their
    //    own, so their owners are re-filtered through the scope predicate.
    const asPhone = normaliseContactPoint({ channelType: 'phone', value: term })
    const cpQueries = [
      asPhone.normalisedValue ? { normalisedValue: prefix(asPhone.normalisedValue) } : null,
      { normalisedValue: prefix(term) },
      { value: prefix(term) }
    ].filter(Boolean)

    for (const q of cpQueries) {
      const hits = await ContactPoint.find(q).limit(200)
      if (!hits.length) continue
      const owners = await Customer.find({ ...active, _id: { $in: hits.map(h => h.customerId) } }).limit(50)
      add(owners, 'contact_point')
    }

    // 2. national ID   3. account reference   4. display name
    add(await Customer.find({ ...active, nationalId: prefix(term) }).limit(50), 'national_id')
    add(await Customer.find({ ...active, accountRef: prefix(term) }).limit(50), 'account_ref')
    add(await Customer.find({ ...active, displayName: prefix(term) }).limit(50), 'display_name')

    return res.json({ customers: ranked.slice(0, 50), searched: true, count: ranked.length })
  } catch (err) {
    return next(err)
  }
}

// spec 001 — implements CM-03, FR-003, FR-023, AS-03
// Out-of-scope is 404, identical to non-existent (AS-03: "not-found response,
// not a forbidden response").
export const getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      ...scopeFilter(req.assignments)
    }).catch(() => null)

    if (!customer) {
      return res.status(404).json({ message: { ar: 'العميل غير موجود', en: 'Customer not found' } })
    }

    const contactPoints = await ContactPoint.find({ customerId: customer._id })
    const organisation = customer.organisationId
      ? await Customer.findOne({ _id: customer.organisationId, ...scopeFilter(req.assignments) })
      : null

    return res.json({
      customer: redact(customer),
      contactPoints: contactPoints.map(p => redact(p)),
      organisation: organisation ? redact(organisation) : null,
      // Constitution III: no duration is computed here. The engine is blocked,
      // so this is the honest answer rather than a subtraction.
      entitlement: { status: 'unavailable', reason: 'erp-entitlement-out-of-scope' }
    })
  } catch (err) {
    return next(err)
  }
}

// Fields a caller may change. `type`, `branchId`, `departmentId`, `status` and
// `mergedInto` are absent deliberately: type is immutable (§3), scope is not a
// user-editable field, and status is system-managed.
const EDITABLE = ['displayName', 'nationalId', 'accountRef', 'preferredLanguage', 'preferredChannel', 'sensitiveFlag']

// spec 001 — implements FR-020, FR-023; constitution II
//
// FR-020: "Every field mutation MUST write a history entry carrying actor,
// timestamp, field, before value and after value." ONE ENTRY PER FIELD, not one
// per request — §10 names the event "Field changed" with a `field` column, so a
// request touching three fields writes three entries.
export const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      ...scopeFilter(req.assignments)
    }).catch(() => null)

    if (!customer) {
      return res.status(404).json({ message: { ar: 'العميل غير موجود', en: 'Customer not found' } })
    }

    const changes = []
    for (const field of EDITABLE) {
      if (!(field in (req.body ?? {}))) continue
      const next_ = req.body[field]
      const prev = customer[field]
      if (String(prev ?? '') === String(next_ ?? '')) continue
      changes.push({ field, before: prev ?? null, after: next_ ?? null })
    }

    if (!changes.length) {
      return res.status(400).json({
        message: { ar: 'لا توجد تغييرات', en: 'No changes supplied' },
        editable: EDITABLE
      })
    }

    const language = changes.find(c => c.field === 'preferredLanguage')
    if (language && !LANGUAGES.includes(language.after)) {
      return bad(res, 'اللغة المفضلة غير صحيحة', `preferredLanguage must be one of: ${LANGUAGES.join(', ')}`, ['preferredLanguage'])
    }
    const channel = changes.find(c => c.field === 'preferredChannel')
    if (channel && channel.after && !CHANNEL_TYPES.includes(channel.after)) {
      return bad(res, 'قناة التواصل المفضلة غير صحيحة', `preferredChannel must be one of: ${CHANNEL_TYPES.join(', ')}`, ['preferredChannel'])
    }

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        for (const change of changes) {
          await recordAudit({
            actorId: req.user._id,
            actorRef: req.user._id.toString(),
            action: 'customer.field_changed',
            entityType: 'Customer',
            entityId: customer._id,
            before: { [change.field]: change.before },
            after: { [change.field]: change.after },
            req,
            session
          })
          customer[change.field] = change.after
        }
        await customer.save({ session })
      })
    } finally {
      await session.endSession()
    }

    return res.json({ customer: redact(customer), changed: changes.map(c => c.field) })
  } catch (err) {
    return next(err)
  }
}

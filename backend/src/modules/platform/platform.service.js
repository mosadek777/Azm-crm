// spec 012 — implements PLT-07, PLT-08, FR-004, FR-007, FR-008
// spec 010 — implements FR-004, AS-01; constitution I, IV
//
// Branches and departments: the two scope dimensions themselves. A branch is
// its own scope co-ordinate, so "in scope" here means the caller's scope
// includes that branch's id.
//
// Every read merges the scope filter, so out-of-scope records never enter a
// result, a count or an aggregate (AS-01).

import mongoose from 'mongoose'
import { Branch } from '../../DB/models/branch.model.js'
import { Department } from '../../DB/models/department.model.js'
import { recordAudit, redact } from '../../utils/audit.js'
import { selfScopedFilter } from '../../utils/scope.js'

// spec 012 FR-004 / AS-02: a single-language save is REFUSED, naming the
// missing language. Never warned, never defaulted, never an empty string.
const validateLocalized = (value, field) => {
  if (!value || typeof value !== 'object') {
    return { field, missing: ['ar', 'en'] }
  }
  const missing = ['ar', 'en'].filter(lang => !value[lang] || !String(value[lang]).trim())
  return missing.length ? { field, missing } : null
}

const refuseSingleLanguage = (res, problem) => {
  const names = { ar: 'العربية', en: 'English' }
  return res.status(400).json({
    message: {
      ar: `يجب إدخال قيمة "${problem.field}" باللغتين. الناقص: ${problem.missing.map(l => names[l]).join('، ')}`,
      en: `"${problem.field}" requires a value in both languages. Missing: ${problem.missing.map(l => names[l]).join(', ')}`
    },
    field: problem.field,
    missingLanguages: problem.missing
  })
}

export const listBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find(selfScopedFilter(req.assignments, 'branch'))
    return res.json({ branches: branches.map(b => redact(b)) })
  } catch (err) {
    return next(err)
  }
}

export const listDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find(selfScopedFilter(req.assignments, 'department'))
    return res.json({ departments: departments.map(d => redact(d)) })
  } catch (err) {
    return next(err)
  }
}

// Reached only after authorizeOnTarget has confirmed scope. An out-of-scope id
// answered 404 there and never arrives here (AS-01).
export const getBranch = async (req, res) => {
  return res.json({ branch: redact(req.target) })
}

export const createBranch = async (req, res, next) => {
  try {
    const { name, timezone, defaultLocale } = req.body ?? {}

    const problem = validateLocalized(name, 'name')
    if (problem) return refuseSingleLanguage(res, problem)

    if (!timezone || !['ar', 'en'].includes(defaultLocale)) {
      return res.status(400).json({
        message: {
          ar: 'المنطقة الزمنية واللغة الافتراضية مطلوبتان',
          en: 'timezone and defaultLocale are both required'
        }
      })
    }

    const branchId = new mongoose.Types.ObjectId()
    const doc = { _id: branchId, name, timezone, defaultLocale }

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        // §10: "Branch created | actor, timestamp, before, after, timezone and
        // calendar changes". Audit-first, inside the transaction — see
        // src/utils/audit.js.
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action: 'branch.created',
          entityType: 'Branch',
          entityId: branchId,
          after: doc,
          req,
          session
        })

        await Branch.create([doc], { session })
      })
    } finally {
      await session.endSession()
    }

    return res.status(201).json({ branch: redact(await Branch.findById(branchId)) })
  } catch (err) {
    return next(err)
  }
}

export const createDepartment = async (req, res, next) => {
  try {
    const { name } = req.body ?? {}

    const problem = validateLocalized(name, 'name')
    if (problem) return refuseSingleLanguage(res, problem)

    const departmentId = new mongoose.Types.ObjectId()
    const doc = { _id: departmentId, name }

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        await recordAudit({
          actorId: req.user._id,
          actorRef: req.user._id.toString(),
          action: 'department.created',
          entityType: 'Department',
          entityId: departmentId,
          after: doc,
          req,
          session
        })

        await Department.create([doc], { session })
      })
    } finally {
      await session.endSession()
    }

    return res.status(201).json({ department: redact(await Department.findById(departmentId)) })
  } catch (err) {
    return next(err)
  }
}

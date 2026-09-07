// spec 010 — implements SEC-04, SEC-05, FR-004, FR-005, FR-021, AS-01, AS-03,
//            AS-04; constitution IV
//
// THE ONE PLACE SCOPE IS DECIDED. Every read and every write goes through a
// function in this file. Constitution IV: "Department, branch, team and role
// scoping is applied in the data layer on every read and write."
//
// TWO OF THREE DIMENSIONS. FR-004 names branch, department AND team. Branch and
// department are implemented. Team is not — no spec in this repository defines
// a Team entity (see department.model.js). Reported, not invented. When Team is
// defined, it is added here and nowhere else.
//
// THE RULE THAT IS EASY TO GET WRONG (FR-005, AS-03).
//
// Effective permission is NOT the union of a user's roles. A user who is an
// agent in branch B and a team lead in branch C holds LEAD on branch C records
// and AGT on branch B records — and never LEAD on a branch B record. So the
// question is never "does this user hold LEAD?" but "does this user hold LEAD
// in an assignment that covers THIS record?"
//
// That is why rolesForTarget() takes the target. A helper that answered
// "what roles does this user have?" without one would be the union, which is a
// privilege-escalation bug wearing a convenience's clothes.

// Unrestricted scope is a property of an ASSIGNMENT, never of a person, and it
// is a flag rather than an absence — "empty set means everything" is the classic
// scoping bug, where a truncated list silently becomes global access.
//
// In practice only the break-glass root (spec 010 E-07) carries it: it is the
// bootstrap identity and has no enclosing scope to inherit. Note that
// `user.breakGlass` is deliberately NOT consulted here — that flag drives audit
// severity, and scope must have exactly one source of truth.
export const isUnrestricted = (assignments) => assignments.some(a => a.unrestricted)

const idsInclude = (ids, target) =>
  Array.isArray(ids) && ids.some(id => String(id) === String(target))

// Does ONE assignment cover ONE target record?
//
// Every dimension the target HAS must match. A record carrying both branch and
// department (a ticket, a customer) needs both: an assignment covering branch B
// but not department D does not cover a record in B/D.
//
// A record that IS a scope co-ordinate carries one dimension only — a Branch
// has a branch identity and no department — and is matched on that one. Each
// model states its own co-ordinate via scopeCoordinate(); nothing here guesses
// from the shape of the document.
//
// A target with NO co-ordinate at all is never covered. Failing closed matters:
// the alternative is that a model which forgets its co-ordinate silently
// becomes readable by everyone.
export const assignmentCovers = (assignment, target) => {
  const matches = []
  if (target?.branchId) matches.push(idsInclude(assignment.branchIds, target.branchId))
  if (target?.departmentId) matches.push(idsInclude(assignment.departmentIds, target.departmentId))
  if (!matches.length) return false
  return matches.every(Boolean)
}

// The roles this user holds ON THIS RECORD. Empty array means no access at all.
export const rolesForTarget = (assignments, target) => {
  if (isUnrestricted(assignments)) return assignments.map(a => a.role)
  return assignments.filter(a => assignmentCovers(a, target)).map(a => a.role)
}

// The union of a user's scope across all assignments, for building list
// filters. Safe to union HERE because it answers "which records may they see at
// all", not "what may they do to this one" — the second question is
// rolesForTarget's, evaluated per record.
export const reachableScope = (assignments) => {
  if (isUnrestricted(assignments)) return { unrestricted: true }
  const branchIds = [...new Set(assignments.flatMap(a => a.branchIds.map(String)))]
  const departmentIds = [...new Set(assignments.flatMap(a => a.departmentIds.map(String)))]
  return { unrestricted: false, branchIds, departmentIds }
}

// The mongo filter for a scoped LIST read. Merged into every find() on a
// scoped collection, so out-of-scope records never enter a result, a count or
// an aggregate (AS-01).
export const scopeFilter = (assignments, fields = { branch: 'branchId', department: 'departmentId' }) => {
  const scope = reachableScope(assignments)
  if (scope.unrestricted) return {}
  return {
    [fields.branch]: { $in: scope.branchIds },
    [fields.department]: { $in: scope.departmentIds }
  }
}

// A Branch or Department record IS its own scope co-ordinate: a branch is in
// scope when the caller's scope includes that branch id.
export const selfScopedFilter = (assignments, dimension) => {
  const scope = reachableScope(assignments)
  if (scope.unrestricted) return {}
  return { _id: { $in: dimension === 'branch' ? scope.branchIds : scope.departmentIds } }
}

// FR-021 / AS-04: a granting administrator may not grant scope exceeding their
// own, and an EMPTY requested set resolves to the granter's own scope — never
// to "all".
//
// The empty case is resolved to a concrete list and STORED concrete. Storing
// an empty array and interpreting it later would mean the same record widening
// silently the moment the granter's own scope widened.
export const resolveGrantedScope = ({ granterAssignments, requested }) => {
  const granterScope = reachableScope(granterAssignments)

  const requestedBranches = (requested?.branchIds ?? []).map(String)
  const requestedDepartments = (requested?.departmentIds ?? []).map(String)

  if (granterScope.unrestricted) {
    // The break-glass root. An empty request cannot resolve to "the granter's
    // scope" because that is everything, so it must be stated explicitly
    // rather than defaulted to global.
    if (!requestedBranches.length || !requestedDepartments.length) {
      return {
        ok: false,
        reason: 'explicit_scope_required',
        detail: 'An unrestricted granter must name the branches and departments explicitly.'
      }
    }
    return { ok: true, branchIds: requestedBranches, departmentIds: requestedDepartments }
  }

  const branchIds = requestedBranches.length ? requestedBranches : granterScope.branchIds
  const departmentIds = requestedDepartments.length ? requestedDepartments : granterScope.departmentIds

  const excessBranches = branchIds.filter(id => !granterScope.branchIds.includes(id))
  const excessDepartments = departmentIds.filter(id => !granterScope.departmentIds.includes(id))

  if (excessBranches.length || excessDepartments.length) {
    return { ok: false, reason: 'exceeds_granter_scope', excessBranches, excessDepartments }
  }

  return { ok: true, branchIds, departmentIds }
}

// spec 010 — implements SEC-08, FR-008, E-11, NFR-005; constitution II
//
// The single audit writer. Every mutation in this codebase goes through it, so
// there is one format and one failure behaviour.
//
// E-11 — "if the system cannot write an audit entry, the underlying action is
// refused" — IS NOW ATOMIC. Converted 2026-09-07, once the single-node replica
// set made transactions available. See docs/decisions-pending.md §3 and §10.
//
// HOW IT WORKS. A caller that mutates anything opens a session, starts a
// transaction on it, and passes that session to BOTH this writer and its own
// writes. The server then treats them as one unit: they commit together or
// neither commits. There is no window in which one exists without the other.
//
// A session must be PASSED, not looked up. The server decides transaction
// membership from the session id attached to each operation, so an untagged
// write is simply not in the transaction — it commits on its own and no
// rollback reaches it. And because one Node process serves many overlapping
// requests, a module-level "current session" would let one request's writes
// land inside another's transaction. Explicit beats implicit here.
//
// AUDIT-FIRST ORDERING IS KEPT, inside the transaction. Atomicity makes the
// ordering unnecessary — either both land or neither does, whichever order they
// were issued in — but it costs nothing and it keeps one behaviour unchanged
// while the other changes. If the audit write throws, the transaction aborts
// and the mutation is abandoned, which is E-11 stated exactly.
//
// WHEN NO SESSION IS NEEDED. Some audit entries have no accompanying mutation
// at all: a failed sign-in, a permission refusal, an out-of-scope attempt. They
// are a single document write, which MongoDB is atomic about on its own, so
// wrapping them in a transaction would be ceremony rather than safety. Those
// callers pass `session: null` — EXPLICITLY. The parameter is required precisely
// so that "this entry stands alone" is a statement a reader can see, rather than
// an absence they have to interpret.
//
// PRE-GENERATED IDs: the entry names the record before the record exists, so
// callers generate the _id themselves with `new mongoose.Types.ObjectId()`
// rather than letting the insert assign one.

import { AuditEntry } from '../DB/models/audit-entry.model.js'

// Pulls the request-derived fields §3 requires for user-initiated actions.
const fromRequest = (req) => {
  if (!req) return { ip: null, userAgent: null }
  return {
    ip: req.ip ?? req.socket?.remoteAddress ?? null,
    userAgent: req.get?.('user-agent') ?? null
  }
}

export const recordAudit = async ({
  actorId = null,
  actorRef,
  action,
  entityType = null,
  entityId = null,
  before = null,
  after = null,
  severity = 'normal',
  req = null,
  // REQUIRED, with no default. Pass the caller's transaction session when
  // there is a mutation to be atomic with, or `session: null` when the entry
  // stands alone. There is deliberately no default: a missing session used to
  // mean a silent non-transactional write, which is how an orphaned entry gets
  // shipped. Omission is now a loud error — "I forgot" becomes "I declared".
  session
}) => {
  if (session === undefined) {
    throw new Error(
      'recordAudit: session is required. Pass the transaction session when a ' +
      'mutation accompanies this entry, or `session: null` when it stands alone. ' +
      'See src/utils/audit.js.'
    )
  }

  const { ip, userAgent } = fromRequest(req)

  // No try/catch. A failure must propagate so the caller's transaction aborts
  // and its mutation is abandoned — that IS E-11. Swallowing it here would
  // silently reintroduce exactly the under-recording this exists to prevent.
  //
  // The array form is required by mongoose whenever options are passed, so it
  // is used unconditionally rather than branching on `session`.
  const [entry] = await AuditEntry.create(
    [{
      actorId,
      actorRef,
      action,
      entityType,
      entityId,
      before,
      after,
      severity,
      ip,
      userAgent,
      // scopeContext is populated from the caller's scope in a later step.
      scopeContext: {}
    }],
    session ? { session } : {}
  )

  return entry
}

// Never log a password hash, a token or a secret into an audit entry. `before`
// and `after` are stored verbatim and are readable by every auditor.
export const redact = (doc, fields = ['passwordHash']) => {
  if (!doc) return doc
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc }
  for (const f of fields) delete plain[f]
  delete plain.__v
  return plain
}

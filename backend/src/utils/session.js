// spec 010 — implements the session controls of FR-007, and FR-001's
// "deactivation MUST terminate sessions"
//
// The single place sessions are opened, checked and revoked, for the same
// reason utils/audit.js is the single audit writer: one implementation cannot
// drift from itself, and a second copy for the portal would.
//
// CONSTITUTION II APPLIES HERE NOW. Opening a session is a database write, so
// the audit entry for a sign-in has to commit in the same transaction as the
// session record. Before this existed, auth.service.js wrote its sign-in entry
// with `session: null` and explained that "issuing a JWT is a signature, not a
// database write". That was true and has stopped being true.

import mongoose from 'mongoose'
import { Session } from '../DB/models/session.model.js'
import { SECURITY_POLICY as P } from '../config/security-policy.js'
import { recordAudit } from './audit.js'

const minutes = n => n * 60 * 1000
const hours = n => n * 60 * 60 * 1000

// Opens a session, evicting the oldest if the identity is already at the limit.
// MUST be called inside a transaction, and the caller passes it — same contract
// as recordAudit, and for the same reason: an untagged write is simply not in
// the transaction and no rollback reaches it.
export const openSession = async ({ subjectId, audience, actorRef, req, session }) => {
  if (!session) throw new Error('openSession requires a transaction session')

  const now = new Date()
  const sessionId = new mongoose.Types.ObjectId()

  // Evict oldest-first down to limit-1, leaving room for the one being opened.
  const limit = P.maxConcurrentSessions.value
  if (limit > 0) {
    const live = await Session.find({ subjectId, audience, revokedAt: null })
      .sort({ issuedAt: 1 }).session(session)
    const excess = live.length - (limit - 1)
    for (let i = 0; i < excess; i++) {
      const victim = live[i]
      await recordAudit({
        actorId: subjectId,
        actorRef,
        action: 'session.revoked',
        entityType: 'Session',
        entityId: victim._id,
        before: { revokedAt: null },
        after: { revokedAt: now, revokedReason: 'concurrent_limit', limit },
        severity: 'normal',
        req,
        session
      })
      await Session.updateOne(
        { _id: victim._id },
        { $set: { revokedAt: now, revokedReason: 'concurrent_limit' } },
        { session }
      )
    }
  }

  await recordAudit({
    actorId: subjectId,
    actorRef,
    action: 'session.opened',
    entityType: 'Session',
    entityId: sessionId,
    before: null,
    after: { audience, absoluteExpiresAt: new Date(now.getTime() + hours(P.absoluteLifetimeHours.value)) },
    severity: 'normal',
    req,
    session
  })

  await Session.create([{
    _id: sessionId,
    subjectId,
    audience,
    issuedAt: now,
    lastSeenAt: now,
    absoluteExpiresAt: new Date(now.getTime() + hours(P.absoluteLifetimeHours.value)),
    ip: req?.ip ?? null,
    userAgent: req?.get?.('user-agent') ?? null
  }], { session })

  return sessionId
}

// Called on every authenticated request. Returns why a session is not usable
// rather than a bare boolean, so the caller can distinguish the cases in an
// audit entry — but note that the REFUSAL SENT TO THE CLIENT is identical in
// every case, exactly as a failed sign-in is (spec 010 §8): telling a caller
// "your session went idle" versus "your session was revoked" discloses whether
// somebody else ended it.
export const touchSession = async (sessionId, subjectId, audience) => {
  if (!sessionId) return { ok: false, reason: 'no_session_id' }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) return { ok: false, reason: 'malformed' }

  const s = await Session.findById(sessionId)
  if (!s) return { ok: false, reason: 'not_found' }
  if (String(s.subjectId) !== String(subjectId)) return { ok: false, reason: 'subject_mismatch' }
  if (s.audience !== audience) return { ok: false, reason: 'audience_mismatch' }
  if (s.revokedAt) return { ok: false, reason: 'revoked' }

  const now = new Date()
  if (s.absoluteExpiresAt <= now) return { ok: false, reason: 'absolute_expiry' }

  const idleMs = minutes(P.idleTimeoutMinutes.value)
  if (idleMs > 0 && now - s.lastSeenAt > idleMs) return { ok: false, reason: 'idle_expiry' }

  // Not audited. A read is not a mutation, and one audit entry per request
  // would bury the trail this project depends on under its own traffic.
  await Session.updateOne({ _id: s._id }, { $set: { lastSeenAt: now } })
  return { ok: true, session: s }
}

// Ends every live session for an identity. The caller supplies the transaction.
// This is what makes "deactivation MUST terminate sessions" (FR-001) and
// "the credential changed" real rather than a wait for token expiry.
export const revokeAllSessions = async ({ subjectId, audience, reason, actorRef, req = null, session }) => {
  if (!session) throw new Error('revokeAllSessions requires a transaction session')
  const now = new Date()
  const live = await Session.find({ subjectId, audience, revokedAt: null }).session(session)

  for (const s of live) {
    await recordAudit({
      actorId: subjectId,
      actorRef,
      action: 'session.revoked',
      entityType: 'Session',
      entityId: s._id,
      before: { revokedAt: null },
      after: { revokedAt: now, revokedReason: reason },
      severity: 'normal',
      req,
      session
    })
  }
  if (live.length) {
    await Session.updateMany(
      { _id: { $in: live.map(s => s._id) } },
      { $set: { revokedAt: now, revokedReason: reason } },
      { session }
    )
  }
  return live.length
}

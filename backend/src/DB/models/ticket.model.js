// spec 002 — implements TM-01, TM-02, TM-07, TM-20; the §3 Ticket entity
//
// TWO DELIBERATE DEVIATIONS, recorded in docs/decisions-pending.md §0:
//
//   DECISION 20 — `owningTeamId` IS ABSENT. §3 marks `owning_team_id`
//   **Required**. Team was scoped out and tickets assign directly to an agent.
//   The Team defect (§7) is NOT resolved — it is stepped around. Restoring it
//   means adding the entity, a `teamIds` set on RoleAssignment, the third
//   dimension in scope.js, and a backfill of every ticket.
//
//   DECISION 21 — `category` IS A FLAT STRING. This deviates from FR-004
//   (**MUST**): "Categories MUST form a tree; a ticket MUST reference a leaf
//   node". FR-005's inheritance and E-07's tree-as-at-creation rule go with it.
//
// WHAT WAS NOT COMPROMISED: `branchId` and `departmentId` are required and are
// the scope predicate (FR-033, constitution IV), and every mutation writes an
// audit entry (FR-013, constitution II).
//
// FR-034: this model computes no duration and holds no elapsed field. Every
// such value is read from src/utils/elapsed-time.js (constitution III).

import { Schema, model } from 'mongoose'
import { STATUS_KEYS, PRIORITIES, PRIORITY_SOURCES } from '../../utils/ticket-status.js'

const ticketSchema = new Schema({
  // §3: required, unique, immutable, never reused. Format TKT-YYYY-NNNNN with a
  // 5-digit annual sequence (decision 11). Generated from the Counter model
  // inside the creating transaction, so AS-02's 1,000 concurrent creations
  // cannot collide.
  reference: { type: String, required: true, unique: true, immutable: true },

  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, immutable: true },

  // WHERE THE TICKET CAME FROM. Decision 37.
  //
  // The value set is NOT invented here — `002` §10 already enumerates it, for
  // the audit entry: "Ticket created | actor, timestamp, source (`ui` / `email`
  // / `whatsapp` / `sms` / `chat` / `form` / `api` / `portal`), …". What no spec
  // provided was a place to STORE it: `002` §3's Ticket entity has no such
  // attribute, while `008 AS-04` requires that a portal submission produce "a
  // ticket … with source `portal`". Two specs, one gap between them.
  //
  // Immutable, because where a request arrived from is a fact about its past.
  // Defaulted to `ui` so tickets created before this field existed read as what
  // they were — every one of them came through the staff API, and each carries
  // an audit entry that already recorded `source: 'ui'` at creation.
  source: {
    type: String,
    enum: ['ui', 'email', 'whatsapp', 'sms', 'chat', 'form', 'api', 'portal'],
    default: 'ui',
    required: true,
    immutable: true
  },

  // Decision 21 — flat. Free string, trimmed.
  category: { type: String, required: true, trim: true, maxlength: 120 },

  priority: { type: String, enum: PRIORITIES, required: true },
  // §3 and AS-05: the provenance is stored and displayed, never inferred.
  prioritySource: { type: String, enum: PRIORITY_SOURCES, default: 'manual', required: true },

  status: { type: String, enum: STATUS_KEYS, default: 'new', required: true },

  // Decision 20: no owning team. Empty means queued (§3).
  assignedAgentId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

  // §3: "Required; the scope predicate (constitution IV)".
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },

  subject: { type: String, required: true, trim: true, minlength: 3, maxlength: 300 },

  // §8: free text, either language or mixed. NOT a localised subdocument —
  // user-authored content is single-language with direction detected per item.
  tags: { type: [String], default: [] },

  // §3: "Only valid while status has `pauses_sla`" — enforced in the service,
  // since it depends on the status set rather than on this document alone.
  followUpAt: { type: Date, default: null },

  // Present so merge and split have somewhere to land later; neither is built
  // today (both scoped out).
  mergedInto: { type: Schema.Types.ObjectId, ref: 'Ticket', default: null },
  parentTicketId: { type: Schema.Types.ObjectId, ref: 'Ticket', default: null }
}, { timestamps: true })

// Scope first in every compound index — every list query is scope-filtered, so
// the predicate is the most selective prefix.
ticketSchema.index({ branchId: 1, departmentId: 1, status: 1, createdAt: -1 })
ticketSchema.index({ branchId: 1, departmentId: 1, assignedAgentId: 1, status: 1 })
ticketSchema.index({ customerId: 1, createdAt: -1 })
ticketSchema.index({ subject: 1 })
ticketSchema.index({ tags: 1 })

// Declared, never inferred — src/utils/scope.js matches only the dimensions a
// target declares.
ticketSchema.methods.scopeCoordinate = function () {
  return { branchId: this.branchId, departmentId: this.departmentId }
}

export const Ticket = model('Ticket', ticketSchema)

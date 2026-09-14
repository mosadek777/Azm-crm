// spec 004 §3 — a Task. FR-004, E-09, AS-05; §9, §10.
//
// §2: "A personal to-do with a due date, always attached to a ticket. NOT a
// sub-task (spec 002), which is team work." That distinction is the whole
// design: a task belongs to a PERSON, a sub-task belongs to a ticket's team.
//
// §3 gives the shape, and every rule below is from it:
//
//   ticket_id      Required — "a task never floats free"
//   owner_id       Required
//   due_at         Required
//   remind_before  Optional; "defaults per user preference"
//   state          open | done | cancelled
//   body           Required
//
// ── THE BODY IS USER-AUTHORED, SINGLE LANGUAGE ──────────────────────────────
//
// §8: "Task bodies | Free | Free | Direction detected per task." So NOT the
// localizedText subdocument — a task is a note somebody wrote to themselves,
// like a ticket subject or a message body, and constitution I's both-languages
// rule is about ADMIN-AUTHORED LABELS. Forcing a translation here would be
// asking an agent to write their own to-do twice.
//
// ── remind_before HAS NOWHERE TO GET ITS DEFAULT ────────────────────────────
//
// §3 says it "defaults per user preference", and there is no user preference:
// 010 §3's User carries skills, languages, capacity and mfa_enrolled, and no
// notification settings at all. So the default comes from config instead —
// visible, cited, overridable — and the gap is carded rather than papered over.
//
// ── E-09 IS ENFORCED BY ABSENCE ─────────────────────────────────────────────
//
// "Task due date is in the past → ACCEPTED and immediately overdue; not
// refused." There is deliberately NO validator rejecting a past date. Somebody
// recording a follow-up they already owe is the normal case, not an error.

import { Schema, model } from 'mongoose'

export const TASK_STATES = ['open', 'done', 'cancelled']

const taskSchema = new Schema({
  // "A task never floats free."
  ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },

  // WHOSE task. §9 lets a lead create one for somebody else, so this is not
  // always the creator — which is why both are stored.
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },

  // No `min`, no past-date check: E-09 requires a past date to be ACCEPTED.
  dueAt: { type: Date, required: true },

  // Minutes before dueAt at which a reminder becomes due. §3's "duration",
  // stored as a number because a duration with no unit is the kind of field
  // somebody later reads as seconds.
  remindBeforeMinutes: { type: Number, default: null, min: 0 },

  state: { type: String, enum: TASK_STATES, default: 'open', required: true },

  // User-authored, single language, direction detected by the browser (§8).
  body: { type: String, required: true, trim: true, maxlength: 2000 },

  // When it left `open`, so "completed today" is answerable from the record
  // rather than from the audit log. Null while open.
  closedAt: { type: Date, default: null }
}, { timestamps: true })

// The workspace asks "my open tasks, soonest first" on every load, and the
// reminder evaluation asks the same question with a time bound.
taskSchema.index({ ownerId: 1, state: 1, dueAt: 1 })

export const Task = model('Task', taskSchema)

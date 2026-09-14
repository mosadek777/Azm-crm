// spec 004 — the §3 Notification entity; FR-013, AD-13.
//
// §3 gives the shape: user_id, kind, ticket_id, channels_sent, read_at.
// Implemented as written, with two notes.
//
// ── `channelsSent` IS ALWAYS `['in_app']` TODAY, AND IT IS STILL AN ARRAY ───
//
// FR-013 names in-app, email and push. Email and push need spec 003, which does
// not exist. Storing a single string would be the cheaper shape and it would
// have to be migrated the day a second channel arrives; keeping the set means
// the record already answers "where did this go" correctly. What it must never
// do is claim a channel that was not attempted — see notification.service.js.
//
// ── NO SCOPE CO-ORDINATE, DELIBERATELY ─────────────────────────────────────
//
// §11: "list / mark notifications | Notification centre | `user = caller`
// only." A notification is not scoped by branch and department — it is scoped
// to ONE PERSON, which is narrower. `scopeCoordinate()` returns an empty object
// so `assignmentCovers` fails closed: nothing can authorise a notification by
// its branch, and the service filters on `userId` and nothing else.
//
// The ticket it points at is a different question, and the answer is that a
// notification can only ever have been created for somebody who held scope on
// that ticket at the time (decision 39 for mentions; assignment and reply
// notifications go to the assignee, who is checked to be scoped). If their
// scope is later withdrawn the ticket link 404s through the normal predicate —
// which is the correct outcome, and the reason the notification stores the
// reference rather than a copy of the subject.

import { Schema, model } from 'mongoose'

export const NOTIFICATION_KINDS = [
  'assigned',
  'mentioned',
  'customer_replied',
  'escalated',
  'task_due',
  'sla_threshold',
  'delivery_failed',
  'chat_offered'
]

/** The channels that exist. `email` and `push` are spec 003 and unreachable. */
export const CHANNELS = ['in_app', 'email', 'push']

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
  kind: { type: String, enum: NOTIFICATION_KINDS, required: true, immutable: true },
  // §3: "Required except for system notices". Nothing generates a system notice
  // today, so every row carries one — but the field stays nullable rather than
  // required, because making it required would have to be undone.
  ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', default: null, immutable: true },

  // Who caused it, for rendering "Sara mentioned you". Resolved through
  // utils/actor.js at read time, never denormalised — an actor's name changes
  // and a copy would go stale, and the audit trail outlives the account.
  actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, immutable: true },

  channelsSent: { type: [String], enum: CHANNELS, default: () => ['in_app'], immutable: true },

  // Null until read. NOT a boolean: FR-013's grouping and any future "since you
  // were last here" both want the instant, and a boolean cannot be widened.
  readAt: { type: Date, default: null }
}, { timestamps: true })

// The notification centre reads one person's rows newest first, and the unread
// count reads the same index.
notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, readAt: 1 })

// Empty on purpose — see the header. Fails closed in assignmentCovers.
notificationSchema.methods.scopeCoordinate = function () { return {} }

export const Notification = model('Notification', notificationSchema)

import { LocalizedText } from './user.model';
// spec 001 + 002 — client-side shapes for what the API actually returns.
// Deviations carried through from the backend: no owningTeamId (decision 20),
// category is a flat string (decision 21).

export type TicketStatus =
  | 'new' | 'assigned' | 'in_progress'
  | 'pending_customer' | 'pending_supplier' | 'pending_internal'
  | 'resolved' | 'closed' | 'merged' | 'cancelled';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type Visibility = 'customer' | 'internal';

// FR-034 / constitution III: the client never computes a duration either. It
// renders whichever branch the engine returns, and 'unavailable' is a normal
// answer, not an error state.
export interface Sla {
  status: 'ok' | 'unavailable';
  minutes?: number;
  reason?: string;
}

export interface Customer {
  _id: string;
  type: 'person' | 'organisation';
  displayName: string;          // user-authored, single language
  nationalId: string | null;
  accountRef: string | null;
  preferredLanguage: 'ar' | 'en';
  preferredChannel: string | null;
  organisationId: string | null;
  sensitiveFlag: boolean;
  branchId: string;
  departmentId: string;
  status: 'active' | 'merged' | 'erased';
  matchedOn?: string;
}

export interface ContactPoint {
  _id: string;
  channelType: 'phone' | 'email' | 'whatsapp';
  value: string;
  normalisedValue: string | null;
  normalised: boolean;
  isPrimary: boolean;
  collisionConfirmedAt: string | null;
}

export interface Ticket {
  _id: string;
  reference: string;
  customerId: string;
  category: string;
  priority: Priority;
  prioritySource: string;
  status: TicketStatus;
  assignedAgentId: string | null;
  subject: string;
  tags: string[];
  followUpAt: string | null;
  createdAt: string;
  customerName?: string | null;
  assignedAgentName?: string | null;
  pausesSla?: boolean | null;
  terminal?: boolean;
  sla?: Sla;
}

export interface TicketMessage {
  _id: string;
  visibility: Visibility;
  authorKind: 'user' | 'customer' | 'system';
  body: string;
  sentAt: string;
}

// The audit trail outlives the records it points at, so an actor is described
// rather than merely named. `kind` always has a value; `displayName` may not —
// a system action has no person behind it, and an erased customer has no name
// left. The screen renders a label for those cases; it never prints the id.
// See backend/src/utils/actor.js for how each kind is recognised.
export interface HistoryActor {
  kind: 'user' | 'customer' | 'system' | 'unknown';
  displayName: string | null;
  state: 'active' | 'deactivated' | null;
}

export interface HistoryEntry {
  action: string;
  /** Exactly as the entry holds it. An auditor traces by this, not by the name. */
  actorRef: string;
  actor: HistoryActor;
  occurredAt: string;
  before: unknown;
  after: unknown;
}

export interface TicketMeta {
  statuses: { key: TicketStatus; pausesSla: boolean | null; terminal: boolean }[];
  priorities: Priority[];
  transitions: Record<TicketStatus, TicketStatus[]>;
}

// spec 012 FR-007, FR-008. Branch and Department names are ADMINISTRATOR-authored
// labels, so they carry both languages and the API refuses a save with only one.
// `active` is the only disposal: neither can be deleted, here or in the API.
export interface Branch {
  _id: string;
  name: LocalizedText;
  timezone: string;
  defaultLocale: 'ar' | 'en';
  active: boolean;
}

export interface Department {
  _id: string;
  name: LocalizedText;
  active: boolean;
}

// spec 004 §3 — a quick reply. FR-006: both bodies, always.
export interface QuickReply {
  _id: string;
  name: LocalizedText;
  body: LocalizedText;
  scope: 'personal' | 'global';
  ownerId: string | null;
  active: boolean;
}

// Decision 41. The vocabulary is SERVED, never copied into the client: two
// lists drift, and the drift surfaces as a refusal nobody can explain.
export interface Placeholder {
  token: string;
  label: LocalizedText;
}

/** FR-006's refusal, which names WHICH token failed and why. */
export interface PlaceholderFailure {
  token: string;
  reason: 'unknown_placeholder' | 'no_value';
}

// spec 004 §3 — a Task. A personal to-do with a due date, always attached to a
// ticket. The body is user-authored and single-language (§8): direction is
// detected per task, never forced.
export interface Task {
  _id: string;
  ticketId: string;
  ownerId: string;
  ownerName?: string | null;
  dueAt: string;
  remindBeforeMinutes: number | null;
  state: 'open' | 'done' | 'cancelled';
  body: string;
  closedAt: string | null;
  /** Only on the reminder list: past dueAt, per AS-05's strict boundary. */
  overdue?: boolean;
  ticketReference?: string | null;
  ticketSubject?: string | null;
}

// --- the team queue (spec 004 FR-016, AD-16) --------------------------------

/**
 * FR-016's four views. `at_risk` is offered and cannot be answered: "at risk"
 * is a statement about remaining time against an SLA target, and the clock is
 * blocked on 005 [CLARIFY-2]. The server returns `unavailable` with its reason
 * rather than an empty list, because an empty list would read as a claim that
 * nothing is at risk.
 */
export type TeamQueueView = 'unassigned' | 'oldest' | 'at_risk' | 'agent';

/** One colleague's open workload. Agents carrying ZERO are included — they are
 *  the answer to "who can take this", and a group-by over tickets alone cannot
 *  produce them. */
export interface AgentLoad {
  userId: string;
  displayName: string;
  role: string | null;
  open: number;
}

// --- notifications (spec 004 FR-013, AD-13) ---------------------------------

/**
 * One GROUP of notifications, as FR-013 requires: "notifications for one ticket
 * within a configured window MUST be grouped, except escalations, which MUST
 * NOT be grouped or suppressed."
 *
 * Grouped on the way out, not suppressed on the way in — every event is still
 * recorded and audited, and `count` says how many are in here.
 */
export interface NotificationGroup {
  key: string;
  kind: 'assigned' | 'mentioned' | 'customer_replied' | 'escalated'
      | 'task_due' | 'sla_threshold' | 'delivery_failed' | 'chat_offered';
  ticketId: string | null;
  /** Every member's id. Marking the group read marks all of them. */
  ids: string[];
  count: number;
  newestAt: string;
  oldestAt: string;
  unread: boolean;
  /** Resolved through the one actor resolver — may be a deactivated user, or
   *  a customer, or absent. Never a raw database id. */
  actor: { kind: string; displayName: string; state?: string } | null;
  /** Null when the ticket is no longer in the caller's scope. The
   *  notification stays; the record is not disclosed. */
  ticketReference: string | null;
  ticketSubject: string | null;
  reachable: boolean;
}

// --- administrator configuration (spec 010 FR-011, spec 002 §8) -------------

/**
 * One configurable label for a ratified status or priority key.
 *
 * THE KEY IS NOT EDITABLE and `editable.key` says so. A key is written onto
 * every ticket and into every audit entry; renaming one orphans history, and
 * adding one needs either a transition graph (statuses) or a queue rank
 * (priorities) that no spec supplies.
 */
export interface TicketLabel {
  _id: string;
  kind: 'status' | 'priority';
  key: string;
  /** Both languages, always. Constitution I; the server refuses a partial save. */
  label: { ar: string; en: string };
  /** Status only. Editable, and NOT retroactive — spec 005's pause ledger is
   *  append-only, so time already accounted keeps its old accounting. */
  pausesSla: boolean | null;
  /** Status only, and structural: a terminal status accepts no reply and no
   *  assignment (002 §3), so this is shown and never edited. */
  terminal: boolean;
  order: number;
  editable: { label: boolean; pausesSla: boolean; terminal: boolean; key: boolean };
}

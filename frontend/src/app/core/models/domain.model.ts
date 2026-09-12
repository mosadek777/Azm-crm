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

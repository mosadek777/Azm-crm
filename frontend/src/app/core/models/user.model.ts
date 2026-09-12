// spec 010 — implements the §3 User entity, client side
//
// `LocalizedText` mirrors the backend's localized-text subdocument. The API
// returns refusal messages in both languages (spec 010 §8, spec 012 §8) — field
// names stay English, the human-readable text is bilingual.

export type Language = 'ar' | 'en';
export type UserState = 'active' | 'deactivated';

// The provisional answer to spec 010 [CLARIFY-3], unratified.
// See docs/decisions-pending.md §1.
export type Role = 'AGT' | 'LEAD' | 'MGR' | 'ADM' | 'AUD';

export interface LocalizedText {
  ar: string;
  en: string;
}

export interface AuthenticatedUser {
  id: string;
  displayName: string;
  email: string;
  defaultLanguage: Language;
}

export interface LoginResponse {
  token: string;
  user: AuthenticatedUser;
}

export interface ApiRefusal {
  message: LocalizedText;
  fields?: string[];
}

// spec 010 §3 — a staff user as the administration list returns them.
//
// `roles` is the role CODES only. The list deliberately carries no branchIds or
// departmentIds: a user is admitted to the list on a scope OVERLAP, so their
// full scope could name branches the caller may not see. See listUsers in
// backend/src/modules/user/user.service.js.
export interface StaffUser {
  _id: string;
  displayName: string;
  email: string;
  defaultLanguage: Language;
  state: UserState;
  roles: Role[];
}

// FR-021 / AS-04: an omitted scope resolves to the GRANTER'S scope, never to
// all — so the form always sends a concrete pair of lists rather than relying
// on that default, and the server bounds them either way.
export interface CreateUserRequest {
  displayName: string;
  email: string;
  password: string;
  defaultLanguage: Language;
  roles: Role[];
  scope: { branchIds: string[]; departmentIds: string[] };
}

// --- GET /auth/me ------------------------------------------------------------
//
// RENDERING HINTS, NOT PERMISSIONS. Each flag means "this caller holds the role
// somewhere", which cannot answer whether they may act on a PARTICULAR record —
// the only question authorisation asks. The server decides that per request and
// never reads these back. See backend/src/modules/auth/auth.service.js.
export interface CapabilityHints {
  /** Holds ADM: may create and deactivate branches, departments and users. */
  administration: boolean;
  /** Holds LEAD or above: GET /user is refused below that, so the Users and
   *  Roles screens cannot load at all without it. */
  staffDirectory: boolean;
  /** Holds AGT/LEAD/MGR/ADM: an auditor is read-everything, change-nothing. */
  ticketWrite: boolean;
  /** Holds AGT/LEAD/MGR: 002 §9 forbids an administrator a customer-visible
   *  reply while permitting them an internal note. */
  customerReply: boolean;
}

/** The starting point, and what a failed lookup falls back to: show nothing. */
export const NO_CAPABILITIES: CapabilityHints = {
  administration: false,
  staffDirectory: false,
  ticketWrite: false,
  customerReply: false
};

export interface MeResponse {
  user: AuthenticatedUser;
  show: CapabilityHints;
}

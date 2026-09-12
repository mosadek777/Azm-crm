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

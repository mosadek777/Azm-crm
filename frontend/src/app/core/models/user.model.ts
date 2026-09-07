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

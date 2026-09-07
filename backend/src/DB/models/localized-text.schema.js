// spec 012 — implements FR-004 (the shape); constitution I
//
// The reusable subdocument for a bilingual label. Both languages are required,
// so a save missing one fails validation and the request answers 400. Never a
// warning, never a default, never an empty string (spec 012 AS-02).
//
// WHICH STRINGS USE THIS — the split, so nobody re-derives it (spec 012 §8):
//
//   1. Localised value, BOTH languages required — admin-authored configurable
//      labels only: status names, category names, priority labels, ticket type
//      and custom field labels, segment names, resolution codes, root causes,
//      role names, SLA policy names, notification templates, quick replies.
//
//   2. Single language, free, direction detected per item — user-authored
//      content. NOT this schema: customer display_name, ticket subject,
//      message bodies, internal notes, KB article text. Spec 001 §8 stores
//      names as entered and forbids transliteration.
//
//   3. Always LTR, never bilingual — direction-neutral values: ticket
//      references, phone numbers, email addresses, identifiers, numerals,
//      times and durations (spec 012 FR-002).
//
// NO FALLBACK, EVER (spec 012 AS-03): if legacy data somehow holds one
// language, the reader sees an explicit missing-translation marker. The system
// must not silently render the other language in its place.
//
// Provisional: spec 012 [CLARIFY-1] (peer languages vs primary + translation)
// is still open with the client. Constitution I already settles the model —
// a value per language — so the shape is safe to build; what is unconfirmed is
// whether the client agrees that neither language is the source of the other.

import { Schema } from 'mongoose'

export const localizedTextSchema = new Schema({
  ar: { type: String, required: true, trim: true },
  en: { type: String, required: true, trim: true }
}, { _id: false })

// spec 001 — implements part of FR-002, FR-004, E-06
//
// Contact point normalisation. ONE implementation, deliberately, for the same
// reason constitution III gives duration one implementation: FR-002 requires
// that "local and international forms match the same record", and two
// normalisers that disagree by one character would make a create-time collision
// probe and a search miss each other silently. Review point 2 (create) and
// review point 3 (search) both call this.
//
// §3: "normalised (E.164 for phone and WhatsApp, lowercased for email)".
//
// E-06: a phone in an unrecognised format is "Stored as entered, flagged
// unnormalised, excluded from normalised matching, surfaced in a data-quality
// list". So this never throws and never guesses — it returns
// `{ value, normalisedValue: null, normalised: false }` and lets the caller
// store the original.

// The default country code turns a local form into E.164. It is configurable
// because it is an INFERENCE, not a requirement: no spec states a country. It
// is read from the specs' own worked examples — AS-02 uses `+201001234567` with
// the local forms `01001234567` and `0100 123 4567`, and its national ID
// `29001011234567` is Egyptian. Flagged in docs/decisions-pending.md rather
// than presented as sourced.
const defaultCountryCode = () => process.env.DEFAULT_COUNTRY_CODE ?? '+20'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// E.164: a leading + then 8–15 digits, first digit non-zero.
const E164 = /^\+[1-9]\d{7,14}$/

const normalisePhone = (raw) => {
  // Strip everything a human might type as punctuation: spaces, dashes,
  // brackets, dots, and the Arabic-Indic digits a customer may use.
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩'
  let s = String(raw).trim().replace(/[\s\-().]/g, '')
  s = s.replace(/[٠-٩]/g, d => String(arabicDigits.indexOf(d)))

  // 00 as an international prefix becomes +.
  if (s.startsWith('00')) s = '+' + s.slice(2)

  // A leading single 0 is a national trunk prefix: drop it and prepend the
  // default country code. AS-02 requires `01001234567` to match
  // `+201001234567`.
  if (/^0\d+$/.test(s)) s = defaultCountryCode() + s.slice(1)

  // A bare national number with no prefix at all.
  if (/^\d+$/.test(s)) s = defaultCountryCode() + s

  return E164.test(s) ? s : null
}

const normaliseEmail = (raw) => {
  const s = String(raw).trim().toLowerCase()
  return EMAIL.test(s) ? s : null
}

// Returns the three fields contact-point.model.js stores. `value` is always the
// input as entered — §3 keeps the original so a data-quality list can show what
// the agent actually typed.
export const normaliseContactPoint = ({ channelType, value }) => {
  const asEntered = String(value ?? '').trim()

  const normalisedValue = channelType === 'email'
    ? normaliseEmail(asEntered)
    : normalisePhone(asEntered)

  return {
    value: asEntered,
    normalisedValue,
    // E-06's flag. False means "excluded from normalised matching", which is
    // the behaviour the edge case asks for, not an error.
    normalised: normalisedValue !== null
  }
}

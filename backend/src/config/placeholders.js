// The quick-reply placeholder vocabulary. spec 004 FR-006; decision 41.
//
// ⚠ THIS IS THE ONLY DEFINITION. The resolver reads it, the validator reads it,
// and the interface reads it over GET /quick-reply/placeholders rather than
// keeping a copy. Two lists drift, and the drift surfaces as a refusal nobody
// can explain: an editor that offers a token the resolver has never heard of.
//
// DECISION 41 (developer, provisional — NOT a reading of the spec). FR-006
// requires "named placeholders" and names none, anywhere. The vocabulary is
// load-bearing because it is what agents type into every template, so it is
// recorded and attributed rather than inferred from whatever fields exist.
// Full reasoning: docs/decisions-pending.md §16.
//
// THE RULE THAT SHAPES THE LIST: nothing that can resolve to "unavailable".
// No SLA target, no entitlement, no segment, no customer tier — each is blocked
// on 005 [CLARIFY-1], on the ERP, or on being unbuilt. A placeholder that
// renders "unavailable" inside a customer-facing reply is worse than one that
// refuses: the refusal is seen by the AGENT before sending, the "unavailable"
// is seen by the CUSTOMER afterwards. Every token below resolves from a field
// that exists on every ticket.
//
// SYNTAX: {{dotted.path}} — double braces. Single braces collide with ordinary
// punctuation in Arabic prose more often than double ones do.

/**
 * Each entry describes one token and how to resolve it from the context the
 * render endpoint assembles. `resolve` returns a string, or null when the value
 * genuinely is not there — which is what produces the refusal.
 */
export const PLACEHOLDERS = [
  {
    token: 'customer.name',
    label: { ar: 'اسم العميل', en: "Customer's name" },
    resolve: ({ customer }) => customer?.displayName ?? null
  },
  {
    token: 'ticket.reference',
    label: { ar: 'مرجع التذكرة', en: 'Ticket reference' },
    resolve: ({ ticket }) => ticket?.reference ?? null
  },
  {
    token: 'ticket.subject',
    label: { ar: 'موضوع التذكرة', en: 'Ticket subject' },
    resolve: ({ ticket }) => ticket?.subject ?? null
  },
  {
    // THE SENDER, NOT THE ASSIGNEE. A template is written in the voice of
    // whoever is sending it; resolving this to the assignee would put one
    // person's name under another person's message.
    token: 'agent.name',
    label: { ar: 'اسم الموظف المُرسِل', en: "Sending agent's name" },
    resolve: ({ actor }) => actor?.displayName ?? null
  },
  {
    // Admin-authored labels carry both languages (constitution I). The reader's
    // language decides which one is substituted, and there is no fallback: a
    // branch missing one language resolves to null and the insertion refuses,
    // which is the same rule the rest of the product applies to labels.
    token: 'branch.name',
    label: { ar: 'اسم الفرع', en: 'Branch name' },
    resolve: ({ branch, lang }) => branch?.name?.[lang] ?? null
  },
  {
    token: 'department.name',
    label: { ar: 'اسم القسم', en: 'Department name' },
    resolve: ({ department, lang }) => department?.name?.[lang] ?? null
  }
]

/** Just the token names, for validation and for the interface. */
export const PLACEHOLDER_TOKENS = PLACEHOLDERS.map(p => p.token)

const BY_TOKEN = new Map(PLACEHOLDERS.map(p => [p.token, p]))

// Deliberately tolerant of inner whitespace — {{ customer.name }} is what
// somebody types by habit — and deliberately NOT tolerant of anything else, so
// a typo is a refusal rather than a silent pass-through.
const TOKEN_PATTERN = /\{\{\s*([^{}]*?)\s*\}\}/g

/** Every token a body mentions, in the order it mentions them, deduplicated. */
export const tokensIn = (body) =>
  [...new Set([...String(body ?? '').matchAll(TOKEN_PATTERN)].map(m => m[1]))]

/**
 * Tokens a body mentions that this vocabulary does not define.
 *
 * Used when a quick reply is SAVED, so an unknown token is refused at authoring
 * time rather than discovered by whoever tries to use the template later.
 */
export const unknownTokensIn = (body) =>
  tokensIn(body).filter(t => !BY_TOKEN.has(t))

/**
 * Substitute every token in `body` from `context`.
 *
 * FR-006: "MUST REFUSE rather than insert an unresolved placeholder." So this
 * is all-or-nothing — it never returns a partly-substituted body, and it names
 * WHICH placeholders failed and why, because an agent editing a template needs
 * to know which token is wrong rather than only that one is.
 *
 * @returns {{ok: true, body: string} | {ok: false, failures: Array<{token: string, reason: string}>}}
 */
export const resolvePlaceholders = (body, context) => {
  const text = String(body ?? '')
  const failures = []

  for (const token of tokensIn(text)) {
    const entry = BY_TOKEN.get(token)
    if (!entry) {
      failures.push({ token, reason: 'unknown_placeholder' })
      continue
    }
    const value = entry.resolve(context)
    if (value === null || value === undefined || String(value).trim() === '') {
      failures.push({ token, reason: 'no_value' })
    }
  }

  if (failures.length) return { ok: false, failures }

  // Only substitutes once every token is known to resolve, so there is no path
  // that writes a half-finished body anywhere.
  return {
    ok: true,
    body: text.replace(TOKEN_PATTERN, (_m, token) =>
      String(BY_TOKEN.get(token).resolve(context)))
  }
}

// spec 010 — implements the password-policy half of FR-007
//
// Enforced where a password is SET, never where one is checked. Applying a
// policy at sign-in would lock out every account whose password predates the
// policy, which is a self-inflicted outage rather than a security control.
//
// Refusals are bilingual and name every rule that failed at once, rather than
// one at a time — constitution I, and the difference between one correction and
// four rounds of trial and error.

import { SECURITY_POLICY as P } from '../config/security-policy.js'

export const checkPassword = (password) => {
  const failures = []
  const value = typeof password === 'string' ? password : ''

  if (value.length < P.password.minLength.value) {
    failures.push({
      rule: 'minLength',
      ar: `يجب ألا تقل كلمة المرور عن ${P.password.minLength.value} حرفًا`,
      en: `Password must be at least ${P.password.minLength.value} characters`
    })
  }
  if (P.password.requireMixedCase.value && !(/[a-z]/.test(value) && /[A-Z]/.test(value))) {
    failures.push({
      rule: 'mixedCase',
      ar: 'يجب أن تحتوي كلمة المرور على حرف كبير وحرف صغير',
      en: 'Password must contain both an upper-case and a lower-case letter'
    })
  }
  if (P.password.requireDigit.value && !/[0-9]/.test(value)) {
    failures.push({ rule: 'digit', ar: 'يجب أن تحتوي كلمة المرور على رقم', en: 'Password must contain a digit' })
  }
  if (P.password.requireSymbol.value && !/[^A-Za-z0-9]/.test(value)) {
    failures.push({ rule: 'symbol', ar: 'يجب أن تحتوي كلمة المرور على رمز', en: 'Password must contain a symbol' })
  }

  return { ok: failures.length === 0, failures }
}

// A 400 body in the shape the rest of the API uses. The failing RULE NAMES are
// returned alongside the prose so a client can highlight the right field
// without parsing a sentence — and the password itself is never echoed back,
// in the body or in a log.
export const passwordRefusal = (failures) => ({
  message: {
    ar: `كلمة المرور لا تستوفي السياسة: ${failures.map(f => f.ar).join('، ')}`,
    en: `Password does not meet the policy: ${failures.map(f => f.en).join('; ')}`
  },
  failedRules: failures.map(f => f.rule)
})

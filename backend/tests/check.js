// The assertion helper, shared by every suite.
//
// It used to be three copies of `String(actual) === String(expected)`. That
// comparison has two ways of passing when it should not, and both are silent:
//
//   String(undefined) === String(undefined)   ->  "undefined" === "undefined"
//   String(null)      === String('null')      ->  "null"      === "null"
//
// The first is the dangerous one. Almost every assertion here reads a field off
// a response body with optional chaining, so a request that failed, or a field
// that was renamed, yields `undefined` — and an expectation derived the same way
// yields `undefined` too. The check then passes while testing nothing. That is
// exactly how a test ends up asserting a bug instead of catching it, which has
// already happened once in this suite.
//
// So: types must match, and an `undefined` actual is always a failure. If a test
// genuinely wants to assert absence, it says so explicitly:
//
//   chk('followUpAt is cleared', ticket.followUpAt, null)        // null is fine
//   chk('field is absent', 'followUpAt' in ticket, false)        // not undefined

const show = (v) => {
  if (typeof v === 'string') return v
  if (v === undefined) return 'undefined'
  if (v === null) return 'null'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

const same = (actual, expected) => {
  // No legitimate assertion in these suites expects `undefined`. Refusing it
  // outright costs nothing and closes the vacuous-pass hole.
  if (actual === undefined || expected === undefined) return false
  if (actual === null || expected === null) return actual === expected
  if (typeof actual !== typeof expected) return false
  if (typeof actual === 'object') return JSON.stringify(actual) === JSON.stringify(expected)
  return Object.is(actual, expected)
}

export const createChecker = ({ width = 62, indent = '  ' } = {}) => {
  const state = { failures: 0 }

  const chk = (label, actual, expected) => {
    const ok = same(actual, expected)
    if (!ok) state.failures++

    let note = ''
    if (!ok) {
      if (actual === undefined) {
        // Spelled out, because "undefined (want 201)" reads like a wrong value
        // when it usually means the request failed or the field moved.
        note = `  (want ${show(expected)} — actual is undefined: the call failed, or the field is not on the response)`
      } else if (expected === undefined) {
        note = '  (the EXPECTED value is undefined — assert absence explicitly, e.g. chk(label, x === undefined, true))'
      } else if (typeof actual !== typeof expected && actual !== null && expected !== null) {
        note = `  (want ${show(expected)} — type mismatch: ${typeof actual} vs ${typeof expected})`
      } else {
        note = `  (want ${show(expected)})`
      }
    }

    console.log(`${indent}${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(width)} ${show(actual)}${note}`)
    return ok
  }

  return {
    chk,
    get failures () { return state.failures },
    report () {
      console.log(`\n${state.failures === 0 ? 'ALL CHECKS PASSED' : state.failures + ' CHECK(S) FAILED'}`)
      return state.failures === 0 ? 0 : 1
    }
  }
}

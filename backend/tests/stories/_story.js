// The story-test harness.
//
// WHAT THIS LAYER IS FOR. `backend/tests/*.test.js` are CONTRACT tests: does
// this endpoint accept, refuse, scope and audit correctly. They are organised
// by requirement, which is the right axis for them, and nothing here replaces
// or duplicates them.
//
// This layer asks the other question: did the user get the thing the story
// asked for, and is it still there afterwards. `TM-09` is the worked example —
// the contract suite proves a reason is REQUIRED and that the call succeeds
// with one; nothing reads it back, so deleting `reason` from the audit payload
// leaves every contract check green. The story is "so nobody wonders later
// why", and only a read-back proves it.
//
// THREE DECLARATIONS, and the choice between them is part of the output:
//
//   story(id, want, soThat, fn)   proven here, by assertions that run
//   storyCoveredBy(id, where)     already fully proven — reference, never re-test
//   storyUnbuilt(id, why)         nothing exists to test
//
// `storyCoveredBy` is what stops this layer becoming a second copy of the
// contract suites. It is a mechanical rule, not a discipline: if a story is
// already proven, the only thing that may be written is a pointer to where.
//
// The three counts print on every run, so the suite is a living version of
// docs/story-coverage.md and cannot drift from it the way a document does.

import { createChecker } from '../check.js'

export const createStories = (specLabel) => {
  const checker = createChecker({ indent: '      ', width: 58 })
  const state = { proven: 0, referenced: 0, unbuilt: 0, vacuous: 0 }
  let assertionsInCurrentStory = 0

  // Wraps the shared checker so every assertion is counted against the story
  // that is running. A story that asserts nothing is the failure mode this
  // whole layer exists to avoid, so it is detected rather than trusted.
  const chk = (label, actual, expected) => {
    assertionsInCurrentStory++
    return checker.chk(label, actual, expected)
  }

  const header = (id, want, soThat) =>
    `${id}  ${want}${soThat ? `  —  so that ${soThat}` : ''}`

  const story = async (id, want, soThat, fn) => {
    console.log(`\n  STORY  ${header(id, want, soThat)}`)
    assertionsInCurrentStory = 0
    const before = checker.failures
    try {
      await fn()
    } catch (err) {
      console.log(`      FAIL  ${'threw'.padEnd(58)} ${err.message}`)
      state.vacuous++ // counted as a failure below via checker? no — track separately
      throw err
    }
    if (assertionsInCurrentStory === 0) {
      // A story that ran no assertions passes silently and proves nothing. That
      // is worse than a missing test, because the roll-call reports it as done.
      console.log(`      FAIL  ${'this story asserted NOTHING'.padEnd(58)} vacuous`)
      state.vacuous++
      return
    }
    if (checker.failures === before) state.proven++
  }

  const storyCoveredBy = (id, want, where) => {
    state.referenced++
    console.log(`  COVERED  ${id}  ${want}`)
    console.log(`           already proven by ${where} — not re-tested here`)
  }

  const storyUnbuilt = (id, want, why) => {
    state.unbuilt++
    console.log(`  UNBUILT  ${id}  ${want}`)
    console.log(`           ${why}`)
  }

  // Reading a collection that happens to be empty makes every downstream check
  // pass for the wrong reason. The portal suite already guards this by hand
  // ("otherwise every check below passes vacuously"); here it is the default.
  const nonEmpty = (label, list) => {
    const arr = Array.isArray(list) ? list : []
    chk(`${label} is not empty — otherwise the checks below are vacuous`, arr.length > 0, true)
    return arr
  }

  const report = () => {
    const total = state.proven + state.referenced + state.unbuilt
    console.log('')
    console.log('='.repeat(74))
    console.log(`  ${specLabel}`)
    console.log(`  proven here ${state.proven}   ·   covered elsewhere ${state.referenced}   ·   unbuilt ${state.unbuilt}   ·   declared ${total}`)
    if (state.vacuous) console.log(`  ⚠ ${state.vacuous} story/stories asserted nothing`)
    console.log('='.repeat(74))
    const failed = checker.failures + state.vacuous
    console.log(failed === 0 ? '\nALL CHECKS PASSED' : `\n${failed} CHECK(S) FAILED`)
    return failed === 0 ? 0 : 1
  }

  return { story, storyCoveredBy, storyUnbuilt, chk, nonEmpty, report }
}

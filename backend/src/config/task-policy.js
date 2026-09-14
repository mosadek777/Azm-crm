// spec 004 §3, FR-005. The reminder lead time, and where "today" is not.
//
// §3 says `remind_before` "defaults per user preference". THERE IS NO USER
// PREFERENCE: 010 §3's User carries display name, email, state, default
// language, skills, languages, capacity and mfa_enrolled, and nothing about
// notifications. FR-013's "on the channels the user has enabled" assumes the
// same missing thing.
//
// So the default lives here — visible, cited and overridable — rather than
// being a number buried in a service, and the gap is carded
// (`task-reminder-preferences`) rather than quietly filled. When per-user
// notification settings arrive, this becomes the fallback for somebody who has
// not set one, which is what "defaults per user preference" implies anyway.
//
// TWO HOURS is the figure in the spec's own worked example — AS-05: "a task due
// tomorrow at 10:00 with a 2-hour reminder ... when 08:00 tomorrow arrives".
// That is an illustration rather than a requirement, so it is proposed and
// unratified like every other number in this project that no requirement fixes.

const num = (key, fallback) => {
  const raw = process.env[key]
  if (raw === undefined || raw === '') return { value: fallback, ratified: false, source: 'default' }
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${key} must be a non-negative number, got ${JSON.stringify(raw)}`)
  }
  return { value: n, ratified: false, source: 'env' }
}

export const TASK_POLICY = Object.freeze({
  // How long before `dueAt` a reminder becomes due, when the task does not
  // carry its own `remindBeforeMinutes`.
  defaultRemindBeforeMinutes: num('TASK_REMIND_BEFORE_MINUTES', 120)
})

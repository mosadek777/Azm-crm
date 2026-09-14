// spec 004 FR-013 — the grouping window.
//
// "Notifications for one ticket within A CONFIGURED WINDOW must be grouped,
// except escalations." The requirement says the window is configured and does
// not say what it is, so the number lives here — visible, cited and
// overridable — rather than buried as a literal in the service.
//
// FIFTEEN MINUTES is the developer's, provisional, and chosen on one argument:
// the window exists so that a burst of activity on one ticket reads as one
// event, and a burst is what happens while somebody is working on it. Long
// enough that three replies while an agent types do not become three rows;
// short enough that this morning's mention and this afternoon's are still two
// separate things to answer. No requirement fixes it and nothing in the source
// material implies a figure, so it is proposed like every other unratified
// number in this project.
//
// ⚠ THE WINDOW IS APPLIED AT READ TIME AND NOTHING IS DISCARDED. Changing this
// number changes how existing rows are presented, not which rows exist — so it
// is safe to change after go-live, unlike a value that decided what to store.
// See notification.service.js#groupNotifications for why that choice was made.

const num = (key, fallback) => {
  const raw = process.env[key]
  if (raw === undefined || raw === '') return { value: fallback, ratified: false, source: 'default' }
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${key} must be a positive number, got ${JSON.stringify(raw)}`)
  }
  return { value: n, ratified: false, source: 'env' }
}

export const NOTIFICATION_POLICY = Object.freeze({
  groupWindowMinutes: num('NOTIFICATION_GROUP_WINDOW_MINUTES', 15)
})

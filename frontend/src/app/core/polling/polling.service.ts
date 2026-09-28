// spec 004 FR-021, AD-19; NFR-002, NFR-003.
//
// `FR-021`: "An open list or conversation MUST reflect a change to its contents
// without the user reloading, within the `NFR-002` interval for lists and the
// `NFR-003` interval for a message on an open conversation."
//
// ── POLLING, NOT SOCKETS — AND THE REASON IS A SECURITY ONE ────────────────
//
// `FR-021` continues: an update must reach "only a recipient who could have
// read that record through an ordinary request AT THE MOMENT OF DELIVERY", and
// the scope predicate must be "evaluated per recipient at that moment, never
// once per event".
//
// A poll satisfies that by construction, because it IS an ordinary request. It
// travels `authenticate` → `authorize` → `scopeFilter`, the same path as every
// other read, so there is no second implementation of the predicate to keep in
// step. A pushed update would require the server to decide who may receive a
// record — and that decision living anywhere but `utils/scope.js` is precisely
// how scoping goes quietly missing.
//
// The consequence is worth stating positively rather than as a caveat: a ticket
// that leaves an agent's scope stops reaching them **on the very next poll**,
// with no invalidation logic, no subscription bookkeeping and nothing to
// forget. decisions-pending §26 argues the whole trade.
//
// ── THE INTERVALS ARE RATIFIED, NOT CHOSEN ─────────────────────────────────
//
// `NFR-003` — "Notification delivery, in-app: ≤ 5s from the triggering event".
// `NFR-002` — "Counter and queue freshness: ≤ 30s, without manual reload".
//
// Both are in spec `004`'s own table. They are not developer preferences and
// they must not be relaxed to make polling cheaper — the honest response to
// finding 5s expensive is to make the request cheaper, which is what the
// conditional-request design does, not to poll less often than the requirement
// permits. See `config/polling.ts`.
//
// ── ONE POLLER, NOT ONE PER COMPONENT ──────────────────────────────────────
//
// Every subscriber shares one timer per interval. Two independent pollers on
// one screen is how a count and the list beneath it end up disagreeing — the
// same reason the workspace counters and the reminder badge already read one
// service each.

import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { AuthService } from '../auth/services/auth.service';
import { PortalAuthService } from '../auth/services/portal-auth.service';
import { POLLING } from './polling.config';

type Job = { fn: () => void; intervalMs: number };

@Injectable({ providedIn: 'root' })
export class PollingService {
  private readonly auth = inject(AuthService);

  /**
   * ── TWO AUDIENCES, ONE POLLER ──────────────────────────────────────────
   *
   * This service used to gate every tick on the STAFF session alone. A portal
   * screen could register a poll and it would never fire once, silently: a
   * customer is not a User and holds no staff session, so `auth.isSignedIn()`
   * is permanently false for them. The timer ran, the job was skipped, and
   * nothing anywhere said so.
   *
   * The gate is about whether there is a LIVE SESSION to spend requests on, and
   * this application has two kinds. Both are asked. It is not a widening of
   * anything: a poll is an ordinary request that carries its own token and
   * meets its own predicate server-side — the portal's `customer = session`
   * for a portal screen, `utils/scope.js` for a staff one. Neither audience
   * can reach the other's data by being polled for, because neither token is
   * accepted by the other's routes (portal.test.js asserts both directions).
   */
  private readonly portalAuth = inject(PortalAuthService);

  /** Either audience having a live session is a reason to poll. */
  private readonly sessionLive = () => this.auth.isSignedIn() || this.portalAuth.isSignedIn();

  private readonly jobs = new Map<symbol, Job>();
  private readonly timers = new Map<number, ReturnType<typeof setInterval>>();

  /**
   * Whether the tab is being looked at. Polling a hidden tab spends the user's
   * battery and the server's capacity on a screen nobody can see — and the
   * requirement is about what somebody is *looking at*.
   */
  private readonly visible = signal(!document.hidden);

  constructor() {
    document.addEventListener('visibilitychange', this.onVisibility);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', this.onVisibility);
      for (const t of this.timers.values()) clearInterval(t);
      this.timers.clear();
      this.jobs.clear();
    });
  }

  private readonly onVisibility = () => {
    const nowVisible = !document.hidden;
    this.visible.set(nowVisible);
    // ⚠ POLL ONCE IMMEDIATELY ON RETURN, rather than waiting out an interval.
    // Somebody coming back to a tab is exactly the person who most needs it to
    // be current, and making them wait 30 seconds is how a screen earns a
    // reputation for being stale.
    if (nowVisible) this.runAll();
  };

  /**
   * Register a poll. Returns an unregister function — call it in the
   * component's `DestroyRef.onDestroy`, or the poll outlives the screen.
   *
   * `fn` is NOT called immediately: a component has just loaded its own data,
   * and an extra request on the same tick would double every screen's cost for
   * nothing.
   */
  register(fn: () => void, intervalMs: number): () => void {
    const key = Symbol('poll');
    this.jobs.set(key, { fn, intervalMs });
    this.ensureTimer(intervalMs);
    return () => {
      this.jobs.delete(key);
      // Drop the timer once nothing is using it, so a screen left open with no
      // pollers is not still waking the browser.
      if (![...this.jobs.values()].some(j => j.intervalMs === intervalMs)) {
        const t = this.timers.get(intervalMs);
        if (t) { clearInterval(t); this.timers.delete(intervalMs); }
      }
    };
  }

  private ensureTimer(intervalMs: number): void {
    if (this.timers.has(intervalMs)) return;
    this.timers.set(intervalMs, setInterval(() => this.tick(intervalMs), intervalMs));
  }

  private tick(intervalMs: number): void {
    // Signed out is not a reason to keep asking. The interceptor would sign the
    // user out on the first 401 anyway, but polling a dead session produces a
    // burst of them rather than one.
    if (!this.visible() || !this.sessionLive()) return;
    for (const job of this.jobs.values()) if (job.intervalMs === intervalMs) job.fn();
  }

  private runAll(): void {
    if (!this.sessionLive()) return;
    for (const job of this.jobs.values()) job.fn();
  }

  /** The ratified intervals, re-exported so callers do not hold their own. */
  readonly intervals = POLLING;
}

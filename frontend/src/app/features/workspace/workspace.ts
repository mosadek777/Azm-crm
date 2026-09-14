// The agent workspace. spec 004 — FR-001, FR-002, FR-019, FR-020, E-01, E-05,
// E-13; constitution III and IV.
//
// WHAT THIS SCREEN IS. The first thing an agent sees when they sign in: what is
// mine, in an order I did not have to choose, and where I stand. AD-01: "open
// to my assigned tickets ordered by SLA urgency, so I never decide what to work
// on next." Until this existed the landing was the whole ticket list, newest
// first, with the agent doing the triage themselves.
//
// ── THE SLA ENGINE IS NOT BUILT, AND THIS IS STILL THE REQUIREMENT ──────────
//
// FR-001 asks for urgency order and FR-002 for an "overdue" counter. Both need
// the SLA clock, which returns `unavailable` because 005 [CLARIFY-2] (working
// hours and holidays per branch) is unanswered. That does NOT make this screen
// unbuildable, because the spec already wrote the degraded mode:
//
//   E-05: "SLA service is unavailable → Countdowns render as 'unavailable';
//          the queue falls back to priority then age, AND STATES THAT IT HAS
//          DONE SO. It MUST NOT compute a substitute duration."
//
// So the fallback path IS the requirement while the engine is blocked, and
// building it means the engine lands later as a data change rather than a
// rewrite. Three consequences, all deliberate:
//
//   1. The queue asks the server for `sort=urgency` and renders the order the
//      server reports back (`ordering.applied`). The screen never claims an
//      order it did not receive.
//   2. The OVERDUE counter renders `unavailable` — not zero. Zero is a
//      factual claim that nothing is overdue, and nobody knows that.
//   3. Nothing here subtracts two dates. Not for the countdown, not for the
//      counters, not "just for a rough number". Constitution III, FR-019.
//
// ── COUNTERS AGREE WITH THEIR LISTS BY CONSTRUCTION ─────────────────────────
//
// FR-002: each counter "MUST be openable as its own list and MUST agree exactly
// with that list". The counter is not a separate calculation — it is
// `GET /ticket?<filter>&limit=1` read for its `total`, and opening it navigates
// to the ticket list with the SAME filter, which runs the same server query.
// Two implementations of "open" would drift; one cannot.
//
// E-13 ("counter and list disagree because of a concurrent change → the list is
// authoritative; the counter refreshes on open") is satisfied for free: the
// counters refresh whenever this screen is entered.

import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { StatusTonePipe } from '../../shared/pipes/status-tone.pipe';
import { Tag } from '../../shared/components/tag/tag';
import { ReminderService } from '../../core/notifications/reminder.service';
import { Ticket } from '../../core/models/domain.model';

/** Every status that is not terminal and not resolved — work still on my desk. */
const OPEN_STATUSES = [
  'new', 'assigned', 'in_progress', 'pending_customer', 'pending_supplier', 'pending_internal'
].join(',');

export interface Counter {
  key: string;
  labelKey: string;
  /** Null while the SLA engine cannot answer — rendered as "unavailable". */
  value: number | null;
  /** True when the value is unknown rather than zero. */
  unavailable: boolean;
  /** The query that produced it, and that opening it re-runs. */
  params: Record<string, string> | null;
}

@Component({
  selector: 'app-workspace',
  imports: [RouterLink, TranslatePipe, StatusTonePipe, Tag, DatePipe],
  templateUrl: './workspace.html'
})
export class Workspace {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(LanguageService);

  // ── REMINDERS ────────────────────────────────────────────────────────────
  //
  // FR-013 in-app. The service is shared with the sidebar badge so both read
  // ONE answer; two fetches would drift and show a badge of 3 beside a list of
  // 2. Read the service's own header for why this screen is the only thing
  // that makes reminders happen at all.
  protected readonly reminders = inject(ReminderService);

  protected readonly queue = signal<Ticket[]>([]);
  protected readonly loading = signal(true);

  /**
   * What the SERVER said about the ordering it applied. E-05 requires the queue
   * to state that it fell back; this is what that statement is read from, so
   * the screen cannot announce an urgency order the server did not use.
   */
  protected readonly ordering = signal<string | null>(null);

  private readonly openCount = signal<number | null>(null);
  private readonly pendingCount = signal<number | null>(null);
  private readonly resolvedTodayCount = signal<number | null>(null);

  /** Which branch timezones "today" was evaluated in — 009 E-19. */
  protected readonly timezones = signal<string[]>([]);

  private readonly me = computed(() => this.auth.user()?.id ?? '');

  protected readonly counters = computed<Counter[]>(() => {
    const mine = this.me();
    const list: Counter[] = [
      {
        key: 'open', labelKey: 'workspace.open', value: this.openCount(),
        unavailable: false,
        params: { status: OPEN_STATUSES, assignedAgentId: mine }
      },
      {
        // NOT ZERO. "Overdue" needs a target and a consumed duration, and the
        // engine has neither. Rendering 0 would assert that nothing is
        // overdue, which nobody knows.
        key: 'overdue', labelKey: 'workspace.overdue', value: null,
        unavailable: true, params: null
      },
      {
        key: 'pending', labelKey: 'workspace.pendingCustomer', value: this.pendingCount(),
        unavailable: false,
        params: { status: 'pending_customer', assignedAgentId: mine }
      },
      {
        key: 'resolvedToday', labelKey: 'workspace.resolvedToday', value: this.resolvedTodayCount(),
        unavailable: false,
        params: { resolvedToday: 'true', assignedAgentId: mine }
      }
    ];
    return list;
  });

  protected readonly queueEmpty = computed(() => !this.loading() && this.queue().length === 0);

  constructor() {
    this.load();
    // ⚠ THIS CALL IS WHAT MAKES A REMINDER EXIST. There is no scheduler, so
    // opening this screen is the only moment anything is evaluated — which is
    // exactly what `reminder.howItWorks` tells the agent, in as many words.
    // `announce` raises ONE toast for reminders not yet seen this session.
    this.reminders.refresh({ announce: true });
  }

  protected load(): void {
    const mine = this.me();
    if (!mine) { this.loading.set(false); return; }

    this.loading.set(true);

    // THE QUEUE. `sort=urgency` is the server's fallback ordering; the reply
    // says which order it actually applied.
    // OPEN work only. AD-01 is "so I never decide what to work on next" — a
    // resolved or closed ticket is not next. Without this the queue listed 12
    // while the Open counter said 10, which is two numbers disagreeing on one
    // screen, and the extra two were tickets already finished.
    this.api.listTickets({ assignedAgentId: mine, status: OPEN_STATUSES, sort: 'urgency', limit: '25' }).subscribe({
      next: r => {
        this.queue.set(r.tickets);
        this.ordering.set(r.ordering?.applied ?? null);
        this.loading.set(false);
      },
      error: (_e: HttpErrorResponse) => { this.queue.set([]); this.loading.set(false); }
    });

    // THE COUNTERS. Each is the `total` of the same query its card opens.
    // `limit=1` because only the count is wanted — the rows are not read.
    const count = (params: Record<string, string>, into: (n: number | null) => void,
                   zones?: (z: string[]) => void) =>
      this.api.listTickets({ ...params, limit: '1' }).subscribe({
        next: r => { into(r.total); zones?.(r.timezonesUsed ?? []); },
        // A count that could not be fetched is UNKNOWN, not zero.
        error: () => into(null)
      });

    count({ status: OPEN_STATUSES, assignedAgentId: mine }, n => this.openCount.set(n));
    count({ status: 'pending_customer', assignedAgentId: mine }, n => this.pendingCount.set(n));
    count({ resolvedToday: 'true', assignedAgentId: mine },
      n => this.resolvedTodayCount.set(n), z => this.timezones.set(z));
  }

  /** Open a counter as its own list — the same filter, so the same query. */
  protected openCounter(c: Counter): void {
    if (!c.params) return;
    this.router.navigate(['/tickets'], { queryParams: c.params });
  }

  protected openTicket(t: Ticket): void {
    this.router.navigate(['/tickets', t._id]);
  }
}

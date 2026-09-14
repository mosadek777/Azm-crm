// Task reminders. spec 004 — FR-005 (the task half), FR-013, AD-05.
//
// ── THE THREE THINGS THE SCREEN SAYS, AND WHY EACH IS TRUE ──────────────────
//
//   1. "Reminders appear here."   There is nowhere else. FR-013 names in-app,
//      email and push; both other channels need spec 003, which does not
//      exist — no transport, no provider, no push-token store. Board card:
//      reminder-channels-email-push.
//
//   2. "They are not emailed."    Said out loud rather than left to be
//      discovered. An agent who assumes an email is coming and never gets one
//      is worse off than one who knows to look.
//
//   3. "They are computed when    This system has NO SCHEDULER: no cron, no
//      you open this screen."      queue, no worker, no timer. Nothing fires
//                                  while nobody is looking. `GET /task/mine`
//                                  evaluates them on the request and answers
//                                  `evaluation: 'on_request'`. Board card:
//                                  reminder-scheduler.
//
// Point 3 is the one that reads badly, and that is the honest shape of it
// showing through rather than the wording failing. A line saying only "not
// emailed" would still let an agent believe a reminder was waiting for them the
// moment it fell due.
//
// THE SLA-THRESHOLD HALF OF FR-005 IS NOT HERE. Those thresholds live in
// 005 FR-006 and 005 is blocked on [CLARIFY-1]; a reminder fired against an
// invented target would train an agent to act on a deadline nobody agreed.
// Board card: reminder-sla-thresholds. When it lands it becomes a second
// PRODUCER writing into this same surface, not a rewrite of it.

import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../auth/services/auth.service';
import { ToastService } from './toast.service';
import { Task } from '../models/domain.model';

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  private readonly _reminders = signal<Task[]>([]);
  private readonly _overdueCount = signal(0);
  private readonly _evaluatedAt = signal<string | null>(null);

  // Read through `isSignedIn`, so one person's reminders can never be left on
  // screen for the next. The service is a root singleton and outlives a
  // session; the signals holding its data must not be trusted on their own.
  readonly reminders = computed(() => this.auth.isSignedIn() ? this._reminders() : []);
  readonly overdueCount = computed(() => this.auth.isSignedIn() ? this._overdueCount() : 0);
  readonly evaluatedAt = computed(() => this.auth.isSignedIn() ? this._evaluatedAt() : null);

  /** How many reminders there are at all — what the sidebar badge shows. */
  readonly count = computed(() => this.reminders().length);

  /**
   * Which reminders have already been announced in this browser session.
   *
   * ONE TOAST, NOT ONE PER TASK. A toast per reminder is how four cards end up
   * stacked on load, which was already a complaint about the refusals. This
   * raises a single summary and then stays quiet; the list on the workspace is
   * where the detail lives. Held in memory, not storage: a new browser session
   * is a new working session and being told again then is correct.
   */
  private readonly announced = new Set<string>();

  /**
   * Ask the server what is due.
   *
   * ⚠ Called when a screen is OPENED, and never on a timer. A `setInterval`
   * here would be a scheduler that only runs while a tab happens to be open —
   * the exact promise this refuses to make. See the note at the top.
   */
  refresh(options: { announce?: boolean } = {}): void {
    if (!this.auth.isSignedIn()) return;

    this.api.myTasks().subscribe({
      next: r => {
        this._reminders.set(r.reminders);
        this._overdueCount.set(r.overdueCount);
        this._evaluatedAt.set(r.evaluatedAt);
        if (options.announce) this.announce(r.reminders);
      },
      // A count that could not be fetched is UNKNOWN. Setting zero would be a
      // claim that nothing is due, which nobody knows — so the badge and the
      // list simply empty rather than reassure.
      error: () => {
        this._reminders.set([]);
        this._overdueCount.set(0);
        this._evaluatedAt.set(null);
      }
    });
  }

  private announce(reminders: Task[]): void {
    const fresh = reminders.filter(r => !this.announced.has(r._id));
    if (!fresh.length) return;
    for (const r of fresh) this.announced.add(r._id);

    const overdue = fresh.filter(r => r.overdue).length;
    const due = fresh.length - overdue;

    // Counts are rendered as LABEL: NUMBER rather than "3 reminders", which
    // would need a plural rule per language — Arabic has six and getting one
    // wrong in front of a native reader is worse than not inflecting at all.
    // Both halves always appear, so a zero is visible as a zero.
    this.toast.warning('reminder.toastTitle', {
      ar: `مستحقة قريبًا: ${due} · متأخرة: ${overdue}`,
      en: `Due soon: ${due} · Overdue: ${overdue}`
    });
  }
}

// The notification centre. spec 004 — FR-013, AD-13; §11.
//
// AD-13: "As an agent I want in-app, email and push notifications for
// assignments, mentions, replies and escalations, so I stop refreshing the list
// to see what changed." IN-APP IS THE ONLY CHANNEL THAT EXISTS — email and push
// need spec 003 — and the screen says so rather than letting an agent wait for
// an email. Same honesty rule as the task reminders, and for the same reason.
//
// Unlike reminders, these are STORED RECORDS. A notification is written at the
// instant the thing happened, inside that mutation's transaction, so the count
// is live and does not carry the "computed when you open this screen" caveat.
// The two surfaces are deliberately different in exactly this way.
//
// ── §11: `user = caller` ONLY ───────────────────────────────────────────────
//
// There is no endpoint here that takes a user id, so there is no request this
// screen could make for somebody else's notifications.
//
// ── WHAT CANNOT APPEAR YET ──────────────────────────────────────────────────
//
//   escalated        no escalation exists (spec 005)
//   sla_threshold    blocked on 005 [CLARIFY-1]
//   task_due         answered by the workspace ON REQUEST — there is no
//                    scheduler to write a row at the moment it falls due
//   delivery_failed  needs a channel that can fail (spec 003)
//   chat_offered     needs chat (spec 003 / 004 [CLARIFY-3])
//
// The kinds are still translated, so the day a producer lands the centre
// renders it rather than showing a raw key.

import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { LanguageService } from '../../core/i18n/language.service';
import { ToastService } from '../../core/notifications/toast.service';
import { NotificationCountService } from '../../core/notifications/notification-count.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { NotificationGroup } from '../../core/models/domain.model';

@Component({
  selector: 'app-notifications',
  imports: [TranslatePipe, DatePipe],
  templateUrl: './notifications.html'
})
export class Notifications {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly counts = inject(NotificationCountService);
  protected readonly i18n = inject(LanguageService);

  protected readonly groups = signal<NotificationGroup[]>([]);
  protected readonly unread = signal(0);
  protected readonly windowMinutes = signal(0);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);

  protected readonly hasUnread = computed(() => this.unread() > 0);

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.api.listNotifications().subscribe({
      next: r => {
        this.groups.set(r.notifications);
        this.unread.set(r.unread);
        this.windowMinutes.set(r.groupWindowMinutes);
        this.loading.set(false);
        this.counts.set(r.unread);
      },
      error: (e: HttpErrorResponse) => {
        this.groups.set([]); this.loading.set(false);
        this.toast.fromHttpError(e, { ar: 'تعذر تحميل الإشعارات', en: 'Could not load notifications' });
      }
    });
  }

  /** The whole group, not one member — see the endpoint's own note. */
  protected markRead(g: NotificationGroup): void {
    if (!g.unread) return;
    this.busy.set(true);
    this.api.markNotificationsRead(g.ids).subscribe({
      next: r => { this.busy.set(false); this.counts.set(r.unread); this.load(); },
      error: () => { this.busy.set(false); this.load(); }
    });
  }

  protected markAllRead(): void {
    this.busy.set(true);
    this.api.markAllNotificationsRead().subscribe({
      next: r => { this.busy.set(false); this.counts.set(r.unread); this.load(); },
      error: () => { this.busy.set(false); this.load(); }
    });
  }

  /**
   * Opening a notification marks it read and goes to the ticket.
   *
   * A notification whose ticket is no longer reachable is NOT a dead link that
   * 404s — the row stays readable and simply does not navigate. Losing scope on
   * a ticket is a real thing that happens when a role changes, and the record
   * that you were once notified is not itself a disclosure.
   */
  protected open(g: NotificationGroup): void {
    this.markRead(g);
    if (g.reachable && g.ticketId) this.router.navigate(['/tickets', g.ticketId]);
  }
}

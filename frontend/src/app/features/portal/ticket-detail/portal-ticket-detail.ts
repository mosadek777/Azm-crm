// spec 008 — one of the customer's own requests (FR-003, AS-05, AS-06).
//
// WHAT IS DELIBERATELY ABSENT FROM THIS SCREEN, and why:
//
//   Internal notes    — FR-019 (MUST). The server never sends them; the query
//                       excludes them, so there is nothing here to hide.
//   Agent identity    — 002 [CLARIFY-6], resolved 2026-09-08 (decision 29):
//                       team only, and no agent, including the replier. A
//                       message says 'you' or 'support' and nothing more.
//   Timing            — 008 [CLARIFY-2], resolved provisionally (decision 28):
//                       nothing is shown. Both alternatives are durations, and
//                       constitution III routes every duration through spec
//                       005, which is unbuilt. FR-003 stays an uncovered MUST.
//   The owning team   — FR-003 requires it and Team does not exist (decision
//                       20, extended here by decision 35).
//
// Two of those four are requirements this screen does not yet satisfy. They are
// recorded in docs/portal-plan.md rather than papered over with a placeholder.

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PortalApiService, PortalTicket, PortalMessage } from '../../../core/services/portal-api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { ApiRefusal, LocalizedText } from '../../../core/models/user.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { StatusTonePipe } from '../../../shared/pipes/status-tone.pipe';
import { ToastService } from '../../../core/notifications/toast.service';

@Component({
  selector: 'app-portal-ticket-detail',
  imports: [FormsModule, RouterLink, DatePipe, TranslatePipe, StatusTonePipe],
  templateUrl: './portal-ticket-detail.html'
})
export class PortalTicketDetail {
  private readonly toast = inject(ToastService);
  private readonly api = inject(PortalApiService);
  protected readonly i18n = inject(LanguageService);

  // ActivatedRoute, not a signal input: withComponentInputBinding() is not
  // enabled on this app's router, so an input() would never receive the route
  // parameter and the screen would sit on "Loading…" forever. This matches how
  // the staff ticket detail reads its id.
  private readonly route = inject(ActivatedRoute);
  private readonly id = this.route.snapshot.paramMap.get('id')!;

  protected readonly ticket = signal<PortalTicket | null>(null);
  protected readonly messages = signal<PortalMessage[]>([]);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);

  // FR-004. There is no visibility control, and its absence is the point: a
  // customer reply is always visible to both sides and the route has no code
  // path that could make it internal.
  protected readonly draft = signal('');
  protected readonly sending = signal(false);
  protected readonly replyRefusal = signal<LocalizedText | null>(null);

  // 002 §3: "Terminal statuses accept no reply." The box is hidden rather than
  // shown-and-refused, because a control a customer cannot use is the deeper
  // problem recorded in next-steps.md §5. The server still refuses, so this is
  // a courtesy and not the enforcement.
  protected readonly canReply = computed(() => {
    const status = this.ticket()?.status;
    return !!status && !['closed', 'merged', 'cancelled'].includes(status);
  });

  constructor() {
    this.api.myTicket(this.id).subscribe({
      next: response => {
        this.ticket.set(response.ticket);
        this.messages.set(response.messages);
        this.loading.set(false);
      },
      // A 404 here means the ticket is not theirs OR does not exist — the
      // server makes those indistinguishable on purpose (AS-02), so this
      // screen must not distinguish them either.
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      }
    });
  }

  protected sendReply() {
    if (!this.draft().trim()) return;
    this.replyRefusal.set(null);
    this.sending.set(true);

    this.api.reply(this.id, this.draft()).subscribe({
      next: response => {
        // AS-07: appended to the same thread. The server is the authority on
        // what the thread contains, but re-fetching the whole ticket to add one
        // known message would be a round trip for nothing.
        this.messages.update(list => [...list, response.message]);
        this.draft.set('');
        this.sending.set(false);
        this.toast.success('toast.replySent');
      },
      error: (error: HttpErrorResponse) => {
        this.sending.set(false);
        const body = error.error as ApiRefusal | null;
        const fallback = { ar: 'تعذر إرسال الرد', en: 'Could not send the reply' };
        this.replyRefusal.set(body?.message ?? fallback);
        this.toast.fromHttpError(error, fallback);
      }
    });
  }
}

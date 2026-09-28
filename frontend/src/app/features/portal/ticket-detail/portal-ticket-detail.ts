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

import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PortalApiService, PortalTicket, PortalMessage } from '../../../core/services/portal-api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { ApiRefusal, LocalizedText } from '../../../core/models/user.model';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { StatusTonePipe } from '../../../shared/pipes/status-tone.pipe';
import { Tag } from '../../../shared/components/tag/tag';
import { ToastService } from '../../../core/notifications/toast.service';
import { Conversation, ConversationMessage } from '../../../shared/components/conversation/conversation';
import { PollingService } from '../../../core/polling/polling.service';

@Component({
  selector: 'app-portal-ticket-detail',
  imports: [FormsModule, RouterLink, DatePipe, TranslatePipe, StatusTonePipe, Conversation, Tag],
  templateUrl: './portal-ticket-detail.html'
})
export class PortalTicketDetail implements OnDestroy {
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

  /**
   * The thread, mapped for the shared conversation component.
   *
   * ⚠ NOTHING IS FILTERED HERE, and that is the point. 008 FR-019 is enforced
   * in the QUERY — portal-ticket.service.js puts `visibility: 'customer'` in
   * the find — so an internal note never reaches this browser at all. A filter
   * at this line would mean the text had already arrived and was being hidden,
   * which is one devtools panel away from being read.
   *
   * `internal` is not set and `showVisibility` is not passed: every message a
   * customer can see is customer-visible by construction, so a chip saying so
   * would be noise, and a chip that could ever say 'internal' is exactly what
   * FR-019 forbids.
   *
   * THE AUTHOR IS A KEY, NEVER A NAME. Decision 29 resolved 002 [CLARIFY-6]:
   * a customer sees no individual agent, including the author of a reply they
   * can read. The API does not send one — `from` is 'you' or 'support' — so
   * there is no name here to leak even by accident.
   */
  protected readonly conversation = computed<ConversationMessage[]>(() =>
    this.messages().map(m => ({
      _id: m._id,
      body: m.body,
      sentAt: m.sentAt,
      fromCustomer: m.from === 'you',
      authorKey: m.from === 'you' ? 'portal.fromYou' : 'portal.fromSupport'
    })));
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);

  /**
   * The customer-facing status label — 008 FR-003, §8, constitution I.
   *
   * NO FALLBACK BETWEEN LANGUAGES. The server sends both and never chooses, so
   * this only ever picks the one the interface is in. A status key with no
   * configured label renders the same visible marker LanguageService.translate
   * uses for a missing dictionary key — never the raw key, because a raw key is
   * exactly the defect this replaced: an Arabic customer reading `resolved`.
   */
  protected statusLabel(t: PortalTicket): string {
    const label = t.statusLabel;
    if (!label) return `⟦missing label: ${t.status}⟧`;
    return this.i18n.lang() === 'ar' ? label.ar : label.en;
  }

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

  // ── 002 FR-031: THE CUSTOMER CONFIRMS CLOSURE ────────────────────────────
  //
  // Offered only on `resolved`, because that is the only transition FR-031
  // names and the only one the route accepts.
  //
  // WHAT IS NOT OFFERED HERE, and why each one is absent rather than forgotten:
  //
  //   REOPEN (008 FR-009)   — not applicable to a RESOLVED request. The window
  //                           runs from `closed`, not from `resolved`: 002
  //                           FR-022, AS-11 and decision 10 all say so, and 002
  //                           §3 was amended to agree. It is an action on a
  //                           closed ticket, and it is not built — board card
  //                           `ticket-reopen`.
  //                           ⚠ 008 E-08 contradicts this, saying a reply to a
  //                           `resolved` ticket within the window reopens it.
  //                           The contradiction is recorded in
  //                           decisions-pending.md §31 and deliberately NOT
  //                           resolved here.
  //   WITHDRAW (008 FR-014) — specified as unavailable once resolved. AS-12:
  //                           "given the ticket is already resolved,
  //                           withdrawal is not offered." Its absence IS the
  //                           requirement.
  //   RATE (008 FR-008)     — blocked on 008 [CLARIFY-3]: the scale and the
  //                           delay are an open client question, and a invented
  //                           scale would make the data incomparable across the
  //                           change point (009 FR-005 reports it as a mean).
  //                           Nothing is said about it ON THE SCREEN, because a
  //                           customer was never offered it and telling them
  //                           about our open questions is not honesty, it is
  //                           noise. It is recorded here and on the board.
  protected readonly isResolved = computed(() => this.ticket()?.status === 'resolved');
  protected readonly confirming = signal(false);

  protected confirmClosure(): void {
    if (this.confirming()) return;
    this.confirming.set(true);

    this.api.confirmClosure(this.id).subscribe({
      next: response => {
        // The server is the authority on the resulting status; the screen takes
        // what it was given rather than assuming `closed`. The reply box and
        // this panel both disappear on the next render, because both read the
        // status off the same signal.
        this.ticket.set(response.ticket);
        this.confirming.set(false);
        this.toast.success('toast.closureConfirmed');
      },
      error: (error: HttpErrorResponse) => {
        this.confirming.set(false);
        const body = error.error as ApiRefusal | null;
        const fallback = { ar: 'تعذر تأكيد الإغلاق', en: 'Could not confirm closure' };
        // Shown in the same place a reply refusal is shown — one refusal slot
        // on the screen, so two controls cannot argue about whose error is on
        // display.
        this.replyRefusal.set(body?.message ?? fallback);
        this.toast.fromHttpError(error, fallback);
      }
    });
  }

  // ── FR-021 / AD-19 AT THE NFR-003 INTERVAL ────────────────────────────────
  //
  // The portal thread did not poll at all until 2026-09-27, while the staff
  // thread beside it polled every five seconds on the same requirement. A
  // customer sitting on this screen watched a conversation that could not
  // change: support replied, and nothing arrived until they reloaded the page.
  //
  // `004 FR-021` is not written about staff — it says "an open list or
  // conversation", and this is the open conversation the customer is looking
  // at. `NFR-003`'s five seconds is ratified, so it is read from the service
  // rather than chosen here.
  private readonly polling = inject(PollingService);
  private readonly stopPolling = this.polling.register(
    () => this.pollRefresh(), this.polling.intervals.realtimeMs);

  /**
   * The poll.
   *
   * ⚠ IT TOUCHES NEITHER THE DRAFT NOR THE REFUSAL, which is the whole
   * difference between this and the constructor's first load. A customer
   * half-way through typing a reply is exactly the person this screen is for,
   * and clearing their sentence every five seconds would make the feature a
   * net loss — the same rule the staff thread's `pollRefresh()` follows, and
   * for the same reason.
   *
   * A 404 mid-session is not treated as "not found" here either. The ticket was
   * readable a moment ago; a transient failure must not replace a live thread
   * with the not-found panel. A genuine loss of access shows up on the next
   * navigation, which re-runs the constructor's load.
   */
  protected pollRefresh(): void {
    this.api.myTicket(this.id).subscribe({
      next: response => {
        this.ticket.set(response.ticket);
        this.messages.set(response.messages);
      },
      error: () => { /* keep what is on screen; see above */ }
    });
  }

  ngOnDestroy(): void {
    // The poll outlives the screen unless it is unregistered here.
    this.stopPolling();
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

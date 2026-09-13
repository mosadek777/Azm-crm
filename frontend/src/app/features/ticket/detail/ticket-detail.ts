// spec 002 — FR-007, FR-008, FR-009, FR-013, FR-014, FR-034, AS-03, AS-06,
//            AS-07, AS-15; constitution II, III
// Tailwind only, no component library (decision 24).
//
// THE STATUS CONTROL OFFERS ONLY LEGAL TRANSITIONS, and it gets them from the
// SERVER: `reachableStatuses` on the detail response is computed by
// utils/ticket-status.js from decision 22's transition graph. The client holds
// no copy of the graph. If it did, editing the graph would leave the UI
// offering moves the API refuses, and AS-03's correct refusal would look like
// a bug to the agent.

import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { StatusTonePipe } from '../../../shared/pipes/status-tone.pipe';
import { Tag } from '../../../shared/components/tag/tag';
import { CustomerContext } from '../../../shared/components/customer-context/customer-context';
import { QuickReply } from '../../../core/models/domain.model';
import { ActionTonePipe } from '../../../shared/pipes/action-tone.pipe';
import { LocalizedText } from '../../../core/models/user.model';
import {
  Ticket, Customer, TicketMessage, HistoryEntry, Sla, Visibility, TicketMeta
} from '../../../core/models/domain.model';
import { ToastService } from '../../../core/notifications/toast.service';
import { MessageBubble } from '../../../shared/components/message-bubble/message-bubble';

@Component({
  selector: 'app-ticket-detail',
  imports: [FormsModule, TranslatePipe, StatusTonePipe, ActionTonePipe, MessageBubble, Tag, DatePipe, CustomerContext],
  templateUrl: './ticket-detail.html'
})
export class TicketDetail implements OnDestroy {
  private readonly toast = inject(ToastService);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  protected readonly i18n = inject(LanguageService);
  private readonly auth = inject(AuthService);

  // RENDERING HINTS, not authorisation — the server refuses regardless and
  // re-reads permissions per request (E-04).
  //
  // An AUDITOR is read-everything, change-nothing (002 §9), so every write
  // control on this screen is refused for them, every time.
  protected readonly canWrite = computed(() => this.auth.show().ticketWrite);

  // 002 §9 splits authorship BY VISIBILITY: an ADMINISTRATOR may write an
  // internal note and may NOT speak to the customer in the organisation's
  // voice. Offering them the customer-visible option guarantees a 403 —
  // which is exactly what the demo script warns about. The option is not
  // offered; the server still refuses it if anybody sends it anyway.
  protected readonly canReplyToCustomer = computed(() => this.auth.show().customerReply);

  private readonly id = this.route.snapshot.paramMap.get('id')!;

  protected readonly ticket = signal<Ticket | null>(null);
  protected readonly customer = signal<Customer | null>(null);
  protected readonly agent = signal<{ id: string; displayName: string } | null>(null);
  protected readonly messages = signal<TicketMessage[]>([]);
  protected readonly history = signal<HistoryEntry[]>([]);
  protected readonly sla = signal<Sla | null>(null);
  protected readonly notFound = signal(false);
  protected readonly refusal = signal<LocalizedText | null>(null);
  // Off by default. The raw audit keys are evidence for an auditor, not
  // reading matter for somebody working tickets all day — and every tag
  // carries its key on the title regardless, so nothing depends on this.
  // --- quick replies (004 FR-006, AD-06) ----------------------------------
  //
  // The picker lists what the server says this caller has; inserting one
  // asks the SERVER to substitute, because the language choice and the
  // refusal rule both belong there. Nothing is substituted in the client.
  protected readonly quickReplies = signal<QuickReply[]>([]);
  protected readonly pickerOpen = signal(false);
  protected readonly inserting = signal<string | null>(null);
  /** Which language the server chose, so the screen can say so. */
  protected readonly insertedLanguage = signal<string | null>(null);

  protected readonly showEventKeys = signal(false);
  protected readonly busy = signal(false);

  // Straight from the server. Never derived, never cached, never guessed.
  protected readonly reachable = signal<string[]>([]);

  // The ratified status set with its pauses_sla flags, also server-supplied.
  protected readonly meta = signal<TicketMeta | null>(null);

  protected readonly nextStatus = signal('');
  protected readonly statusReason = signal('');
  protected readonly followUpAt = signal('');
  protected readonly assignReason = signal('');
  protected readonly reply = signal('');

  // --- draft preservation (004 FR-015, E-02, E-12, AS-09; NFR-004) -------
  //
  // The draft is the SERVER's, keyed to `user = caller` (004 §11). This
  // holds only what the screen needs to say about it.
  protected readonly draftStale = signal(false);
  protected readonly draftExpired = signal(false);
  protected readonly draftRetentionDays = signal<number | null>(null);
  /** E-02: who owns the ticket now, when it moved while this was open. */
  protected readonly draftReassignedTo = signal<string | null>(null);
  protected readonly draftSaving = signal(false);

  // NFR-004: "≤ 10s of typing, and on blur." The interval comes from the
  // server with the draft, so the number lives in one place.
  private autosaveSeconds = 8;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  /** What was last persisted, so an unchanged draft is not re-saved. */
  private lastSavedBody = '';
  // No default: FR-014 has no safe default for visibility — a defaulted value
  // is how an internal note becomes a customer reply by accident.
  protected readonly visibility = signal<Visibility | ''>('');

  constructor() {
    this.loadDraft();

    // On blur is the other half of NFR-004, and the important half: a tab
    // closing is exactly the case FR-015 exists for.
    window.addEventListener('blur', this.flushDraft);
    // Only offered where a reply can be written at all.
    this.api.listQuickReplies().subscribe({
      next: r => this.quickReplies.set(r.quickReplies),
      error: () => this.quickReplies.set([])
    });
    this.api.ticketMeta().subscribe({ next: m => this.meta.set(m) });
    this.load();
  }

  protected load(): void {
    this.api.getTicket(this.id).subscribe({
      next: r => {
        this.ticket.set(r.ticket);
        this.customer.set(r.customer);
        this.agent.set(r.assignedAgent);
        this.messages.set(r.messages);
        this.history.set(r.history);
        this.reachable.set(r.reachableStatuses);
        this.sla.set(r.sla);
        this.nextStatus.set('');
        this.statusReason.set('');
        this.followUpAt.set('');
      },
      error: (e: HttpErrorResponse) => {
        // AS-03: out of scope and non-existent are indistinguishable, on
        // purpose. This says "not found", never "forbidden".
        if (e.status === 404) { this.notFound.set(true); return; }
        this.refusal.set(e.error?.message ?? null);
      }
    });
  }

  // FR-016: the refusal the SERVER sent, never a client-authored string. The
  // inline banner this used to set has been removed from the template — it and
  // a toast said the same thing in two places.
  private readonly fail = (e: HttpErrorResponse): void => {
    this.busy.set(false);
    this.toast.fromHttpError(e, { ar: 'تعذر الاتصال بالخادم', en: 'Could not reach the server' });
  };

  protected applyStatus(): void {
    this.refusal.set(null);
    this.busy.set(true);
    this.api.changeStatus(this.id, {
      status: this.nextStatus(),
      reason: this.statusReason() || undefined,
      followUpAt: this.followUpAt() || undefined
    }).subscribe({
      next: () => { this.busy.set(false); this.toast.success('toast.statusChanged'); this.load(); },
      error: this.fail
    });
  }

  protected release(): void {
    this.refusal.set(null);
    this.busy.set(true);
    this.api.assign(this.id, { assignedAgentId: null, reason: this.assignReason() })
      .subscribe({ next: () => { this.busy.set(false); this.assignReason.set(''); this.toast.success('toast.ticketAssigned'); this.load(); }, error: this.fail });
  }

  protected claim(): void {
    this.refusal.set(null);
    this.busy.set(true);
    // FR-010: an agent may self-assign any unassigned ticket in their scope.
    // The id comes from the stored session; the server re-checks scope anyway.
    const me = JSON.parse(localStorage.getItem('azm.user') ?? 'null');
    this.api.assign(this.id, { assignedAgentId: me?.id, reason: this.assignReason() })
      .subscribe({ next: () => { this.busy.set(false); this.assignReason.set(''); this.toast.success('toast.ticketAssigned'); this.load(); }, error: this.fail });
  }

  protected send(): void {
    this.refusal.set(null);
    this.busy.set(true);
    this.api.addMessage(this.id, { body: this.reply(), visibility: this.visibility() })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.reply.set('');
          this.visibility.set('');
          this.lastSavedBody = '';
          // §10: the discard event carries its cause. The reply went out,
          // so the draft was not abandoned — it was sent.
          this.api.discardDraft(this.id, 'sent').subscribe({ error: () => {} });
          this.draftStale.set(false);
          this.toast.success('toast.messageSent');
          this.load();
        },
        error: this.fail
      });
  }

  // FR-021: a follow-up date is only valid on a status whose `pauses_sla` is
  // true. The flags are the SERVER's (decision 14) and are read from
  // /ticket/meta — an earlier version of this method hardcoded the three
  // pausing statuses, which is the same drift the transition graph is kept
  // server-side to avoid: an admin editing the status set would have left this
  // list quietly wrong.
  protected pausesSla(status: string): boolean {
    return this.meta()?.statuses.find(s => s.key === status)?.pausesSla === true;
  }
  /**
   * Insert a quick reply into the draft.
   *
   * THE SERVER SUBSTITUTES, not this. FR-006 puts two rules there — the body
   * is chosen by the CUSTOMER's preferred language, and an unresolved
   * placeholder REFUSES rather than being inserted half-done — and a second
   * implementation here would be a second place for them to be wrong.
   *
   * A 422 carries `failures` naming which token could not be resolved, and
   * that is what is shown: an agent has to know which token is wrong.
   */
  /** A quick reply's name and body are admin-authored labels: render the
   *  READER's language here. Which body is SENT is a different question, and
   *  the server answers it from the customer's preference. */
  protected label(v: LocalizedText): string {
    return this.i18n.lang() === 'ar' ? v.ar : v.en;
  }

  protected insertQuickReply(q: QuickReply): void {
    const t = this.ticket();
    if (!t) return;
    this.inserting.set(q._id);
    this.api.renderQuickReply(q._id, t._id).subscribe({
      next: r => {
        this.inserting.set(null);
        this.pickerOpen.set(false);
        this.insertedLanguage.set(r.language);
        // Appended, never replacing: an agent may have already typed.
        this.reply.update(v => (v ? v.trimEnd() + '\n\n' : '') + r.body);
      },
      error: (e: HttpErrorResponse) => {
        this.inserting.set(null);
        // Rendered as the server sent it, naming the tokens that failed.
        this.toast.fromHttpError(e, { ar: 'تعذر إدراج الرد السريع', en: 'Could not insert the quick reply' });
      }
    });
  }

  /**
   * Restore whatever this agent left here.
   *
   * Everything the screen says about the draft is the SERVER's answer:
   * whether it expired (E-12), whether the thread moved under it (AS-09),
   * and who owns the ticket now (E-02). None of it is worked out here.
   */
  private loadDraft(): void {
    this.api.getDraft(this.id).subscribe({
      next: r => {
        this.autosaveSeconds = r.autosaveSeconds ?? 8;
        this.draftStale.set(r.stale);
        this.draftExpired.set(r.expired);
        this.draftRetentionDays.set(r.retentionDays ?? null);
        this.draftReassignedTo.set(r.reassignedTo ?? null);
        if (r.draft) {
          // Never clobber something already typed in this session.
          if (!this.reply().trim()) {
            this.reply.set(r.draft.body);
            // The server stores the visibility as a free string; the signal is
            // the narrow union, so anything unrecognised falls back to the
            // blank default FR-014 requires rather than being trusted.
            const v = r.draft.visibility;
            this.visibility.set(v === 'customer' || v === 'internal' ? v : '');
            this.lastSavedBody = r.draft.body;
          }
        }
      },
      // A draft that cannot be fetched is not worth interrupting anybody
      // over — the reply box still works and the screen behind it will say
      // if the ticket itself is unreachable.
      error: () => { /* silent */ }
    });
  }

  /** Called on every keystroke; debounced to NFR-004's interval. */
  protected onReplyInput(value: string): void {
    this.reply.set(value);
    // A restored draft that has not been touched is already saved.
    if (value === this.lastSavedBody) return;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => this.flushDraft(), this.autosaveSeconds * 1000);
  }

  /** Save now. An arrow so it can be used as an event listener and removed. */
  protected flushDraft = (): void => {
    if (this.autosaveTimer) { clearTimeout(this.autosaveTimer); this.autosaveTimer = null; }
    const body = this.reply();
    if (body === this.lastSavedBody) return;
    this.draftSaving.set(true);
    this.api.saveDraft(this.id, body, this.visibility()).subscribe({
      next: () => { this.lastSavedBody = body; this.draftSaving.set(false); },
      error: () => this.draftSaving.set(false)
    });
  };

  /** Throw the draft away deliberately. §10 records the cause. */
  protected discardDraft(): void {
    if (this.autosaveTimer) { clearTimeout(this.autosaveTimer); this.autosaveTimer = null; }
    this.api.discardDraft(this.id, 'abandoned').subscribe({
      next: () => {
        this.reply.set('');
        this.visibility.set('');
        this.lastSavedBody = '';
        this.draftStale.set(false);
        this.draftReassignedTo.set(null);
      },
      error: () => { /* the box is already clear to the agent */ }
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('blur', this.flushDraft);
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
  }

}

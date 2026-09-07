// spec 002 — detail, thread, status change, assignment, reply.
//
// The status dropdown is populated from `reachableStatuses`, which the SERVER
// returns from the transition graph (FR-008). The client never holds its own
// copy of the graph — if it did, a graph change would leave the UI offering
// transitions the API refuses, and AS-03's correct refusal would look like a bug.

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LocalizedText } from '../../../core/models/user.model';
import {
  Ticket, Customer, TicketMessage, HistoryEntry, Sla, Visibility
} from '../../../core/models/domain.model';

@Component({
  selector: 'app-ticket-detail',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './ticket-detail.html'
})
export class TicketDetail {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  protected readonly i18n = inject(LanguageService);

  private readonly id = this.route.snapshot.paramMap.get('id')!;

  protected readonly ticket = signal<Ticket | null>(null);
  protected readonly customer = signal<Customer | null>(null);
  protected readonly agent = signal<{ id: string; displayName: string } | null>(null);
  protected readonly messages = signal<TicketMessage[]>([]);
  protected readonly history = signal<HistoryEntry[]>([]);
  protected readonly reachable = signal<string[]>([]);
  protected readonly sla = signal<Sla | null>(null);
  protected readonly refusal = signal<LocalizedText | null>(null);

  protected readonly nextStatus = signal('');
  protected readonly statusReason = signal('');
  protected readonly followUpAt = signal('');
  protected readonly assignReason = signal('');
  protected readonly reply = signal('');

  // No default. FR-014 has no safe default for visibility — a defaulted value
  // is how an internal note becomes a customer reply by accident.
  protected readonly visibility = signal<Visibility | ''>('');

  constructor() { this.load(); }

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
      },
      error: (e: HttpErrorResponse) => this.refusal.set(e.error?.message ?? null)
    });
  }

  private readonly fail = (e: HttpErrorResponse): void => {
    this.refusal.set(e.error?.message ?? null);
  };

  protected applyStatus(): void {
    this.refusal.set(null);
    this.api.changeStatus(this.id, {
      status: this.nextStatus(),
      reason: this.statusReason() || undefined,
      followUpAt: this.followUpAt() || undefined
    }).subscribe({ next: () => this.load(), error: this.fail });
  }

  protected release(): void {
    this.refusal.set(null);
    this.api.assign(this.id, { assignedAgentId: null, reason: this.assignReason() })
      .subscribe({ next: () => this.load(), error: this.fail });
  }

  protected send(): void {
    this.refusal.set(null);
    this.api.addMessage(this.id, { body: this.reply(), visibility: this.visibility() })
      .subscribe({
        next: () => { this.reply.set(''); this.visibility.set(''); this.load(); },
        error: this.fail
      });
  }
}

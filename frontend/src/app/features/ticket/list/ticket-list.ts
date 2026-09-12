// spec 002 — TM-07, FR-033, FR-034; list with filters
// Tailwind only, no component library (decision 24).
//
// Every row arrives already scope-filtered by the server (FR-033). The client
// filters for convenience only — never for security, and removing a client
// filter must not make anything visible that the server would refuse.

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { StatusTonePipe } from '../../../shared/pipes/status-tone.pipe';
import { Tag } from '../../../shared/components/tag/tag';
import { Ticket, TicketMeta } from '../../../core/models/domain.model';
import { LocalizedText } from '../../../core/models/user.model';

@Component({
  selector: 'app-ticket-list',
  imports: [FormsModule, TranslatePipe, StatusTonePipe, Tag],
  templateUrl: './ticket-list.html'
})
export class TicketList {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly i18n = inject(LanguageService);

  protected readonly rows = signal<Ticket[]>([]);
  protected readonly total = signal(0);
  protected readonly meta = signal<TicketMeta | null>(null);
  protected readonly busy = signal(false);
  protected readonly refusal = signal<LocalizedText | null>(null);

  protected readonly status = signal('');
  protected readonly assignee = signal('');
  protected readonly q = signal('');
  protected readonly unassigned = signal(false);
  private readonly customerId = signal('');

  // Assignee options are derived from the loaded rows rather than from
  // GET /user, which spec 010 §9 restricts to LEAD and above — an agent
  // filtering their own queue must not need a permission they do not have.
  // The trade-off is honest and worth stating: only assignees present in the
  // current result set appear.
  protected readonly assignees = computed(() => {
    const seen = new Map<string, string>();
    for (const t of this.rows()) {
      if (t.assignedAgentId && t.assignedAgentName) {
        seen.set(t.assignedAgentId, t.assignedAgentName);
      }
    }
    return [...seen].map(([id, name]) => ({ id, name }));
  });

  protected readonly visible = computed(() => {
    const a = this.assignee();
    return a ? this.rows().filter(t => t.assignedAgentId === a) : this.rows();
  });

  constructor() {
    this.customerId.set(this.route.snapshot.queryParamMap.get('customerId') ?? '');
    this.api.ticketMeta().subscribe({ next: m => this.meta.set(m) });
    this.load();
  }

  protected load(): void {
    this.busy.set(true);
    this.refusal.set(null);
    this.api.listTickets({
      status: this.status(),
      q: this.q(),
      customerId: this.customerId(),
      unassigned: this.unassigned() ? 'true' : ''
    }).subscribe({
      next: r => { this.rows.set(r.tickets); this.total.set(r.total); this.busy.set(false); },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.rows.set([]);
        this.refusal.set(e.error?.message ?? null);
      }
    });
  }

  protected open(t: Ticket): void { this.router.navigate(['/tickets', t._id]); }
  protected create(): void { this.router.navigate(['/tickets/new']); }
}

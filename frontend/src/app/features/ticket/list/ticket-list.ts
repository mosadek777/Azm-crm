// spec 002 — list with filters. Every row comes back already scope-filtered by
// the server (FR-033); the client adds no filtering of its own for security,
// only for convenience.

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { Ticket, TicketMeta } from '../../../core/models/domain.model';

@Component({
  selector: 'app-ticket-list',
  imports: [FormsModule, TranslatePipe],
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
  protected readonly status = signal('');
  protected readonly priority = signal('');
  protected readonly q = signal('');
  protected readonly unassigned = signal(false);
  private readonly customerId = signal('');

  constructor() {
    this.customerId.set(this.route.snapshot.queryParamMap.get('customerId') ?? '');
    this.api.ticketMeta().subscribe(m => this.meta.set(m));
    this.load();
  }

  protected load() {
    this.api.listTickets({
      status: this.status(),
      priority: this.priority(),
      q: this.q(),
      customerId: this.customerId(),
      unassigned: this.unassigned() ? 'true' : ''
    }).subscribe(r => { this.rows.set(r.tickets); this.total.set(r.total); });
  }

  protected open(t: Ticket) { this.router.navigate(['/tickets', t._id]); }
  protected create() { this.router.navigate(['/tickets/new']); }
}

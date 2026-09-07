// spec 002 — FR-001 / AS-01: create from customer, subject, description,
// category and priority. Nothing else is required.
//
// The customer is chosen by searching, not typed as an id — and the search is
// the same scope-filtered endpoint, so an agent cannot open a ticket against a
// customer outside their branch and department. The server refuses it anyway
// (constitution IV); this only keeps the UI honest about what is selectable.

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LocalizedText } from '../../../core/models/user.model';
import { Customer, Priority, TicketMeta } from '../../../core/models/domain.model';

@Component({
  selector: 'app-ticket-create',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './ticket-create.html'
})
export class TicketCreate {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(LanguageService);

  protected readonly meta = signal<TicketMeta | null>(null);
  protected readonly refusal = signal<LocalizedText | null>(null);
  protected readonly fields = signal<string[]>([]);
  protected readonly busy = signal(false);

  protected readonly customerTerm = signal('');
  protected readonly candidates = signal<Customer[]>([]);
  protected readonly chosen = signal<Customer | null>(null);

  protected readonly subject = signal('');
  protected readonly description = signal('');
  protected readonly category = signal('');
  // No default priority. §3 makes it required, and a silent 'normal' is a
  // judgement the agent should be making.
  protected readonly priority = signal<Priority | ''>('');
  protected readonly tags = signal('');

  constructor() {
    this.api.ticketMeta().subscribe(m => this.meta.set(m));
  }

  protected findCustomer(): void {
    const q = this.customerTerm().trim();
    if (q.length < 3) { this.candidates.set([]); return; }
    this.api.searchCustomers(q).subscribe(r => this.candidates.set(r.customers));
  }

  protected choose(c: Customer): void {
    this.chosen.set(c);
    this.candidates.set([]);
    this.customerTerm.set(c.displayName);
  }

  protected submit(): void {
    this.refusal.set(null);
    this.fields.set([]);
    this.busy.set(true);

    this.api.createTicket({
      customerId: this.chosen()?._id,
      subject: this.subject(),
      description: this.description(),
      category: this.category(),
      priority: this.priority(),
      tags: this.tags().split(',').map(t => t.trim()).filter(Boolean)
    }).subscribe({
      next: r => this.router.navigate(['/tickets', r.ticket._id]),
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.refusal.set(e.error?.message ?? null);
        this.fields.set(e.error?.fields ?? []);
      }
    });
  }

  protected get ready(): boolean {
    return Boolean(this.chosen() && this.subject().trim().length >= 3
      && this.description().trim() && this.category().trim() && this.priority());
  }
}

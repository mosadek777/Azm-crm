// spec 008 — the customer's own requests (FR-005), client side.
//
// Read-only. FR-002's "submit a request" and FR-004's "reply" are pieces X6 and
// X4; the screen says so rather than showing a button that does nothing.
//
// Nothing here filters anything for privacy. The server sends only this
// customer's tickets (§11) and only their customer-visible content (FR-019) —
// a client-side filter would be a second place for the rule to live, and the
// weaker of the two.

import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { PortalApiService, PortalTicket } from '../../../core/services/portal-api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { StatusTonePipe } from '../../../shared/pipes/status-tone.pipe';
import { Tag } from '../../../shared/components/tag/tag';

@Component({
  selector: 'app-portal-tickets',
  imports: [RouterLink, DatePipe, TranslatePipe, StatusTonePipe, Tag],
  templateUrl: './portal-tickets.html'
})
export class PortalTickets {
  private readonly api = inject(PortalApiService);
  protected readonly i18n = inject(LanguageService);

  protected readonly tickets = signal<PortalTicket[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    this.api.myTickets().subscribe({
      next: response => {
        this.tickets.set(response.tickets);
        this.loading.set(false);
      },
      // A 401 is handled by the interceptor, which signs the session out. Any
      // other failure leaves an empty list rather than a spinner forever.
      error: () => this.loading.set(false)
    });
  }
}

// spec 008 — the customer's own requests (FR-005), client side.
//
// FR-005 is three verbs — "list, SEARCH and FILTER all their own requests, open
// and closed" — and until 2026-09-27 this screen did only the first. That is
// fine at five requests and unusable at fifty, and finding last time's request
// without telephoning us is the entire point of the portal.
//
// Nothing here filters anything for privacy. The server sends only this
// customer's tickets (§11) and only their customer-visible content (FR-019) —
// a client-side filter would be a second place for the rule to live, and the
// weaker of the two. The search term and the status go TO the server for the
// same reason: they narrow inside the predicate rather than beside it.

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { PortalApiService, PortalTicket, PortalStatusFilter } from '../../../core/services/portal-api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { StatusTonePipe } from '../../../shared/pipes/status-tone.pipe';
import { Tag } from '../../../shared/components/tag/tag';

@Component({
  selector: 'app-portal-tickets',
  imports: [FormsModule, RouterLink, DatePipe, TranslatePipe, StatusTonePipe, Tag],
  templateUrl: './portal-tickets.html'
})
export class PortalTickets {
  private readonly api = inject(PortalApiService);
  protected readonly i18n = inject(LanguageService);

  protected readonly tickets = signal<PortalTicket[]>([]);
  protected readonly loading = signal(true);

  /** FR-005. Both go to the server; neither is applied here. */
  protected readonly query = signal('');
  protected readonly status = signal('');

  /**
   * The statuses this customer actually has, sent by the server with their
   * bilingual labels.
   *
   * NOT a list held here. Two reasons, and the second is the one that matters:
   * a copy in the client would drift from the administrator-authored labels the
   * rows are rendered with, so the control and the table could disagree about
   * what the same status is called; and the ten ratified keys include several a
   * customer will never see on their own requests, so offering all of them
   * would mean offering filters that can only ever return nothing.
   */
  protected readonly statuses = signal<PortalStatusFilter[]>([]);

  /** True once a term or a status is in play — drives the "no matches" copy. */
  protected readonly filtered = signal(false);

  private debounce: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.load();
  }

  /**
   * FR-005's search.
   *
   * DEBOUNCED, NOT SENT PER KEYSTROKE. A request per character would put the
   * server under ten times the load for one search and would race its own
   * answers — the fourth response can arrive before the third. 300ms is a
   * developer choice, not a ratified interval: no requirement fixes it, and it
   * is marked as chosen so nobody later reads it as specified.
   */
  protected onSearch(value: string): void {
    this.query.set(value);
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.load(), 300);
  }

  protected onStatus(value: string): void {
    this.status.set(value);
    this.load();
  }

  protected clear(): void {
    this.query.set('');
    this.status.set('');
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    const q = this.query().trim();
    const status = this.status();
    this.filtered.set(q.length > 0 || status.length > 0);

    this.api.myTickets({ q, status }).subscribe({
      next: response => {
        this.tickets.set(response.tickets);
        // The options are computed over the customer's WHOLE scope rather than
        // the filtered result, so they do not collapse to the one status the
        // customer just picked. Taken as sent rather than merged, so a status
        // whose last request was deleted stops being offered.
        this.statuses.set(response.filters?.statuses ?? []);
        this.loading.set(false);
      },
      // A 401 is handled by the interceptor, which signs the session out. Any
      // other failure leaves an empty list rather than a spinner forever.
      error: () => this.loading.set(false)
    });
  }

  /**
   * The customer-facing status label — 008 FR-003, §8, constitution I.
   *
   * NO FALLBACK BETWEEN LANGUAGES. The server sends both and never chooses, so
   * this only ever picks the one the interface is in. A status key with no
   * configured label renders the same visible marker LanguageService.translate
   * uses for a missing dictionary key — never the raw key, because a raw key is
   * exactly the defect this replaced: an Arabic customer reading `resolved`.
   *
   * Duplicated from the detail screen deliberately, following the `label()`
   * idiom already used by branches, departments, users and the staff thread. A
   * shared pipe would be the change to make when a fifth caller appears.
   */
  protected statusLabel(t: PortalTicket): string {
    const label = t.statusLabel;
    if (!label) return `⟦missing label: ${t.status}⟧`;
    return this.i18n.lang() === 'ar' ? label.ar : label.en;
  }

  /** The same rule, for an entry in the filter control. */
  protected filterLabel(s: PortalStatusFilter): string {
    if (!s.label) return `⟦missing label: ${s.key}⟧`;
    return this.i18n.lang() === 'ar' ? s.label.ar : s.label.en;
  }
}

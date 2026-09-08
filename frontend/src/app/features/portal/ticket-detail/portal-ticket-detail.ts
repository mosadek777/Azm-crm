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

import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { PortalApiService, PortalTicket, PortalMessage } from '../../../core/services/portal-api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { StatusTonePipe } from '../../../shared/pipes/status-tone.pipe';

@Component({
  selector: 'app-portal-ticket-detail',
  imports: [RouterLink, DatePipe, TranslatePipe, StatusTonePipe],
  templateUrl: './portal-ticket-detail.html'
})
export class PortalTicketDetail {
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
}

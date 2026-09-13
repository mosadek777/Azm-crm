// The customer context panel. spec 004 — FR-003, AD-03; constitution III.
//
// AD-03: "customer profile, entitlements and recent tickets beside the
// conversation, so I answer without leaving the reply box." Before this, an
// agent reading a ticket knew the customer's NAME and nothing else — every
// other question meant opening the customer record in another screen and
// losing the reply they were part-way through writing.
//
// FR-003 names six things and one obligation:
//
//   "The ticket view MUST render customer identity, contact points, segments,
//    entitlement, SLA tier and recent tickets without navigating away, and
//    MUST STATE EXPLICITLY WHEN A VALUE IS UNAVAILABLE."
//
// Three of the six do not exist yet, and that last clause is exactly what to do
// about it. Each says WHY, and the three reasons are different because the
// causes are different — reusing one sentence would state something untrue:
//
//   identity        real — spec 001
//   contact points  real — spec 001
//   recent tickets  real — the same scope-filtered ticket query
//   segments        NOT BUILT. spec 001 FR-019 defines segments; nothing
//                   implements them. Not blocked on a client answer — simply
//                   not built, and saying so is more use than an empty list.
//   entitlement     BLOCKED on the ERP (spec 011), which is out of scope for
//                   this phase. The server already answers `unavailable` with
//                   that reason; this renders it in words.
//   SLA tier        BLOCKED on 005 [CLARIFY-1], the SLA numbers per priority
//                   and per customer tier. A tier with no targets behind it
//                   would be a label pretending to mean something.
//
// ⚠ NOTHING HERE COMPUTES A DURATION. The entitlement envelope is rendered as
// it arrives, and the recent tickets carry the engine's own SLA answer.
// Constitution III, FR-019.
//
// SCOPE. Both requests are ordinary scope-checked endpoints. A customer outside
// the caller's scope answers 404 — byte-identical to absent — and this panel
// renders the not-found state rather than a partial record.

import { Component, computed, inject, input, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { StatusTonePipe } from '../../pipes/status-tone.pipe';
import { Tag } from '../tag/tag';
import { ContactPoint, Customer, Ticket } from '../../../core/models/domain.model';

@Component({
  selector: 'app-customer-context',
  imports: [TranslatePipe, StatusTonePipe, Tag],
  templateUrl: './customer-context.html'
})
export class CustomerContext {
  /** Whose context to show. */
  readonly customerId = input.required<string>();
  /** The ticket being read, so it is not listed as one of its own "recent". */
  readonly currentTicketId = input<string | null>(null);

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(LanguageService);

  protected readonly customer = signal<Customer | null>(null);
  protected readonly contactPoints = signal<ContactPoint[]>([]);
  protected readonly entitlement = signal<{ status: string; reason?: string } | null>(null);
  protected readonly recent = signal<Ticket[]>([]);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);

  /** The current ticket is not one of its own "recent tickets". */
  protected readonly otherTickets = computed(() =>
    this.recent().filter(t => t._id !== this.currentTicketId()).slice(0, 5));

  constructor() {
    // Re-fetch if the panel is pointed at a different customer.
    effect(() => {
      const id = this.customerId();
      if (!id) return;
      this.load(id);
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.notFound.set(false);

    this.api.getCustomer(id).subscribe({
      next: r => {
        this.customer.set(r.customer);
        this.contactPoints.set(r.contactPoints ?? []);
        this.entitlement.set(r.entitlement ?? null);
        this.loading.set(false);
      },
      error: (e: HttpErrorResponse) => {
        // 404 is both "absent" and "out of your scope", deliberately
        // indistinguishable (constitution IV). Either way there is nothing to
        // show, and a half-rendered panel would be worse than saying so.
        this.notFound.set(e.status === 404);
        this.loading.set(false);
      }
    });

    // Six is asked for so that five survive removing the current ticket.
    this.api.listTickets({ customerId: id, limit: '6' }).subscribe({
      next: r => this.recent.set(r.tickets),
      error: () => this.recent.set([])
    });
  }

  protected openTicket(t: Ticket): void {
    this.router.navigate(['/tickets', t._id]);
  }

  protected openCustomer(): void {
    const c = this.customer();
    if (c) this.router.navigate(['/customers', c._id]);
  }
}

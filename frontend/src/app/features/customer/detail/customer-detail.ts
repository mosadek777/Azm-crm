// spec 001 — CM-03, FR-003, FR-020, FR-023, AS-03, E-07
// Tailwind only (decision 24).
//
// AS-03 / constitution IV: an out-of-scope customer answers 404, identical to
// one that does not exist. This screen therefore shows "not found" and MUST
// NOT say "forbidden" or "no permission" — the whole point of the server
// answering 404 is that the caller cannot tell the two apart, and a UI that
// guesses "you probably lack access" leaks exactly what the 404 protects.

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { Customer, ContactPoint, Sla } from '../../../core/models/domain.model';
import { LocalizedText } from '../../../core/models/user.model';
import { ToastService } from '../../../core/notifications/toast.service';

@Component({
  selector: 'app-customer-detail',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './customer-detail.html'
})
export class CustomerDetail {
  private readonly toast = inject(ToastService);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly i18n = inject(LanguageService);

  protected readonly customer = signal<Customer | null>(null);
  protected readonly contactPoints = signal<ContactPoint[]>([]);
  protected readonly organisation = signal<Customer | null>(null);
  protected readonly entitlement = signal<Sla | null>(null);

  protected readonly notFound = signal(false);
  protected readonly refusal = signal<LocalizedText | null>(null);
  protected readonly saved = signal<string[]>([]);
  protected readonly editing = signal(false);
  protected readonly busy = signal(false);

  protected readonly editName = signal('');
  protected readonly editLang = signal<'ar' | 'en'>('en');
  protected readonly editSensitive = signal(false);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getCustomer(id).subscribe({
      next: r => {
        this.customer.set(r.customer);
        this.contactPoints.set(r.contactPoints);
        this.organisation.set(r.organisation);
        this.entitlement.set(r.entitlement);
        this.editName.set(r.customer.displayName);
        this.editLang.set(r.customer.preferredLanguage);
        this.editSensitive.set(r.customer.sensitiveFlag);
      },
      error: (e: HttpErrorResponse) => {
        // 404 means not found — out of scope or genuinely absent, and this
        // screen must not distinguish them (AS-03).
        if (e.status === 404) {
          this.notFound.set(true);
          return;
        }
        this.refusal.set(e.error?.message ?? null);
      }
    });
  }

  protected save(): void {
    const c = this.customer();
    if (!c) return;
    this.busy.set(true);
    this.refusal.set(null);
    this.saved.set([]);

    this.api.updateCustomer(c._id, {
      displayName: this.editName(),
      preferredLanguage: this.editLang(),
      sensitiveFlag: this.editSensitive()
    }).subscribe({
      next: r => {
        this.customer.set(r.customer);
        this.saved.set(r.changed);
        this.editing.set(false);
        this.busy.set(false);
        this.toast.success('toast.customerSaved');
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.toast.fromHttpError(e, { ar: 'تعذر الاتصال بالخادم', en: 'Could not reach the server' });
      }
    });
  }

  protected openTickets(): void {
    this.router.navigate(['/tickets'], { queryParams: { customerId: this.customer()?._id } });
  }
}

// spec 001 — CM-03, FR-003, FR-020. Detail plus in-place field edit.
// The entitlement panel renders whatever the API returns, including
// 'unavailable' (E-07) — never a blank and never a stale value.

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { Customer, ContactPoint, Sla } from '../../../core/models/domain.model';
import { LocalizedText } from '../../../core/models/user.model';

@Component({
  selector: 'app-customer-detail',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './customer-detail.html'
})
export class CustomerDetail {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly i18n = inject(LanguageService);

  protected readonly customer = signal<Customer | null>(null);
  protected readonly contactPoints = signal<ContactPoint[]>([]);
  protected readonly organisation = signal<Customer | null>(null);
  protected readonly entitlement = signal<Sla | null>(null);
  protected readonly refusal = signal<LocalizedText | null>(null);
  protected readonly saved = signal<string[]>([]);

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
      error: (e: HttpErrorResponse) => this.refusal.set(e.error?.message ?? null)
    });
  }

  protected save() {
    const c = this.customer();
    if (!c) return;
    this.refusal.set(null);
    this.saved.set([]);
    this.api.updateCustomer(c._id, {
      displayName: this.editName(),
      preferredLanguage: this.editLang(),
      sensitiveFlag: this.editSensitive()
    }).subscribe({
      next: r => { this.customer.set(r.customer); this.saved.set(r.changed); },
      error: (e: HttpErrorResponse) => this.refusal.set(e.error?.message ?? null)
    });
  }

  protected openTickets() {
    this.router.navigate(['/tickets'], { queryParams: { customerId: this.customer()?._id } });
  }
}

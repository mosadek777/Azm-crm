// spec 001 — CM-02, FR-002; the ranked match list from decision 7.
// E-13: nothing runs below 3 characters, and that is not an error.

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { Customer } from '../../../core/models/domain.model';

@Component({
  selector: 'app-customer-list',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './customer-list.html'
})
export class CustomerList {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(LanguageService);

  protected readonly term = signal('');
  protected readonly rows = signal<Customer[]>([]);
  protected readonly searched = signal(false);
  protected readonly busy = signal(false);

  protected search() {
    const q = this.term().trim();
    if (q.length < 3) { this.rows.set([]); this.searched.set(false); return; }
    this.busy.set(true);
    this.api.searchCustomers(q).subscribe({
      next: r => { this.rows.set(r.customers); this.searched.set(r.searched); this.busy.set(false); },
      error: () => this.busy.set(false)
    });
  }

  protected open(c: Customer) { this.router.navigate(['/customers', c._id]); }
}

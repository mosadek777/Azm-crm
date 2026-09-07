// spec 001 — CM-02, CM-03, FR-002, FR-003, FR-023
// Tailwind only, no component library (decision 24).
//
// Two modes in one screen, and the distinction is the spec's, not a UI whim:
//   - fewer than 3 characters typed  -> BROWSE a scope-filtered page (E-13:
//     "no search runs; no error" — so no error is shown either)
//   - 3 or more                      -> SEARCH, ranked (FR-002, decision 7)
// `matchedOn` is only meaningful in the second mode, so the column only
// appears there.

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { Customer } from '../../../core/models/domain.model';
import { LocalizedText } from '../../../core/models/user.model';

type SortKey = 'displayName' | 'type' | 'nationalId';

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
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = signal(25);
  protected readonly busy = signal(false);
  protected readonly refusal = signal<LocalizedText | null>(null);

  protected readonly sortKey = signal<SortKey>('displayName');
  protected readonly sortAsc = signal(true);

  constructor() {
    this.load();
  }

  // Sorting is client-side over the returned page, deliberately: the search
  // path returns a RANKED list (phone, then email, then national ID, then
  // name — decision 7), and re-sorting the whole result set server-side would
  // throw that ranking away. Browse mode is a plain page, so sorting it here
  // is honest.
  protected readonly sorted = computed(() => {
    const key = this.sortKey();
    const dir = this.sortAsc() ? 1 : -1;
    return [...this.rows()].sort((a, b) => {
      const av = (a[key] ?? '') as string;
      const bv = (b[key] ?? '') as string;
      return av.localeCompare(bv, this.i18n.lang()) * dir;
    });
  });

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.limit())));

  protected load(): void {
    this.busy.set(true);
    this.refusal.set(null);
    this.api.searchCustomers(this.term().trim(), this.page(), this.limit()).subscribe({
      next: r => {
        this.rows.set(r.customers);
        this.searched.set(r.searched);
        this.total.set(r.total ?? r.customers.length);
        this.busy.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.rows.set([]);
        this.refusal.set(e.error?.message ?? null);
      }
    });
  }

  protected search(): void {
    this.page.set(1);
    this.load();
  }

  protected sortBy(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortAsc.set(!this.sortAsc());
    } else {
      this.sortKey.set(key);
      this.sortAsc.set(true);
    }
  }

  protected goToPage(next: number): void {
    if (next < 1 || next > this.pageCount()) return;
    this.page.set(next);
    this.load();
  }

  protected open(c: Customer): void {
    this.router.navigate(['/customers', c._id]);
  }

  protected create(): void {
    this.router.navigate(['/customers/new']);
  }
}

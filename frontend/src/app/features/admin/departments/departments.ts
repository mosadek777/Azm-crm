// Administration — departments. spec 012 FR-007, FR-004, FR-015.
//
// The same three rules as the branches screen, for the same reasons — see
// branches.ts for the full reasoning. A department is a branch without a
// timezone or a default locale, which is the only reason these are two files
// rather than one: the shared parts are the API service, the toast surface and
// the translate pipe, and a configuration-driven "generic admin list" for two
// screens would be harder to read than either of them.
//
//   1. SCOPE — the list arrives already filtered by the server.
//   2. DEACTIVATE, NEVER DELETE — the API offers no delete and neither does this.
//   3. BOTH LANGUAGES OR NEITHER — the name is administrator-authored.

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { Department } from '../../../core/models/domain.model';
import { LocalizedText } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-departments',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './departments.html'
})
export class AdminDepartments {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly i18n = inject(LanguageService);

  protected readonly rows = signal<Department[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal<string | null>(null);

  protected readonly creating = signal(false);
  protected readonly nameAr = signal('');
  protected readonly nameEn = signal('');
  protected readonly refusal = signal<LocalizedText | null>(null);

  protected readonly activeCount = computed(() => this.rows().filter(d => d.active).length);

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.api.listDepartments().subscribe({
      next: r => { this.rows.set(r.departments); this.loading.set(false); },
      error: (e: HttpErrorResponse) => {
        this.loading.set(false);
        this.toast.fromHttpError(e, { ar: 'تعذر الاتصال بالخادم', en: 'Could not reach the server' });
      }
    });
  }

  protected readonly canSubmit = computed(() =>
    this.nameAr().trim().length > 0 && this.nameEn().trim().length > 0);

  protected submit(): void {
    if (!this.canSubmit()) return;
    this.refusal.set(null);
    this.busy.set('create');
    this.api.createDepartment({ name: { ar: this.nameAr().trim(), en: this.nameEn().trim() } })
      .subscribe({
        next: r => {
          this.busy.set(null);
          this.creating.set(false);
          this.nameAr.set(''); this.nameEn.set('');
          this.toast.success('admin.departmentCreated', r.department.name);
          this.load();
        },
        error: (e: HttpErrorResponse) => {
          this.busy.set(null);
          this.refusal.set(e.error?.message ?? null);
          this.toast.fromHttpError(e, { ar: 'تعذر إنشاء القسم', en: 'Could not create the department' });
        }
      });
  }

  protected toggleActive(d: Department): void {
    this.busy.set(d._id);
    this.api.setDepartmentActive(d._id, !d.active).subscribe({
      next: r => {
        this.busy.set(null);
        // Replace in place rather than refetching, so the table does not
        // reorder under the cursor.
        this.rows.update(list => list.map(x => x._id === r.department._id ? r.department : x));
        this.toast.success(r.department.active ? 'admin.reactivated' : 'admin.deactivated', r.department.name);
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(null);
        this.toast.fromHttpError(e, { ar: 'تعذر تغيير الحالة', en: 'Could not change the state' });
      }
    });
  }

  protected label(v: LocalizedText): string {
    return this.i18n.lang() === 'ar' ? v.ar : v.en;
  }
}

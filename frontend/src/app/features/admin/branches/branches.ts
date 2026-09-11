// Administration — branches. spec 012 FR-008, FR-004, FR-015.
//
// Until this screen existed, the honest answer to "how do I add a branch?" was
// "send an API request".
//
// THREE THINGS ARE BUILT IN RATHER THAN ADDED AFTER:
//
// 1. SCOPE. The list comes from the server already filtered to what the caller
//    may see; this component does no filtering of its own and could not widen
//    the result if it tried. An administrator attached to one branch sees one
//    branch here.
//
// 2. DEACTIVATE, NEVER DELETE. The API offers no delete at all, and neither
//    does this screen. A branch is referenced by every record created in it and
//    throughout the audit trail, so removing one would strand those records and
//    break the trail. Deactivation is reversible, which is why it is safe to
//    offer and why the control is a toggle rather than a destructive action.
//
// 3. BOTH LANGUAGES OR NEITHER. The name is an administrator-authored label, so
//    the server refuses a save carrying only one language. The form asks for
//    both and the refusal is rendered as the server sent it, rather than being
//    pre-empted here — one rule, enforced in one place.

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { Branch } from '../../../core/models/domain.model';
import { LocalizedText } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-branches',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './branches.html'
})
export class AdminBranches {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly i18n = inject(LanguageService);

  protected readonly rows = signal<Branch[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal<string | null>(null);

  // The create form.
  protected readonly creating = signal(false);
  protected readonly nameAr = signal('');
  protected readonly nameEn = signal('');
  protected readonly timezone = signal('Africa/Cairo');
  protected readonly defaultLocale = signal<'ar' | 'en'>('ar');
  protected readonly refusal = signal<LocalizedText | null>(null);

  protected readonly activeCount = computed(() => this.rows().filter(b => b.active).length);

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.api.listBranches().subscribe({
      next: r => { this.rows.set(r.branches); this.loading.set(false); },
      error: (e: HttpErrorResponse) => {
        this.loading.set(false);
        this.toast.fromHttpError(e, { ar: 'تعذر الاتصال بالخادم', en: 'Could not reach the server' });
      }
    });
  }

  protected readonly canSubmit = computed(() =>
    this.nameAr().trim().length > 0 &&
    this.nameEn().trim().length > 0 &&
    this.timezone().trim().length > 0);

  protected submit(): void {
    if (!this.canSubmit()) return;
    this.refusal.set(null);
    this.busy.set('create');
    this.api.createBranch({
      name: { ar: this.nameAr().trim(), en: this.nameEn().trim() },
      timezone: this.timezone().trim(),
      defaultLocale: this.defaultLocale()
    }).subscribe({
      next: r => {
        this.busy.set(null);
        this.creating.set(false);
        this.nameAr.set(''); this.nameEn.set('');
        this.toast.success('admin.branchCreated', r.branch.name);
        this.load();
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(null);
        // The server's own refusal — including the single-language one, which
        // is the rule this form most often meets.
        this.refusal.set(e.error?.message ?? null);
        this.toast.fromHttpError(e, { ar: 'تعذر إنشاء الفرع', en: 'Could not create the branch' });
      }
    });
  }

  protected toggleActive(b: Branch): void {
    this.busy.set(b._id);
    this.api.setBranchActive(b._id, !b.active).subscribe({
      next: r => {
        this.busy.set(null);
        // Replace in place rather than refetching: the server has told us the
        // new state, and a refetch would reorder the table under the cursor.
        this.rows.update(list => list.map(x => x._id === r.branch._id ? r.branch : x));
        this.toast.success(r.branch.active ? 'admin.reactivated' : 'admin.deactivated', r.branch.name);
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(null);
        this.toast.fromHttpError(e, { ar: 'تعذر تغيير الحالة', en: 'Could not change the state' });
      }
    });
  }

  /** Administrator-authored labels carry both languages; render the reader's. */
  protected label(v: LocalizedText): string {
    return this.i18n.lang() === 'ar' ? v.ar : v.en;
  }
}

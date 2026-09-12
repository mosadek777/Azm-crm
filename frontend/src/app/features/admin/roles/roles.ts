// Administration — roles. spec 010 FR-002, FR-005, FR-021, §11.
//
// THIS SCREEN IS A REFERENCE, NOT AN EDITOR, and that is not a shortcut.
//
// Roles are five code constants — `ROLES` in
// backend/src/DB/models/role-assignment.model.js — and there is no endpoint to
// create, rename or delete one. FR-002 is the reason it stays that way:
// "Permissions MUST be assigned through roles only. Per-user permission
// overrides MUST NOT exist." A screen that let an administrator invent a sixth
// role, or tick an extra permission onto one person, would be building exactly
// the thing that requirement forbids.
//
// test-cases/010 SEC-11 already says this in as many words: everything
// configurable here is a code constant and there is no interface for it. This
// screen makes that visible rather than leaving somebody to discover it by
// hunting for a button.
//
// WHAT IT DOES SHOW, and why each part earns its place:
//
//   - what each role is for, so "give them LEAD" is a decision somebody can
//     make without reading the permission matrix in spec 010 §11;
//   - who currently holds each, counted from the SAME scope-filtered list the
//     users screen renders. An administrator attached to one branch sees the
//     holders in their own scope and no others — the count is not a global
//     total and the page says so.
//
// The holder counts come from `GET /user`, which returns role codes only. No
// second endpoint was added for this: a count that disagreed with the users
// screen would be worse than no count.

import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { Role, StaffUser } from '../../../core/models/user.model';

const ALL_ROLES: Role[] = ['AGT', 'LEAD', 'MGR', 'ADM', 'AUD'];

export interface RoleRow {
  code: Role;
  holders: StaffUser[];
}

@Component({
  selector: 'app-admin-roles',
  imports: [TranslatePipe],
  templateUrl: './roles.html'
})
export class AdminRoles {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly i18n = inject(LanguageService);

  protected readonly users = signal<StaffUser[]>([]);
  protected readonly loading = signal(true);

  // Holders are the ACTIVE users only. A deactivated account still carries its
  // assignments, so counting it would answer "who was given this" when the
  // question the page asks is "who holds it".
  protected readonly rows = computed<RoleRow[]>(() =>
    ALL_ROLES.map(code => ({
      code,
      holders: this.users().filter(u => u.state === 'active' && u.roles.includes(code))
    })));

  constructor() {
    this.api.listUsers().subscribe({
      next: r => { this.users.set(r.users); this.loading.set(false); },
      error: (e: HttpErrorResponse) => {
        this.loading.set(false);
        this.toast.fromHttpError(e, { ar: 'تعذر الاتصال بالخادم', en: 'Could not reach the server' });
      }
    });
  }
}

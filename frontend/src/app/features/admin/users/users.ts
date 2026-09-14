// Administration — staff users. spec 010 FR-001, FR-002, FR-021, AS-01, AS-04.
//
// Until this screen existed, creating a colleague's account meant composing a
// POST by hand with two ObjectIds nobody has memorised.
//
// FOUR THINGS ARE BUILT IN RATHER THAN ADDED AFTER:
//
// 1. SCOPE ON THE LIST. `GET /user` returns users whose assignments overlap the
//    caller's own scope. This component does no filtering and could not widen
//    the result if it tried.
//
// 2. THE PICKER OFFERS ONLY WHAT CAN BE GRANTED — and does so WITHOUT deciding
//    anything itself. `GET /platform/branches` is filtered by
//    `selfScopedFilter`, which reads the same `reachableScope(assignments)`
//    that bounds `resolveGrantedScope`. So the list an administrator can SEE
//    is, by construction, the list they may GRANT. The screen agrees with the
//    server because it asked the server, not because it reimplemented FR-021.
//    An excessive grant is still refused 403 server-side, and that refusal is
//    rendered here as the server sent it.
//
//    WHY NOT SEND NO SCOPE AT ALL. An omitted scope resolves to the granter's
//    own (AS-04), which would also be correct — but it would mean the form
//    never shows what is being granted. Making the grant visible and explicit
//    is most of the reason to have a screen at all.
//
// 3. DEACTIVATE, NEVER DELETE. FR-001: "Deletion MUST NOT be offered." A user's
//    name is attached to tickets and to every audit entry they caused. Two
//    refusals are the server's to make and are rendered as sent: the last
//    active administrator (E-01) and deactivating your own account (E-02).
//
// 4. THE PASSWORD IS PINNED LTR. Decision 38: a password is a direction-neutral
//    value, and an Arabic layout otherwise renders a trailing underscore at the
//    visual start — what was typed and what is seen disagree.
//
// ROLES CAN NOW BE CHANGED IN PLACE (2026-09-14). Until then, changing somebody's
// role meant deleting the account and recreating it, which changed their id and
// orphaned every ticket and audit entry naming them.
//
// FOUR REFUSALS come back from the server and are rendered as it wrote them:
//
//   the last role          decision 43 — an account that signs in and can reach
//                          nothing is worse than a refusal that says why
//   the last administrator E-01, extended from deactivation to revocation
//   your own roles         E-02 by analogy; another administrator must do it
//   an excessive grant     FR-021 / AS-04
//
// The screen does not pre-empt any of them except the one it can state without
// guessing: it does not offer the controls on your own row, because that
// refusal depends only on who you are.

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { Branch, Department } from '../../../core/models/domain.model';
import { Language, LocalizedText, Role, StaffUser } from '../../../core/models/user.model';

const ALL_ROLES: Role[] = ['AGT', 'LEAD', 'MGR', 'ADM', 'AUD'];

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './users.html'
})
export class AdminUsers {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly i18n = inject(LanguageService);
  private readonly auth = inject(AuthService);

  /**
   * Whether to OFFER the controls that create and deactivate. Not whether
   * they are allowed — the server decides that per request (E-04) and
   * refuses regardless of what this says.
   *
   * It matters even behind the route guard. Listing branches, departments
   * and staff is open below ADM (010 §9, 012 §9), so a lead or an auditor
   * can legitimately READ this screen and can never use a single one of
   * its buttons. Showing them a form whose save is refused every time is
   * the defect; a read-only screen is the honest answer.
   */
  protected readonly canManage = computed(() => this.auth.show().administration);

  protected readonly rows = signal<StaffUser[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal<string | null>(null);

  /** What this administrator may grant — the server's answer, not ours. */
  protected readonly branches = signal<Branch[]>([]);
  protected readonly departments = signal<Department[]>([]);

  protected readonly creating = signal(false);
  protected readonly displayName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly defaultLanguage = signal<Language>('ar');
  protected readonly roles = signal<Role[]>([]);
  protected readonly branchIds = signal<string[]>([]);
  protected readonly departmentIds = signal<string[]>([]);
  protected readonly refusal = signal<LocalizedText | null>(null);

  protected readonly allRoles = ALL_ROLES;

  // --- role assignment (010 §10, §11; decision 43) ---

  /** Which row has its role panel open. One at a time. */
  protected readonly managingRoles = signal<string | null>(null);
  protected readonly roleToGrant = signal<Role | ''>('');
  /** The last revocation's stranded count, shown until the panel closes. */
  protected readonly stranded = signal<{ userId: string; count: number } | null>(null);

  /** Their own row. The one refusal this screen can state without guessing. */
  protected readonly me = computed(() => this.auth.user()?.id ?? '');

  protected rolesFor(u: StaffUser): Role[] { return (u.roles ?? []) as Role[]; }

  /** Roles they do not already hold — the same list the server would accept. */
  protected grantable(u: StaffUser): Role[] {
    return ALL_ROLES.filter(r => !this.rolesFor(u).includes(r));
  }

  protected toggleRolePanel(u: StaffUser): void {
    this.managingRoles.set(this.managingRoles() === u._id ? null : u._id);
    this.roleToGrant.set('');
    this.stranded.set(null);
    this.refusal.set(null);
  }

  protected grant(u: StaffUser): void {
    const role = this.roleToGrant();
    if (!role) return;
    this.busy.set(u._id);
    this.refusal.set(null);
    // NO SCOPE IS SENT. FR-021: an omitted scope resolves to the GRANTER's own
    // scope, server-side, and never to "all". Sending one from here would be a
    // scope decision made in the client.
    this.api.grantRole(u._id, role).subscribe({
      next: () => {
        this.busy.set(null);
        this.roleToGrant.set('');
        this.toast.success('admin.roleGranted');
        this.load();
      },
      error: (e: HttpErrorResponse) => this.failRole(e)
    });
  }

  protected revoke(u: StaffUser, role: Role): void {
    this.busy.set(u._id);
    this.refusal.set(null);
    this.api.revokeRole(u._id, role).subscribe({
      next: r => {
        this.busy.set(null);
        this.toast.success('admin.roleRevoked');
        // Reported, not refused. 002 E-12 covers deactivation and says nothing
        // about a role change, so nothing was moved — the number is here so
        // somebody can decide what to do about it.
        this.stranded.set(r.strandedTickets > 0 ? { userId: u._id, count: r.strandedTickets } : null);
        this.load();
      },
      error: (e: HttpErrorResponse) => this.failRole(e)
    });
  }

  /** The server's refusal, bilingual, rendered as it was written. */
  private failRole(e: HttpErrorResponse): void {
    this.busy.set(null);
    const message = e.error?.message;
    if (message?.ar && message?.en) this.refusal.set(message);
    else this.toast.fromHttpError(e, { ar: 'تعذر تغيير الأدوار', en: 'Could not change the roles' });
  }
  protected readonly activeCount = computed(() => this.rows().filter(u => u.state === 'active').length);

  constructor() {
    this.load();
    // Only ACTIVE branches and departments are offered as grant targets: an
    // inactive branch is not somewhere to put a new person.
    this.api.listBranches().subscribe({
      next: r => this.branches.set(r.branches.filter(b => b.active)),
      error: () => this.branches.set([])
    });
    this.api.listDepartments().subscribe({
      next: r => this.departments.set(r.departments.filter(d => d.active)),
      error: () => this.departments.set([])
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.api.listUsers().subscribe({
      next: r => { this.rows.set(r.users); this.loading.set(false); },
      error: (e: HttpErrorResponse) => {
        this.loading.set(false);
        this.toast.fromHttpError(e, { ar: 'تعذر الاتصال بالخادم', en: 'Could not reach the server' });
      }
    });
  }

  protected toggleRole(role: Role): void {
    this.roles.update(v => v.includes(role) ? v.filter(x => x !== role) : [...v, role]);
  }

  protected toggleBranch(id: string): void {
    this.branchIds.update(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);
  }

  protected toggleDepartment(id: string): void {
    this.departmentIds.update(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);
  }

  // The password LENGTH is deliberately not checked here. The policy lives in
  // config/security-policy.js and is enforced where the password is set; a
  // second copy in the client would drift from it and refuse for the wrong
  // reason. The server's refusal names the rule that failed, and it is rendered.
  protected readonly canSubmit = computed(() =>
    this.displayName().trim().length > 0 &&
    this.email().trim().length > 0 &&
    this.password().length > 0 &&
    this.roles().length > 0 &&
    this.branchIds().length > 0 &&
    this.departmentIds().length > 0);

  protected submit(): void {
    if (!this.canSubmit()) return;
    this.refusal.set(null);
    this.busy.set('create');
    this.api.createUser({
      displayName: this.displayName().trim(),
      email: this.email().trim(),
      password: this.password(),
      defaultLanguage: this.defaultLanguage(),
      roles: this.roles(),
      scope: { branchIds: this.branchIds(), departmentIds: this.departmentIds() }
    }).subscribe({
      next: r => {
        this.busy.set(null);
        this.creating.set(false);
        this.displayName.set(''); this.email.set(''); this.password.set('');
        this.roles.set([]); this.branchIds.set([]); this.departmentIds.set([]);
        this.toast.success('admin.userCreated', { ar: r.user.displayName, en: r.user.displayName });
        this.load();
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(null);
        // Whatever the server refused on: the password policy, a duplicate
        // address, or a scope wider than the granter's own (403, FR-021).
        this.refusal.set(e.error?.message ?? null);
        this.toast.fromHttpError(e, { ar: 'تعذر إنشاء المستخدم', en: 'Could not create the user' });
      }
    });
  }

  protected toggleActive(u: StaffUser): void {
    const next = u.state !== 'active';
    this.busy.set(u._id);
    this.api.setUserActive(u._id, next).subscribe({
      next: r => {
        this.busy.set(null);
        this.rows.update(list => list.map(x => x._id === r.user._id ? { ...x, ...r.user } : x));
        this.toast.success(next ? 'admin.reactivated' : 'admin.deactivated',
          { ar: u.displayName, en: u.displayName });
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(null);
        // E-01 (last administrator) and E-02 (your own account) arrive here as
        // 409 carrying a bilingual message. Rendered as sent — the rule lives
        // on the server and this screen does not second-guess which it was.
        this.toast.fromHttpError(e, { ar: 'تعذر تغيير الحالة', en: 'Could not change the state' });
      }
    });
  }

  protected label(v: LocalizedText): string {
    return this.i18n.lang() === 'ar' ? v.ar : v.en;
  }
}

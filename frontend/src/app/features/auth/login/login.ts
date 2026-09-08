// spec 010 — implements SEC-06, FR-006 (local path), client side
// spec 012 — implements FR-001, FR-002, AS-01 (this screen's surface)
//
// Tailwind only — no component library. See docs/decisions-pending.md
// decision 24 for why PrimeNG was removed.
//
// There is no register screen and no link to one. Spec 010 FR-001 makes user
// creation an administrator action and E-08 forbids automatic account creation,
// so the screen says so rather than leaving the user hunting for a link.
//
// Refusal text comes from the SERVER, already bilingual ({ ar, en } per spec
// 010 §8). The client picks the active language from it; it does not translate
// it. That is why a wrong password shows the server's wording and a missing
// field shows the dictionary's.

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { PasswordField } from '../../../shared/components/password-field/password-field';
import { ApiRefusal, LocalizedText } from '../../../core/models/user.model';

@Component({
  selector: 'app-login',
  imports: [FormsModule, TranslatePipe, PasswordField],
  templateUrl: './login.html'
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(LanguageService);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly submitting = signal(false);
  protected readonly refusal = signal<LocalizedText | null>(null);

  protected submit() {
    this.refusal.set(null);
    this.submitting.set(true);

    this.auth.login(this.email(), this.password()).subscribe({
      next: () => this.router.navigate(['/']),
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        const body = error.error as ApiRefusal | null;
        this.refusal.set(
          body?.message ?? {
            ar: 'تعذر الاتصال بالخادم',
            en: 'Could not reach the server'
          }
        );
      }
    });
  }
}

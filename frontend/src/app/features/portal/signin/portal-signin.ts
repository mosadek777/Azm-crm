// spec 008 — customer sign-in (FR-001, AS-01), client side.
//
// DEMO SHORTCUT (decision 31): a password, not a one-time code. Decision 26
// stands as the target — one-time code to a verified email or phone — and this
// screen is measured against it, not a revision of it.
//
// No register link, because who creates a portal identity is NOT SPECIFIED:
// 008 §3 defines the entity, E-02 mentions registration only as something
// [CLARIFY-1] would decide, and no requirement provides a route. The screen
// says accounts are arranged by us rather than offering a link to nothing.
//
// The refusal text comes from the SERVER, already bilingual. The client picks
// the active language from it and does not translate it — and the server's
// refusal is deliberately identical for every failure (E-02), so this screen
// cannot reveal whether an address is known to us even if it wanted to.

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PortalAuthService } from '../../../core/auth/services/portal-auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ApiRefusal, LocalizedText } from '../../../core/models/user.model';

@Component({
  selector: 'app-portal-signin',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './portal-signin.html'
})
export class PortalSignin {
  private readonly portalAuth = inject(PortalAuthService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(LanguageService);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly refusal = signal<LocalizedText | null>(null);

  protected submit() {
    this.refusal.set(null);
    this.submitting.set(true);

    this.portalAuth.signIn(this.email(), this.password()).subscribe({
      next: () => this.router.navigate(['/portal/tickets']),
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        const body = error.error as ApiRefusal | null;
        this.refusal.set(body?.message ?? {
          ar: 'تعذر الاتصال بالخادم',
          en: 'Could not reach the server'
        });
      }
    });
  }
}

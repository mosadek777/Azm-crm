// spec 010 — wraps the unauthenticated staff surface. Sign-in only: FR-001
// makes user creation an administrator action and E-08 forbids self-registration.
//
// It carries the same header as the signed-in staff shell, for two reasons.
// Without one the sign-in card floated on an empty page while every other
// screen in the product had a bar, which read as a different application. And
// the header is where a person learns WHICH application they are looking at —
// staff and portal share a host and look alike, so the answer has to be present
// before anyone signs in, not after.
//
// The language toggle lives here rather than on the card, so there is exactly
// one of it on the page (FR-011 still holds: switchable at any time).

import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ToastHost } from '../../shared/components/toast-host/toast-host';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, TranslatePipe, ToastHost],
  templateUrl: './auth-layout.html'
})
export class AuthLayout {
  protected readonly i18n = inject(LanguageService);
}

// spec 008 — the portal shell (FR-011, FR-012).
//
// Deliberately unlike MainLayout: no navigation to customers, tickets or any
// staff surface. A customer's whole portal is their own requests.
//
// TWO THINGS THIS SHELL IS CAREFUL ABOUT.
//
// It renders NOTHING customer-specific until a session exists. The sign-in page
// is a child of this shell, so an unconditional header put a customer's name
// and a Sign out button on the page where nobody has signed in yet — and worse,
// it did so on the strength of a cached object that may describe a session the
// server has long since forgotten.
//
// It carries the ONLY language toggle. FR-011 requires the portal to be
// "switchable at any time", which the shell satisfies for every screen inside
// it; a second toggle on the sign-in card was two controls doing one job.
//
// `verify()` on construction turns a stale cached session into a signed-out one
// at load, instead of at the first screen that happens to need data.

import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';
import { PortalAuthService } from '../../core/auth/services/portal-auth.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-portal-layout',
  imports: [RouterOutlet, RouterLink, TranslatePipe],
  templateUrl: './portal-layout.html'
})
export class PortalLayout {
  protected readonly i18n = inject(LanguageService);
  protected readonly portalAuth = inject(PortalAuthService);

  constructor() {
    this.portalAuth.verify();
  }
}

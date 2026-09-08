// spec 008 — the portal shell (FR-011, FR-012).
//
// Deliberately unlike MainLayout: no navigation to customers, tickets or any
// staff surface. A customer's whole portal is their own requests, so the shell
// carries the product name, the language switch and sign-out, and nothing else.

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
}

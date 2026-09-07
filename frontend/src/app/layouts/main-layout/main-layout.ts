// spec 010 — implements FR-001 (session surface); spec 012 — FR-001, FR-002
// The page shell: header, footer, content centred between them.
// Tailwind only — see docs/decisions-pending.md decision 24.

import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './main-layout.html'
})
export class MainLayout {
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(LanguageService);

  protected readonly userMenuOpen = signal(false);

  protected initials(name: string | undefined): string {
    if (!name) return '?';
    return name.trim().charAt(0).toUpperCase();
  }

  protected signOut(): void {
    this.userMenuOpen.set(false);
    this.auth.signOut();
  }
}

// spec 010 — implements FR-001 (session surface); spec 012 — FR-001, FR-002
// The page shell: header, footer, content centred between them.
// Tailwind only — see docs/decisions-pending.md decision 24.

import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ToastHost } from '../../shared/components/toast-host/toast-host';
import { Sidebar } from '../sidebar/sidebar';
import { SidebarState } from '../sidebar/sidebar-state';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, TranslatePipe, ToastHost, Sidebar],
  templateUrl: './main-layout.html'
})
export class MainLayout {
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(LanguageService);
  protected readonly sidebar = inject(SidebarState);

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

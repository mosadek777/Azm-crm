// spec 010 — implements FR-001 (session surface); spec 012 — FR-001, FR-002
// Wraps the authenticated staff workspace.

import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout {
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(LanguageService);
}

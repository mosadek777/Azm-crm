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

import { Component, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';
import { PortalAuthService } from '../../core/auth/services/portal-auth.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ToastHost } from '../../shared/components/toast-host/toast-host';
import { AuthBackdrop } from '../../shared/components/auth-backdrop/auth-backdrop';

@Component({
  selector: 'app-portal-layout',
  imports: [RouterOutlet, RouterLink, TranslatePipe, ToastHost, AuthBackdrop],
  templateUrl: './portal-layout.html'
})
export class PortalLayout {
  protected readonly i18n = inject(LanguageService);
  protected readonly portalAuth = inject(PortalAuthService);

  // ⚠ ONE COMPUTED PER DECISION, and the WHOLE class string in each.
  //
  // The header note above used to say this shell's header is identical signed
  // in and signed out, and that a second layout component would only have
  // duplicated it. That stopped being true when the signed-out state became a
  // dark photograph: the bar is transparent over an image before sign-in and a
  // white bar on a light page after it.
  //
  // It is still ONE shell, because splitting it would mean a second route
  // branch and a second guard arrangement for the sake of a few classes. But
  // the difference is now real, so it is expressed as computed strings rather
  // than as a static class plus a bound override — those tie at equal
  // specificity and the cascade decides, which is how the staff sidebar came
  // out 155px wide. See the frontend-design skill, RTL rule 4.
  private readonly signedOut = computed(() => !this.portalAuth.isSignedIn());

  protected readonly shellClasses = computed(() =>
    this.signedOut()
      ? 'relative flex min-h-svh flex-col overflow-hidden bg-surface-950'
      : 'flex min-h-svh flex-col bg-surface-100');

  protected readonly headerClasses = computed(() =>
    this.signedOut()
      ? 'relative border-b border-white/10 border-t-4 border-t-primary-600'
      : 'border-b border-surface-200 border-t-4 border-t-primary-600 bg-surface-0');

  protected readonly brandClasses = computed(() =>
    this.signedOut()
      ? 'text-lg font-semibold text-white no-underline drop-shadow-sm'
      : 'text-lg font-semibold text-primary-700 no-underline');

  protected readonly pillClasses = computed(() =>
    this.signedOut()
      ? 'rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium text-white'
      : 'rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-600');

  protected readonly langClasses = computed(() =>
    this.signedOut()
      ? 'rounded-md px-2.5 py-1.5 font-medium text-white/80 hover:bg-white/10 hover:text-white'
        + ' motion-safe:transition-colors focus:outline-none focus-visible:ring-2'
        + ' focus-visible:ring-primary-500'
      : 'rounded-md px-2.5 py-1.5 font-medium text-primary-600 hover:bg-primary-50'
        + ' hover:text-primary-700 motion-safe:transition-colors focus:outline-none'
        + ' focus-visible:ring-2 focus-visible:ring-primary-500');

  // Signed in: the content column every other portal screen uses. Signed out:
  // the two-column auth composition, which becomes one column below lg.
  protected readonly mainClasses = computed(() =>
    this.signedOut()
      ? 'relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center'
        + ' gap-12 px-5 py-14 lg:flex-row lg:justify-between lg:gap-20 lg:px-8'
      : 'mx-auto w-full max-w-6xl flex-1 px-4 py-6');

  protected readonly outletClasses = computed(() =>
    this.signedOut() ? 'w-full max-w-md' : 'contents');

  constructor() {
    this.portalAuth.verify();
  }
}

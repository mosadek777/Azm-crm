// Proposed spec 012 FR-016 / story PLT-15 — the in-app feedback surface.
//
// One host, mounted once per shell, rendering whatever the ToastService holds.
// Both interfaces use the same component: a customer and an agent get the same
// affordance, mirrored the same way, for the same reason `012 FR-012` names the
// agent workspace and the customer portal in one breath.
//
// ⚠ NOT WIRED TO ANY ACTION YET. The look is being agreed before call sites are
// touched, so that a restyle later is one file rather than every screen.
//
// ACCESSIBILITY, because this is a new hand-rolled component and that is
// exactly where it goes missing:
//   - the host is a live region, so a toast is announced without stealing focus
//     — stealing focus mid-typing would be worse than silence;
//   - `assertive` for errors and warnings, `polite` for success and info, so an
//     error interrupts and a confirmation waits its turn. Two regions rather
//     than one, because the politeness of a live region is fixed when it is
//     read, not when it changes;
//   - every dismiss control is a real <button> with a bilingual label, reachable
//     in tab order;
//   - the icon is aria-hidden and never the only signal: kind is carried by
//     icon, colour AND the text itself.
//
// COLOUR IS NOT THE ONLY SIGNAL. Each kind has a distinct glyph, so the four are
// distinguishable in greyscale and to anyone who cannot separate red from green.

import { Component, inject } from '@angular/core'
import { LanguageService } from '../../../core/i18n/language.service'
import { TranslatePipe } from '../../pipes/translate.pipe'
import { ToastService, type Toast, type ToastKind, type LocalisedText } from '../../../core/notifications/toast.service'

@Component({
  selector: 'app-toast-host',
  imports: [TranslatePipe],
  templateUrl: './toast-host.html'
})
export class ToastHost {
  protected readonly i18n = inject(LanguageService)
  protected readonly toasts = inject(ToastService)

  /** A literal `{ ar, en }` renders directly; a string is a dictionary key. */
  protected isLocalised (v: string | LocalisedText | undefined): v is LocalisedText {
    return !!v && typeof v === 'object' && 'ar' in v && 'en' in v
  }

  protected text (v: LocalisedText): string {
    return this.i18n.lang() === 'ar' ? v.ar : v.en
  }

  protected trackById = (_: number, t: Toast) => t.id

  // Tailwind cannot see class names assembled at runtime, so every variant is
  // written out in full rather than built by interpolation. A `bg-${kind}-50`
  // would be correct JavaScript and would produce no CSS at all.
  protected readonly tone: Record<ToastKind, string> = {
    success: 'border-s-emerald-500 bg-surface-0',
    error: 'border-s-red-500 bg-surface-0',
    warning: 'border-s-amber-500 bg-surface-0',
    info: 'border-s-primary-500 bg-surface-0'
  }

  protected readonly iconTone: Record<ToastKind, string> = {
    success: 'text-emerald-600',
    error: 'text-red-600',
    warning: 'text-amber-600',
    info: 'text-primary-600'
  }

  protected readonly label: Record<ToastKind, string> = {
    success: 'toast.success',
    error: 'toast.error',
    warning: 'toast.warning',
    info: 'toast.info'
  }
}

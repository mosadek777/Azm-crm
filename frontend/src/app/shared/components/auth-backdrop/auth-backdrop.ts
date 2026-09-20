// The photograph and its two overlay layers, behind both sign-in screens.
//
// ONE COMPONENT, so the opacity stops exist in exactly one file. Staff and
// portal both sign in against the same treatment, and two copies of the numbers
// would have drifted the first time one of them was adjusted.
//
// The values are taken verbatim from the borrowed design system's section 7 —
// base wash 75 → 55 → 85 top to bottom, then a directional layer running from
// transparent to 80% toward whichever edge the form occupies. See
// docs/design-system.md and decisions-pending §30 for why this screen is dark
// when the rest of the product is light.
//
// ⚠ DIRECTION. A CSS gradient has no logical form: `to right` is physical, the
// way `translateX` is, and it is the second thing in this codebase that needs an
// explicit direction rather than a logical property (the first is the toast
// keyframe — see --toast-enter-x in styles.css).
//
// The three direction rules below are MUTUALLY EXCLUSIVE rather than layered:
//
//   max-lg:bg-linear-to-b    below lg, where the form sits at the bottom
//   ltr:lg:bg-linear-to-r    from lg in English, where the form sits right
//   rtl:lg:bg-linear-to-l    from lg in Arabic, where the form sits left
//
// That is deliberate and it is not the obvious formulation. `lg:bg-linear-to-r`
// plus `lg:rtl:bg-linear-to-l` reads as "and flip it in Arabic", but Tailwind
// compiles `rtl:` to a ZERO-SPECIFICITY :where(...) clause, so the two rules tie
// at (0,1,0) and the winner is whichever Tailwind happened to emit last. That is
// the same trap that produced a 155px sidebar and a routerLinkActive state that
// never appeared. Each direction gets its own rule and nothing arbitrates.

import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-backdrop',
  host: {
    // The ground colour lives on the host, BEHIND the image. A slow or missing
    // photograph degrades to the gradient over near-black, never to a white
    // page. pointer-events-none so the backdrop can never eat a click.
    class: 'pointer-events-none absolute inset-0 overflow-hidden bg-surface-950'
  },
  template: `
    <!-- Decorative. alt="" and aria-hidden so it is not announced; there is no
         information in it that the headline does not already carry. -->
    <img src="auth-bg.jpg" alt="" aria-hidden="true"
         fetchpriority="high" decoding="async"
         class="absolute inset-0 size-full object-cover object-bottom" />

    <!-- 1. Base wash, top to bottom. -->
    <div class="absolute inset-0 bg-linear-to-b
                from-surface-950/75 via-surface-950/55 to-surface-950/85"></div>

    <!-- 2. Directional, toward the form. See the note above on why this is
            three exclusive rules and not an override. -->
    <div class="absolute inset-0 from-transparent via-transparent to-surface-950/80
                max-lg:bg-linear-to-b
                ltr:lg:bg-linear-to-r
                rtl:lg:bg-linear-to-l"></div>
  `
})
export class AuthBackdrop {}

// A headline that reveals itself on load, one character at a time.
//
// ⚠ IT DOES NOT TYPE THE TEXT. The whole string is in the DOM, shaped, from the
// first frame; each character sits in its own span and the animation moves
// nothing but `opacity`. That is not a detail — it is the entire reason this
// works in Arabic.
//
// WHY, MEASURED. Arabic is cursive and a letter's glyph depends on its
// neighbours. Appending a character at a time means every letter already on
// screen is re-shaped the moment the next one lands. In Cairo at 48px the word
// "كل" is 64.52px joined and 70.86px as two separate letters — 9.8% apart, so
// the line visibly jumps on each keystroke. English moves 0.8% over the same
// test, which is kerning and invisible. Appending is a Latin technique.
//
// Wrapping every character in a span and animating opacity was measured too,
// because inline boxes can break a shaping run: the Arabic headline is 524.34px
// in per-character spans against 524.14px as plain text. 0.04%. Chrome shapes
// across inline boundaries, so the joined forms are the ones drawn, and a
// hidden letter still occupies its shaped advance. Layout is final before the
// animation starts and the card beside it never moves.
//
// A consequence worth knowing: because the glyphs are the JOINED forms, the
// leading edge of a half-revealed Arabic word shows a connecting stroke running
// into the dark. That is correct — it is the letter's real shape — and it reads
// as the word being drawn rather than as a defect. Verified in the
// mid-animation screenshots.
//
// SPLIT BY GRAPHEME, NOT BY CODE POINT. `[...string]` would put a shadda or a
// fatha in a span of its own, so a diacritic could be revealed before the
// letter it sits on, or the letter could appear bare and gain its mark a frame
// later. `auth.headlineSub` and both portal strings carry diacritics.
// Intl.Segmenter keeps each mark with its base.
//
// ACCESSIBILITY. The animated copy is aria-hidden throughout; a visually-hidden
// copy of the whole string sits beside it and is what gets announced. The
// accessibility tree holds the finished sentence from the first frame and never
// changes — it is never built up character by character.
//
// REDUCED MOTION. The whole headline appears at once. This is a JS-driven
// reveal rather than a CSS transition, so it cannot use the `motion-safe:`
// variant the rest of the app uses; matchMedia is the equivalent, checked once
// at construction.

import {
  Component, ElementRef, computed, effect, inject, input, signal, OnDestroy
} from '@angular/core';

/** Per-character step, and the ceiling on the whole reveal. */
const STEP_MS = 28;
const TOTAL_CAP_MS = 1000;

/**
 * Which headlines have already played, for this page load.
 *
 * Module scope, so it survives leaving the route and coming back — "once on
 * load" means once, not once per visit. A full reload starts over, which is
 * the only time the animation is telling the reader anything new.
 *
 * Keyed by the translation key rather than by the rendered text, so toggling
 * the language does not replay it. The reveal is a load affordance, not a
 * transition effect.
 */
const played = new Set<string>();

@Component({
  selector: 'app-typewriter',
  host: { class: 'inline' },
  template: `
    <!-- The string as it will be announced: present, complete and unchanging
         from the first frame. -->
    <span class="sr-only">{{ text() }}</span>

    <!-- The decorative copy. whitespace-pre-wrap so a space in a span of its
         own is not collapsed away. -->
    <span aria-hidden="true" class="whitespace-pre-wrap">
      @for (unit of units(); track $index) {
        <span [class]="$index < revealed() ? 'opacity-100' : 'opacity-0'">{{ unit }}</span>
      }
    </span>
  `
})
export class Typewriter implements OnDestroy {
  /** The text to reveal. */
  readonly text = input.required<string>();
  /** A stable id — the translation key. Decides whether this has played. */
  readonly once = input.required<string>();

  /** Grapheme clusters, so a combining mark is never separated from its base. */
  protected readonly units = computed(() => {
    const t = this.text();
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
      return [...seg.segment(t)].map(s => s.segment);
    }
    return [...t];
  });

  protected readonly revealed = signal(0);

  private frame = 0;

  constructor() {
    effect(() => {
      const units = this.units();
      const key = this.once();

      this.stop();

      const reduced = typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reduced || played.has(key) || units.length === 0) {
        this.revealed.set(units.length);
        played.add(key);
        return;
      }

      played.add(key);
      this.revealed.set(0);

      const step = Math.min(STEP_MS, TOTAL_CAP_MS / units.length);
      const start = performance.now();

      // rAF rather than setInterval: it stays on the frame clock, it does not
      // drift, and it stops while the tab is in the background instead of
      // finishing the reveal where nobody is looking.
      const tick = (now: number) => {
        const n = Math.min(units.length, Math.floor((now - start) / step));
        this.revealed.set(n);
        if (n < units.length) this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    });
  }

  private stop() {
    if (this.frame) { cancelAnimationFrame(this.frame); this.frame = 0; }
  }

  ngOnDestroy() { this.stop(); }
}

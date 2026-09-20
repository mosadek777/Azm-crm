// A headline that types itself, holds, deletes itself, and does that three
// times before settling on the finished line for good.
//
// ⚠ IT NEVER CHANGES THE TEXT. The whole string is in the DOM, shaped, from the
// first frame; each grapheme sits in its own span and the animation moves
// nothing but `opacity`. That is not a detail — it is the entire reason this
// works in Arabic, in both directions of the loop.
//
// WHY, MEASURED. Arabic is cursive and a letter's glyph depends on its
// neighbours. Growing or shrinking a string means every letter still on screen
// is re-shaped as its neighbour arrives or leaves. In Cairo at 48px the word
// "كل" is 64.52px joined and 70.86px as two separate letters — 9.8% apart, so
// the line visibly jumps on every step, and jumps again on the way back out.
// English moves 0.8% over the same test, which is kerning and invisible.
// Typing and deleting a substring is a Latin technique.
//
// Per-character spans were measured too, because inline boxes can break a
// shaping run: the Arabic headline is 524.34px in per-character spans against
// 524.14px as plain text. 0.04%. Chrome shapes across inline boundaries, so
// the joined forms are the ones drawn — and because shaping is settled once,
// for the complete string, DELETING cannot revert a letter to its isolated
// form. There is nothing to revert; the glyphs never changed.
//
// SPLIT BY GRAPHEME, NOT BY CODE POINT. `[...string]` would put a shadda or a
// fatha in a span of its own, so a diacritic could be revealed before the
// letter it sits on, or outlive it on the way out. The four headline strings
// carry no marks as currently worded — the SUB-lines do ("سجّل") — so this is
// correct by construction rather than by luck, and it stays right the first
// time somebody rewrites a headline with one.
//
// HEIGHT IS RESERVED BY CONSTRUCTION. Every span is laid out at every phase,
// including at zero revealed — opacity is a paint-time property and takes no
// space away. The <h1> box is its full wrapped size before the first frame and
// stays there, so the card beside it and the line beneath it never move. There
// is no min-height guess to get wrong.
//
// ACCESSIBILITY. The animated copy is aria-hidden for its whole life; a
// visually-hidden copy of the complete string sits beside it and is what gets
// announced. The accessibility tree holds the finished sentence from the first
// frame and never changes — it is not built up, and it is not torn down again
// on each delete.
//
// WCAG 2.2.2 (Pause, Stop, Hide). The animation STOPS ON ITS OWN after three
// passes, which is why there is no pause control beside the sign-in form. See
// CYCLES below and decisions-pending §30, including the part where three
// passes does not get under the criterion's five-second threshold and two
// would have.
//
// REDUCED MOTION. No loop at all — the whole headline, at once, forever. This
// is a JS-driven reveal rather than a CSS transition, so it cannot use the
// `motion-safe:` variant the rest of the app uses; matchMedia is the
// equivalent, checked when the effect runs.

import {
  Component, computed, effect, input, signal, OnDestroy
} from '@angular/core';

/** Typing. Per grapheme, and the ceiling on one pass. */
const TYPE_STEP_MS = 28;
const TYPE_CAP_MS = 1000;
/** How long the finished line stands before it starts clearing. */
const HOLD_MS = 2200;
/**
 * Deleting, faster than typing — it is not the part anybody reads.
 *
 * ⚠ 18ms, NOT 14. Half of 28 is the right ratio and 14 was measured doing
 * exactly that — 23 graphemes cleared over 333ms, 20 distinct counts, properly
 * progressive. But a 14ms step against a 16.7ms frame removes ~1.2 characters
 * per frame, so the trace stutters (…18 16 15 14 13 12 10…) and it reads as a
 * flick rather than as a countdown. 18ms is longer than one frame, so exactly
 * one grapheme leaves per frame and nothing is skipped. Still roughly half the
 * typing interval; the cadence was the problem, not the ratio.
 */
const DELETE_STEP_MS = 18;
const DELETE_CAP_MS = 700;
/** The beat on an empty line before it starts again. */
const REST_MS = 500;
/**
 * How many times it types before settling on the finished line.
 *
 * THREE, then it stops for good — the product owner's decision, recorded in
 * decisions-pending §30. It is the answer to WCAG 2.2.2 (Pause, Stop, Hide):
 * a perpetual loop beside a sign-in form needs a control to stop it, and a
 * stop button on a sign-in screen is more clutter than the effect is worth.
 * Stopping on its own removes the need for the control.
 *
 * ⚠ It does NOT bring the motion under 2.2.2's five-second threshold. Three
 * passes is about 8.8 seconds. Two would be about 4.8 and would satisfy the
 * criterion by duration; that trade was considered and declined. §30 carries
 * the numbers and the reasoning.
 */
const CYCLES = 3;

type Phase = 'typing' | 'holding' | 'deleting' | 'resting';

@Component({
  selector: 'app-typewriter',
  host: { class: 'inline' },
  template: `
    <!-- The string as it will be announced: present, complete and unchanging
         through every phase of the loop. -->
    <span class="sr-only">{{ text() }}</span>

    <!-- The decorative copy. whitespace-pre-wrap so a space in a span of its
         own is not collapsed away. -->
    <span aria-hidden="true" class="whitespace-pre-wrap">
      @for (unit of units(); track $index) {
        <span [class]="spanClasses()[$index]">{{ unit }}</span>
      }
    </span>
  `
})
export class Typewriter implements OnDestroy {
  /** The text to reveal. */
  readonly text = input.required<string>();

  /** Grapheme clusters, so a combining mark is never separated from its base. */
  protected readonly units = computed(() => {
    const t = this.text();
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
      return [...seg.segment(t)].map(s => s.segment);
    }
    return [...t];
  });

  /**
   * How many leading graphemes are the first word.
   *
   * Derived from where the first whitespace falls, so it is a property of the
   * TEXT and not a number anybody has to keep in step. It is recomputed when
   * the language changes and it is unaffected by the loop — the colour belongs
   * to the word, not to a position the animation happens to be passing through.
   */
  protected readonly firstWordLength = computed(() => {
    const i = this.units().findIndex(u => /\s/u.test(u));
    return i === -1 ? this.units().length : i;
  });

  protected readonly revealed = signal(0);

  /** One complete class string per grapheme — never a static class plus a
   *  bound override, which would tie at equal specificity. */
  protected readonly spanClasses = computed(() => {
    const shown = this.revealed();
    const accent = this.firstWordLength();
    return this.units().map((_, i) =>
      (i < shown ? 'opacity-100' : 'opacity-0')
      + ' '
      + (i < accent ? 'text-primary-400' : 'text-white')
    );
  });

  private frame = 0;

  constructor() {
    effect(() => {
      const total = this.units().length;
      this.stop();

      const reduced = typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reduced || total === 0) {
        this.revealed.set(total);
        return;
      }

      const typeStep = Math.min(TYPE_STEP_MS, TYPE_CAP_MS / total);
      const deleteStep = Math.min(DELETE_STEP_MS, DELETE_CAP_MS / total);

      let phase: Phase = 'typing';
      let phaseStart = performance.now();
      let pass = 1;
      this.revealed.set(0);

      // rAF rather than setInterval: it stays on the frame clock, it does not
      // drift over a loop that may run for minutes, and it stops while the tab
      // is in the background instead of cycling where nobody is looking.
      const tick = (now: number) => {
        const elapsed = now - phaseStart;

        switch (phase) {
          case 'typing': {
            const n = Math.min(total, Math.floor(elapsed / typeStep));
            this.revealed.set(n);
            if (n >= total) {
              // The last pass settles here and never schedules another frame,
              // so the page is genuinely static afterwards rather than running
              // an idle loop nobody can see.
              if (pass >= CYCLES) { this.frame = 0; return; }
              phase = 'holding'; phaseStart = now;
            }
            break;
          }
          case 'holding':
            if (elapsed >= HOLD_MS) { phase = 'deleting'; phaseStart = now; }
            break;
          case 'deleting': {
            const n = Math.max(0, total - Math.floor(elapsed / deleteStep));
            this.revealed.set(n);
            if (n <= 0) { phase = 'resting'; phaseStart = now; }
            break;
          }
          case 'resting':
            if (elapsed >= REST_MS) { pass++; phase = 'typing'; phaseStart = now; }
            break;
        }

        this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    });
  }

  private stop() {
    if (this.frame) { cancelAnimationFrame(this.frame); this.frame = 0; }
  }

  ngOnDestroy() { this.stop(); }
}

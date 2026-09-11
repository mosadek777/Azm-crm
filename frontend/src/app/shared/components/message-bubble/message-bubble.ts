// One message in a conversation. Used by BOTH the staff thread and the customer
// portal thread — spec 002 FR-014 / AS-07, spec 008 FR-004 / AS-07.
//
// WHY ONE COMPONENT. The two threads showed the same data and had drifted into
// looking like different products: different corner radius, different padding,
// a different type scale, and line breaks preserved on one side and collapsed
// on the other. They were never meant to differ; they differed because they
// were written twice.
//
// WHAT IS GENUINELY DIFFERENT BETWEEN THE TWO, and it is only two things:
//
//   1. The portal never shows an internal note. That is enforced in the QUERY,
//      not here — `008 FR-019`. This component would render one if handed one,
//      and it is never handed one. Filtering in the interface would mean the
//      text had already reached the customer's browser.
//   2. The portal names no individual agent. `visibility` and the author label
//      are both supplied by the caller, so the portal passes an organisation
//      label and the staff thread passes a role. Decision 29.
//
// Everything else — the side a message sits on, its colours, its shape, its
// spacing, its type — is the same here and cannot drift again.
//
// THE SIDE RULE IS THE SAME ON BOTH: the customer's words at the START edge,
// the organisation's at the END edge. Expressed with logical properties, so the
// whole conversation mirrors in Arabic with no second stylesheet.
//
// COLOUR IS NEVER THE ONLY SIGNAL. The two sides differ by side, background,
// border AND a named label. An internal note additionally carries a start-rule
// and a chip, so it is distinguishable in greyscale — nobody should post an
// internal note believing it is a reply to the customer.

import { Component, computed, input, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-message-bubble',
  imports: [DatePipe, TranslatePipe],
  templateUrl: './message-bubble.html'
})
export class MessageBubble {
  protected readonly i18n = inject(LanguageService);

  /** The customer's own words sit at the start edge; ours at the end. */
  readonly fromCustomer = input.required<boolean>();
  /** A dictionary key. The caller decides what the author is called. */
  readonly authorKey = input.required<string>();
  readonly body = input.required<string>();
  readonly sentAt = input<string | Date | null>(null);

  /**
   * Staff only. The portal never passes this, because it is never handed an
   * internal message in the first place.
   */
  readonly internal = input(false);
  /** Staff only: show the customer-visible / internal chip. */
  readonly showVisibility = input(false);

  // Written out in full rather than assembled — Tailwind scans source text, so
  // a class built at runtime compiles to no CSS.
  protected readonly rowClass = computed(() =>
    this.fromCustomer() ? 'flex justify-start' : 'flex justify-end');

  protected readonly bubbleClass = computed(() => {
    const shape = 'max-w-[80%] rounded-2xl border px-4 py-3 ';
    const side = this.fromCustomer()
      ? 'border-surface-200 bg-surface-0 rounded-es-sm '
      : 'border-primary-200 bg-primary-50 rounded-ee-sm ';
    // The amber start-rule sits on top of either side's colours, so an internal
    // note is obvious whoever wrote it.
    const note = this.internal() ? 'border-s-4 border-s-amber-400' : '';
    return shape + side + note;
  });

  protected readonly authorClass = computed(() =>
    this.fromCustomer() ? 'font-medium text-surface-700' : 'font-medium text-primary-800');
}

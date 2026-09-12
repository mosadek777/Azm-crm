// ONE tag. Statuses, audit actions, and anything else that needs a small
// coloured label all render through this.
//
// WHY IT EXISTS. `status-tone.pipe.ts` already established that there must be a
// single colour vocabulary — "two colour maps drift, and a status that is amber
// on one screen and grey on the next teaches the reader that colour means
// nothing". The pipe held the line on colour but not on shape: the four places
// a status appeared each hand-rolled their own span, and they had already
// drifted to px-2, px-2.5, with and without font-medium. Adding the history
// actions as a fifth variant would have made that worse.
//
// The tone is passed in rather than computed here, so the component knows
// nothing about statuses or audit actions and the vocabularies stay in their
// own pipes.
//
// `raw` puts the exact underlying value on the element's title. An audit
// reader needs the event key, not a paraphrase of it — see the history table,
// which also renders the key visibly rather than relying on a hover that does
// not exist on a touch screen.

import { Component, input } from '@angular/core';

@Component({
  selector: 'app-tag',
  template: `
    <span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
          [class]="tone()"
          [attr.title]="raw()">
      <ng-content />
    </span>
  `
})
export class Tag {
  /** Tailwind classes from a tone pipe — never a colour chosen at the call site. */
  readonly tone = input<string>('bg-surface-200 text-surface-700');
  /** The exact underlying value, surfaced on hover for a reader who needs it. */
  readonly raw = input<string | null>(null);
}

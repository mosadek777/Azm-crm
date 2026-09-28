// The shell around a message box. Used by BOTH the staff thread and the
// customer portal thread — spec 002 FR-014, spec 008 FR-004.
//
// ── WHY THIS EXISTS ────────────────────────────────────────────────────────
//
// `message-bubble` unified one message and `conversation` unified the thread
// around it. The COMPOSER was the last thing still written twice, and it had
// drifted the way the other two had before they were shared: the portal's card
// capped its contents at a readable measure and the staff's did not; the portal
// put a label above the box and the staff put a placeholder inside it; the
// portal showed a server refusal in a red panel and the staff showed one only
// as a toast; the two send buttons had different padding, different disabled
// rules and different type.
//
// Same control, two products. So the CARD, the TEXTAREA, the REFUSAL, the SEND
// BUTTON and its disabled rule live here now, and neither screen can drift from
// the other again.
//
// ── THE VISIBILITY SELECTOR, AND WHY IT IS NOT AN INPUT ────────────────────
//
// The staff composer carries a customer-visible / internal selector. `008
// FR-019` (MUST) is that no internal note — and nothing that could produce one
// — reaches any portal surface. The portal must therefore never render that
// control: not enabled, not disabled, not hidden.
//
// THERE IS NO `showVisibility` FLAG HERE, AND THAT ABSENCE IS THE DESIGN. A
// flag would put the only thing standing between a customer and an
// internal-note control into a template condition and an input default. One
// `input(true)`, one caller passing the wrong thing, one refactor, and the
// portal renders it — and nothing would fail, because a rendered control is not
// an error.
//
// Instead this component has NO visibility markup at all. The staff screen
// PROJECTS its selector into the `[composer-actions]` slot; the portal projects
// nothing. The portal cannot render a control whose markup does not exist in
// the component it renders — the same property the server already has, where
// `POST /portal/ticket/:id/message` takes no `visibility` parameter rather than
// accepting one and validating it.
//
// This is the third time this codebase has chosen ABSENT over HIDDEN, after
// `conversation.ts` (which refuses to filter internal notes in the interface,
// because a filter means the text already reached the browser) and the portal
// read itself (which excludes them in the QUERY). The reasoning is the same
// every time: a guarantee enforced by something not existing cannot be lost in
// a refactor, and one enforced by a condition can.
//
// ── WHAT THE TWO CALLERS GENUINELY DIFFER ON ───────────────────────────────
//
// Everything staff-only arrives through a content slot, so this file knows
// about none of it: draft banners (004 FR-015), the autosave indicator,
// mentions (004 FR-009), quick replies (004 FR-006) and the visibility
// selector. The portal fills none of the four slots.

import { Component, computed, inject, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/i18n/language.service';
import { LocalizedText } from '../../../core/models/user.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-message-composer',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './message-composer.html'
})
export class MessageComposer {
  protected readonly i18n = inject(LanguageService);

  /** The text being written. Two-way: the caller owns it and autosaves it. */
  readonly value = model.required<string>();

  /** A dictionary key for a label above the box. The staff screen uses none. */
  readonly labelKey = input<string | null>(null);
  /** A dictionary key for placeholder text. The portal uses none. */
  readonly placeholderKey = input<string | null>(null);

  readonly sendKey = input.required<string>();
  readonly sendingKey = input.required<string>();

  /** A request is in flight: disables the button and swaps its label. */
  readonly busy = input(false);

  /**
   * An extra condition the caller imposes on top of "there is some text".
   *
   * The staff screen passes whether a visibility has been chosen — FR-014 has
   * no safe default, so nothing may be sent until somebody picks one. This
   * component neither knows nor asks what the condition is, which is what keeps
   * it ignorant of visibility entirely.
   */
  readonly canSend = input(true);

  /**
   * A refusal from the server, rendered as the server sent it. Bilingual, and
   * never pre-empted by client-side validation — the rule lives in one place.
   */
  readonly refusal = input<LocalizedText | null>(null);

  /**
   * Cap the contents at a readable measure while the card still spans the page.
   * The portal wants this; the staff card is already narrow in its column.
   * Capping the textarea alone was tried on the portal and left the send button
   * outside that column, detached from the field it submits.
   */
  readonly constrain = input(false);

  readonly send = output<void>();
  /** 004 NFR-004's other half: the staff screen flushes its draft on blur. */
  readonly blurred = output<void>();

  protected readonly sendable = computed(() =>
    !this.busy() && this.canSend() && this.value().trim().length > 0);

  protected readonly refusalText = computed(() => {
    const refusal = this.refusal();
    if (!refusal) return null;
    return this.i18n.lang() === 'ar' ? refusal.ar : refusal.en;
  });

  // Written out in full rather than assembled, because Tailwind scans source
  // text and a class built at runtime compiles to no CSS. One computed per
  // decision, returning the whole string — never a static class beside a bound
  // override, which is how the sidebar came out 155px wide.
  protected readonly innerClass = computed(() =>
    this.constrain() ? 'flex max-w-2xl flex-col gap-3' : 'flex flex-col gap-3');

  protected onSend(): void {
    if (!this.sendable()) return;
    this.send.emit();
  }
}

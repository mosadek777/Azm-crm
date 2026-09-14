// A whole conversation. Used by BOTH the staff thread and the customer portal
// thread — spec 002 FR-014 / AS-07, spec 008 FR-003, FR-004, FR-019 / AS-06.
//
// ── WHY THIS EXISTS ON TOP OF `message-bubble` ─────────────────────────────
//
// `message-bubble` already unified one MESSAGE. Everything around it was still
// written twice and had drifted exactly as the bubbles had before it: the staff
// thread sat in a bordered card and the portal thread floated on the page; the
// headings used different weights and different colours; the rows were `gap-3`
// on one side and `space-y-4` on the other; the empty state was a bare sentence
// in one and absent from the other. Same data, two products.
//
// So the CARD, the HEADING, the EMPTY STATE, the ordering and the spacing live
// here now, and neither screen can drift from the other again.
//
// ── WHAT IS GENUINELY DIFFERENT, AND IT IS STILL ONLY TWO THINGS ───────────
//
//   1. NO INTERNAL NOTES ON THE PORTAL. `008 FR-019` (MUST): "No internal note,
//      AI output, automation log, assignment detail or agent identity ... MUST
//      appear on any portal surface, export or notification." That is enforced
//      IN THE QUERY — `portal-ticket.service.js` puts `visibility: 'customer'`
//      in the `find`, so an internal note is never loaded, and therefore cannot
//      be projected, logged or serialised by mistake.
//
//      ⚠ THIS COMPONENT WOULD RENDER ONE IF HANDED ONE, AND THAT IS DELIBERATE.
//      A filter here would mean the text had already reached the customer's
//      browser and was being hidden by CSS or by a template condition — one
//      refactor, one devtools panel, or one `view-source` away from being read.
//      The safety is that it is never handed one. `AS-06` is the test: three
//      internal notes and two customer replies, and the customer sees two.
//
//   2. NO AGENT NAME ON THE PORTAL. Decision 29 resolved `002 [CLARIFY-6]`:
//      a customer sees the owning team and no individual agent, including the
//      author of a reply they can read. The author label is a dictionary KEY
//      supplied by the caller, so the portal passes an organisation label and
//      the staff thread passes a role. Nothing here knows a name.
//
// Everything else — side, colour, shape, spacing, type, the empty state, the
// heading — is one implementation.

import { Component, inject, input } from '@angular/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { MessageBubble } from '../message-bubble/message-bubble';

/**
 * What a conversation needs to render one message.
 *
 * THE TWO SCREENS MAP INTO THIS RATHER THAN SHARING A WIRE TYPE, because the
 * two responses genuinely differ and must: the staff response carries
 * `authorKind` and `visibility`, and the portal response carries neither — it
 * says only `from: 'you' | 'support'`, which is the most the customer is
 * allowed to know. Mapping in each screen keeps that asymmetry where the API
 * put it instead of inventing a shape that could carry an agent identity to the
 * portal.
 */
export interface ConversationMessage {
  _id: string;
  body: string;
  sentAt: string | Date | null;
  /** The customer's own words sit at the start edge; ours at the end. */
  fromCustomer: boolean;
  /** A dictionary key, never a name. Decision 29 is enforced by this being a key. */
  authorKey: string;
  /** Staff only. The portal is never handed a message with this set. */
  internal?: boolean;
}

@Component({
  selector: 'app-conversation',
  imports: [TranslatePipe, MessageBubble],
  templateUrl: './conversation.html'
})
export class Conversation {
  protected readonly i18n = inject(LanguageService);

  readonly messages = input.required<ConversationMessage[]>();

  /** Dictionary keys, so each screen names the thread in its own voice. */
  readonly headingKey = input('ticket.thread');
  readonly emptyKey = input('conversation.empty');

  /**
   * Show the customer-visible / internal chip on each bubble. STAFF ONLY: on
   * the portal every message is customer-visible by construction, so a chip
   * saying so would be noise — and a chip that could ever say "internal" is
   * exactly what `FR-019` forbids.
   */
  readonly showVisibility = input(false);
}

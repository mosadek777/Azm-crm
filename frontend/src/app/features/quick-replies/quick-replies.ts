// Quick replies — the library. spec 004 FR-006, FR-007, AD-06, AD-07.
//
// WHY THERE IS A SCREEN AT ALL. A picker on the ticket with nothing to pick
// from is the same trap as a user form whose required fields can only be filled
// from the API. The library has to be writable by the people who use it.
//
// ── WHAT THE SERVER DECIDES, AND WHAT THIS ONLY RENDERS ─────────────────────
//
// FR-007: "team and global MUST be manageable by a lead or above and MUST NOT
// be editable by an individual agent." The scope picker offers `global` only
// when `show.sharedQuickReplies` is true — a RENDERING HINT, so that an agent
// is not offered a control the server refuses every time. The server refuses it
// regardless of what this believes, and that is proven in
// backend/tests/security.test.js rather than asserted here.
//
// ── THE PLACEHOLDER VOCABULARY IS FETCHED, NOT DUPLICATED ───────────────────
//
// Decision 41 requires one list, read by both the editor and the resolver. The
// helper below renders whatever `GET /quick-reply/placeholders` returns, so a
// token added or removed on the server appears or disappears here without a
// second edit. A copy in the client would drift, and the drift would surface as
// a refusal nobody can explain: an editor offering a token the resolver has
// never heard of.
//
// ── BOTH LANGUAGES, ALWAYS ──────────────────────────────────────────────────
//
// FR-006 requires an Arabic body and an English body. The form asks for both
// and the save stays disabled without them — but the RULE is the server's, and
// its refusal is rendered as sent rather than pre-empted, so there is one place
// the rule lives.

import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ToastService } from '../../core/notifications/toast.service';
import { Tag } from '../../shared/components/tag/tag';
import { Placeholder, QuickReply } from '../../core/models/domain.model';
import { LocalizedText } from '../../core/models/user.model';

@Component({
  selector: 'app-quick-replies',
  imports: [FormsModule, TranslatePipe, Tag],
  templateUrl: './quick-replies.html'
})
export class QuickReplies {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly i18n = inject(LanguageService);

  protected readonly rows = signal<QuickReply[]>([]);
  protected readonly placeholders = signal<Placeholder[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal<string | null>(null);

  protected readonly creating = signal(false);
  protected readonly nameAr = signal('');
  protected readonly nameEn = signal('');
  protected readonly bodyAr = signal('');
  protected readonly bodyEn = signal('');
  protected readonly scope = signal<'personal' | 'global'>('personal');
  protected readonly refusal = signal<LocalizedText | null>(null);
  /** FR-006's refusal names WHICH tokens failed; these are them. */
  protected readonly badTokens = signal<string[]>([]);

  // ── WHERE A PLACEHOLDER LANDS ───────────────────────────────────────────
  //
  // At the CARET, in the field that currently has focus. The first version
  // appended to "whichever body was last edited", which is a rule an author has
  // to be told and then remember — and it silently put the token in the wrong
  // language's box if they had glanced at the other one.
  //
  // `null` means neither body is focused, and then the buttons are DISABLED
  // rather than guessing. Guessing is how a token ends up in the Arabic body
  // when the author was writing English.
  protected readonly focusedField = signal<'ar' | 'en' | null>(null);

  // The elements themselves, because a caret position is a property of the
  // DOM node and there is no signal for it.
  private readonly bodyArRef = viewChild<ElementRef<HTMLTextAreaElement>>('bodyArBox');
  private readonly bodyEnRef = viewChild<ElementRef<HTMLTextAreaElement>>('bodyEnBox');

  /** A rendering hint — FR-007's rule is the server's and it refuses anyway. */
  protected readonly canShare = computed(() => this.auth.show().sharedQuickReplies);

  protected readonly mine = computed(() => this.rows().filter(r => r.scope === 'personal'));
  protected readonly shared = computed(() => this.rows().filter(r => r.scope === 'global'));

  constructor() {
    this.load();
    this.api.quickReplyPlaceholders().subscribe({
      next: r => this.placeholders.set(r.placeholders),
      // An editor without the helper still works — the tokens can be typed.
      error: () => this.placeholders.set([])
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.api.listQuickReplies().subscribe({
      next: r => { this.rows.set(r.quickReplies); this.loading.set(false); },
      error: (e: HttpErrorResponse) => {
        this.loading.set(false);
        this.toast.fromHttpError(e, { ar: 'تعذر الاتصال بالخادم', en: 'Could not reach the server' });
      }
    });
  }

  /**
   * A token as it is WRITTEN, for display.
   *
   * Built here rather than in the template: Angular decodes HTML entities
   * before it parses interpolation, so `&#123;&#123;` in the markup becomes a
   * second opening brace and the template fails to compile.
   */
  protected tokenText(token: string): string { return `{{` + token + `}}`; }

  /**
   * Insert a token AT THE CARET of the focused body.
   *
   * Does nothing when neither body is focused — the buttons are disabled in
   * that state, and this is the second guard rather than the only one.
   *
   * The caret is put back after the token, so an author can keep typing where
   * they were. That has to happen after Angular has written the new value into
   * the element — see the note on afterNextRender below.
   */
  protected insertToken(token: string): void {
    const which = this.focusedField();
    if (!which) return;

    const el = (which === 'ar' ? this.bodyArRef() : this.bodyEnRef())?.nativeElement;
    if (!el) return;

    const wrapped = `{{${token}}}`;
    const value = el.value ?? '';
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? start;

    // Replaces a selection if there is one, which is what every other editor
    // does and therefore what an author expects.
    const next = value.slice(0, start) + wrapped + value.slice(end);
    (which === 'ar' ? this.bodyAr : this.bodyEn).set(next);

    const caret = start + wrapped.length;

    // ⚠ A MACROTASK, and the two tidier options were both tried and MEASURED.
    //
    // Setting `el.value` moves the caret to the end, and ngModel writes the new
    // value during change detection — so the selection has to be restored after
    // that write, not before it.
    //
    //   queueMicrotask   ran before the write. Caret ended at 36, not 23.
    //   afterNextRender  ran before it too, in this component. Same result.
    //   setTimeout(0)    runs after the change-detection flush. Caret 23.
    //
    // Measured in the browser rather than reasoned about, because the ordering
    // between Angular's render hooks and the value accessor's write is exactly
    // the kind of thing that looks obvious and is not. If this ever regresses,
    // the check that catches it asserts selectionStart after an insert.
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
      // Focus was never really lost — the buttons preventDefault on mousedown
      // precisely so the caret survives the click — but a programmatic focus
      // here keeps the signal honest if anything else stole it.
      this.focusedField.set(which);
    }, 0);
  }

  protected readonly canSubmit = computed(() =>
    this.nameAr().trim().length > 0 && this.nameEn().trim().length > 0 &&
    this.bodyAr().trim().length > 0 && this.bodyEn().trim().length > 0);

  protected submit(): void {
    if (!this.canSubmit()) return;
    this.refusal.set(null);
    this.badTokens.set([]);
    this.busy.set('create');
    this.api.createQuickReply({
      name: { ar: this.nameAr().trim(), en: this.nameEn().trim() },
      body: { ar: this.bodyAr().trim(), en: this.bodyEn().trim() },
      scope: this.scope()
    }).subscribe({
      next: r => {
        this.busy.set(null);
        this.creating.set(false);
        this.nameAr.set(''); this.nameEn.set('');
        this.bodyAr.set(''); this.bodyEn.set('');
        this.scope.set('personal');
        this.toast.success('quickReply.created', r.quickReply.name);
        this.load();
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(null);
        // The server's own refusal, rendered as sent — including the one that
        // NAMES each unknown token, which is what an author needs to fix it.
        this.refusal.set(e.error?.message ?? null);
        this.badTokens.set(e.error?.unknownPlaceholders ?? []);
        this.toast.fromHttpError(e, { ar: 'تعذر حفظ الرد', en: 'Could not save the quick reply' });
      }
    });
  }

  protected toggleActive(r: QuickReply): void {
    this.busy.set(r._id);
    this.api.setQuickReplyActive(r._id, !r.active).subscribe({
      next: () => {
        this.busy.set(null);
        this.toast.success('admin.deactivated', r.name);
        this.load();
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(null);
        this.toast.fromHttpError(e, { ar: 'تعذر تغيير الحالة', en: 'Could not change the state' });
      }
    });
  }

  protected label(v: LocalizedText): string {
    return this.i18n.lang() === 'ar' ? v.ar : v.en;
  }
}

// Administrator configuration — statuses and priorities. spec 010 FR-011,
// SEC-11; spec 002 §8; constitution I.
//
// FR-011 names FOURTEEN configuration surfaces. THIS SCREEN IS TWO OF THEM,
// and it says so on the page rather than implying the requirement is met:
// status labels, priority labels, and a status's `pausesSla`. Everything else
// is blocked or is a subsystem that does not exist — see label.service.js for
// the list with a board card each.
//
// ── BOTH LANGUAGES OR NOTHING ───────────────────────────────────────────────
//
// "Any change to a user-visible label MUST be refused unless both language
// values are supplied." The server refuses; this screen agrees with it rather
// than pre-empting it — the Save control is disabled while either field is
// empty, and the refusal, if one arrives anyway, is rendered as the server
// wrote it.
//
// Both fields are PRE-FILLED with what is stored, so changing one language does
// not mean retyping the other. That matters: the requirement refuses a partial
// save, and a form that made the administrator retype the language they were
// not changing would push them to leave it wrong.
//
// ── `pausesSla` IS NOT AN ORDINARY CHECKBOX ─────────────────────────────────
//
// Decision 14 ratified these values, and spec 005's pause ledger is
// append-only: time already accounted under the old flag stays accounted that
// way. So the change cannot be applied backwards, and the screen says exactly
// that beside the control rather than after the fact.
//
// Today there is no pause ledger at all — 005 is not built — so a change made
// now affects nothing retroactively because nothing has been computed. That
// stops being true the day 005 lands, and it stops being true silently, which
// is why the warning is written now.

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TicketLabel } from '../../../core/models/domain.model';

/** One row's edit state. Held apart from the stored row so a cancelled edit
 *  leaves nothing behind. */
interface Draft { ar: string; en: string }

@Component({
  selector: 'app-configuration',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './configuration.html'
})
export class Configuration {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly i18n = inject(LanguageService);

  protected readonly statuses = signal<TicketLabel[]>([]);
  protected readonly priorities = signal<TicketLabel[]>([]);
  protected readonly covers = signal<string[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal<string | null>(null);

  /** Which row is open for editing. One at a time. */
  protected readonly editing = signal<string | null>(null);
  protected readonly draft = signal<Draft>({ ar: '', en: '' });

  /**
   * 010 FR-001 puts configuration at ADM. A rendering hint: the server refuses
   * a LEAD and an AGENT regardless, and the route guard keeps them off the
   * screen. This decides whether to OFFER a control that would always fail.
   */
  protected readonly canEdit = computed(() => this.auth.show().administration);

  protected readonly canSave = computed(() =>
    this.draft().ar.trim().length > 0 && this.draft().en.trim().length > 0);

  constructor() { this.load(); }

  protected rowId(l: TicketLabel): string { return `${l.kind}:${l.key}`; }

  protected load(): void {
    this.loading.set(true);
    this.api.ticketLabels().subscribe({
      next: r => {
        this.statuses.set(r.statuses);
        this.priorities.set(r.priorities);
        this.covers.set(r.covers);
        this.loading.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.statuses.set([]); this.priorities.set([]); this.loading.set(false);
        this.toast.fromHttpError(e, { ar: 'تعذر تحميل الإعدادات', en: 'Could not load the configuration' });
      }
    });
  }

  protected startEdit(l: TicketLabel): void {
    this.editing.set(this.editing() === this.rowId(l) ? null : this.rowId(l));
    // PRE-FILLED, both of them. See the header: a form that made somebody
    // retype the language they were not changing is a form that gets it wrong.
    this.draft.set({ ar: l.label.ar, en: l.label.en });
  }

  protected cancelEdit(): void {
    this.editing.set(null);
    this.draft.set({ ar: '', en: '' });
  }

  protected save(l: TicketLabel): void {
    if (!this.canSave()) return;
    this.busy.set(this.rowId(l));
    this.api.updateTicketLabel(l.kind, l.key, {
      label: { ar: this.draft().ar.trim(), en: this.draft().en.trim() }
    }).subscribe({
      next: () => {
        this.busy.set(null);
        this.cancelEdit();
        this.toast.success('config.saved');
        this.load();
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(null);
        // The single-language refusal arrives here as the server wrote it,
        // bilingual, naming which field was missing.
        this.toast.fromHttpError(e, { ar: 'تعذر حفظ التسمية', en: 'Could not save the label' });
      }
    });
  }

  /**
   * Change whether a status pauses the SLA clock.
   *
   * Confirmed first, because it is the one change on this screen that cannot be
   * applied backwards. The confirmation names what it cannot undo rather than
   * asking "are you sure" — a prompt that gives no reason teaches people to
   * click through it.
   */
  protected togglePauses(l: TicketLabel): void {
    const next = !l.pausesSla;
    const warn = this.i18n.translate('config.pausesSlaConfirm');
    if (!window.confirm(warn)) return;

    this.busy.set(this.rowId(l));
    this.api.updateTicketLabel(l.kind, l.key, { pausesSla: next }).subscribe({
      next: () => {
        this.busy.set(null);
        this.toast.success('config.saved');
        this.load();
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(null);
        // A terminal status is refused here — decision 14 stores null for those
        // because there is no clock to pause.
        this.toast.fromHttpError(e, { ar: 'تعذر تغيير الإعداد', en: 'Could not change the setting' });
      }
    });
  }
}

// Tasks on a ticket. spec 004 FR-004, E-09, AD-04.
//
// "A task list with due dates against tickets, so the follow-up I promised is
// not forgotten." The success measure the story sets is missed follow-ups under
// 2% of created tasks — which only means anything if recording one is quicker
// than writing it on paper.
//
// ── E-09 IS A UI RULE TOO ───────────────────────────────────────────────────
//
// "Task due date is in the past → ACCEPTED and immediately overdue; not
// refused." So there is no `min` on the date input and no client-side check
// against now. Somebody recording a follow-up they already owe is the normal
// case, and the server accepts it deliberately.
//
// ── WHO MAY DO WHAT IS THE SERVER'S ─────────────────────────────────────────
//
// §9 lets a LEAD create a task for a colleague and an agent only for
// themselves; it lets an owner close their own and a lead close anybody's.
// This screen offers the controls its caller can use and the server refuses
// regardless — `canWrite` is the same rendering hint the reply box uses, and an
// auditor never sees any of it.

import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { ReminderService } from '../../../core/notifications/reminder.service';
import { Tag } from '../tag/tag';
import { Task } from '../../../core/models/domain.model';

@Component({
  selector: 'app-ticket-tasks',
  imports: [FormsModule, TranslatePipe, DatePipe, Tag],
  templateUrl: './ticket-tasks.html'
})
export class TicketTasks {
  readonly ticketId = input.required<string>();

  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  // Changing a task here changes what is due, and the sidebar badge is the same
  // service's count. Without this, completing a task from a ticket leaves a
  // reminder badge standing for work that is finished.
  private readonly reminders = inject(ReminderService);
  protected readonly i18n = inject(LanguageService);

  protected readonly tasks = signal<Task[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal<string | null>(null);

  protected readonly adding = signal(false);
  protected readonly body = signal('');
  protected readonly dueAt = signal('');

  /** An auditor changes nothing (002 §9), so none of this is offered to them. */
  protected readonly canWrite = computed(() => this.auth.show().ticketWrite);

  protected readonly open = computed(() => this.tasks().filter(t => t.state === 'open'));
  protected readonly closed = computed(() => this.tasks().filter(t => t.state !== 'open'));

  constructor() {
    // ⚠ NOT `this.load()` DIRECTLY. A required `input()` has no value during
    // construction, so reading it there throws NG0950 — and because this
    // component sits inside the ticket's own template, that error took the
    // WHOLE ticket page down, not just this panel. An effect runs once the
    // input is set, and again if the panel is ever pointed at another ticket.
    // Same pattern as customer-context, for the same reason.
    effect(() => {
      const id = this.ticketId();
      if (id) this.load();
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.api.listTicketTasks(this.ticketId()).subscribe({
      next: r => { this.tasks.set(r.tasks); this.loading.set(false); },
      error: () => { this.tasks.set([]); this.loading.set(false); }
    });
  }

  protected readonly canSubmit = computed(() =>
    this.body().trim().length > 0 && this.dueAt().length > 0);

  protected submit(): void {
    if (!this.canSubmit()) return;
    this.busy.set('create');
    this.api.createTask(this.ticketId(), {
      body: this.body().trim(),
      // Sent as an instant. The input gives local wall-clock time; the server
      // stores what it is given and compares against it.
      dueAt: new Date(this.dueAt()).toISOString()
    }).subscribe({
      next: () => {
        this.busy.set(null);
        this.adding.set(false);
        this.body.set(''); this.dueAt.set('');
        this.toast.success('task.created');
        this.load();
        // `announce: false` — the agent just created this task; a toast telling
        // them it exists would be the same news twice.
        this.reminders.refresh({ announce: false });
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(null);
        this.toast.fromHttpError(e, { ar: 'تعذر حفظ المهمة', en: 'Could not save the task' });
      }
    });
  }

  protected close(t: Task, state: 'done' | 'cancelled'): void {
    this.busy.set(t._id);
    this.api.setTaskState(t._id, state).subscribe({
      next: () => {
        this.busy.set(null);
        this.toast.success(state === 'done' ? 'task.completed' : 'task.cancelled');
        this.load();
        this.reminders.refresh({ announce: false });
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(null);
        // §9's refusals arrive here: a colleague's task needs a lead, and a
        // task already closed answers 409. Rendered as the server sent them.
        this.toast.fromHttpError(e, { ar: 'تعذر تغيير حالة المهمة', en: 'Could not change the task' });
      }
    });
  }

  /**
   * Whether a task is past its due date.
   *
   * ⚠ THE ONLY DATE COMPARISON IN THIS COMPONENT, and it is not a duration.
   * Constitution III forbids computing elapsed TIME — "how long has this taken"
   * needs the business calendar and belongs to spec 005. This asks a different
   * question: is one instant after another. It produces a boolean, never a
   * number of minutes, and nothing here renders "2 hours late".
   */
  protected isOverdue(t: Task): boolean {
    return t.state === 'open' && new Date(t.dueAt).getTime() < Date.now();
  }
}

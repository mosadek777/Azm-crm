// The team queue. spec 004 — FR-016, AD-16, AS-10, E-14; constitution III, IV.
//
// AD-16: "As a LEAD I want the team queue by unassigned, oldest, at-risk and
// agent, so I rebalance load while it still matters." The last clause is the
// point — a queue that tells you what is waiting but not who is free answers
// half the question.
//
// ── THE AT-RISK VIEW IS OFFERED AND CANNOT ANSWER ───────────────────────────
//
// It is not hidden. "At risk" is a statement about remaining time against an
// SLA target, and the clock returns `unavailable` while 005 [CLARIFY-2] is
// open. The server sends `unavailable` with its reason and this screen renders
// that reason. Hiding the tab would make a blocked requirement look like one
// nobody read; showing an empty list would assert that nothing is at risk.
//
// ── TEAM IS NOT A DIMENSION HERE, AND THE SCREEN SAYS SO ────────────────────
//
// §11's predicate names team, branch and department. Team does not exist
// (decision 20), so the queue is scoped by branch and department — WIDER than
// the spec intends, not narrower. Said on the page rather than left for someone
// to discover from the row count.
//
// ── ASSIGNMENT RE-USES THE ONE ENDPOINT ─────────────────────────────────────
//
// PATCH /ticket/:id/assign, with FR-009's mandatory reason. No second path, so
// the terminal-status refusal, the assignee-must-be-scoped check and the audit
// entry cannot drift. `canAssignOthers` is a RENDERING HINT: see the note on
// the picker below for the one place it is not backed by a server refusal.

import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { ToastService } from '../../core/notifications/toast.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { StatusTonePipe } from '../../shared/pipes/status-tone.pipe';
import { Tag } from '../../shared/components/tag/tag';
import { AgentLoad, TeamQueueView, Ticket } from '../../core/models/domain.model';

@Component({
  selector: 'app-team-queue',
  imports: [FormsModule, TranslatePipe, StatusTonePipe, Tag],
  templateUrl: './team-queue.html'
})
export class TeamQueue {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(LanguageService);

  protected readonly views: TeamQueueView[] = ['unassigned', 'oldest', 'at_risk', 'agent'];
  protected readonly view = signal<TeamQueueView>('unassigned');
  protected readonly agentId = signal<string>('');

  protected readonly tickets = signal<Ticket[]>([]);
  protected readonly load = signal<AgentLoad[]>([]);
  protected readonly total = signal(0);
  protected readonly ordering = signal<{ applied: string; reason: string | null } | null>(null);
  protected readonly unavailable = signal<{ reason: string; blockedBy: string } | null>(null);
  protected readonly scopeEmpty = signal(false);
  protected readonly loading = signal(true);

  /** Which row has its assign panel open. One at a time. */
  protected readonly assigning = signal<string | null>(null);
  protected readonly assignTo = signal<string>('');
  protected readonly reason = signal<string>('');
  protected readonly busy = signal<string | null>(null);

  /** 002 §9: an auditor changes nothing, so no assign control is offered. */
  protected readonly canAssign = computed(() => this.auth.show().ticketWrite);

  /**
   * 004 §9: "Assign from the team queue — AGT: self only". A lead gets the
   * roster; an agent gets themselves.
   *
   * ⚠ UNUSUALLY FOR THIS CODEBASE, THE SERVER DOES NOT BACK THIS ONE UP, and
   * that is recorded rather than glossed. 002 FR-010 is a MUST that an agent may
   * self-assign any unassigned ticket in scope, and 002 §9 lets them assign
   * generally; only taking over a ticket somebody ELSE holds is refused for an
   * agent. So what an agent could do here by editing the page, they could also
   * do from the ticket screen, which spec 002 governs. decisions-pending §21.
   */
  protected readonly canAssignOthers = computed(() => this.auth.show().teamAssign);

  protected readonly me = computed(() => this.auth.user()?.id ?? '');

  /** Who the picker offers. Self only for an agent — see above. */
  protected readonly assignableAgents = computed(() =>
    this.canAssignOthers() ? this.load() : this.load().filter(a => a.userId === this.me()));

  protected readonly canSubmitAssign = computed(() =>
    this.assignTo().length > 0 && this.reason().trim().length > 0);

  constructor() {
    // Re-reads whenever the view or the chosen agent changes, which is what
    // makes the tabs work without a manual refresh call in four places.
    effect(() => { this.view(); this.agentId(); this.load_(); });
  }

  protected setView(v: TeamQueueView): void {
    this.assigning.set(null);
    this.view.set(v);
  }

  private load_(): void {
    this.loading.set(true);
    const params: Record<string, string> = { view: this.view() };
    if (this.view() === 'agent' && this.agentId()) params['agentId'] = this.agentId();

    this.api.teamQueue(params).subscribe({
      next: r => {
        this.tickets.set(r.tickets);
        this.load.set(r.load);
        this.total.set(r.total);
        this.ordering.set(r.ordering);
        this.unavailable.set(r.unavailable);
        this.scopeEmpty.set(r.scopeEmpty);
        this.loading.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.tickets.set([]); this.load.set([]); this.total.set(0);
        this.loading.set(false);
        this.toast.fromHttpError(e, { ar: 'تعذر تحميل قائمة الفريق', en: 'Could not load the team queue' });
      }
    });
  }

  protected openAssign(t: Ticket): void {
    this.assigning.set(this.assigning() === t._id ? null : t._id);
    // An agent has exactly one choice, so preselecting it saves a click that
    // could only ever land on the same value.
    this.assignTo.set(this.canAssignOthers() ? '' : this.me());
    this.reason.set('');
  }

  protected submitAssign(t: Ticket): void {
    if (!this.canSubmitAssign()) return;
    this.busy.set(t._id);
    // FR-009 (MUST): actor, previous holder, new holder AND A REASON. The
    // reason is not defaulted to a placeholder here — the server requires it
    // and an invented one would make the audit trail useless.
    this.api.assign(t._id, { assignedAgentId: this.assignTo(), reason: this.reason().trim() }).subscribe({
      next: () => {
        this.busy.set(null);
        this.assigning.set(null);
        this.toast.success('teamQueue.assigned');
        this.load_();
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(null);
        // The server's refusals arrive here as written: a terminal ticket
        // (409), an agent outside the ticket's scope (409), an auditor (403).
        this.toast.fromHttpError(e, { ar: 'تعذر تعيين التذكرة', en: 'Could not assign the ticket' });
      }
    });
  }

  protected openTicket(t: Ticket): void {
    this.router.navigate(['/tickets', t._id]);
  }

  /** Show an agent's own list from the load table — one click, not a form. */
  protected showAgent(a: AgentLoad): void {
    this.agentId.set(a.userId);
    this.view.set('agent');
  }
}

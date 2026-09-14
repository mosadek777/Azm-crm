// One HTTP surface. The bearer token is attached by tokenInterceptor, and a 401
// signs the user out there — neither concern belongs in a feature component.

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Branch, ContactPoint, Customer, Department, HistoryEntry, Placeholder, QuickReply, Sla, Task, Ticket, TicketMessage, TicketMeta } from '../models/domain.model';
import { CreateUserRequest, LocalizedText, StaffUser } from '../models/user.model';

const API = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // --- customers ---
  // An empty or <3-character `q` browses a scope-filtered page instead of
  // searching (spec 001 E-13 — no search runs, and no error either).
  searchCustomers(q: string, page = 1, limit = 25) {
    return this.http.get<{
      customers: Customer[]; searched: boolean; browsed?: boolean;
      count?: number; minimumLength?: number;
      page?: number; limit?: number; total?: number;
    }>(`${API}/customer`, {
      params: new HttpParams()
        .set('q', q)
        .set('page', String(page))
        .set('limit', String(limit))
    });
  }

  getCustomer(id: string) {
    return this.http.get<{
      customer: Customer; contactPoints: ContactPoint[];
      organisation: Customer | null; entitlement: Sla;
    }>(`${API}/customer/${id}`);
  }

  createCustomer(body: unknown) {
    return this.http.post<{ customer: Customer; contactPoints: ContactPoint[] }>(`${API}/customer`, body);
  }

  updateCustomer(id: string, body: unknown) {
    return this.http.patch<{ customer: Customer; changed: string[] }>(`${API}/customer/${id}`, body);
  }

  // --- tickets ---
  listTickets(filters: Record<string, string>) {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filters)) if (v) params = params.set(k, v);
    return this.http.get<{
      tickets: Ticket[]; page: number; limit: number; total: number;
      // E-05: what order the SERVER applied. The screen states the fallback
      // from this rather than assuming it, so it cannot claim an order that
      // was not used.
      ordering: { applied: 'priority_then_age' | 'newest_first'; reason: string | null };
      // 009 E-19: which branch timezones a period was evaluated in. Null when
      // no period was evaluated.
      timezonesUsed: string[] | null;
    }>(`${API}/ticket`, { params });
  }

  getTicket(id: string) {
    return this.http.get<{
      ticket: Ticket; customer: Customer | null;
      assignedAgent: { id: string; displayName: string } | null;
      messages: TicketMessage[]; history: HistoryEntry[];
      reachableStatuses: string[]; sla: Sla;
    }>(`${API}/ticket/${id}`);
  }

  createTicket(body: unknown) {
    return this.http.post<{ ticket: Ticket }>(`${API}/ticket`, body);
  }

  ticketMeta() {
    return this.http.get<TicketMeta>(`${API}/ticket/meta`);
  }

  changeStatus(id: string, body: unknown) {
    return this.http.patch<{ ticket: Ticket; reachableStatuses: string[] }>(`${API}/ticket/${id}/status`, body);
  }

  assign(id: string, body: unknown) {
    return this.http.patch<{ ticket: Ticket }>(`${API}/ticket/${id}/assign`, body);
  }

  addMessage(id: string, body: unknown) {
    return this.http.post<{ message: TicketMessage }>(`${API}/ticket/${id}/message`, body);
  }

  // --- platform: branches and departments (spec 012 FR-007, FR-008) ---
  //
  // Both lists are SCOPE-FILTERED BY THE SERVER. An administrator attached to
  // one branch receives one branch — the interface does no filtering of its
  // own, so a screen cannot accidentally show more than the caller may see.
  listBranches() {
    return this.http.get<{ branches: Branch[] }>(`${API}/platform/branches`);
  }

  createBranch(body: { name: LocalizedText; timezone: string; defaultLocale: 'ar' | 'en' }) {
    return this.http.post<{ branch: Branch }>(`${API}/platform/branches`, body);
  }

  // There is NO delete, by design: a branch is referenced by every record
  // created in it and throughout the audit trail. Deactivation is reversible
  // and is the only disposal the API offers (spec 012 FR-015).
  setBranchActive(id: string, active: boolean) {
    return this.http.patch<{ branch: Branch; changed: boolean }>(
      `${API}/platform/branches/${id}/active`, { active });
  }

  listDepartments() {
    return this.http.get<{ departments: Department[] }>(`${API}/platform/departments`);
  }

  createDepartment(body: { name: LocalizedText }) {
    return this.http.post<{ department: Department }>(`${API}/platform/departments`, body);
  }

  setDepartmentActive(id: string, active: boolean) {
    return this.http.patch<{ department: Department; changed: boolean }>(
      `${API}/platform/departments/${id}/active`, { active });
  }

  // --- administration: staff users (spec 010 FR-001, FR-002, FR-021) ---
  //
  // SCOPE-FILTERED BY THE SERVER, like the branch and department lists. A user
  // out of the caller's scope is absent from the response, not flagged — AS-01.
  // The response carries role CODES and no scope detail; see listUsers.
  listUsers() {
    return this.http.get<{ users: StaffUser[] }>(`${API}/user`);
  }

  // The branch and department ids come from listBranches()/listDepartments(),
  // which are bounded by the same reachable scope that bounds a grant. So the
  // picker offers what can be granted WITHOUT the client deciding anything:
  // FR-021 is still enforced server-side and an excessive grant is refused 403.
  createUser(body: CreateUserRequest) {
    return this.http.post<{ user: StaffUser }>(`${API}/user`, body);
  }

  // There is NO delete, by design (FR-001 forbids offering one): a user's name
  // is attached to tickets and to every audit entry they caused. Deactivation
  // is reversible and is the only disposal the API offers.
  //
  // Two refusals come back as 409 and are rendered as the server sent them:
  // the last active administrator (E-01) and deactivating yourself (E-02).
  setUserActive(id: string, active: boolean) {
    return this.http.patch<{ user: StaffUser }>(
      `${API}/user/${id}/${active ? 'reactivate' : 'deactivate'}`, {});
  }
  // --- quick replies (spec 004 FR-006, FR-007) ---
  //
  // THE VOCABULARY IS FETCHED, NOT DUPLICATED. Decision 41 requires one list,
  // read by both the editor's helper and the resolver. A copy here would drift
  // from backend/src/config/placeholders.js and the drift would surface as a
  // refusal nobody can explain.
  quickReplyPlaceholders() {
    return this.http.get<{ placeholders: Placeholder[]; syntax: string }>(
      `${API}/quick-reply/placeholders`);
  }

  /** The caller's own, plus every global one. Personal replies of others are absent. */
  listQuickReplies() {
    return this.http.get<{ quickReplies: QuickReply[] }>(`${API}/quick-reply`);
  }

  createQuickReply(body: { name: LocalizedText; body: LocalizedText; scope: 'personal' | 'global' }) {
    return this.http.post<{ quickReply: QuickReply }>(`${API}/quick-reply`, body);
  }

  // No delete: a retired template's wording may be quoted in tickets already
  // sent, which is the same reason branches, departments and users deactivate.
  setQuickReplyActive(id: string, active: boolean) {
    return this.http.patch<{ quickReply: QuickReply; changed: boolean }>(
      `${API}/quick-reply/${id}/active`, { active });
  }

  /**
   * Substitute the placeholders against one ticket.
   *
   * The SERVER chooses the body's language from the CUSTOMER's preference and
   * refuses rather than returning a partly-substituted body (FR-006). A 422
   * carries `failures`, naming which token could not be resolved.
   */
  renderQuickReply(id: string, ticketId: string) {
    return this.http.post<{ body: string; language: 'ar' | 'en'; languageFrom: string }>(
      `${API}/quick-reply/${id}/render`, { ticketId });
  }
  // --- drafts (spec 004 FR-015, E-02, E-12, AS-09; §11) ---
  //
  // §11's predicate is `user = caller AND ticket scope`, and BOTH halves are the
  // server's. There is no parameter here that could ask for somebody else's
  // draft, which is why a draft stays with its author when a ticket moves.
  //
  // `autosaveSeconds` comes back with the answer rather than being a constant
  // here: NFR-004 sets the cadence and a second copy of the number would drift.
  getDraft(ticketId: string) {
    return this.http.get<{
      draft: { body: string; visibility: string } | null;
      stale: boolean;
      expired: boolean;
      retentionDays?: number;
      reassignedTo?: string | null;
      autosaveSeconds: number;
    }>(`${API}/ticket/${ticketId}/draft`);
  }

  /** Autosave. An empty body deletes the draft rather than storing emptiness. */
  saveDraft(ticketId: string, body: string, visibility: string) {
    return this.http.put<{ draft: unknown | null; discarded?: boolean }>(
      `${API}/ticket/${ticketId}/draft`, { body, visibility });
  }

  /** §10 records the cause: 'sent' when a reply went out, 'abandoned' otherwise. */
  discardDraft(ticketId: string, cause: 'sent' | 'abandoned') {
    return this.http.request<{ discarded: boolean; cause?: string }>(
      'DELETE', `${API}/ticket/${ticketId}/draft`, { body: { cause } });
  }
  // --- tasks (spec 004 FR-004, FR-005 task half) ---
  //
  // ⚠ REMINDERS ARE EVALUATED ON THE REQUEST. There is no scheduler in this
  // system, so nothing fires while nobody has the product open. The response
  // carries `evaluation: 'on_request'` and the screens say so in words.
  listTicketTasks(ticketId: string) {
    return this.http.get<{ tasks: Task[] }>(`${API}/ticket/${ticketId}/task`);
  }

  /** A PAST dueAt is accepted and immediately overdue — E-09, never refused. */
  createTask(ticketId: string, body: { body: string; dueAt: string; ownerId?: string }) {
    return this.http.post<{ task: Task }>(`${API}/ticket/${ticketId}/task`, body);
  }

  myTasks() {
    return this.http.get<{
      tasks: Task[];
      reminders: Task[];
      overdueCount: number;
      evaluatedAt: string;
      evaluation: 'on_request';
    }>(`${API}/task/mine`);
  }

  setTaskState(id: string, state: 'done' | 'cancelled') {
    return this.http.patch<{ task: Task }>(
      `${API}/task/${id}/${state === 'done' ? 'complete' : 'cancel'}`, {});
  }
}





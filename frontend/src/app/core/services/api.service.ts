// One HTTP surface. The bearer token is attached by tokenInterceptor, and a 401
// signs the user out there — neither concern belongs in a feature component.

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Customer, ContactPoint, Ticket, TicketMessage, HistoryEntry, TicketMeta, Sla,
  Branch, Department
} from '../models/domain.model';
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
    return this.http.get<{ tickets: Ticket[]; page: number; limit: number; total: number }>(
      `${API}/ticket`, { params });
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
}


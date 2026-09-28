// spec 008 — the portal's HTTP surface.
//
// Separate from ApiService for the same reason the backend module is separate:
// these are different endpoints, a different token and a different scope rule.
// The types below are deliberately NARROWER than the staff ones — a portal
// ticket has no assignee and a portal message has no author, because the server
// does not send them (002 [CLARIFY-6], decision 29). Reusing the staff `Ticket`
// type here would declare fields that never arrive and invite a template to
// render one.

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { LocalizedText } from '../models/user.model';

const API = 'http://localhost:3000';

export interface PortalSla {
  status: 'ok' | 'unavailable';
  reason?: string;
  minutes?: number;
}

export interface PortalTicket {
  _id: string;
  reference: string;
  subject: string;
  status: string;
  // BILINGUAL, both languages always present — 008 §8, constitution I. The
  // server sends the pair and never chooses between them, so the screen renders
  // the language it is in and there is no fallback anywhere in the path.
  //
  // Still nullable, and deliberately: a status key with no configured label is
  // possible in principle, and the screens say so visibly rather than blanking.
  statusLabel: LocalizedText | null;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  sla: PortalSla;
}

/** A status the signed-in customer actually has, with its bilingual label. */
export interface PortalStatusFilter {
  key: string;
  label: LocalizedText | null;
}

export interface PortalMessage {
  _id: string;
  body: string;
  sentAt: string;
  // 'you' or 'support'. Never a name — decision 29.
  from: 'you' | 'support';
}

@Injectable({ providedIn: 'root' })
export class PortalApiService {
  private readonly http = inject(HttpClient);

/**
   * FR-005 — list, search and filter.
   *
   * `q` and `status` NARROW within the caller's own requests; they cannot widen
   * past them. The server applies the customer predicate as the base of the
   * query and every filter on top of it, and portal.test.js asserts that a
   * search matching another customer's ticket still returns nothing — with the
   * staff read as the control, so a zero there cannot pass vacuously.
   *
   * An empty term or status is omitted from the request rather than sent empty,
   * so the server sees the same shape it would for an unfiltered list.
   */
  myTickets(opts: { page?: number; limit?: number; q?: string; status?: string } = {}) {
    let params = new HttpParams()
      .set('page', String(opts.page ?? 1))
      .set('limit', String(opts.limit ?? 25));
    if (opts.q?.trim()) params = params.set('q', opts.q.trim());
    if (opts.status) params = params.set('status', opts.status);

    return this.http.get<{
      tickets: PortalTicket[]; total: number; page: number; limit: number;
      filters: { statuses: PortalStatusFilter[] };
    }>(`${API}/portal/ticket`, { params });
  }

  // FR-002. The body is deliberately these three fields and nothing else: the
  // server refuses anything more BY NAME (002 §9), so sending a priority or a
  // status would produce a 400 rather than being quietly ignored.
  submitTicket(body: { subject: string; description: string; category: string }) {
    return this.http.post<{ ticket: PortalTicket }>(`${API}/portal/ticket`, body);
  }

  // FR-004. No visibility parameter — a customer reply is always visible to
  // both sides, and the route has no code path that could make it internal.
  reply(id: string, body: string) {
    return this.http.post<{ message: PortalMessage }>(`${API}/portal/ticket/${id}/message`, { body });
  }

  /**
   * 002 FR-031 — the customer confirms a resolved request is finished.
   *
   * NO BODY, deliberately. The route carries no status parameter, so this can
   * only ever move a ticket from `resolved` to `closed` — the same shape as
   * `reply()` having no visibility parameter. A client cannot ask for a
   * different transition because there is nowhere to put one.
   */
  confirmClosure(id: string) {
    return this.http.post<{ ticket: PortalTicket }>(`${API}/portal/ticket/${id}/confirm-closure`, {});
  }

  myTicket(id: string) {
    return this.http.get<{
      ticket: PortalTicket; messages: PortalMessage[];
    }>(`${API}/portal/ticket/${id}`);
  }
}

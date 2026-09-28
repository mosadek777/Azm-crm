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

  myTickets(page = 1, limit = 25) {
    return this.http.get<{
      tickets: PortalTicket[]; total: number; page: number; limit: number;
    }>(`${API}/portal/ticket`, {
      params: new HttpParams().set('page', String(page)).set('limit', String(limit))
    });
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

  myTicket(id: string) {
    return this.http.get<{
      ticket: PortalTicket; messages: PortalMessage[];
    }>(`${API}/portal/ticket/${id}`);
  }
}

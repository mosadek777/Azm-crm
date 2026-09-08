// spec 008 — the customer's session, client side.
//
// SEPARATE FROM AuthService, AND SEPARATELY STORED. A customer and a member of
// staff are different identities against different endpoints with different
// tokens, and the backend refuses each other's tokens outright. Sharing one
// storage key here would mean signing in as a customer silently signed the
// staff session out on the same browser — which is precisely what someone
// demonstrating both halves side by side would hit first.
//
// There is no register method. Who creates a portal identity is NOT SPECIFIED:
// 008 §3 defines the entity, E-02 mentions registration only as something
// [CLARIFY-1] would decide, and no requirement provides a route. Rather than
// invent one, the sign-in screen says accounts are arranged by us.

import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

const TOKEN_KEY = 'azm.portal.token';
const CUSTOMER_KEY = 'azm.portal.customer';

export interface PortalCustomer {
  _id: string;
  displayName: string;
  preferredLanguage: 'ar' | 'en';
}

interface PortalSignInResponse {
  token: string;
  customer: PortalCustomer;
  locale: 'ar' | 'en';
}

@Injectable({ providedIn: 'root' })
export class PortalAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly api = 'http://localhost:3000';

  private readonly _customer = signal<PortalCustomer | null>(this.readStored());

  readonly customer = this._customer.asReadonly();
  readonly isSignedIn = computed(() => this._customer() !== null);

  signIn(email: string, password: string) {
    return this.http
      .post<PortalSignInResponse>(`${this.api}/portal/auth/signin`, { email, password })
      .pipe(tap(response => {
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify(response.customer));
        this._customer.set(response.customer);
      }));
  }

  signOut() {
    this.clear();
    this.router.navigate(['/portal/signin']);
  }

  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Confirms the stored session is actually alive, rather than trusting the
  // cached customer object.
  //
  // Without this, `isSignedIn()` answers yes for any browser that has ever held
  // a session, however dead the token is — the object in localStorage outlives
  // the identity it describes. A reseeded database, a revoked identity or an
  // expired token all leave a browser claiming to be signed in, which shows a
  // customer's name in the header before they have proved anything and lets
  // `portalGuard` wave a request through to a screen whose first call then
  // 401s. Two symptoms, one cause.
  //
  // Called once when the portal shell loads. A failure is a 401, which the
  // interceptor already turns into a sign-out — this only makes it happen at
  // load rather than at the first screen that needs data.
  verify() {
    const checking = this.token();
    if (!checking) return;

    this.http.get<{ customer: PortalCustomer }>(`${this.api}/portal/me`).subscribe({
      next: response => {
        // Only if this is still the session being checked. A customer can sign
        // in while this is in flight, and the reply would then describe the
        // previous identity.
        if (this.token() !== checking) return;
        // The server is the authority on who this is; refresh the cache from it.
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify(response.customer));
        this._customer.set(response.customer);
      },
      // Same guard, and it matters more here: without it a dead token's refusal
      // arriving after a successful sign-in wipes the new session.
      error: () => { if (this.token() === checking) this.clear(); }
    });
  }

  private clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
    this._customer.set(null);
  }

  private readStored(): PortalCustomer | null {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PortalCustomer;
    } catch {
      localStorage.removeItem(CUSTOMER_KEY);
      return null;
    }
  }
}

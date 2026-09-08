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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
    this._customer.set(null);
    this.router.navigate(['/portal/signin']);
  }

  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
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

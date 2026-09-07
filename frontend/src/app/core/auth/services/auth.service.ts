// spec 010 — implements SEC-06, FR-006 (local path), client side
//
// Holds the token and the signed-in user. There is no register method: spec 010
// FR-001 makes user creation an administrator action and E-08 forbids automatic
// account creation, so no such endpoint exists to call.
//
// The token lives in localStorage. That is a deliberate, and reversible,
// choice: spec 010 FR-007's session timeout, absolute session lifetime and
// concurrent-session limit are step 3, and any of them may replace this with a
// server-held session.

import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { AuthenticatedUser, LoginResponse } from '../../models/user.model';

const TOKEN_KEY = 'azm.token';
const USER_KEY = 'azm.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly api = 'http://localhost:3000';

  private readonly _user = signal<AuthenticatedUser | null>(this.readStoredUser());

  readonly user = this._user.asReadonly();
  readonly isSignedIn = computed(() => this._user() !== null);

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${this.api}/auth/login`, { email, password }).pipe(
      tap(response => {
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        this._user.set(response.user);
      })
    );
  }

  signOut() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private readStoredUser(): AuthenticatedUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthenticatedUser;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}

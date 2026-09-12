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
import { Observable, shareReplay, tap } from 'rxjs';
import { AuthenticatedUser, CapabilityHints, LoginResponse, MeResponse, NO_CAPABILITIES } from '../../models/user.model';

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

  // --- RENDERING HINTS. NOT AUTHORISATION. -----------------------------------
  //
  // From GET /auth/me. Every flag answers "does this caller hold this role
  // SOMEWHERE", which is too coarse to decide anything about a particular
  // record — see the long comment on the endpoint itself.
  //
  // WHAT THESE ARE FOR: not offering somebody a control the server refuses
  // every single time. An agent was being shown the whole administration
  // section, and every click produced a toast saying "not authorised".
  //
  // WHAT THEY ARE NOT FOR: deciding whether an action is allowed. The server
  // re-reads permissions on every request (E-04) and never reads this back —
  // it is not sent. Editing it in the browser reveals a menu entry whose every
  // action is still refused, which is proven in tests/security.test.js rather
  // than asserted here.
  //
  // They start ALL FALSE and are replaced when the endpoint answers. Failing
  // closed means a moment of missing navigation, which is recoverable; failing
  // open means showing an agent a section that then rejects them, which is the
  // defect being fixed.
  private readonly _show = signal<CapabilityHints>({ ...NO_CAPABILITIES });
  readonly show = this._show.asReadonly();

  /** True once /auth/me has answered, so a guard can wait rather than guess. */
  private readonly _hintsLoaded = signal(false);
  readonly hintsLoaded = this._hintsLoaded.asReadonly();

  constructor() {
    // A reload keeps the token but not the hints — they are deliberately not
    // cached, so a role withdrawn between sessions cannot linger in storage.
    //
    // ⚠ DEFERRED, and it must stay deferred. `tokenInterceptor` does
    // `inject(AuthService)` to read the bearer token, so issuing an HTTP call
    // from inside this constructor asks Angular to resolve AuthService while
    // AuthService is still being constructed. The request goes out without its
    // Authorization header, /auth/me answers 401, every flag falls closed, and
    // the whole interface renders as though nobody may do anything — which is
    // exactly what happened: an administrator saw no administration section.
    //
    // A microtask is enough. Construction has finished by the time it runs.
    if (this.token()) queueMicrotask(() => this.refreshHints());
  }

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${this.api}/auth/login`, { email, password }).pipe(
      tap(response => {
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        this._user.set(response.user);
        this.refreshHints();
      })
    );
  }

  /** Re-read the hints. Cheap, and the only way they are ever obtained. */
  refreshHints(): Observable<MeResponse> {
    const request = this.http.get<MeResponse>(`${this.api}/auth/me`).pipe(
      tap({
        next: r => {
          this._show.set({ ...NO_CAPABILITIES, ...r.show });
          this._hintsLoaded.set(true);
        },
        // Fail CLOSED. If the endpoint cannot be reached we know nothing, and
        // showing everything on the strength of not knowing is how an agent
        // ends up clicking through refusals.
        error: () => {
          this._show.set({ ...NO_CAPABILITIES });
          this._hintsLoaded.set(true);
        }
      }),
      shareReplay(1)
    );
    request.subscribe({ error: () => { /* handled above */ } });
    return request;
  }

  signOut() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    this._show.set({ ...NO_CAPABILITIES });
    this._hintsLoaded.set(false);
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

// spec 010 — implements FR-006 (bearer transport), E-04 (client side)
// spec 008 — the portal half of the same
//
// Attaches the bearer token to every outbound request, and signs the caller out
// when the server answers 401.
//
// The 401 handling matters more than it looks. The backend re-reads the user and
// their roles from the database on every request (E-04, FR-001), so a
// deactivated user's still-unexpired token starts failing immediately. Without
// this, the app would keep a signed-out user on screen holding a dead token.
// 008 §3's portal `state` behaves the same way (E-05: "Session is terminated").
//
// TWO TOKEN POPULATIONS, CHOSEN BY URL. The backend issues portal tokens with
// an `aud` claim and refuses each population on the other's routes, so sending
// the wrong one is not a security problem — it is a guaranteed 401. It IS a
// usability problem: without this split, a customer signed in on the same
// browser as a member of staff would send the staff token to /portal, get a
// 401, and be signed out of a session that was perfectly valid.
//
// Everything that is not a portal URL behaves exactly as it did before.

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { PortalAuthService } from '../auth/services/portal-auth.service';

const isPortalUrl = (url: string) => url.includes('/portal/');

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const portalAuth = inject(PortalAuthService);

  const portal = isPortalUrl(req.url);
  const token = portal ? portalAuth.token() : auth.token();

  const outbound = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(outbound).pipe(
    catchError((error: HttpErrorResponse) => {
      // Never sign out on a sign-in request's own 401 — that is a wrong
      // password, not an expired session. True on both surfaces.
      const isSignInAttempt =
        req.url.endsWith('/auth/login') || req.url.endsWith('/portal/auth/signin');

      if (error.status === 401 && !isSignInAttempt) {
        if (portal) portalAuth.signOut();
        else auth.signOut();
      }
      return throwError(() => error);
    })
  );
};

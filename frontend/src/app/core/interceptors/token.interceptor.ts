// spec 010 — implements FR-006 (bearer transport), E-04 (client side)
//
// Attaches the bearer token to every outbound request, and signs the user out
// when the server answers 401.
//
// The 401 handling matters more than it looks. The backend re-reads the user and
// their roles from the database on every request (E-04, FR-001), so a
// deactivated user's still-unexpired token starts failing immediately. Without
// this, the app would keep a signed-out user on screen holding a dead token.

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();

  const outbound = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(outbound).pipe(
    catchError((error: HttpErrorResponse) => {
      // Never sign out on the login request's own 401 — that is a wrong
      // password, not an expired session.
      const isLoginAttempt = req.url.endsWith('/auth/login');
      if (error.status === 401 && !isLoginAttempt) auth.signOut();
      return throwError(() => error);
    })
  );
};

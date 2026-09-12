// spec 010 — courtesy only; the control is server-side.
//
// ⚠ CONSTITUTION IV: "The UI hides what a user may not see as a COURTESY; the
// API refuses it as the CONTROL. A permission check that exists only in the
// client does not exist."
//
// THIS GUARD IS THE COURTESY HALF AND NOTHING MORE. Removing it must not make
// one byte of data reachable, and it does not: every route behind it calls
// endpoints that run `authenticate` + `authorize` and re-read permissions from
// the database per request (E-04). What the guard prevents is a person typing
// /admin/departments and landing on a page that LOOKS like it works — a list
// that fails to load, a create form whose save is refused every time.
//
// It reads `auth.show()`, which comes from GET /auth/me. Those flags say "holds
// this role somewhere"; they cannot say whether the caller may act on a
// particular record, which is why they are safe to render from and useless to
// authorise with. A forged `administration: true` in the browser gets somebody
// to a screen whose every action the server still refuses — proven in
// backend/tests/security.test.js, not asserted here.
//
// WAITING, NOT GUESSING. On a cold reload the token is present but the hints
// have not arrived. Answering "no" then would bounce an administrator off their
// own screen on every refresh, so the guard waits for the first answer. It
// fails CLOSED if that answer never comes.

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CapabilityHints } from '../../models/user.model';

export const requiresHint = (hint: keyof CapabilityHints): CanActivateFn => async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isSignedIn()) {
    router.navigate(['/auth/login']);
    return false;
  }

  if (!auth.hintsLoaded()) {
    // One request, awaited. `refreshHints` records the result on the service
    // and swallows the error there, so a failure leaves every flag false.
    try { await firstValueFrom(auth.refreshHints()); } catch { /* falls closed */ }
  }

  if (auth.show()[hint]) return true;

  // Sent to the workspace rather than to a "forbidden" page: the person is
  // signed in and perfectly entitled to be here, just not on that screen.
  router.navigate(['/tickets']);
  return false;
};

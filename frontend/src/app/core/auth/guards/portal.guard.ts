// spec 008 — keeps signed-out visitors off the portal.
//
// A COURTESY, exactly as authGuard is (constitution IV). Every portal route is
// independently refused server-side by §11's `customer = session` predicate,
// and removing this guard must not make one byte of data reachable.

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PortalAuthService } from '../services/portal-auth.service';

export const portalGuard: CanActivateFn = () => {
  const portalAuth = inject(PortalAuthService);
  const router = inject(Router);
  return portalAuth.isSignedIn() ? true : router.createUrlTree(['/portal/signin']);
};

// The mirror of the above: someone who already has a session has no business
// looking at a sign-in card. Without this, a customer returning to /portal/signin
// sees a form they do not need, and — before the shell stopped rendering it —
// their own name in the header above it, which is the confusing state that
// prompted this guard.
export const portalSignedOutGuard: CanActivateFn = () => {
  const portalAuth = inject(PortalAuthService);
  const router = inject(Router);
  return portalAuth.isSignedIn() ? router.createUrlTree(['/portal/tickets']) : true;
};

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

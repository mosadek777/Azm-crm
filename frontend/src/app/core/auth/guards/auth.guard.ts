// spec 010 — courtesy only; the control is server-side
//
// CONSTITUTION IV: "The UI hides what a user may not see as a courtesy; the API
// refuses it as the control. A permission check that exists only in the client
// does not exist."
//
// So this guard is a convenience that keeps signed-out users off the workspace.
// It is NOT a permission check. Every route it protects is independently
// enforced by authenticate + authorize on the server, and removing this guard
// must not make any data reachable.
//
// There is deliberately no role-checking guard here yet. A role guard reads the
// caller's roles, and the roles that matter are scoped by branch, department and
// team — FR-004, which is blocked by spec 012 [CLARIFY-6] and [CLARIFY-3].
// Step 3.

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isSignedIn()) return true;

  router.navigate(['/auth/login']);
  return false;
};

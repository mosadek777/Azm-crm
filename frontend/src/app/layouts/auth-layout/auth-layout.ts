// spec 010 — scaffold only; implements no requirement yet (step 1)
// Wraps the unauthenticated surface. Login only — there is no public register
// screen: spec 010 FR-001 makes user creation an administrator action.

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  templateUrl: './auth-layout.html'
})
export class AuthLayout {}

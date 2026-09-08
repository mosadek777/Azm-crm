// spec 010 — implements FR-006 (client routing); spec 012 — FR-001
//
// Two shells: auth routes render inside AuthLayout, everything else inside
// MainLayout. Feature routes are lazy, one child group per specs/NNN-slug —
// named to match the backend module on the other side.
//
// authGuard on the MainLayout branch is a COURTESY (constitution IV): it keeps
// signed-out users off the workspace. Every route it covers is independently
// refused server-side, and removing it must not make any data reachable.

import { Routes } from '@angular/router';
import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { MainLayout } from './layouts/main-layout/main-layout';
import { authGuard } from './core/auth/guards/auth.guard';
import { PortalLayout } from './layouts/portal-layout/portal-layout';
import { portalGuard } from './core/auth/guards/portal.guard';

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' }
    ]
  },
  {
    // spec 008. A separate shell with its own guard and its own token — a
    // customer is not a member of staff and shares nothing with MainLayout.
    // Declared BEFORE the '' branch, or the empty path swallows it.
    path: 'portal',
    component: PortalLayout,
    children: [
      {
        path: 'signin',
        loadComponent: () => import('./features/portal/signin/portal-signin').then(m => m.PortalSignin)
      },
      {
        path: 'tickets',
        canActivate: [portalGuard],
        loadComponent: () => import('./features/portal/tickets/portal-tickets').then(m => m.PortalTickets)
      },
      {
        // Declared BEFORE ':id', or 'new' is read as an identifier.
        path: 'tickets/new',
        canActivate: [portalGuard],
        loadComponent: () => import('./features/portal/new-request/portal-new-request').then(m => m.PortalNewRequest)
      },
      {
        path: 'tickets/:id',
        canActivate: [portalGuard],
        loadComponent: () => import('./features/portal/ticket-detail/portal-ticket-detail').then(m => m.PortalTicketDetail)
      },
      { path: '', pathMatch: 'full', redirectTo: 'tickets' }
    ]
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tickets' },
      {
        path: 'customers',
        loadComponent: () => import('./features/customer/list/customer-list').then(m => m.CustomerList)
      },
      {
        // Declared BEFORE ':id', or 'new' is read as an identifier.
        path: 'customers/new',
        loadComponent: () => import('./features/customer/create/customer-create').then(m => m.CustomerCreate)
      },
      {
        path: 'customers/:id',
        loadComponent: () => import('./features/customer/detail/customer-detail').then(m => m.CustomerDetail)
      },
      {
        path: 'tickets',
        loadComponent: () => import('./features/ticket/list/ticket-list').then(m => m.TicketList)
      },
      {
        // Declared BEFORE ':id', or 'new' is read as an identifier.
        path: 'tickets/new',
        loadComponent: () => import('./features/ticket/create/ticket-create').then(m => m.TicketCreate)
      },
      {
        path: 'tickets/:id',
        loadComponent: () => import('./features/ticket/detail/ticket-detail').then(m => m.TicketDetail)
      }
    ]
  },
  { path: '**', redirectTo: 'auth/login' }
];

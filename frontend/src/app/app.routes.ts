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

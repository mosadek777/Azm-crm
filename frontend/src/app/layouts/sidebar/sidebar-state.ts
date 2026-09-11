// Shared state for the staff navigation.
//
// It exists because two things in different parts of the shell need the same
// state: the drawer trigger, which belongs visually in the top bar, and the
// panel itself, which is a sibling of the whole content column. Passing it
// through inputs would mean the layout owning navigation state it has no other
// use for.
//
// COLLAPSED is a per-viewer preference and is persisted. DRAWER OPEN is not —
// a drawer that is still open after a reload is a surprise, and on mobile it
// would cover the screen on arrival.

import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'azm.sidebar.collapsed';

/**
 * Read once at startup. Wrapped, because storage can throw outright rather than
 * returning null — in a private window, with site data blocked, or during a
 * preview render. A navigation that fails to render is much worse than one that
 * forgets a preference, so any failure means the safe default.
 *
 * The safe default is EXPANDED: a collapsed sidebar on a first visit hides the
 * navigation from somebody who has not learnt the icons yet.
 */
const readCollapsed = (): boolean => {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
};

@Injectable({ providedIn: 'root' })
export class SidebarState {
  readonly collapsed = signal(readCollapsed());
  readonly drawerOpen = signal(false);

  toggleCollapsed(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* preference lost, navigation intact */ }
  }

  openDrawer(): void { this.drawerOpen.set(true); }
  closeDrawer(): void { this.drawerOpen.set(false); }
}

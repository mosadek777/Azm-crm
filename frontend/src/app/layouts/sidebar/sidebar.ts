// The staff navigation panel. spec 012 — FR-002 (mirrored layout), FR-005
// (usable on a phone), FR-012 (keyboard and assistive technology).
//
// WHY A SIDEBAR, AND ONLY ON THE STAFF SIDE. The top bar held two links and the
// product has thirteen modules. It does not scale horizontally, and it breaks
// sooner in Arabic than the English labels suggest — "التذاكر" and "العملاء"
// are not the widths of "Tickets" and "Customers" — and administration will add
// a group with several children under it, which a horizontal bar cannot hold.
//
// The CUSTOMER PORTAL keeps its top bar. A customer has two screens; a sidebar
// there would be heavier than the content it navigates.
//
// ⚠ THIS PART OF THE LAYOUT HAS BROKEN THE PAGE BEFORE. The previous top bar
// was one non-wrapping row, so at 390px it pushed the document to 466px and
// EVERY staff screen scrolled sideways — invisible at desktop width and found
// by accident. Hence the width discipline in the template and a measurement at
// 390px as part of accepting this.
//
// State lives in SidebarState, shared with the trigger in the top bar.

import { Component, computed, inject, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SidebarState } from './sidebar-state';

export interface NavChild { labelKey: string; route: string }

export interface NavItem {
  labelKey: string;
  /** A leaf has a route; a group has children. Never both. */
  route?: string;
  icon: string;
  children?: NavChild[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './sidebar.html'
})
export class Sidebar {
  protected readonly i18n = inject(LanguageService);
  protected readonly state = inject(SidebarState);

  /** Groups start open, so nothing is hidden from somebody who has not used it. */
  private readonly closedGroups = new Set<string>();

  // THE WHOLE CLASS LIST IS COMPUTED, deliberately, rather than split between a
  // static `class` and a `[class]` binding. Two faults came from splitting it,
  // both found by measuring rather than by reading:
  //
  //   1. `lg:w-auto` in the static list and `lg:w-60` from the binding have
  //      equal specificity, so the stylesheet's own ordering decided the width —
  //      and it chose auto. The panel sized to its content, 155px, not 240px.
  //   2. `lg:translate-x-0` lost to `rtl:translate-x-full` for the same reason,
  //      so at desktop width in Arabic the panel sat outside the viewport.
  //
  // Emitting exactly one class per decision removes the competition. The strings
  // are written out in full because Tailwind scans source text: `lg:w-${n}`
  // would compile to no CSS at all.
  //
  // `max-lg:` on the off-canvas transform means it does not exist above the
  // breakpoint, rather than existing and being overridden.
  protected readonly asideClasses = computed(() => {
    const base = 'fixed inset-y-0 start-0 z-40 flex w-64 flex-col border-e border-surface-200 '
      + 'bg-surface-0 motion-safe:transition-transform lg:static lg:z-auto '
      + 'lg:motion-safe:transition-[width] ';
    const width = this.state.collapsed() ? 'lg:w-16 ' : 'lg:w-60 ';
    const offCanvas = this.state.drawerOpen()
      ? 'translate-x-0 '
      : 'max-lg:-translate-x-full rtl:max-lg:translate-x-full ';
    return base + width + offCanvas;
  });

  protected readonly items: NavItem[] = [
    { labelKey: 'nav.tickets', route: '/tickets', icon: 'tickets' },
    { labelKey: 'nav.customers', route: '/customers', icon: 'customers' },
    // Administration is a GROUP with no destination of its own — the reason the
    // sidebar needs grouping at all. Its children are the screens that do not
    // exist yet; listing them here is all that will be required.
    { labelKey: 'nav.administration', icon: 'administration', children: [] }
  ];

  /** A group with no children is not rendered — an empty section reads as broken. */
  protected readonly visibleItems = computed(() =>
    this.items.filter(i => i.route || (i.children?.length ?? 0) > 0));

  protected isGroupOpen(key: string): boolean { return !this.closedGroups.has(key); }

  protected toggleGroup(key: string): void {
    this.closedGroups.has(key) ? this.closedGroups.delete(key) : this.closedGroups.add(key);
  }

  /** Escape closes the drawer — an overlay that traps a keyboard user is a defect. */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.state.drawerOpen()) this.state.closeDrawer();
  }
}

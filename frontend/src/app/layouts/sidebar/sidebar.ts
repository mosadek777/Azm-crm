// The staff navigation panel. spec 012 — FR-002 (mirrored layout), FR-005
// (usable on a phone), FR-012 (keyboard and assistive technology).
//
// WHY A SIDEBAR, AND ONLY ON THE STAFF SIDE. The top bar held two links and the
// product has thirteen modules. It does not scale horizontally, and it breaks
// sooner in Arabic than the English labels suggest — "التذاكر" and "العملاء"
// are not the widths of "Tickets" and "Customers".
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
// THE SHAPE. Built to a supplied reference: a brand block, quiet uppercase
// section headings, collapsible groups with chevrons and indented children,
// count badges, and the signed-in user pinned at the foot with the sign-out and
// language controls — which have MOVED OUT of the page header, so there is one
// place to look for "me" rather than two.
//
// LIGHT, NOT DARK. The reference is dark; the rest of the product is not, and
// two visual languages in one screen is worse than a less literal copy. The
// active state is a light violet fill (primary-100) rather than a dark one and
// the surface stays surface-0.
//
// ⚠ EVERY CLASS LIST IS COMPUTED IN ONE PLACE. A static `class` and a bound
// `[class]` have EQUAL specificity, so the cascade falls back to whatever order
// Tailwind happened to emit. That fault has appeared three times in this one
// component: the panel 155px wide, the panel outside the viewport under RTL,
// and `routerLinkActive` silently losing its text colour to the resting one.
// Nothing here splits a decision across two attributes, and an inactive state
// OMITS its utilities rather than overriding them.
//
// State lives in SidebarState, shared with the drawer trigger in the top bar.

import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { CapabilityHints } from '../../core/models/user.model';
import { SidebarState } from './sidebar-state';

export interface NavChild { labelKey: string; route: string }

export interface NavItem {
  labelKey: string;
  /** A leaf has a route; a group has children. Never both. */
  route?: string;
  icon: string;
  children?: NavChild[];
  /** Which live count, if any, this item carries. */
  badge?: 'unassignedTickets';
  /**
   * The rendering hint this item depends on. Absent means always shown.
   *
   * This is NOT authorisation — it decides whether to OFFER a control, and
   * the server refuses regardless. Its only job is that an agent is never
   * shown a section where every action returns "not authorised".
   */
  requires?: keyof CapabilityHints;
}

/** A titled run of items, like the reference's "Navigation" and "Projects". */
export interface NavSection {
  labelKey: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './sidebar.html'
})
export class Sidebar {
  protected readonly i18n = inject(LanguageService);
  protected readonly state = inject(SidebarState);
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  /** Groups start open, so nothing is hidden from somebody who has not used it. */
  private readonly closedGroups = new Set<string>();

  // See the header note: one class per decision, never split between a static
  // and a bound attribute.
  // ⚠ THE PANEL IS PINNED TO THE VIEWPORT, NOT TO THE PAGE.
  //
  // `lg:static` made it an ordinary flex item, so on a long ticket it stretched
  // to the height of the CONTENT and took the user block and the collapse
  // control hundreds of pixels below the fold with it. The navigation is not
  // part of the document being read; it has to stay where the reader is.
  //
  // `lg:sticky lg:top-0 lg:h-screen` fixes the box to one viewport height and
  // holds it there while the page scrolls past. `lg:self-start` stops the flex
  // container stretching it back out — without it, `align-items: stretch` wins
  // and `h-screen` is only a minimum.
  //
  // Below `lg` it is already `fixed inset-y-0`, which is viewport height by
  // construction. The internal `overflow-y-auto` on <nav> is what lets a long
  // list scroll inside the panel rather than pushing the foot off the bottom,
  // and it matters in both presentations.
  protected readonly asideClasses = computed(() => {
    const base = 'fixed inset-y-0 start-0 z-40 flex w-72 flex-col border-e border-surface-200 '
      + 'bg-surface-0 motion-safe:transition-transform '
      + 'lg:sticky lg:top-0 lg:h-screen lg:self-start lg:z-auto '
      + 'lg:motion-safe:transition-[width] ';
    const width = this.state.collapsed() ? 'lg:w-[4.5rem] ' : 'lg:w-64 ';
    const offCanvas = this.state.drawerOpen()
      ? 'translate-x-0 '
      : 'max-lg:-translate-x-full rtl:max-lg:translate-x-full ';
    return base + width + offCanvas;
  });

  protected readonly sections: NavSection[] = [
    {
      labelKey: 'nav.section.navigation',
      items: [
        { labelKey: 'nav.tickets', route: '/tickets', icon: 'tickets', badge: 'unassignedTickets' },
        { labelKey: 'nav.customers', route: '/customers', icon: 'customers' }
      ]
    },
    {
      labelKey: 'nav.section.administration',
      items: [
        // TWO GROUPS, not one. They are genuinely different things:
        // branches and departments are the platform's own structure
        // (spec 012 FR-007, FR-008); users and roles are who may reach it
        // (spec 010 FR-001, FR-002). A single 'Administration' group under
        // an 'Administration' heading also said the word twice.
        {
          labelKey: 'nav.group.organisation',
          icon: 'organisation',
          requires: 'administration',
          children: [
            { labelKey: 'admin.branches', route: '/admin/branches' },
            { labelKey: 'admin.departments', route: '/admin/departments' }
          ]
        },
        {
          labelKey: 'nav.group.access',
          icon: 'access',
          requires: 'staffDirectory',
          children: [
            { labelKey: 'admin.users', route: '/admin/users' },
            { labelKey: 'admin.roles', route: '/admin/roles' }
          ]
        }
      ]
    }
  ];

  /**
   * Items whose hint is false are not rendered AT ALL, and a section left
   * with nothing in it goes with them — an empty heading reads as broken,
   * and an "Administration" heading over nothing is worse than no heading.
   *
   * The hints start false and are replaced when /auth/me answers, so the
   * panel briefly shows less rather than briefly showing too much.
   */
  protected readonly visibleSections = computed(() => {
    const show = this.auth.show();
    const permitted = (i: NavItem) =>
      (i.route || (i.children?.length ?? 0) > 0) && (!i.requires || show[i.requires]);
    return this.sections
      .map(s => ({ ...s, items: s.items.filter(permitted) }))
      .filter(s => s.items.length > 0);
  });

  // --- the count badge ------------------------------------------------------
  //
  // UNASSIGNED TICKETS, read from the server's own total. `GET /ticket` applies
  // the scope predicate as the BASE of its query, so `total` is already the
  // number this caller may see — AS-01: an out-of-scope ticket appears in "no
  // list, search, count or aggregate". `limit=1` because only the count is
  // wanted; nothing is counted client-side and no new endpoint was needed.
  //
  // It starts null, not zero. Zero unassigned tickets is good news and the
  // badge is hidden for it; "not known yet" must not render as that.
  protected readonly unassignedTickets = signal<number | null>(null);

  private readonly url = signal(this.router.url.split('?')[0]);

  constructor() {
    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        this.url.set(e.urlAfterRedirects.split('?')[0]);
        this.refreshBadges();
      }
    });
    this.refreshBadges();
  }

  private refreshBadges(): void {
    if (!this.auth.isSignedIn()) { this.unassignedTickets.set(null); return; }
    this.api.listTickets({ unassigned: 'true', limit: '1' }).subscribe({
      next: r => this.unassignedTickets.set(r.total),
      // A failed count is not an error the navigation should report — the
      // screen behind it will say so. The badge simply does not appear.
      error: () => this.unassignedTickets.set(null)
    });
  }

  protected badgeFor(item: NavItem): number | null {
    if (item.badge !== 'unassignedTickets') return null;
    const n = this.unassignedTickets();
    return n && n > 0 ? n : null;
  }

  // --- active state ---------------------------------------------------------
  protected isRouteActive(route: string): boolean {
    const u = this.url();
    return u === route || u.startsWith(route + '/');
  }

  protected isGroupActive(item: NavItem): boolean {
    return (item.children ?? []).some(c => this.isRouteActive(c.route));
  }

  protected isGroupOpen(key: string): boolean { return !this.closedGroups.has(key); }

  protected toggleGroup(key: string): void {
    this.closedGroups.has(key) ? this.closedGroups.delete(key) : this.closedGroups.add(key);
  }

  // --- class lists ----------------------------------------------------------
  //
  // ACTIVE reads as SELECTED rather than as a tint: a primary-100 fill, the
  // darker primary-800 text and semibold weight. Three signals, so it is never
  // colour alone. Inactive omits all three rather than overriding them.
  private readonly ROW = 'relative flex w-full items-center gap-3 rounded-lg '
    + 'px-3 py-2.5 text-sm no-underline motion-safe:transition-colors '
    + 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ';

  protected linkClasses(route: string): string {
    const centred = this.state.collapsed() ? 'lg:justify-center lg:px-0 ' : '';
    return this.ROW + centred + (this.isRouteActive(route)
      ? 'bg-primary-100 font-semibold text-primary-800 '
      : 'text-surface-700 hover:bg-surface-100 hover:text-surface-900 ');
  }

  protected groupClasses(item: NavItem): string {
    const centred = this.state.collapsed() ? 'lg:justify-center lg:px-0 ' : '';
    // Collapsed, the group answers for its children: they are hidden, so the
    // child carrying aria-current would be drawn for nobody.
    return this.ROW + centred + (this.state.collapsed() && this.isGroupActive(item)
      ? 'bg-primary-100 font-semibold text-primary-800 '
      : 'text-surface-700 hover:bg-surface-100 hover:text-surface-900 ');
  }

  protected childClasses(route: string): string {
    const base = 'relative block rounded-lg px-3 py-2 text-sm no-underline '
      + 'motion-safe:transition-colors '
      + 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ';
    return base + (this.isRouteActive(route)
      ? 'bg-primary-100 font-semibold text-primary-800 '
      : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 ');
  }

  /**
   * The group chevron's rotation — computed, because this is the FOURTH time
   * two competing utilities have met on one element in this component.
   *
   * `rtl:rotate-180` (static) and `rotate-90` (bound) both set Tailwind v4's
   * individual `rotate` property at equal specificity, so in Arabic an OPEN
   * group's chevron pointed left instead of down: 180 won and 90 was ignored.
   *
   * The behaviour wanted is simple once stated. The base glyph points along
   * the reading direction. Open, it points DOWN in both directions, which is
   * the same 90° turn either way. Shut, it points the way the eye travels:
   * unrotated in English, half-turned in Arabic.
   */
  protected chevronRotation(open: boolean): string {
    if (open) return 'rotate-90';
    return this.i18n.dir() === 'rtl' ? 'rotate-180' : '';
  }

  protected badgeClasses(route: string): string {
    const base = 'ms-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ';
    return base + (this.isRouteActive(route)
      ? 'bg-primary-200 text-primary-900 '
      : 'bg-surface-200 text-surface-700 ');
  }

  // --- identity -------------------------------------------------------------
  //
  // Initials from a user-authored name, which may be Arabic or Latin. The first
  // character of each of the first two words works for both and assumes no
  // particular alphabet. Spread rather than charAt, so a character outside the
  // basic plane is not cut in half.
  protected initials(name: string | null | undefined): string {
    if (!name) return '؟';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => [...p][0] ?? '').join('').toUpperCase();
  }

  /** The brand mark: the first character of the product's own name, per language. */
  protected readonly brandInitial = computed(() =>
    [...this.i18n.translate('app.name', this.i18n.lang()).trim()][0] ?? 'A');

  protected signOut(): void { this.auth.signOut(); }

  /** Escape closes the drawer — an overlay that traps a keyboard user is a defect. */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.state.drawerOpen()) this.state.closeDrawer();
  }
}

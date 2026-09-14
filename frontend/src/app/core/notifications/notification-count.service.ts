// The unread notification count, shared between the sidebar badge and the
// notification centre. spec 004 FR-013, AD-13.
//
// ONE NUMBER, TWO READERS. The centre writes what the server told it; the badge
// reads it. Without this the badge would fetch its own count and the two would
// disagree for as long as it took the next navigation to reconcile them — a
// badge saying 3 above a screen showing nothing unread.
//
// Unlike the task reminders, this count IS live: a notification is a stored row
// written inside the transaction that caused it, so refreshing on navigation
// reads a real number rather than re-running an evaluation. That is why this
// service fetches on navigation and the reminder service deliberately does not.

import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AuthService } from '../auth/services/auth.service';

@Injectable({ providedIn: 'root' })
export class NotificationCountService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly _unread = signal<number | null>(null);

  /**
   * Null means NOT KNOWN — not zero. A count that failed to load must not
   * render as "nothing is waiting", so the badge hides instead of reassuring.
   * Read through `isSignedIn` so one person's count cannot outlive their
   * session on a root singleton.
   */
  readonly unread = computed(() => this.auth.isSignedIn() ? this._unread() : null);

  refresh(): void {
    if (!this.auth.isSignedIn()) { this._unread.set(null); return; }
    this.api.unreadNotifications().subscribe({
      next: r => this._unread.set(r.unread),
      error: () => this._unread.set(null)
    });
  }

  /** Set from a response that already carried the number — saves a round trip. */
  set(n: number): void { this._unread.set(n); }
}

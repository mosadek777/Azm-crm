// The colour vocabulary for audit action keys — the counterpart to
// `status-tone.pipe.ts`, and written on the same principle: the tone tracks
// what the event MEANS to someone reading a history, not the words in its key.
//
//   something began        -> primary  (created, added)
//   ownership moved        -> sky      (assigned, granted)
//   state changed          -> amber    (a transition worth noticing)
//   someone communicated   -> green    (a message, a successful sign-in)
//   something was refused  -> red      (refusals and lockouts; these matter)
//   something was withdrawn-> grey     (deactivation, revocation, eviction)
//
// An unknown key falls through to grey rather than to a guess. A new audit
// action appearing in a colour that implies a meaning it does not have is worse
// than one appearing uncoloured.

import { Pipe, PipeTransform } from '@angular/core';

const TONES: Record<string, string> = {
  // began
  'ticket.created': 'bg-primary-100 text-primary-800',
  'customer.created': 'bg-primary-100 text-primary-800',
  'branch.created': 'bg-primary-100 text-primary-800',
  'department.created': 'bg-primary-100 text-primary-800',
  'user.created': 'bg-primary-100 text-primary-800',
  'portal_identity.created': 'bg-primary-100 text-primary-800',
  'contact_point.added': 'bg-primary-100 text-primary-800',

  // ownership moved
  'ticket.assigned': 'bg-sky-100 text-sky-800',
  'role_assignment.granted': 'bg-sky-100 text-sky-800',

  // state changed
  'ticket.status_changed': 'bg-amber-100 text-amber-800',

  // communicated
  'message.added': 'bg-green-100 text-green-800',
  'auth.signin_succeeded': 'bg-green-100 text-green-800',
  'session.opened': 'bg-green-100 text-green-800',
  'user.reactivated': 'bg-green-100 text-green-800',

  // refused
  'permission.refused': 'bg-red-100 text-red-800',
  'auth.signin_failed': 'bg-red-100 text-red-800',
  'auth.locked_out': 'bg-red-100 text-red-800',

  // withdrawn
  'user.deactivated': 'bg-surface-200 text-surface-700',
  'session.revoked': 'bg-surface-200 text-surface-700',
  'role_assignment.revoked': 'bg-surface-200 text-surface-700',
  'branch.active_changed': 'bg-surface-200 text-surface-700',
  'department.active_changed': 'bg-surface-200 text-surface-700'
};

@Pipe({ name: 'actionTone' })
export class ActionTonePipe implements PipeTransform {
  transform(action: string | null | undefined): string {
    return TONES[action ?? ''] ?? 'bg-surface-200 text-surface-700';
  }
}

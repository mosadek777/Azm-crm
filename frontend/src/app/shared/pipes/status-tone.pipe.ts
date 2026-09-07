// spec 002 — the colour vocabulary for the ten ratified statuses.
//
// ONE mapping, used by the list, the detail header and anywhere else a status
// appears — the same reason `elapsed-time.js` is the only duration source: two
// colour maps drift, and a status that is amber on one screen and grey on the
// next teaches the reader that colour means nothing.
//
// The tones track what the status MEANS to an agent, not the raw status name:
//   open work        -> primary  (yours to move)
//   clock paused     -> amber    (waiting on someone else — decision 14)
//   resolved         -> green    (done, pending confirmation)
//   terminal         -> grey     (closed for work)
// `pending_internal` is deliberately NOT amber: it does not pause the clock
// (decision 15), so colouring it like the paused statuses would tell the agent
// the opposite of the truth.

import { Pipe, PipeTransform } from '@angular/core';

const TONES: Record<string, string> = {
  new: 'bg-primary-100 text-primary-800',
  assigned: 'bg-primary-100 text-primary-800',
  in_progress: 'bg-primary-100 text-primary-800',
  pending_internal: 'bg-sky-100 text-sky-800',
  pending_customer: 'bg-amber-100 text-amber-800',
  pending_supplier: 'bg-amber-100 text-amber-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-surface-200 text-surface-700',
  merged: 'bg-surface-200 text-surface-700',
  cancelled: 'bg-surface-200 text-surface-700'
};

@Pipe({ name: 'statusTone' })
export class StatusTonePipe implements PipeTransform {
  transform(status: string | null | undefined): string {
    return TONES[status ?? ''] ?? 'bg-surface-200 text-surface-700';
  }
}

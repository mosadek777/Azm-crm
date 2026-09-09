// Proposed spec 012 FR-016 / story PLT-15 — in-app action feedback.
//
// ⚠ THIS IMPLEMENTS A REQUIREMENT THAT IS NOT YET IN specs/. The wording was
// drafted and put to the project owner on 2026-09-09; nothing in the source
// material demands in-app toasts. `012 E-17` presupposes an in-app channel
// ("Push registration invalid or expired — falls back to in-app and email")
// without any requirement ever defining one, which is the gap this fills.
// If the wording is not ratified, this is what gets deleted.
//
// A MESSAGE IS BILINGUAL OR IT IS A KEY. There is no third option and no
// plain-string overload, deliberately: a `toast.error('Save failed')` helper
// would be used, and it would put an untranslated English string in front of an
// Arabic-speaking user. Constitution I, and the reason `LocalisedText` is the
// only shape accepted for a literal message.
//
// Errors carry the SERVER's message. Every refusal in this API already arrives
// as `{ ar, en }`, so an error toast renders what the server said rather than a
// client-side guess at what went wrong.

import { Injectable, signal, computed } from '@angular/core'

export type ToastKind = 'success' | 'error' | 'warning' | 'info'

/** The `{ ar, en }` shape every API refusal already uses. */
export interface LocalisedText { ar: string; en: string }

export interface Toast {
  id: number
  kind: ToastKind
  /** A dictionary key, resolved at render time, or a literal bilingual message. */
  message: string | LocalisedText
  /** Optional second line — typically a dictionary key naming the record. */
  detail?: string | LocalisedText
  /** Whether this one disappears on its own. Errors never do. */
  autoDismiss: boolean
}

// Success and information are confirmations of something the user already knows
// they did, so they clear themselves. Errors and warnings are not: a message
// that removes itself before it has been read is worse than no message, and an
// error is precisely the case where the user needs time to read it and may need
// to copy it. So errors and warnings stay until dismissed.
const AUTO_DISMISS: Record<ToastKind, boolean> = {
  success: true,
  info: true,
  warning: false,
  error: false
}

const DISMISS_AFTER_MS = 5000

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly items = signal<Toast[]>([])
  private nextId = 1
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>()

  /** Newest first, so the newest renders nearest the screen edge. */
  readonly toasts = computed(() => this.items())

  private push (kind: ToastKind, message: string | LocalisedText, detail?: string | LocalisedText): number {
    const id = this.nextId++
    const autoDismiss = AUTO_DISMISS[kind]
    this.items.update(list => [{ id, kind, message, detail, autoDismiss }, ...list])

    if (autoDismiss) {
      this.timers.set(id, setTimeout(() => this.dismiss(id), DISMISS_AFTER_MS))
    }
    return id
  }

  success (message: string | LocalisedText, detail?: string | LocalisedText) { return this.push('success', message, detail) }
  error (message: string | LocalisedText, detail?: string | LocalisedText) { return this.push('error', message, detail) }
  warning (message: string | LocalisedText, detail?: string | LocalisedText) { return this.push('warning', message, detail) }
  info (message: string | LocalisedText, detail?: string | LocalisedText) { return this.push('info', message, detail) }

  /**
   * The shape an HTTP failure actually arrives in. Every refusal this API
   * produces carries `{ message: { ar, en } }`; anything that does not is a
   * genuine transport failure, and the caller supplies the bilingual fallback
   * rather than this service inventing English.
   */
  fromHttpError (err: unknown, fallback: LocalisedText) {
    const body = (err as { error?: { message?: LocalisedText } })?.error
    const message = body?.message
    const usable = message && typeof message.ar === 'string' && typeof message.en === 'string'
    return this.push('error', usable ? message : fallback)
  }

  dismiss (id: number) {
    const timer = this.timers.get(id)
    if (timer) { clearTimeout(timer); this.timers.delete(id) }
    this.items.update(list => list.filter(t => t.id !== id))
  }

  clear () {
    for (const timer of this.timers.values()) clearTimeout(timer)
    this.timers.clear()
    this.items.set([])
  }
}

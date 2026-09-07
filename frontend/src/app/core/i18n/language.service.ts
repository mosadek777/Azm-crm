// spec 012 — implements FR-001, FR-002, AS-01, AS-03, NFR-001; constitution I
//
// The interface language, as a signal. Switching is runtime — no reload, no
// rebuild — because FR-001 requires switching "at any time without losing the
// user's context, filters or position" and NFR-001 caps it at 1 second.
//
// @angular/localize is deliberately NOT used: it compiles one bundle per locale
// and cannot switch without a reload, which fails FR-001 outright.
//
// Direction (FR-002) is derived, never stored separately: `ar` is rtl, `en` is
// ltr. The service writes `dir` and `lang` onto <html> so CSS logical
// properties and the browser's own bidi algorithm do the mirroring.

import { Injectable, computed, effect, signal } from '@angular/core';
import { DICTIONARY } from './dictionary';
import { Language } from '../models/user.model';

const LANG_KEY = 'azm.lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly _lang = signal<Language>(this.readStored());

  readonly lang = this._lang.asReadonly();
  readonly dir = computed<'rtl' | 'ltr'>(() => (this._lang() === 'ar' ? 'rtl' : 'ltr'));

  constructor() {
    effect(() => {
      const lang = this._lang();
      const root = document.documentElement;
      root.setAttribute('lang', lang);
      root.setAttribute('dir', this.dir());
      try {
        localStorage.setItem(LANG_KEY, lang);
      } catch {
        // A blocked storage is not a reason to fail a language switch.
      }
    });
  }

  set(lang: Language) {
    this._lang.set(lang);
  }

  toggle() {
    this._lang.set(this._lang() === 'ar' ? 'en' : 'ar');
  }

  // AS-03: no fallback. A key with no entry for the active language renders as
  // an explicit, visible marker — never as the other language, and never as an
  // empty string. It is meant to be noticed, and it is what an
  // untranslated-strings scan (NFR-002) would catch.
  translate(key: string, lang: Language = this._lang()): string {
    const entry = DICTIONARY[key];
    if (!entry) return `⟦missing key: ${key}⟧`;
    const value = entry[lang];
    if (!value) return `⟦missing ${lang}: ${key}⟧`;
    return value;
  }

  private readStored(): Language {
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored === 'ar' || stored === 'en') return stored;
    } catch {
      // fall through
    }
    // No stored preference. Arabic and English are peers, so there is no
    // "default" language on principle — the browser's own preference decides.
    return navigator.language?.startsWith('ar') ? 'ar' : 'en';
  }
}

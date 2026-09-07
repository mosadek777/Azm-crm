// spec 012 — verifies AS-01 (switch is complete), AS-03 (no fallback, ever)

import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { LanguageService } from './language.service';
import { DICTIONARY } from './dictionary';

describe('LanguageService', () => {
  let i18n: LanguageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    i18n = TestBed.inject(LanguageService);
  });

  it('switches language and direction together (FR-002)', () => {
    i18n.set('ar');
    expect(i18n.lang()).toBe('ar');
    expect(i18n.dir()).toBe('rtl');

    i18n.set('en');
    expect(i18n.lang()).toBe('en');
    expect(i18n.dir()).toBe('ltr');
  });

  it('returns a different string per language for the same key (AS-01)', () => {
    const ar = i18n.translate('login.title', 'ar');
    const en = i18n.translate('login.title', 'en');
    expect(ar).not.toBe(en);
    expect(ar).toBe('تسجيل الدخول');
    expect(en).toBe('Sign in');
  });

  it('NEVER falls back to the other language (AS-03)', () => {
    // A key present in English only, as legacy or imported data might be.
    (DICTIONARY as Record<string, { ar: string; en: string }>)['test.halfDone'] =
      { ar: '', en: 'English only' };

    const rendered = i18n.translate('test.halfDone', 'ar');

    expect(rendered).not.toBe('English only');
    expect(rendered).not.toBe('');
    expect(rendered).toContain('missing ar');
  });

  it('marks an unknown key visibly rather than rendering empty', () => {
    expect(i18n.translate('no.such.key', 'en')).toContain('missing key');
  });

  it('has both languages for every shipped key (NFR-002)', () => {
    const incomplete = Object.entries(DICTIONARY)
      .filter(([key]) => !key.startsWith('test.'))
      .filter(([, v]) => !v.ar || !v.en)
      .map(([key]) => key);

    expect(incomplete).toEqual([]);
  });
});

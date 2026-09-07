// spec 012 — implements FR-001
//
// Usage:  {{ 'login.title' | translate: lang() }}
//
// The second argument is not decoration. Angular caches a PURE pipe's result
// per set of inputs, so a pipe called with only the key would never re-run when
// the language signal changed and every string would stay stale. Passing the
// language makes the input change, which invalidates the cache. The alternative
// — an impure pipe — re-runs on every change detection cycle for every string.

import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { Language } from '../../core/models/user.model';

@Pipe({ name: 'translate' })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(LanguageService);

  transform(key: string, lang: Language): string {
    return this.i18n.translate(key, lang);
  }
}

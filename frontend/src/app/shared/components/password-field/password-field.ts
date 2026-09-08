// A password input with an eye toggle. One implementation, used by both the
// staff sign-in and the customer portal.
//
// It replaces a "Show"/"Hide" text button that sat inside the input's padding
// and overlapped the typed characters — unreadable in both languages, and worse
// in Arabic where the text ran into the value from the other side.
//
// WHY AN ICON RATHER THAN SHORTER TEXT. The control has to sit inside the field
// to be understood as belonging to it, so its width has to be predictable. A
// word is not: "Show"/"Hide" and "إظهار"/"إخفاء" are four different widths, and
// each one changes the padding the input needs on that edge. A 20px square is
// the same on every screen in every language.
//
// ACCESSIBILITY. The icon is decorative and hidden from assistive technology;
// the button carries an aria-label that still says show or hide, and
// aria-pressed reports the state. Nothing here depends on seeing the glyph.
// (This is one control done properly — it is not the accessibility pass the
// hand-rolled components still need; see next-steps.md §5.)

import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { inject } from '@angular/core';

@Component({
  selector: 'app-password-field',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './password-field.html'
})
export class PasswordField {
  protected readonly i18n = inject(LanguageService);

  readonly value = model.required<string>();
  readonly inputId = input<string>('password');
  readonly autocomplete = input<string>('current-password');

  protected readonly revealed = model(false);
}

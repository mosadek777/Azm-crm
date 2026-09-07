// spec 001 — CM-01, FR-001, FR-004 (decision 16), FR-010, AS-01, AS-04, E-05
// Tailwind only (decision 24).
//
// FR-001: a display name plus at least one contact point. Nothing else is
// required, and this form must not invent extra required fields.
//
// THE COLLISION FLOW (FR-010, AS-04, decision 16). The API answers 409 with the
// matching customers named, and the create is NOT blocked — resending with
// `confirmCollision: true` proceeds and records the override in field history.
// Out-of-scope collisions come back as a COUNT with no identities (spec 010
// §8 forbids disclosing that an out-of-scope record exists), so the screen
// says "N more outside your scope" rather than pretending there were none.

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LocalizedText } from '../../../core/models/user.model';

interface CollisionMatch {
  id: string;
  displayName: string;
  matchedOn: string;
}

@Component({
  selector: 'app-customer-create',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './customer-create.html'
})
export class CustomerCreate {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(LanguageService);

  protected readonly displayName = signal('');
  protected readonly type = signal<'person' | 'organisation'>('person');
  protected readonly preferredLanguage = signal<'ar' | 'en'>('en');
  protected readonly nationalId = signal('');
  protected readonly channelType = signal<'phone' | 'email' | 'whatsapp'>('phone');
  protected readonly contactValue = signal('');

  protected readonly busy = signal(false);
  protected readonly refusal = signal<LocalizedText | null>(null);
  protected readonly fields = signal<string[]>([]);

  protected readonly matches = signal<CollisionMatch[]>([]);
  protected readonly outOfScopeMatches = signal(0);
  protected readonly collisionPrompt = signal(false);

  protected get ready(): boolean {
    return this.displayName().trim().length >= 2 && this.contactValue().trim().length > 0;
  }

  private payload(confirmCollision: boolean) {
    return {
      displayName: this.displayName().trim(),
      type: this.type(),
      preferredLanguage: this.preferredLanguage(),
      nationalId: this.nationalId().trim() || undefined,
      contactPoints: [{
        channelType: this.channelType(),
        value: this.contactValue().trim(),
        isPrimary: true
      }],
      ...(confirmCollision ? { confirmCollision: true } : {})
    };
  }

  protected submit(confirmCollision = false): void {
    this.busy.set(true);
    this.refusal.set(null);
    this.fields.set([]);
    if (!confirmCollision) {
      this.matches.set([]);
      this.outOfScopeMatches.set(0);
      this.collisionPrompt.set(false);
    }

    this.api.createCustomer(this.payload(confirmCollision)).subscribe({
      next: r => this.router.navigate(['/customers', r.customer._id]),
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);

        // 409 is not a failure here — it is the duplicate warning FR-010
        // requires be shown BEFORE saving, with an explicit way to proceed.
        if (e.status === 409) {
          this.matches.set(e.error?.matches ?? []);
          this.outOfScopeMatches.set(e.error?.outOfScopeMatches ?? 0);
          this.collisionPrompt.set(true);
          this.refusal.set(e.error?.message ?? null);
          return;
        }

        // Every other refusal renders the SERVER's bilingual message in the
        // viewing language — the client does not translate API errors.
        this.refusal.set(e.error?.message ?? {
          ar: 'تعذر الاتصال بالخادم',
          en: 'Could not reach the server'
        });
        this.fields.set(e.error?.fields ?? []);
      }
    });
  }

  protected openMatch(id: string): void {
    this.router.navigate(['/customers', id]);
  }

  protected cancel(): void {
    this.router.navigate(['/customers']);
  }
}

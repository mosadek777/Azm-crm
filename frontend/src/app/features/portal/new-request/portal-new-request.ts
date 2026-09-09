// spec 008 — the customer raises a request (FR-002, AS-04).
//
// The form carries exactly three fields, because FR-002 asks for exactly three:
// "submit a request with category, description and attachments" — attachments
// excluded for the demo by decision 34.
//
// There is no priority control and no status control, and their absence is not
// a UI simplification: 002 §9 gives the customer column `—` for assignment and
// limits status changes to confirm/reopen/cancel. The server refuses those
// fields BY NAME, so a form that offered them would produce a 400.

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PortalApiService } from '../../../core/services/portal-api.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ApiRefusal, LocalizedText } from '../../../core/models/user.model';
import { ToastService } from '../../../core/notifications/toast.service';

@Component({
  selector: 'app-portal-new-request',
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './portal-new-request.html'
})
export class PortalNewRequest {
  private readonly toast = inject(ToastService);
  private readonly api = inject(PortalApiService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(LanguageService);

  protected readonly subject = signal('');
  protected readonly description = signal('');
  protected readonly category = signal('');
  protected readonly submitting = signal(false);
  protected readonly refusal = signal<LocalizedText | null>(null);

  // Decision 21: category is a flat string, not the tree FR-004 requires. These
  // are the values the demo data uses, offered as a list rather than free text
  // so the demo does not produce a category nothing else recognises.
  protected readonly categories = ['Billing / Refund', 'Technical', 'Account', 'Logistics', 'Contracts'];

  protected submit() {
    this.refusal.set(null);
    this.submitting.set(true);

    this.api.submitTicket({
      subject: this.subject(),
      description: this.description(),
      category: this.category()
    }).subscribe({
      next: response => {
        this.toast.success('toast.requestSubmitted', { ar: response.ticket.reference, en: response.ticket.reference });
        this.router.navigate(['/portal/tickets', response.ticket._id]);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        const body = error.error as ApiRefusal | null;
        this.refusal.set(body?.message ?? {
          ar: 'تعذر الاتصال بالخادم',
          en: 'Could not reach the server'
        });
      }
    });
  }
}

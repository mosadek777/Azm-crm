// spec 012 — implements FR-001, FR-004; constitution I
//
// Interface chrome, both languages, one entry per string. Peer languages, on
// the provisional answer to [CLARIFY-1] (developer, 2026-09-07, unratified).
//
// AS-03 — NO FALLBACK, EVER. A key missing a language must render as an
// explicit marker, never as the other language. That is enforced in
// language.service.ts, not here.
//
// This holds INTERFACE CHROME only. It is not where admin-authored labels live
// — those are localized-value subdocuments in the database (spec 012 §3), and
// they arrive from the API already carrying both languages.

export interface Translations {
  readonly [key: string]: { readonly ar: string; readonly en: string };
}

export const DICTIONARY: Translations = {
  'app.name': { ar: 'عزم — دعم العملاء', en: 'AZM — Customer Support' },

  'login.title': { ar: 'تسجيل الدخول', en: 'Sign in' },
  'login.email': { ar: 'البريد الإلكتروني', en: 'Email address' },
  'login.password': { ar: 'كلمة المرور', en: 'Password' },
  'login.submit': { ar: 'تسجيل الدخول', en: 'Sign in' },
  'login.submitting': { ar: 'جارٍ تسجيل الدخول…', en: 'Signing in…' },
  'login.required': { ar: 'هذا الحقل مطلوب', en: 'This field is required' },
  'login.noAccount': {
    ar: 'الحسابات يُنشئها مدير النظام. لا يوجد تسجيل ذاتي.',
    en: 'Accounts are created by an administrator. There is no self-registration.'
  },

  'login.show': { ar: 'إظهار', en: 'Show' },
  'login.hide': { ar: 'إخفاء', en: 'Hide' },

  'lang.switchTo': { ar: 'English', en: 'العربية' },

  'workspace.signOut': { ar: 'تسجيل الخروج', en: 'Sign out' },

  'customer.new': { ar: 'عميل جديد', en: 'New customer' },
  'customer.create': { ar: 'إنشاء العميل', en: 'Create customer' },
  'customer.createNote': { ar: 'الاسم ووسيلة تواصل واحدة على الأقل', en: 'A display name and at least one contact point' },
  'customer.notFound': { ar: 'غير موجود', en: 'Not found' },
  'customer.contactPoint': { ar: 'وسيلة التواصل', en: 'Contact point' },
  'customer.person': { ar: 'فرد', en: 'Person' },
  'customer.organisationType': { ar: 'مؤسسة', en: 'Organisation' },
  'customer.existingMatches': { ar: 'يوجد عميل مطابق بالفعل', en: 'A matching customer already exists' },
  'customer.outOfScopeMatches': { ar: 'مطابقات أخرى خارج نطاقك', en: 'more match(es) outside your scope' },
  'customer.createAnyway': { ar: 'إنشاء سجل منفصل', en: 'Create a separate record' },
  'action.cancel': { ar: 'إلغاء', en: 'Cancel' },
  'action.back': { ar: 'رجوع', en: 'Back' },
  'common.optional': { ar: 'اختياري', en: 'optional' },
  'channel.phone': { ar: 'هاتف', en: 'Phone' },
  'channel.email': { ar: 'بريد إلكتروني', en: 'Email' },
  'channel.whatsapp': { ar: 'واتساب', en: 'WhatsApp' },
  'page.prev': { ar: 'السابق', en: 'Previous' },
  'page.next': { ar: 'التالي', en: 'Next' },
  'ticket.allAssignees': { ar: 'كل المسؤولين', en: 'All assignees' },
  'ticket.notFound': { ar: 'غير موجود', en: 'Not found' },
  'ticket.claim': { ar: 'تعييني على التذكرة', en: 'Assign to me' },
  'ticket.changeCustomer': { ar: 'تغيير العميل', en: 'Change customer' },
  'nav.customers': { ar: 'العملاء', en: 'Customers' },
  'nav.tickets': { ar: 'التذاكر', en: 'Tickets' },
  'common.unavailable': { ar: 'غير متاح', en: 'unavailable' },
  'common.yes': { ar: 'نعم', en: 'Yes' },
  'common.no': { ar: 'لا', en: 'No' },
  'action.search': { ar: 'بحث', en: 'Search' },
  'action.save': { ar: 'حفظ', en: 'Save' },
  'action.apply': { ar: 'تطبيق', en: 'Apply' },
  'action.send': { ar: 'إرسال', en: 'Send' },
  'customer.search': { ar: 'بحث العملاء', en: 'Customer search' },
  'customer.searchHint': { ar: 'الاسم أو الهاتف أو البريد أو الرقم القومي', en: 'Name, phone, email or national ID' },
  'customer.minChars': { ar: 'اكتب ٣ أحرف على الأقل', en: 'Type at least 3 characters' },
  'customer.noResults': { ar: 'لا نتائج', en: 'No results' },
  'customer.name': { ar: 'الاسم', en: 'Name' },
  'customer.type': { ar: 'النوع', en: 'Type' },
  'customer.nationalId': { ar: 'الرقم القومي', en: 'National ID' },
  'customer.accountRef': { ar: 'رقم الحساب', en: 'Account reference' },
  'customer.matchedOn': { ar: 'مطابقة على', en: 'Matched on' },
  'customer.sensitive': { ar: 'حساس', en: 'Sensitive' },
  'customer.identity': { ar: 'الهوية', en: 'Identity' },
  'customer.contactPoints': { ar: 'وسائل التواصل', en: 'Contact points' },
  'customer.primary': { ar: 'أساسي', en: 'Primary' },
  'customer.unnormalised': { ar: 'غير مُوحّد', en: 'Unnormalised' },
  'customer.shared': { ar: 'مشترك', en: 'Shared' },
  'customer.organisation': { ar: 'المؤسسة', en: 'Organisation' },
  'customer.entitlement': { ar: 'الاستحقاق', en: 'Entitlement' },
  'customer.preferredLanguage': { ar: 'اللغة المفضلة', en: 'Preferred language' },
  'customer.edit': { ar: 'تعديل', en: 'Edit' },
  'customer.savedFields': { ar: 'تم حفظ', en: 'Saved' },
  'customer.tickets': { ar: 'تذاكر هذا العميل', en: 'Tickets for this customer' },
  'ticket.queue': { ar: 'قائمة التذاكر', en: 'Ticket queue' },
  'ticket.new': { ar: 'تذكرة جديدة', en: 'New ticket' },
  'ticket.create': { ar: 'إنشاء التذكرة', en: 'Create ticket' },
  'ticket.createNote': { ar: 'العميل والموضوع والوصف والتصنيف والأولوية مطلوبة', en: 'Customer, subject, description, category and priority are required' },
  'ticket.none': { ar: 'لا توجد تذاكر', en: 'No tickets' },
  'ticket.reference': { ar: 'المرجع', en: 'Reference' },
  'ticket.subject': { ar: 'الموضوع', en: 'Subject' },
  'ticket.status': { ar: 'الحالة', en: 'Status' },
  'ticket.priority': { ar: 'الأولوية', en: 'Priority' },
  'ticket.category': { ar: 'التصنيف', en: 'Category' },
  'ticket.tags': { ar: 'الوسوم', en: 'Tags' },
  'ticket.description': { ar: 'الوصف', en: 'Description' },
  'ticket.descriptionNote': { ar: 'يصبح الوصف أول رسالة مرئية للعميل في المحادثة', en: 'The description becomes the first customer-visible message on the thread' },
  'ticket.assignee': { ar: 'المسؤول', en: 'Assignee' },
  'ticket.unassigned': { ar: 'غير مُعيّن', en: 'Unassigned' },
  'ticket.unassignedOnly': { ar: 'غير المُعيّنة فقط', en: 'Unassigned only' },
  'ticket.allStatuses': { ar: 'كل الحالات', en: 'All statuses' },
  'ticket.allPriorities': { ar: 'كل الأولويات', en: 'All priorities' },
  'ticket.searchHint': { ar: 'الموضوع أو المرجع', en: 'Subject or reference' },
  'ticket.sla': { ar: 'المؤقت', en: 'SLA' },
  'ticket.paused': { ar: 'المؤقت متوقف', en: 'Clock paused' },
  'ticket.details': { ar: 'التفاصيل', en: 'Details' },
  'ticket.changeStatus': { ar: 'تغيير الحالة', en: 'Change status' },
  'ticket.reason': { ar: 'السبب', en: 'Reason' },
  'ticket.followUp': { ar: 'تاريخ المتابعة', en: 'Follow-up date' },
  'ticket.terminal': { ar: 'حالة نهائية — لا انتقال منها', en: 'Terminal status — no transition out' },
  'ticket.assignment': { ar: 'التعيين', en: 'Assignment' },
  'ticket.release': { ar: 'إلغاء التعيين', en: 'Release' },
  'ticket.assignNote': { ar: 'السبب مطلوب لكل تعيين أو إعادة تعيين', en: 'A reason is required for every assignment and reassignment' },
  'ticket.thread': { ar: 'المحادثة', en: 'Thread' },
  'ticket.reply': { ar: 'الرد', en: 'Reply' },
  'ticket.visibility': { ar: 'الظهور', en: 'Visibility' },
  'ticket.chooseVisibility': { ar: 'اختر: للعميل أم ملاحظة داخلية', en: 'Choose: customer-visible or internal' },
  'ticket.customerVisible': { ar: 'مرئي للعميل', en: 'Customer-visible' },
  'ticket.internal': { ar: 'ملاحظة داخلية', en: 'Internal note' },
  'ticket.history': { ar: 'السجل', en: 'History' },
  'ticket.customer': { ar: 'العميل', en: 'Customer' },
  'ticket.selected': { ar: 'المحدد', en: 'Selected' },
  'history.when': { ar: 'التاريخ', en: 'When' },
  'history.action': { ar: 'الإجراء', en: 'Action' },
  'history.actor': { ar: 'المنفّذ', en: 'Actor' }
};

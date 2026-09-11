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
  'nav.staffArea': { ar: 'الموظفون', en: 'Staff' },

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

  // spec 012 FR-002, FR-012 — the staff sidebar. Every control that is
  // icon-only when collapsed still carries a name here, because an icon with no
  // accessible name is invisible to a screen reader however clear it looks.
  'nav.primary': { ar: 'التنقل الرئيسي', en: 'Main navigation' },
  'nav.menu': { ar: 'القائمة', en: 'Menu' },
  'nav.openMenu': { ar: 'فتح قائمة التنقل', en: 'Open navigation menu' },
  'nav.closeMenu': { ar: 'إغلاق قائمة التنقل', en: 'Close navigation menu' },
  'nav.collapse': { ar: 'طيّ القائمة', en: 'Collapse menu' },
  'nav.expand': { ar: 'توسيع القائمة', en: 'Expand menu' },
  'nav.administration': { ar: 'الإدارة', en: 'Administration' },

  // Administration screens — spec 012 FR-007, FR-008, FR-015.
  'admin.branches': { ar: 'الفروع', en: 'Branches' },
  'admin.departments': { ar: 'الأقسام', en: 'Departments' },
  'admin.newBranch': { ar: 'فرع جديد', en: 'New branch' },
  'admin.newDepartment': { ar: 'قسم جديد', en: 'New department' },
  'admin.name': { ar: 'الاسم', en: 'Name' },
  'admin.nameAr': { ar: 'الاسم بالعربية', en: 'Name in Arabic' },
  'admin.nameEn': { ar: 'الاسم بالإنجليزية', en: 'Name in English' },
  'admin.timezone': { ar: 'المنطقة الزمنية', en: 'Timezone' },
  'admin.defaultLocale': { ar: 'اللغة الافتراضية', en: 'Default language' },
  'admin.state': { ar: 'الحالة', en: 'State' },
  'admin.action': { ar: 'إجراء', en: 'Action' },
  'admin.active': { ar: 'نشط', en: 'Active' },
  'admin.inactive': { ar: 'غير نشط', en: 'Inactive' },
  'admin.deactivate': { ar: 'إيقاف', en: 'Deactivate' },
  'admin.reactivate': { ar: 'إعادة تنشيط', en: 'Reactivate' },
  'admin.branchCreated': { ar: 'تم إنشاء الفرع', en: 'Branch created' },
  'admin.departmentCreated': { ar: 'تم إنشاء القسم', en: 'Department created' },
  'admin.deactivated': { ar: 'تم الإيقاف', en: 'Deactivated' },
  'admin.reactivated': { ar: 'تمت إعادة التنشيط', en: 'Reactivated' },
  'admin.noBranches': { ar: 'لا توجد فروع ضمن نطاقك.', en: 'There are no branches within your scope.' },
  'admin.noDepartments': { ar: 'لا توجد أقسام ضمن نطاقك.', en: 'There are no departments within your scope.' },
  // Said on the screen rather than left implicit: an administrator attached to
  // one branch sees one branch, and that is the system working.
  'admin.scopeNote': {
    ar: 'تعرض هذه القائمة ما يقع ضمن نطاقك فقط.',
    en: 'This list shows only what falls within your own scope.'
  },
  // Why there is no delete button, on the screen where somebody would look for
  // one — rather than leaving them to wonder.
  'admin.noDeleteNote': {
    ar: 'لا يمكن الحذف: السجلات القائمة تشير إلى هذه العناصر. الإيقاف هو البديل، وهو قابل للتراجع.',
    en: 'Deletion is not offered: existing records reference these. Deactivation is the alternative, and it is reversible.'
  },

  'common.loading': { ar: 'جارٍ التحميل…', en: 'Loading…' },
  'lang.arabic': { ar: 'العربية', en: 'Arabic' },
  'lang.english': { ar: 'الإنجليزية', en: 'English' },
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
  // Replaces the raw authorKind values ('customer' / 'user' / 'system'), which
  // were the enum leaking onto the screen. Staff see a role, not a name: the
  // client is not sent one, and resolving it is separate work.
  'ticket.authorCustomer': { ar: 'العميل', en: 'Customer' },
  'ticket.authorStaff': { ar: 'موظف الدعم', en: 'Support agent' },
  'ticket.authorSystem': { ar: 'النظام', en: 'System' },
  'ticket.history': { ar: 'السجل', en: 'History' },
  'ticket.customer': { ar: 'العميل', en: 'Customer' },
  'ticket.selected': { ar: 'المحدد', en: 'Selected' },
  'history.when': { ar: 'التاريخ', en: 'When' },
  'history.action': { ar: 'الإجراء', en: 'Action' },
  'history.actor': { ar: 'المنفّذ', en: 'Actor' },

  // --- spec 008, the customer portal ---------------------------------------
  // FR-011 (MUST): "fully usable in Arabic and English, switchable at any time,
  // with correct right-to-left layout". The portal is a customer-facing surface,
  // so every string here is chrome the customer reads.
  'portal.name': { ar: 'عزم — بوابة العملاء', en: 'AZM — Customer Portal' },
  // A word carrying the same meaning as the header colour, so telling the two
  // interfaces apart never depends on seeing a hue.
  'portal.customerArea': { ar: 'العملاء', en: 'Customer' },
  'portal.signIn': { ar: 'تسجيل الدخول', en: 'Sign in' },
  'portal.email': { ar: 'البريد الإلكتروني', en: 'Email address' },
  'portal.password': { ar: 'كلمة المرور', en: 'Password' },
  'portal.submitting': { ar: 'جارٍ تسجيل الدخول…', en: 'Signing in…' },
  'portal.noAccount': {
    ar: 'الحسابات تُنشأ عن طريقنا. إذا لم تتمكن من الدخول، تواصل معنا.',
    en: 'Accounts are arranged by us. If you cannot sign in, contact us.'
  },
  'portal.myRequests': { ar: 'طلباتي', en: 'My requests' },
  'portal.signOut': { ar: 'تسجيل الخروج', en: 'Sign out' },
  'portal.reference': { ar: 'الرقم المرجعي', en: 'Reference' },
  'portal.subject': { ar: 'الموضوع', en: 'Subject' },
  'portal.status': { ar: 'الحالة', en: 'Status' },
  'portal.raised': { ar: 'تاريخ الطلب', en: 'Raised' },
  'portal.none': { ar: 'لا توجد طلبات بعد.', en: 'No requests yet.' },
  'portal.backToList': { ar: 'العودة إلى طلباتي', en: 'Back to my requests' },
  'portal.conversation': { ar: 'المحادثة', en: 'Conversation' },
  'portal.fromYou': { ar: 'أنت', en: 'You' },
  // WHAT LABELS A SUPPORT REPLY.
  //
  // Not the agent: 002 [CLARIFY-6] was resolved 2026-09-08 (decision 29) — a
  // customer sees the owning team and no individual, including the person who
  // replied. So the label is an ORGANISATION label.
  //
  // It is not the team either, and deliberately not pretending to be. 008
  // FR-003 (MUST) says the view shows "the owning team", but Team is not built
  // (decision 20, extended to this surface by decision 35), so naming a team
  // here would be inventing one. When R2 lands, this label is replaced by the
  // ticket's actual owning team and FR-003 is satisfied for the first time.
  'portal.fromSupport': { ar: 'فريق دعم عزم', en: 'AZM Support' },
  'portal.noMessages': { ar: 'لا توجد رسائل بعد.', en: 'No messages yet.' },
  'portal.loading': { ar: 'جارٍ التحميل…', en: 'Loading…' },
  // Read-only for now: X4 and X6 add submit and reply. Saying so is better than
  // a button that does nothing.
  'portal.newRequest': { ar: 'طلب جديد', en: 'New request' },
  'portal.submit': { ar: 'إرسال الطلب', en: 'Submit request' },
  'portal.submittingRequest': { ar: 'جارٍ الإرسال…', en: 'Submitting…' },
  'portal.category': { ar: 'التصنيف', en: 'Category' },
  'portal.describe': { ar: 'وصف المشكلة', en: 'Describe the problem' },
  'portal.yourReply': { ar: 'ردك', en: 'Your reply' },
  'portal.send': { ar: 'إرسال', en: 'Send' },
  'portal.sending': { ar: 'جارٍ الإرسال…', en: 'Sending…' },
  'portal.cancel': { ar: 'إلغاء', en: 'Cancel' },
  // 008 E-08 (reopen on reply) and E-07 (reply to a cancelled ticket) are not
  // built — piece F3 — so a closed request refuses rather than guessing which.
  'portal.closedNoReply': {
    ar: 'هذا الطلب مغلق ولا يقبل ردودًا. أنشئ طلبًا جديدًا إذا عادت المشكلة.',
    en: 'This request is closed and accepts no reply. Raise a new request if the problem returns.'
  },

  // Proposed 012 FR-016 / PLT-15 — in-app action feedback.
  // The kind is spelled out in words as well as shown as an icon, so colour and
  // glyph are never the only carriers of meaning.
  'toast.success': { ar: 'تم', en: 'Done' },
  'toast.error': { ar: 'خطأ', en: 'Error' },
  'toast.warning': { ar: 'تنبيه', en: 'Warning' },
  'toast.info': { ar: 'معلومة', en: 'Information' },
  'toast.dismiss': { ar: 'إغلاق الإشعار', en: 'Dismiss notification' },
  'toast.regionLabel': { ar: 'إشعارات', en: 'Notifications' },

  // 012 FR-016 — outcome messages for the five actions. Successes are phrased
  // as completed facts, not as "saving…", because they appear after the fact.
  'toast.ticketCreated': { ar: 'تم إنشاء التذكرة', en: 'Ticket created' },
  'toast.ticketAssigned': { ar: 'تم تحديث المسؤول عن التذكرة', en: 'Ticket assignment updated' },
  'toast.statusChanged': { ar: 'تم تغيير حالة التذكرة', en: 'Ticket status changed' },
  'toast.messageSent': { ar: 'تم إرسال الرسالة', en: 'Message sent' },
  'toast.customerCreated': { ar: 'تم إنشاء العميل', en: 'Customer created' },
  'toast.customerSaved': { ar: 'تم حفظ بيانات العميل', en: 'Customer saved' },
  'toast.requestSubmitted': { ar: 'تم إرسال طلبك', en: 'Your request has been submitted' },
  'toast.replySent': { ar: 'تم إرسال ردك', en: 'Your reply has been sent' },
  // The only client-authored failure text in the app: used when the response
  // carries no bilingual refusal at all, which means the request never reached
  // the server. Everything else renders what the server said.
  'toast.unreachable': { ar: 'تعذر الاتصال بالخادم', en: 'Could not reach the server' },
};

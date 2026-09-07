// npm run seed:demo — a demonstrable dataset: 5 customers, 10 tickets spread
// across statuses, priorities and assignees, with Arabic and English names
// mixed throughout.
//
// EVERYTHING GOES THROUGH THE HTTP API, not through direct inserts. That is the
// point of this script: the records it creates carry the same scope predicate
// and the same audit entries a real agent's actions would, because they ARE a
// real agent's actions. A direct `Model.create()` would produce data that looks
// right and is invisible to constitution II — `npm run audit:reconcile` would
// then report it as unaudited, correctly.
//
// It therefore needs the API running (`npm run dev`) and fails clearly if not.
//
// IDEMPOTENT. Every entity carries a marker (see MARKERS below) and each step
// checks for its own output before creating anything. Running it twice leaves
// the counts unchanged.

import 'dotenv/config'

const API = `http://localhost:${process.env.PORT ?? 3000}`

// How demo data is recognised, for both re-runs and `seed:demo:clear`.
const MARKERS = {
  userEmailPrefix: 'demo.',
  customerAccountRefPrefix: 'DEMO-',
  ticketTag: 'demo',
  branchNameEn: 'Demo Branch',
  departmentNameEn: 'Demo Support'
}

const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })
  let json = null
  try { json = await res.json() } catch { /* no body */ }
  return { status: res.status, body: json }
}

const login = async (email, password) => {
  const r = await call('POST', '/auth/login', { body: { email, password } })
  if (!r.body?.token) throw new Error(`sign-in failed for ${email}: ${JSON.stringify(r.body)}`)
  return r.body.token
}

// --- the dataset ------------------------------------------------------------
// Arabic and English names mixed deliberately: a screen that has only ever been
// seen with Latin names hides every RTL and bidi defect until a real customer
// arrives (spec 012 AS-04, AS-05).
const CUSTOMERS = [
  { ref: 'DEMO-001', displayName: 'Ahmed Hassan', type: 'person', lang: 'ar', nationalId: '29001011234567', channel: 'phone', value: '+201001234567' },
  { ref: 'DEMO-002', displayName: 'منى سعيد', type: 'person', lang: 'ar', nationalId: '29505054455661', channel: 'phone', value: '+201115556677' },
  { ref: 'DEMO-003', displayName: 'Rania Botros', type: 'person', lang: 'en', nationalId: null, channel: 'email', value: 'rania.botros@example.com' },
  { ref: 'DEMO-004', displayName: 'شركة النيل للتجارة', type: 'organisation', lang: 'ar', nationalId: null, channel: 'email', value: 'support@nile-trading.example' },
  { ref: 'DEMO-005', displayName: 'Peter Wanas', type: 'person', lang: 'en', nationalId: '28812126677889', channel: 'whatsapp', value: '+201220001122' }
]

const AGENTS = [
  { email: 'demo.sara@azmsquad.com', displayName: 'Sara Ahmed', lang: 'ar' },
  { email: 'demo.omar@azmsquad.com', displayName: 'Omar Farouk', lang: 'en' }
]

// Read from the environment, never hardcoded. A literal password in a tracked
// file is a committed credential the moment the repository is pushed, however
// throwaway the account is — and demo accounts are exactly the ones that get
// reused somewhere real.
const AGENT_PASSWORD = process.env.DEMO_AGENT_PASSWORD

// Each ticket names the transitions to walk it through. Every path is legal
// under decision 22's graph — the API refuses anything else, so an illegal
// route here would fail loudly rather than produce a wrong status.
const TICKETS = [
  { customer: 0, subject: 'Card declined at checkout', category: 'Billing / Refund', priority: 'high', assign: 0, path: ['in_progress'] },
  { customer: 1, subject: 'الفاتورة غير صحيحة', category: 'Billing / Refund', priority: 'normal', assign: 0, path: ['in_progress', 'pending_customer'] },
  { customer: 2, subject: 'Cannot reset my password', category: 'Technical', priority: 'urgent', assign: 1, path: ['in_progress', 'resolved'] },
  { customer: 3, subject: 'طلب زيادة حد الائتمان', category: 'Account', priority: 'normal', assign: 1, path: ['in_progress', 'pending_supplier'] },
  { customer: 4, subject: 'Delivery arrived damaged', category: 'Logistics', priority: 'high', assign: 0, path: ['in_progress', 'pending_internal'] },
  { customer: 0, subject: 'Duplicate charge on statement', category: 'Billing / Refund', priority: 'urgent', assign: null, path: [] },
  { customer: 1, subject: 'تحديث بيانات التواصل', category: 'Account', priority: 'low', assign: null, path: [] },
  { customer: 2, subject: 'Mobile app crashes on open', category: 'Technical', priority: 'high', assign: 1, path: ['in_progress', 'resolved', 'closed'] },
  { customer: 3, subject: 'استفسار عن عقد الصيانة', category: 'Contracts', priority: 'normal', assign: 0, path: ['in_progress'] },
  { customer: 4, subject: 'Request cancelled by customer', category: 'Account', priority: 'low', assign: null, path: ['cancelled'], reason: 'Customer withdrew the request' }
]

const run = async () => {
  // Fail clearly rather than half-seeding against nothing.
  try {
    await fetch(API + '/')
  } catch {
    console.error(`The API is not reachable at ${API}.`)
    console.error('Start it first:  npm run dev')
    process.exit(1)
  }

  const adminEmail = process.env.BREAKGLASS_EMAIL
  const adminPassword = process.env.BREAKGLASS_PASSWORD
  if (!adminEmail || !adminPassword) {
    console.error('BREAKGLASS_EMAIL and BREAKGLASS_PASSWORD must be set in .env')
    process.exit(1)
  }

  if (!AGENT_PASSWORD) {
    console.error('DEMO_AGENT_PASSWORD is not set in .env — refusing to seed.')
    console.error('')
    console.error('The demo agents need a password and this script will not invent')
    console.error('one: a default here becomes a known credential on every machine')
    console.error('that ever runs the seed. Set it in backend/.env, for example:')
    console.error('')
    console.error('  DEMO_AGENT_PASSWORD=$(openssl rand -base64 18)')
    console.error('')
    process.exit(1)
  }

  const admin = await login(adminEmail, adminPassword)
  const created = { branches: 0, departments: 0, users: 0, customers: 0, tickets: 0 }
  const reused = { branches: 0, departments: 0, users: 0, customers: 0, tickets: 0 }

  // --- branch + department (the scope dimensions) ---------------------------
  const branches = (await call('GET', '/platform/branches', { token: admin })).body?.branches ?? []
  let branch = branches.find(b => b.name?.en === MARKERS.branchNameEn)
  if (branch) { reused.branches++ } else {
    branch = (await call('POST', '/platform/branches', {
      token: admin,
      body: { name: { ar: 'فرع العرض التوضيحي', en: MARKERS.branchNameEn }, timezone: 'Africa/Cairo', defaultLocale: 'ar' }
    })).body?.branch
    created.branches++
  }

  const departments = (await call('GET', '/platform/departments', { token: admin })).body?.departments ?? []
  let department = departments.find(d => d.name?.en === MARKERS.departmentNameEn)
  if (department) { reused.departments++ } else {
    department = (await call('POST', '/platform/departments', {
      token: admin,
      body: { name: { ar: 'دعم العرض التوضيحي', en: MARKERS.departmentNameEn } }
    })).body?.department
    created.departments++
  }

  const scope = { branchIds: [branch._id], departmentIds: [department._id] }

  // --- agents ---------------------------------------------------------------
  const existingUsers = (await call('GET', '/user', { token: admin })).body?.users ?? []
  const agentTokens = []
  for (const agent of AGENTS) {
    const already = existingUsers.find(u => u.email === agent.email)
    if (already) { reused.users++ } else {
      const res = await call('POST', '/user', {
        token: admin,
        body: {
          displayName: agent.displayName,
          email: agent.email,
          password: AGENT_PASSWORD,
          defaultLanguage: agent.lang,
          roles: ['AGT'],
          scope
        }
      })
      if (res.status !== 201) throw new Error(`could not create ${agent.email}: ${JSON.stringify(res.body)}`)
      created.users++
    }
    // A reused agent was created with whatever DEMO_AGENT_PASSWORD held at the
    // time. If that value has since changed, sign-in fails here — and the
    // honest fix is to clear and re-seed, not to silently reset a password.
    try {
      agentTokens.push(await login(agent.email, AGENT_PASSWORD))
    } catch {
      console.error(`Cannot sign in as ${agent.email}.`)
      console.error('')
      console.error('That account already exists but does not accept the current')
      console.error('DEMO_AGENT_PASSWORD — it was almost certainly seeded under a')
      console.error('different value. Clear the demo data and seed it again:')
      console.error('')
      console.error('  npm run seed:demo:clear && npm run seed:demo')
      console.error('')
      process.exit(1)
    }
  }

  // --- customers, created BY an agent so scope and audit are an agent's -----
  const customerIds = []
  for (const [i, c] of CUSTOMERS.entries()) {
    const token = agentTokens[i % agentTokens.length]

    // Idempotency: the account reference is unique when present (spec 001 §3),
    // so it doubles as the demo marker and the existence check.
    const found = (await call('GET', `/customer?q=${encodeURIComponent(c.ref)}`, { token })).body?.customers ?? []
    const existing = found.find(x => x.accountRef === c.ref)
    if (existing) {
      customerIds.push(existing._id)
      reused.customers++
      continue
    }

    const res = await call('POST', '/customer', {
      token,
      body: {
        displayName: c.displayName,
        type: c.type,
        preferredLanguage: c.lang,
        accountRef: c.ref,
        nationalId: c.nationalId ?? undefined,
        contactPoints: [{ channelType: c.channel, value: c.value, isPrimary: true }],
        // Two demo customers deliberately share nothing, but a real dataset
        // collides; confirming here keeps the seed non-interactive without
        // suppressing the check itself (FR-010, decision 16).
        confirmCollision: true
      }
    })
    if (res.status !== 201) throw new Error(`could not create ${c.displayName}: ${JSON.stringify(res.body)}`)
    customerIds.push(res.body.customer._id)
    created.customers++
  }

  // --- tickets --------------------------------------------------------------
  const existingTickets = (await call('GET', '/ticket?tag=' + MARKERS.ticketTag + '&limit=100', {
    token: agentTokens[0]
  })).body?.tickets ?? []

  for (const [i, spec] of TICKETS.entries()) {
    const token = agentTokens[i % agentTokens.length]

    // Idempotency: subject + demo tag identifies a ticket this script made.
    if (existingTickets.some(t => t.subject === spec.subject)) { reused.tickets++; continue }

    const res = await call('POST', '/ticket', {
      token,
      body: {
        customerId: customerIds[spec.customer],
        subject: spec.subject,
        description: `Demo ticket seeded for ${spec.subject}.`,
        category: spec.category,
        priority: spec.priority,
        tags: [MARKERS.ticketTag]
      }
    })
    if (res.status !== 201) throw new Error(`could not create "${spec.subject}": ${JSON.stringify(res.body)}`)
    const id = res.body.ticket._id
    created.tickets++

    if (spec.assign !== null && spec.assign !== undefined) {
      const assignee = (await call('GET', '/user', { token: admin })).body.users
        .find(u => u.email === AGENTS[spec.assign].email)
      // FR-009/AS-06: a reason is required for every assignment, including
      // this one. The seed does not get an exemption.
      await call('PATCH', `/ticket/${id}/assign`, {
        token: agentTokens[spec.assign],
        body: { assignedAgentId: assignee._id, reason: 'Demo data: initial assignment' }
      })
    }

    // Walk the ticket through its status path. Every hop is validated against
    // decision 22's graph server-side.
    for (const status of spec.path) {
      const move = await call('PATCH', `/ticket/${id}/status`, {
        token,
        body: { status, ...(spec.reason ? { reason: spec.reason } : {}) }
      })
      if (move.status !== 200) {
        throw new Error(`illegal transition to ${status} on "${spec.subject}": ${JSON.stringify(move.body)}`)
      }
    }
  }

  console.log('')
  console.log('demo data seeded through the API (scope and audit written as a user would)')
  console.log(`  branches     created ${created.branches}   reused ${reused.branches}`)
  console.log(`  departments  created ${created.departments}   reused ${reused.departments}`)
  console.log(`  agents       created ${created.users}   reused ${reused.users}`)
  console.log(`  customers    created ${created.customers}   reused ${reused.customers}`)
  console.log(`  tickets      created ${created.tickets}   reused ${reused.tickets}`)
  console.log('')
  // The password is not echoed: it lives in .env and printing it here would
  // put it into terminal scrollback and CI logs.
  console.log(`  demo agent sign-in: ${AGENTS[0].email} (password: DEMO_AGENT_PASSWORD in .env)`)
  console.log('')
}

run().catch(err => { console.error(err.message ?? err); process.exit(1) })

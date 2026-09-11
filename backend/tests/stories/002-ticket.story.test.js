// Story-level coverage for spec 002 — ticket management.
//
// Every check here asserts what the STORY promised, not what the endpoint
// returned. Where a story is already fully proven by tests/ticket.test.js it is
// referenced, never re-tested. Where nothing is built it is declared unbuilt,
// so the roll-call is complete and the gaps are visible rather than absent.
//
// The reason the history is read through `GET /ticket/:id` rather than the
// database: it is there, it is the same projection a person would see, and
// asserting through the API keeps the rule in tests/db.js intact.

import { BASE_URL, BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD, FIXTURE_PASSWORD } from '../env.js'
import { createStories } from './_story.js'
import { openAudit, closeAudit, latest, tryTamper } from './_audit.js'

const B = BASE_URL
const call = async (m, p, { token, body } = {}) => {
  const r = await fetch(B + p, {
    method: m,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  })
  let j = null; try { j = await r.json() } catch {}
  return { status: r.status, body: j }
}
const login = async (e, p) => (await call('POST', '/auth/login', { body: { email: e, password: p } })).body?.token

const S = createStories('spec 002 — ticket management')
const { story, storyCoveredBy, storyUnbuilt, chk, nonEmpty } = S

// --- fixtures, all through the API ------------------------------------------
const root = await login(BREAKGLASS_EMAIL, BREAKGLASS_PASSWORD)
const mk = async (p, b) => (await call('POST', p, { token: root, body: b })).body
const br = (await mk('/platform/branches', { name: { ar: 'القاهرة', en: 'Cairo' }, timezone: 'Africa/Cairo', defaultLocale: 'ar' })).branch
const dp = (await mk('/platform/departments', { name: { ar: 'الدعم', en: 'Support' } })).department
const sc = { branchIds: [br._id], departmentIds: [dp._id] }
await mk('/user', { displayName: 'Sara Agent', email: 'story.sara@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'ar', roles: ['AGT'], scope: sc })
await mk('/user', { displayName: 'Omar Lead', email: 'story.omar@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['LEAD'], scope: sc })
await mk('/user', { displayName: 'Hana Agent', email: 'story.hana@azmsquad.com', password: FIXTURE_PASSWORD, defaultLanguage: 'en', roles: ['AGT'], scope: sc })
const sara = await login('story.sara@azmsquad.com', FIXTURE_PASSWORD)
const omar = await login('story.omar@azmsquad.com', FIXTURE_PASSWORD)
const users = (await call('GET', '/user', { token: omar })).body.users
const hanaId = users.find(u => u.email === 'story.hana@azmsquad.com')._id
const omarId = users.find(u => u.email === 'story.omar@azmsquad.com')._id
const cust = (await call('POST', '/customer', { token: sara, body: { displayName: 'Ahmed Hassan', contactPoints: [{ channelType: 'phone', value: '+201005550001' }] } })).body.customer

const newTicket = async (over = {}) => (await call('POST', '/ticket', {
  token: sara,
  body: { customerId: cust._id, subject: 'Card declined at checkout', description: 'It fails every time.', category: 'billing', priority: 'normal', ...over }
})).body.ticket

await openAudit()

// ============================================================================
console.log('\n' + '─'.repeat(74))
console.log('  PROVEN ELSEWHERE — referenced, not re-tested')
console.log('─'.repeat(74))

storyCoveredBy('TM-01', 'create a ticket from a handful of fields',
  'tests/ticket.test.js — "FR-001 / AS-01: create" and "FR-001: refuses incomplete"')
storyCoveredBy('TM-07', 'move a ticket through a defined status lifecycle',
  'tests/ticket.test.js — "FR-007: legal transitions" and "FR-008 / AS-03: undefined transition refused, reachable named"')
storyCoveredBy('TM-10', 'pull an unassigned ticket from a shared queue',
  'tests/ticket.test.js — "FR-010: an agent may self-assign" plus "and the assignee really is them"')
storyCoveredBy('TM-14', 'keep internal notes separate from customer replies',
  'tests/ticket.test.js — "FR-014 / AS-07: message visibility"; and from the customer side, tests/portal.test.js — "the internal note appears NOWHERE in the response"')
storyCoveredBy('TM-21', 'set pending with a follow-up date',
  'tests/ticket.test.js — "FR-021: followUpAt only on a pausing status"')

// ============================================================================
console.log('\n' + '─'.repeat(74))
console.log('  PROVEN HERE — the promise, not the endpoint')
console.log('─'.repeat(74))

// The worked example. tests/ticket.test.js proves a reason is REQUIRED and that
// the call succeeds with one. It never reads the reason back, so removing
// `reason` from the audit payload leaves every contract check green.
await story('TM-09', 'assign or reassign with a reason', 'nobody wonders later why', async () => {
  const t = await newTicket({ subject: 'Refund not received' })
  const REASON = 'Hana owns billing this week'

  const assigned = await call('PATCH', `/ticket/${t._id}/assign`,
    { token: omar, body: { assignedAgentId: hanaId, reason: REASON } })
  chk('the reassignment succeeds', assigned.status, 200)

  // Six months later, somebody opens the ticket and asks why.
  const seen = await call('GET', `/ticket/${t._id}`, { token: omar })
  const history = nonEmpty('the ticket history', seen.body?.history)
  const entry = history.filter(h => h.action === 'ticket.assigned').pop()

  chk('an assignment entry is in the history', Boolean(entry), true)
  chk('THE REASON IS STILL THERE', entry?.after?.reason, REASON)
  chk('and it names who moved it', String(entry?.actorRef), String(omarId))
  chk('and who it moved to', String(entry?.after?.assignedAgentId), String(hanaId))
  chk('and when', typeof entry?.occurredAt === 'string' || entry?.occurredAt instanceof Date ? true : Boolean(entry?.occurredAt), true)

  // A release is also an assignment decision and carries its own reason.
  const RELEASE = 'Hana is on leave'
  await call('PATCH', `/ticket/${t._id}/assign`, { token: omar, body: { assignedAgentId: null, reason: RELEASE } })
  const after = (await call('GET', `/ticket/${t._id}`, { token: omar })).body.history
  const rel = after.filter(h => h.action === 'ticket.unassigned').pop()
  chk('the release reason is recorded too', rel?.after?.reason, RELEASE)
  chk('and the two reasons did not overwrite each other',
    after.filter(h => h.action === 'ticket.assigned').pop()?.after?.reason, REASON)
})

await story('TM-02', 'give every ticket a short human-readable reference',
  'I can quote it to the customer', async () => {
    const a = await newTicket()
    const b = await newTicket({ subject: 'Second ticket' })

    chk('the reference is quotable, not an internal id', /^TKT-\d{4}-\d{5}$/.test(a.reference), true)
    chk('two tickets never share one', a.reference === b.reference, false)

    // Immutable: the story is worthless if the reference a customer wrote down
    // can change. Nothing offers to change it, so the check is that an attempt
    // to set it through the update path does not take.
    await call('PATCH', `/ticket/${a._id}/assign`, { token: omar, body: { assignedAgentId: hanaId, reason: 'x', reference: 'TKT-1999-00001' } })
    const again = (await call('GET', `/ticket/${a._id}`, { token: omar })).body.ticket
    chk('and it cannot be changed by a caller', again.reference, a.reference)
    chk('and it is still the one returned on read', again.reference, a.reference)
  })

await story('TM-06', 'set priority and see how an automatic one was derived',
  'I can tell my judgement from a rule', async () => {
    const t = await newTicket({ priority: 'high' })
    const seen = (await call('GET', `/ticket/${t._id}`, { token: sara })).body.ticket
    chk('the priority I chose is the one stored', seen.priority, 'high')
    // The story's real ask: the ORIGIN is visible, not just the value.
    chk('and the record says it was MY judgement', seen.prioritySource, 'manual')
    chk('which is a value, not an absence', typeof seen.prioritySource, 'string')

    // ⚠ HALF OF THIS STORY CANNOT BE PROVEN YET, and saying so is the point.
    // "see how an AUTOMATIC one was derived" needs rule-derived priority, which
    // is the SLA engine and is not built. The field is a discriminator with
    // nothing to discriminate against today: the model defaults it to 'manual',
    // so a service that never set it would still read 'manual' and this check
    // would still pass. What the check does catch is the origin being reported
    // WRONGLY — proven by mutation, setting it to 'rule' for a manual choice.
    // When rule derivation lands, assert a rule-set priority reports 'rule' and
    // names the rule; that is the half that makes the field worth having.
    chk('the value is one the schema actually discriminates between',
      ['manual', 'rule'].includes(seen.prioritySource), true)
  })

await story('TM-08', 'configure legal transitions and which statuses pause SLA',
  'the workflow matches how we actually work', async () => {
    // The administrator-defines-them half is unbuilt (statuses are a code
    // constant). What IS deliverable today is that the client reads the rules
    // from the server rather than hardcoding them — which is the part that
    // makes configuration possible later without touching every screen.
    const meta = (await call('GET', '/ticket/meta', { token: sara })).body
    const statuses = nonEmpty('the status list served to clients', meta?.statuses)
    chk('every status declares whether it pauses the clock',
      statuses.every(s => 'pausesSla' in s), true)
    chk('and whether it is terminal', statuses.every(s => 'terminal' in s), true)

    // The promise is that what the interface OFFERS and what the server ACCEPTS
    // are the same list. Two separate code paths produce them — `reachableFrom`
    // for the projection, `canTransition` for the guard — so a story test that
    // only reads the projection proves nothing about what will actually happen.
    // Mutation testing caught exactly that: breaking the projection alone left
    // an earlier version of this check green.
    const t = await newTicket()
    const seen = (await call('GET', `/ticket/${t._id}`, { token: sara })).body
    const reachable = nonEmpty('the statuses offered for this ticket', seen.reachableStatuses)
    const allKeys = statuses.map(s => s.key ?? s)

    chk('the offer is a real subset, not "anything goes"', reachable.length < allKeys.length, true)

    // Everything NOT offered must be refused. If the two lists ever drift, an
    // agent is shown a control that fails when they use it.
    const notOffered = allKeys.filter(k => !reachable.includes(k) && k !== 'new')
    chk('there is something to refuse', notOffered.length > 0, true)
    let refused = 0
    for (const s of notOffered) {
      const fresh = await newTicket({ subject: `Transition probe ${s}` })
      if ((await call('PATCH', `/ticket/${fresh._id}/status`, { token: sara, body: { status: s } })).status === 409) refused++
    }
    chk('every status NOT offered is refused', refused, notOffered.length)

    // And one that IS offered must work, or the offer is a lie in the other
    // direction — which a refuse-everything regression would otherwise pass.
    const accept = await call('PATCH', `/ticket/${t._id}/status`, { token: sara, body: { status: reachable[0] } })
    chk(`an offered status (${reachable[0]}) is accepted`, accept.status, 200)
  })

await story('TM-13', 'a complete immutable history of every change',
  'disputes are settled by the record', async () => {
    const t = await newTicket({ subject: 'History probe' })
    await call('PATCH', `/ticket/${t._id}/assign`, { token: omar, body: { assignedAgentId: hanaId, reason: 'triage' } })
    await call('PATCH', `/ticket/${t._id}/status`, { token: omar, body: { status: 'in_progress' } })

    const history = nonEmpty('the history', (await call('GET', `/ticket/${t._id}`, { token: omar })).body?.history)
    chk('creation is in it', history.some(h => h.action === 'ticket.created'), true)
    chk('the assignment is in it', history.some(h => h.action === 'ticket.assigned'), true)
    chk('the status change is in it', history.some(h => h.action === 'ticket.status_changed'), true)
    const sc = history.find(h => h.action === 'ticket.status_changed')
    chk('and it records what it changed FROM', sc?.before?.status, 'new')
    chk('and TO', sc?.after?.status, 'in_progress')
    chk('every entry names an actor', history.every(h => Boolean(h.actorRef)), true)

    // "No user or role MAY edit or delete history." A model hook that is never
    // exercised is a claim, not a guarantee — so exercise it.
    const entry = await latest('ticket.created', t._id)
    chk('an entry exists to attempt tampering with', Boolean(entry), true)
    const tamper = await tryTamper(entry._id)
    chk('editing an audit entry is refused', tamper.update, 'refused')
    chk('deleting one is refused', tamper.delete, 'refused')
    const stillThere = await latest('ticket.created', t._id)
    chk('and the entry survived the attempt', String(stillThere?._id), String(entry._id))
    chk('with its action unchanged', stillThere?.action, 'ticket.created')
  })

await story('TM-20', 'tag a ticket freely', 'I can group work my own way', async () => {
    const t = await newTicket({ tags: ['refund', 'vip'] })
    const seen = (await call('GET', `/ticket/${t._id}`, { token: sara })).body.ticket
    chk('the tags I set come back', JSON.stringify(seen.tags), JSON.stringify(['refund', 'vip']))

    // "Reusable across tickets" is the story's actual promise — a tag is not
    // per-ticket vocabulary.
    const other = await newTicket({ subject: 'Another refund', tags: ['refund'] })
    const seen2 = (await call('GET', `/ticket/${other._id}`, { token: sara })).body.ticket
    chk('the same tag is reusable on another ticket', seen2.tags.includes('refund'), true)

    const filtered = (await call('GET', '/ticket?tag=refund', { token: sara })).body
    const rows = nonEmpty('tickets filtered by that tag', filtered?.tickets)
    chk('and filtering by it finds both', rows.filter(r => [t._id, other._id].includes(r._id)).length, 2)
    chk('and does not return the untagged ones', rows.every(r => (r.tags ?? []).includes('refund')), true)
  })

await story('TM-27', 'search full text across tickets', 'I find the one I mean', async () => {
    const t = await newTicket({ subject: 'Unmistakable aardvark subject' })
    const bySubject = (await call('GET', '/ticket?q=aardvark', { token: sara })).body
    const rows = nonEmpty('search results for a word in the subject', bySubject?.tickets)
    chk('the ticket is found by a word in its subject', rows.some(r => r._id === t._id), true)

    const byRef = (await call('GET', `/ticket?q=${t.reference}`, { token: sara })).body
    const refRows = nonEmpty('search results for the reference', byRef?.tickets)
    chk('and by its reference', refRows.some(r => r._id === t._id), true)

    // Non-vacuity: a search that returns everything would satisfy both checks.
    const miss = (await call('GET', '/ticket?q=zzzznotarealword', { token: sara })).body
    chk('a term matching nothing returns nothing', (miss?.tickets ?? []).length, 0)
  })

// ============================================================================
console.log('\n' + '─'.repeat(74))
console.log('  NOT BUILT — declared, so the roll-call is complete')
console.log('─'.repeat(74))

storyUnbuilt('TM-03', 'a ticket opened automatically from email, message or form', 'no channel exists — board cards channel-email / whatsapp / sms / live-chat')
storyUnbuilt('TM-04', 'categorise down a multi-level tree', 'category is a flat string — ratified deviation 21, board card category-tree')
storyUnbuilt('TM-05', 'default priority, team and SLA per category node', 'needs the category tree first — board card category-tree')
storyUnbuilt('TM-11', 'bulk assign, close or retag', 'not built — board card admin-configuration covers the surrounding work')
storyUnbuilt('TM-12', 'escalate to a senior colleague with a note', 'escalation targets are defined by the SLA engine — board card sla-engine')
storyUnbuilt('TM-15', 'attach files and paste screenshots', 'not built — board card attachments')
storyUnbuilt('TM-16', 'link tickets as duplicate of, related to, blocked by', 'not built; also blocks TM-22 — board card ticket-reopen')
storyUnbuilt('TM-17', 'merge duplicate tickets keeping both conversations', 'the mergedInto field exists, the operation does not')
storyUnbuilt('TM-18', 'split a ticket containing several requests', 'parentTicketId exists, the operation does not')
storyUnbuilt('TM-19', 'sub-tasks assigned to other departments', 'needs the team concept — board card scope-team')
storyUnbuilt('TM-22', 'my reply reopens a recently closed ticket', 'documented as unbuilt in the status graph and the portal service — board card ticket-reopen')
storyUnbuilt('TM-23', 'snooze a ticket until a chosen time', 'not built')
storyUnbuilt('TM-24', 'see when a colleague is already typing', 'needs a live connection the stack does not provide')
storyUnbuilt('TM-25', 'define custom fields per category', 'no custom-field entity — board cards missing-entities, admin-configuration')
storyUnbuilt('TM-26', 'save and share filters as named views', 'not built; carries a constitution IV clause about whose scope a shared view applies')
storyUnbuilt('TM-28', 'time logged against tickets', 'not built')
storyUnbuilt('TM-29', 'record root cause and resolution code at closure', 'the lists are unsupplied — ratified decision 23, board card ticket-resolution-codes')
storyUnbuilt('TM-30', 'turn a resolved ticket into a knowledge base draft', 'no knowledge base — board card knowledge-base')
storyUnbuilt('TM-31', 'closure only after I confirm or a grace period passes', 'no auto-close — ratified decision 9, waiting on the SLA engine')
storyUnbuilt('TM-32', 'define ticket types with their own fields and workflow', 'not built — board card admin-configuration')

await closeAudit()
process.exit(S.report())

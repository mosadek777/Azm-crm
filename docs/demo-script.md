# demo-script.md — the rehearsal script

For demonstrating the ticket flow to management. Revised 2026-09-08 after pieces
X4 and X6 landed: **the whole loop now runs, customer end to customer end.**

**What this demo includes.** All five steps. The customer raises the request from
the portal, staff route it and work it, the two exchange messages, and the
customer sees it resolved — with the agent's reply and without the internal note.

**What it does not.** No notifications: nobody is emailed or texted when anything
changes, because that needs spec `003` and no channel exists — the customer sees
the update by returning to the portal. No attachments (decision 34). No timing
shown, deliberately — see the elapsed-time answer at the end. Say these plainly
if asked rather than steering around them.

---

## Before you start

Three terminals, in this order.

```bash
# 1. MongoDB must be running as a replica set (rs0). If the backend
#    fails to connect, that is why — see README Setup.

# 2. backend
cd backend
npm run dev                 # leave running — http://localhost:3000

# 3. demo data, in a second terminal
cd backend
npm run seed:demo:clear     # only if you have already rehearsed once
npm run seed:demo           # prints the three sign-ins — keep this visible

# 4. frontend, in a third terminal
cd frontend
npm start                   # http://localhost:4200
```

`npm run seed:demo` prints the three accounts at the end. **Leave that terminal
on screen** — it is your crib sheet.

> **If you rehearse and then demo, re-run `seed:demo:clear` and `seed:demo`
> first.** Rehearsing assigns and resolves the demo ticket, and it will not be
> back at `new` unless you reset. `npm test` also drops the database, so re-seed
> after running it.

## The three accounts

All three share the password in `DEMO_PASSWORD` (`backend/.env`).

| Persona | Sign-in | Does what |
|---|---|---|
| **ADMIN** | `demo.admin@azmsquad.com` | Assigns the ticket. **Cannot** post a customer-visible reply |
| **AGENT** | `demo.sara@azmsquad.com` | Replies to the customer, resolves the ticket |
| **CUSTOMER** | `demo.customer@azmsquad.com` | Signs in at **http://localhost:4200/portal**. Raises the request, replies on it, and sees it resolved |

Staff sign in at **http://localhost:4200**, the customer at
**http://localhost:4200/portal**. The two sessions are stored separately, so a
private window for the customer lets you hold both at once and switch between
them without signing anything out.

**The ticket you demonstrate with is the one the customer raises in step 1** —
you do not need a seeded one. If the live submission fails for any reason, the
seed leaves **"Refund not received for a returned order"** unassigned as a
fallback: start at step 2 and say the customer raised it a moment ago.

---

## The script

### Step 1 — the customer raises it

**Start on the customer side.** Open a private window at
**http://localhost:4200/portal** and sign in as **CUSTOMER**
(`demo.customer@azmsquad.com`). Leave the staff window signed in behind it — the
two sessions do not disturb each other.

Click **New request** and fill in three fields:

- **Subject** — *"Replacement charger never arrived"*
- **Category** — Technical
- **Describe the problem** — *"I was told a charger would be sent last week and
  nothing has come."*

Submit. They land on the request, with a reference.

> *"Three fields. That is everything a customer supplies."*

**The thing to point at is what is NOT on this form.** No priority control, no
status control. That is not the screen being simple — spec `002` §9 says a
customer does not set those. If a request arrives carrying one, the server
refuses it and names the field. See the escalation question at the end; it is
the most likely thing you will be asked.

Leave the private window open. You come back to it at step 3 and step 5.

### Step 2 — it reaches staff, and an administrator routes it

Switch to the staff window and sign in as **ADMIN**
(`demo.admin@azmsquad.com`). Go to **Tickets**.

The request the customer just raised is at the top — status `new`, no assignee.

> *"It arrived a moment ago and nobody owns it yet."*

Open it. The customer, subject, category and priority are all there, and the
history already records its creation — attributed to the customer, not to us.

Assign it to **Sara Ahmed**, with a reason.

> *"An administrator routes it to an agent. The reason is required — the system
> will not accept an assignment without one, because six months later somebody
> will ask why this went to Sara."*

The history entry appears immediately, naming who assigned, to whom, and why.

### Step 3 — a two-way conversation

Sign out of the staff window. Sign in as **AGENT**
(`demo.sara@azmsquad.com`). Open the same ticket — it is in her list now.

Post a reply, visibility **customer**:

> *"Thank you — I can see the order on our side and I am chasing the courier
> now."*

Then post a second message, visibility **internal**:

> *"Warehouse says it never left the depot. Raising with logistics."*

> *"Two kinds of message on one thread. The first goes to the customer. The
> second never will — not on any screen they see, not in any export, not in any
> email. That is enforced on the server, not by hiding it in the interface."*

**Now switch to the customer window** and open the request. The agent's reply is
there. The internal note is not.

Reply, as the customer:

> *"Still nothing today — could you check the tracking?"*

**Switch back to the staff window** and reload the ticket. The customer's reply
sits in the same thread, in order, alongside the internal note.

> *"One thread, both directions, and no second ticket. Whichever side is
> looking, they are looking at the same conversation — filtered differently."*

**The strongest thing to show here, if you want one:** sign back in as **ADMIN**
and try to post a customer-visible reply. It is refused. An administrator can
annotate a ticket internally but cannot speak to the customer in the
organisation's voice — `002 §9`. It is worth showing precisely because it looks
like a bug until you explain it, and it is the permission model working.

### Step 4 — resolve it

As **AGENT**, move the status: `assigned` → `in_progress`, then → `resolved`.

> *"The statuses are not free text. Each move is checked against a defined
> transition graph — the system refuses anything that is not a legal move and
> tells you which moves are available."*

If you want to show the refusal: attempt a move the graph does not allow. It
comes back refused, naming the statuses that *are* reachable.

### Step 5 — the customer sees it resolved

Back in the customer window. Reload **My requests** — the status now reads
`resolved`. Open it.

> *"This is the same ticket. They see our reply and the status. They do not see
> the internal note, and they never will — the server does not send it. It is
> excluded by the database query, not hidden by the screen."*

**The two things worth pointing at:**

1. **Switch the language.** The whole portal mirrors right-to-left, and the
   ticket reference stays left-to-right inside the mirrored layout.
2. **The internal note is absent.** If someone asks how you know it is really
   absent rather than just not displayed: it is excluded by the query, so it is
   never loaded, and there is an automated check asserting the note appears
   nowhere in the response.

**If asked how they knew it was resolved:** they did not — they came back and
looked. Notifications need a channel and spec `003` is not built. Worth saying
before somebody assumes an email went out.

**Do not promise timing.** The portal deliberately shows nothing about how long
anything will take — see the elapsed-time answer below.

---

## If something goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| Ticket is already assigned or resolved | You rehearsed and did not reset | `npm run seed:demo:clear` then `npm run seed:demo` |
| Sign-in fails for a demo account | `DEMO_PASSWORD` changed after the account was seeded | `npm run seed:demo:clear` then `npm run seed:demo` |
| Ticket list is empty | `npm test` was run — it drops the database | `npm run seed:demo` |
| Backend will not start | MongoDB is not running as a replica set | See README Setup — transactions require `rs0` |
| Customer sign-in fails | The portal login is seeded separately | `npm run seed:demo` reports `portal login created 1` — if it says 0 and sign-in still fails, clear and re-seed |
| Signing in as the customer signs staff out | Should not happen — the two sessions use separate storage | Use a private window anyway; it is the cleanest way to hold both at once |
| ADMIN cannot post a customer reply | Correct behaviour, `002 §9` | Use the AGENT account, or show it deliberately as above |
| Rehearsing left extra tickets behind | Each rehearsal raises a real request | Harmless, but `seed:demo:clear` then `seed:demo` gives a clean list |
| The new request does not appear for staff | The staff list is not live — it loads on navigation | Reload, or leave Tickets and come back |

---

## Questions you are likely to get

**"Can we see it in Arabic?"** Yes — switch language in the interface. It
mirrors right-to-left with no reload. Ticket references, phone numbers and email
addresses stay left-to-right inside the mirrored layout.

**"How long has this ticket been open?"** The system does not answer that yet,
deliberately. Elapsed time depends on working hours, weekends and per-branch
holidays, and on which statuses stop the clock. Until that engine is built, the
system says the value is unavailable rather than showing a number computed the
naive way — which would be wrong the moment a ticket is paused overnight.

**"Can an agent in another branch see this?"** No. Every read and write is
filtered by branch and department on the server. A record outside your scope
does not come back as "forbidden" — it comes back as not found, identically to
a record that does not exist, so the existence of another branch's data is not
disclosed by the error.

**"Is any of this deletable?"** Not the history. Every change writes an entry
that cannot be edited or deleted, and it is written in the same database
transaction as the change itself — so there is no window where a change exists
without its record.

**"Could a customer escalate their own ticket?"** No, and not by accident either.
Priority, assignee, owning team and status are **refused by name** if a request
carries them — a `400` naming the field, not a silent drop. The distinction is
deliberate: a customer who sets `priority: urgent` and receives a success has
been told they escalated their own request, and we would be unable to tell a
hostile caller from a broken integration. Spec `002` §9 is the authority. It is
in the test suite, asserted with direct requests rather than through the screen,
and paired with a valid submission so the checks cannot pass vacuously.

**"When can customers use it?"** The loop works now — raise, reply, follow to
resolution. What is missing before real customers is notifications (spec `003`),
attachments, and the real one-time-code sign-in. See `docs/portal-plan.md`.

**"Is this the real sign-in?"** No, and it is worth being straight about it. The
demo uses a password; the specified method is a one-time code sent to a verified
email or phone (`008 FR-001`, decision 26). The shortcut is recorded as
decision 31 and is reversed by piece `R3`. Everything else on that screen — that
a sign-in binds to exactly one customer, and that a refusal never reveals
whether an address is known to us — is the real behaviour, not a demo stub.

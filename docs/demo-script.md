# demo-script.md — the rehearsal script

For demonstrating the ticket flow to management. Written 2026-09-08 for the
**stage-1 demo**: four of the five steps, driven from the staff interface.

**What this demo does not include.** The customer portal is not built. Step 1 is
performed by an agent on the customer's behalf — which is a real intake path,
not a fudge: `002 §9` gives `AGT` **✓** for *Create ticket*. Step 5 — the
customer seeing it resolved — is absent until piece `X1` exists. Do not promise
the customer half in this demo; say it is next.

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
| **CUSTOMER** | `demo.customer@azmsquad.com` | **Not a sign-in yet.** A customer record — Layla Mansour, `DEMO-006` — whose tickets are already seeded |

The ticket to use: **"Refund not received for a returned order"** — Layla
Mansour's, status `new`, deliberately left unassigned so you can assign it live.

---

## The script

### Step 1 — the ticket exists

Sign in as **ADMIN**. Go to **Tickets**.

Point at **"Refund not received for a returned order"** — status `new`, no
assignee.

> *"This came in from a customer, Layla Mansour. Nobody owns it yet."*

Open it. The customer, the subject, the category and the priority are all there,
and the history already shows it being created.

**If asked "how did it get here?"** — answer honestly: an agent raised it on the
customer's behalf, which is one of the real intake paths. The customer portal is
the next piece of work, and until it exists the customer cannot raise it
themselves.

### Step 2 — assign it

Still as **ADMIN**, on that ticket. Assign it to **Sara Ahmed**, with a reason.

> *"An administrator routes it to an agent. The reason is required — the system
> will not accept an assignment without one, because six months later somebody
> will ask why this went to Sara."*

The history entry appears immediately, naming who assigned, to whom, and why.

### Step 3 — the conversation

Sign out. Sign in as **AGENT** (`demo.sara@azmsquad.com`).

Open the same ticket — it is now in her list.

Post a reply, visibility **customer**:

> *"Thank you for getting in touch — I can see the return was received and I am
> chasing the refund now."*

Then post a second message, visibility **internal**:

> *"Finance confirmed the refund was queued but not released. Chasing."*

> *"Two kinds of message on one thread. The first goes to the customer. The
> second never will — not on any screen they see, not in any export, not in any
> email. That is enforced on the server, not by hiding it in the interface."*

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

### Step 5 — what the customer sees

**Not built.** Say so plainly:

> *"The customer would now see this resolved in their portal, with the reply and
> without the internal note. That is the next piece of work — sign-in, submit,
> and view their own tickets. Everything behind it, including the rule that
> keeps internal notes off their screen, is already here."*

Do not improvise a substitute. There is no customer-facing screen to show.

---

## If something goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| Ticket is already assigned or resolved | You rehearsed and did not reset | `npm run seed:demo:clear` then `npm run seed:demo` |
| Sign-in fails for a demo account | `DEMO_PASSWORD` changed after the account was seeded | `npm run seed:demo:clear` then `npm run seed:demo` |
| Ticket list is empty | `npm test` was run — it drops the database | `npm run seed:demo` |
| Backend will not start | MongoDB is not running as a replica set | See README Setup — transactions require `rs0` |
| ADMIN cannot post a customer reply | Correct behaviour, `002 §9` | Use the AGENT account, or show it deliberately as above |

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

**"When can customers use it?"** Roughly a week of work for sign-in, submit, and
view-plus-reply. See `docs/portal-plan.md` for the split.

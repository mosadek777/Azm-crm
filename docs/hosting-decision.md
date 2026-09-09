# Where should the CRM run? A decision we need from you

**For:** whoever owns the budget and the operational risk
**From:** the development team · **Date:** 9 September 2026
**You do not need to have seen the code or the specifications to read this.**

---

## The short version

The customer support system works. It runs today on a developer's laptop, which
is fine for building and demonstrating it and is not somewhere real customer
data can live.

Moving it somewhere real needs **one decision from you**, and that decision
changes what we build next, what it costs, and what we can promise. We are not
making it ourselves, because it is a cost and operations decision rather than a
technical one — the two options are both perfectly buildable.

There is also **one thing that will probably surprise you**, and we would rather
surprise you now than in three months. It is in the next section.

---

## The surprise, first

**The database we use does not include encryption of stored data in its free
edition.**

We use MongoDB. The free edition — which is what the system runs on today, and
what most projects start on — does not encrypt the data sitting on the disk.
Encrypting data at rest is a paid feature, or you get it by running the database
on a hosting service that provides it.

This matters because "customer data must be encrypted, both while moving across
the network and while sitting on a disk" is a written requirement of this
project, not an optional extra. We cannot meet it on the free edition without
either paying for the database, using a hosting service that includes it, or
encrypting the whole disk at the operating-system level and accepting that this
is a different, coarser protection.

**Nothing is wrong and nothing has been done incorrectly.** This is simply a cost
that appears at the point of going live rather than during development, and it
is easy to discover too late.

---

## The two options

### Option A — a managed service

Somebody else runs the database and the servers. We use them.

**Roughly what it costs:** a predictable monthly bill. For a system of this size
expect a low-hundreds-of-dollars-per-month range to begin with, rising with
usage. No hardware to buy.

**What we would not have to build:** encryption of stored data, encrypted
connections, automatic backups, the ability to restore to any moment in the past,
and the monitoring that tells us the system is unwell. These come included.

**What it costs in our time:** days, not weeks.

**What you take on:** a recurring bill that grows with use, and a dependency on
an outside company. Your data sits on their infrastructure, in a country you
choose from their list.

### Option B — a server we run ourselves

We rent or buy a machine and operate everything on it.

**Roughly what it costs:** a smaller monthly bill for the machine itself,
offset by considerably more of our time — and that time recurs, because somebody
has to keep patching, monitoring and testing it after launch.

**What we would have to build:** all of it. Encrypted connections and their
certificate renewals, disk encryption, a backup routine, somewhere separate to
store the backups, a way to restore to a specific moment, monitoring, alerting,
and a process for applying security updates.

**What it costs in our time:** several weeks up front, then a continuing share of
somebody's attention indefinitely.

**What you take on:** lower running cost, complete control over where the data
physically sits, and full responsibility for it being looked after. If nobody is
assigned to that responsibility after launch, this option quietly becomes the
riskiest one.

### Put simply

**Option A costs money to reduce work and risk. Option B costs work and risk to
reduce money.** For a system holding customer records, with a small team and no
dedicated operations person, we would recommend Option A — but the recommendation
changes if there is a policy requiring the data to stay on hardware you own.

---

## Two questions that come with the decision

### 1. How much data may we lose, and how long may we be down?

These sound like technical questions. They are commercial promises, and they are
the two numbers everything else is designed around. Our written requirements have
a blank where they should be.

**How much data may we lose?** If the system fails at three in the afternoon, how
far back is it acceptable to rewind? If the answer is "the last hour", backups
run hourly and are relatively cheap. If the answer is "nothing at all, not one
message", that is a continuous-replication arrangement and costs substantially
more.

**How long may we be down?** From the moment something breaks, how long may the
support team be unable to work before it becomes a serious problem for the
business? An hour and a full day are very different systems at very different
prices.

There are no wrong answers, but there are expensive ones, and we would rather
design to a number you have chosen than to one we guessed.

**What we have already done, so this is not theoretical.** Backups and restores
are built and, more importantly, **we have rehearsed a restore and it worked** —
the whole database was backed up, restored into a separate copy, and checked
record by record against the original. Every one of the twelve collections came
back complete. Rehearsing the restore is the step that usually gets skipped, and
skipping it is how organisations discover their backups never worked at the exact
moment they need them.

What we cannot yet tell you is whether that is *fast enough* or *frequent enough*,
because that is what these two questions decide.

### 2. Must the data stay in a particular country?

Some clients, and some regulations, require customer data to remain within a
named country or region. If that applies here, tell us before the hosting choice
is made — it is a filter on the options, not an adjustment afterwards.

**This has a consequence worth knowing in advance.** The project has a planned
set of features using artificial intelligence — automatically summarising long
conversations, suggesting replies, sorting incoming requests. Those work by
sending message content to an external service for processing.

**If the data must stay in a particular country, those features may be ruled out
entirely**, because the processing would happen elsewhere. Not delayed — ruled
out, unless a provider operating inside that country is available and acceptable.

We are raising it here because it is a scope decision disguised as a
technicality, and the cheapest moment to discover it is before anyone has planned
around those features.

---

## What we need from you

1. **Option A or Option B** — managed, or run ourselves.
2. **How much data may we lose, and how long may we be down.** Rough figures are
   fine; "about an hour" is far more useful than nothing.
3. **Does the data have to stay in a particular country?** Yes, no, or find out.

## What happens either way, and does not wait

Work already underway and unaffected by this decision:

- Sign-in security — password rules, locking an account after repeated failed
  attempts, ending sessions that have been left idle, limiting how many devices
  one person can be signed in on. **Built and tested.**
- Backups and the rehearsed restore. **Built and rehearsed.**

## What is on hold until you answer

- Encrypting data in transit and at rest. Both are configuration of
  infrastructure that does not exist yet; doing them now would mean doing them
  twice.
- Any promise about how quickly we could recover from a failure.

---

*Prepared alongside a full audit of the project against its written
requirements. The detail behind every point here is in the project's own
records; nothing in this document requires reading them.*

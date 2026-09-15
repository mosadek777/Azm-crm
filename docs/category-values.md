# Ticket categories — the values in use, and the question we need answered

**For: the client's support operations team.** One decision is needed before we
can build the category structure, and it is a decision about how your team
works, not a technical one.

---

## What we are asking for

Today a category is **free text**. Whoever opens a ticket types it, and nothing
checks what they typed against a list. That was a deliberate shortcut to get the
product working, and it is now the thing standing between you and:

- **reporting by category** that actually adds up — today two people typing the
  same thing slightly differently produce two categories;
- **routing and priority defaults per category**, so a billing dispute does not
  have to be prioritised by hand every time;
- **a picker instead of a text box**, which is the difference between a category
  somebody chose and one somebody typed.

The intended design is a **tree**: broad groups at the top, specific leaves
underneath, and a ticket always filed against a leaf. *Billing* would be a group;
*Refund* and *Duplicate charge* would be leaves under it.

**What we need from you is the tree itself** — the categories your team actually
uses, and which sit under which. We would rather ask once, with the real values
in front of us, than guess and have every ticket end up in the wrong place.

---

## The values currently in use

> ⚠ **These come from our demonstration database, not from live data.** The
> demonstration data was written by us to exercise the product, so this list
> tells you the *shape* of the question and nothing about your own categories.
> When there is a live system, we re-run one command and this table is replaced
> by your real values, with real counts.

**12 tickets, 5 distinct category values.**

| Value | Tickets | Looks hierarchical |
|---|---|---|
| `Account` | 4 | — |
| `Billing / Refund` | 4 | **yes** |
| `Technical` | 2 | — |
| `Contracts` | 1 | — |
| `Logistics` | 1 | — |

_No two values differ only in case or spacing._

### The one finding worth your attention

**`Billing / Refund`.** Somebody wanted a hierarchy, did not have one, and made
one out of a slash.

That is the strongest argument in this document for building the tree, and it is
also a warning about how *not* to build it. If we simply turned each distinct
value into a category, you would end up with a category literally called
"Billing / Refund" sitting next to a separate one called "Billing" — the worst of
both arrangements, and harder to unpick later than what you have now.

So when you look at your own list, the useful question for each value is: **is
this one category, or is it two with a separator between them?**

---

## What we need you to tell us

For each value in the list (your real one, when we have it):

1. **Is it a real category, or a typo / one-off?**
2. **Is it the same thing as another value under a different name?** Two names
   for one category should become one category.
3. **Does it belong under a broader group?** And if so, which — an existing one
   or a new one.
4. **Is anything missing?** Categories your team needs and has been working
   around because the box is free text.

And two questions about the tree as a whole:

5. **What are the top-level groups?** Typically between four and eight.
6. **Is there a category that should set a default priority?** For example,
   everything under *Complaint* starting as high. This is optional and can be
   added later.

---

## What happens to existing tickets

**Nothing is lost.** We keep what was originally typed on every ticket,
permanently, alongside the new category. That means:

- a value that matches nothing in the new tree is **not discarded** — the ticket
  is parked under a visible *Unmapped* category and the original text is still
  there to read;
- if a mapping turns out to be wrong, we can redo it, because the input is still
  present;
- nothing has to be restored from a backup to undo any of this.

Two things to be aware of:

- **We will not guess at near-matches.** If a value does not match exactly, it
  goes to *Unmapped* rather than being matched to something that looks close. An
  unmapped ticket is a question somebody answers; a wrongly matched one is an
  error nobody notices.
- **Historical records keep their original wording.** Every ticket carries an
  unchangeable log of what happened to it, and those entries will still show the
  old text. That is intentional — the log is not rewritten — and we record the
  changeover date so it reads correctly.

---

## Two related things this does *not* unlock

Being straight about the boundary, so nothing is expected that will not arrive:

- **Routing to a team per category** needs the *team* concept, which is not built
  yet and is tracked separately.
- **Service-level targets per category** need the service-level rules, which are
  waiting on your working hours and holiday calendar — a question already with
  you.

**A default priority per category does work** and can come with this.

---

## For our side — how to regenerate this list

```bash
cd backend
node src/utils/category-values.js              # readable table
node src/utils/category-values.js --markdown   # to paste into this document
node src/utils/category-values.js --json       # for the migration script
```

Reads only; mutates nothing. It reports counts, first and last use, any value
containing a separator, and any two values differing only in case or spacing.
Run it against the live database before this document goes out.

Full technical analysis, including what the migration touches and why it must be
additive: `docs/decisions-pending.md` §27.

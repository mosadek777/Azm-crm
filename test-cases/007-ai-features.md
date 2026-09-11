# Test cases — 007 AI features

**20 cases.** Summarising long conversations, suggesting replies, classifying
incoming requests, and a chatbot answering customers directly.

**Coverage:** 0 automated · 0 partial · 0 manual · 20 not testable yet

---

## Before you start

⛔ **Nothing in this module is built, and it is the only module in the product
that is blocked on something other than its own effort.**

**Three things stand in front of it**, in order of how hard they are to move:

**1. There is nothing to work on.** Every feature here operates on message
content — summarising a thread, suggesting a reply, classifying an inbound
message. Until a communication channel exists there are no messages to
summarise. This module is blocked behind `003`, not behind itself.

**2. A question nobody has been asked.** These features work by sending customer
message content to an external service for processing. **Whether that is
permitted has not been put to the client.** If the answer is that data must stay
within a named country, most of this module may be ruled out entirely rather
than delayed — unless a provider operating inside that country is available and
acceptable. That is a scope decision disguised as a technicality, and it is the
cheapest possible moment to ask.

**3. A standing constraint in this project.** No AI feature is to be built at
present. That is a deliberate position, not an oversight, and these cases are
written so the acceptance criteria exist if it changes — not as a plan to
proceed.

**The theme running through these cases.** Nearly every one has an expected
result about **the model being visibly wrong safely**: grounded in a named
source, shown before sending, declining rather than inventing, labelled as
machine-generated. A summary that is confidently wrong is more dangerous than no
summary, because an agent acts on it. That is why AI-06, AI-09, AI-16 and AI-20
are the load-bearing cases here, not the features they qualify.

---

## AI-01 — Take over without reading forty messages

> *As an* **agent** *I want to* **an AI summary of a long thread** *so that* **I
> take over without reading forty messages.**

**Requirement:** `007 FR-001` (Must)

**Preconditions**
- A request with a long conversation, in both languages.

**Steps**
1. Open the request and generate a summary.
2. Read it against the actual conversation.
3. Confirm it is labelled as machine-generated.
4. Generate a summary of an Arabic conversation and read it.
5. Confirm internal notes are or are not included, deliberately.

**Expected result**
- The summary reflects what was said and does not add anything that was not.
- Step 3: always labelled — see AI-20.
- Step 5 must be a decision, not an accident. A summary blending internal notes
  with customer messages is fine for an agent and catastrophic if ever shown to
  a customer.

**Status:** ⛔ **Not testable yet.**

---

## AI-02 — The receiving agent starts with context

> *As a* **team lead** *I want to* **a summary generated on escalation and
> transfer** *so that* **the receiving agent starts with context.**

**Requirement:** `007 FR-002` (Should)

**Preconditions**
- AI-01 working, and escalation working.

**Steps**
1. Escalate a long request.
2. As the receiving agent, read what arrives with it.
3. Confirm the summary is attached to the request, not only sent in a message.

**Expected result**
- The receiver starts informed rather than reading the whole thread.
- Step 3: the summary persists, so the next person also benefits.

**Status:** ⛔ **Not testable yet.** Escalation is also unbuilt.

---

## AI-03 — Answer faster without giving up the words

> *As an* **agent** *I want to* **suggested replies grounded in the base and
> past resolutions, editable before sending** *so that* **I answer faster
> without giving up the words.**

**Requirement:** `007 FR-003` (Must)

**Preconditions**
- A knowledge base with articles, and past resolved requests.

**Steps**
1. Open a request and ask for a suggested reply.
2. Read where the suggestion says it came from.
3. Edit it.
4. Send it.
5. Confirm nothing was sent before step 4.

**Expected result**
- The suggestion is **grounded** — it cites the article or past request it drew
  on, so the agent can check it.
- **Step 5 is the essential one.** A suggestion is never sent automatically. The
  agent's name is on the reply, so the agent decides.

**Status:** ⛔ **Not testable yet.** Depends on the knowledge base.

---

## AI-04 — The suggestion is usable, not a starting point

> *As an* **agent** *I want to* **drafts in the customer's language and a chosen
> tone** *so that* **the suggestion is usable, not a starting point.**

**Requirement:** `007 FR-004` (Should)

**Preconditions**
- AI-03 working, and customers preferring each language.

**Steps**
1. Request a draft for an Arabic-preferring customer.
2. Confirm the draft is in Arabic, and reads as Arabic rather than as a
   translation.
3. Change the tone setting and request another.
4. Compare.

**Expected result**
- Step 2 is the hard part and the reason this is not merely a translation
  feature. A draft that reads as translated English is not usable without
  rewriting, which defeats the purpose.

**Status:** ⛔ **Not testable yet.**

---

## AI-05 — Triage fast where safe, human where not

> *As the* **system** *I want to* **auto-categorise and prioritise with
> confidence, low confidence to a human** *so that* **triage is fast where safe,
> human where not.**

**Requirement:** `007 FR-005` (Must)

**Preconditions**
- Inbound messages, and a confidence threshold configured.

**Steps**
1. Send an unambiguous request and check it was categorised automatically.
2. Send an ambiguous one.
3. Confirm the ambiguous one is routed to a human rather than guessed.
4. Check the request records that a model set the category, and its confidence.
5. Lower the threshold and confirm the behaviour changes accordingly.

**Expected result**
- Step 3 is the requirement. A confident wrong categorisation sends a request to
  the wrong team and nobody notices for a day.
- Step 4: the origin is visible, consistent with how a rule-derived priority
  must name its rule.

**Status:** ⛔ **Not testable yet.** Note the request record already carries a
field for where its priority came from, with room for a non-human origin.

---

## AI-06 — I can verify before I trust

> *As an* **agent** *I want to* **suggested solutions with links to their
> sources** *so that* **I can verify before I trust.**

**Requirement:** `007 FR-006` (Must)

**Preconditions**
- AI-03 working.

**Steps**
1. Request a suggestion.
2. Follow every source link it offers.
3. Confirm each link resolves to real content that actually supports the
   suggestion.
4. Find a case where the model has no grounding and see what it does.

**Expected result**
- Step 3: sources are real and relevant. A fabricated citation is worse than no
  citation, because it manufactures confidence.
- Step 4: it says it does not know, rather than producing an ungrounded answer
  with no sources.

**Status:** ⛔ **Not testable yet.** This is one of the load-bearing cases: it
is what makes every other suggestion feature safe to use.

---

## AI-07 — Help at two in the morning

> *As a* **customer** *I want to* **a chatbot on portal, site and WhatsApp
> answering from the base** *so that* **I get help at two in the morning.**

**Requirement:** `007 FR-007` (Must)

**Preconditions**
- A knowledge base, and at least one customer-facing channel.

**Steps**
1. Ask the chatbot a question the base answers.
2. Ask one it does not.
3. Ask something outside the product entirely.
4. Confirm the same behaviour on each channel it is offered on.

**Expected result**
- Step 1 answers from the base and says so.
- Steps 2 and 3 decline and offer a human — see AI-08 and AI-09.

**Status:** ⛔ **Not testable yet.**

---

## AI-08 — Never trapped in a loop with a machine

> *As a* **customer** *I want to* **handoff to a human with my whole
> conversation when the bot cannot help** *so that* **I am never trapped in a
> loop with a machine.**

**Requirement:** `007 FR-008` (Must)

**Preconditions**
- AI-07 working.

**Steps**
1. Ask the chatbot something it cannot answer.
2. Ask again, rephrased.
3. Ask explicitly for a person.
4. Confirm a human receives the **whole conversation so far**.
5. Try step 3 outside business hours.

**Expected result**
- Step 3 always works, immediately, at any point. **A request for a human is
  never refused, deflected or delayed** — this is the single most important
  expected result in this file.
- Step 4: the agent does not ask the customer to start again.
- Step 5 offers the out-of-hours path rather than pretending somebody is coming.

**Status:** ⛔ **Not testable yet.**

---

## AI-09 — It cannot invent policy on our behalf

> *As an* **administrator** *I want to* **the chatbot restricted to approved
> sources, and visibility when it declines** *so that* **it cannot invent policy
> on our behalf.**

**Requirement:** `007 FR-009` (Must)

**Preconditions**
- AI-07 working, with a defined set of approved sources.

**Steps**
1. Ask a question answerable only from an unapproved source.
2. Confirm it declines rather than answering.
3. Ask about refunds, cancellation or anything with a policy consequence not in
   the base.
4. Confirm it declines.
5. Open the report of declined questions.

**Expected result**
- The bot answers **only** from approved content.
- Step 5: declines are visible to administrators. A bot that silently declines a
  hundred times a week is telling you what to write next — that is the same
  signal as failed knowledge searches.

**Status:** ⛔ **Not testable yet.** A chatbot inventing a refund policy commits
the organisation to something nobody approved, which is why this is mandatory
rather than a refinement.

---

## AI-10 — The customer about to leave gets attention first

> *As the* **system** *I want to* **detect frustration and flag or escalate
> angry tickets** *so that* **the customer about to leave gets attention
> first.**

**Requirement:** `007 FR-010` (Should)

**Preconditions**
- Requests with varying tone, in both languages.

**Steps**
1. Send a strongly worded message and check the request is flagged.
2. Send a neutral one and confirm it is not.
3. Repeat both in Arabic.
4. Confirm the flag is a **signal to a person**, not an automatic escalation.

**Expected result**
- Step 3 matters: tone detection that works in English and not Arabic would
  systematically under-serve Arabic-speaking customers, which is a fairness
  problem, not a feature gap.
- Step 4: flagging is advisory. Automatic escalation on detected tone can be
  triggered by a customer using strong language about something trivial.

**Status:** ⛔ **Not testable yet.**

---

## AI-11 — Answered by someone who understands them

> *As the* **system** *I want to* **detect inbound language and route
> accordingly** *so that* **the customer is answered by someone who understands
> them.**

**Requirement:** `007 FR-011` (Should)

**Preconditions**
- Agents with different languages recorded.

**Steps**
1. Send an Arabic message and check where it routes.
2. Send an English one.
3. Send a mixed message.
4. Confirm the detected language does not overwrite the customer's own stated
   preference.

**Expected result**
- Step 4: a customer who has said they prefer Arabic is not switched to English
  because they once wrote one message in it. A stated preference outranks a
  guess.

**Status:** ⛔ **Not testable yet.** Note the agent record already carries
languages.

---

## AI-12 — Serve a customer in a language I do not write well

> *As an* **agent** *I want to* **translate inbound and outbound messages** *so
> that* **I serve a customer in a language I do not write well.**

**Requirement:** `007 FR-012` (Could)

**Preconditions**
- A request in a language the agent does not write.

**Steps**
1. Translate an inbound message and read it.
2. Confirm the original is still available alongside.
3. Write a reply and translate it before sending.
4. Confirm the agent sees the translation before it goes.
5. Confirm the customer is told it was machine-translated.

**Expected result**
- Step 2: the original is never replaced. A translation is a view, not a
  substitute for the record.
- Steps 4 and 5: the agent approves, and the customer is not misled about how it
  was produced.

**Status:** ⛔ **Not testable yet.** Distinct from the bilingual interface,
which is human-authored parallel content and not translated by machine.

---

## AI-13 — Spot a systemic problem in week one

> *As a* **support manager** *I want to* **AI-clustered themes across recent
> tickets** *so that* **I spot a systemic problem in week one, not month
> three.**

**Requirement:** `007 FR-013` (Should)

**Preconditions**
- A few months of requests.

**Steps**
1. Open the themes view.
2. Read the clusters and their sizes.
3. Open a cluster and confirm it lists the actual requests.
4. Compare a cluster against the category the requests were filed under.

**Expected result**
- Step 3: every cluster is traceable to real requests, so a manager can check
  the machine's grouping rather than trusting it.
- Step 4 is where the value is: a cluster that cuts across categories is
  precisely the systemic problem the filing structure was hiding.

**Status:** ⛔ **Not testable yet.**

---

## AI-14 — Two agents do not solve the same problem twice

> *As the* **system** *I want to* **surface similar or duplicate open tickets at
> creation** *so that* **two agents do not solve the same problem twice.**

**Requirement:** `007 FR-014` (Should)

**Preconditions**
- Open requests on similar topics.

**Steps**
1. Begin creating a request similar to an open one.
2. Read the suggested matches.
3. Confirm only requests **within the creator's access** are suggested.
4. Proceed anyway and confirm creation is not blocked.

**Expected result**
- Step 3 is non-negotiable: a similarity suggestion that names a request from
  another branch is a disclosure, however useful the suggestion.
- Step 4: it warns, like the duplicate-customer warning, and does not block.

**Status:** ⛔ **Not testable yet.** The same pattern already exists and works
for duplicate customers, including the rule that an out-of-reach match is
reported as a count with no names.

---

## AI-15 — Quality review scales past what I can read

> *As a* **support manager** *I want to* **AI-assisted quality scoring on a
> sample of conversations** *so that* **quality review scales past what I can
> read.**

**Requirement:** `007 FR-015` (Could)

**Preconditions**
- Resolved requests.

**Steps**
1. Run quality scoring over a sample.
2. Read the scores and the reasons given.
3. Confirm an agent can see and contest their own score.
4. Confirm scores are not used automatically for anything consequential.

**Expected result**
- Steps 3 and 4: a machine score that affects a person's standing without their
  being able to see or contest it is not acceptable, whatever its accuracy.

**Status:** ⛔ **Not testable yet.**

---

## AI-16 — Measure whether the model actually helps

> *As an* **auditor** *I want to* **a log of suggestions shown, accepted, edited
> and rejected** *so that* **we measure whether the model actually helps.**

**Requirement:** `007 FR-016` (Should)

**Preconditions**
- AI-03 working.

**Steps**
1. Accept a suggestion unchanged.
2. Edit one heavily before sending.
3. Reject one.
4. Open the log and find all three.
5. Read the acceptance rate and the average amount of editing.

**Expected result**
- All four outcomes are distinguishable — shown, accepted, edited, rejected.
- Step 5 is the point: a suggestion feature everybody rewrites is costing time
  rather than saving it, and only this log reveals that.

**Status:** ⛔ **Not testable yet.** This is the case that makes the module
**falsifiable**. Without it, "the AI helps" is an assertion nobody can check.

---

## AI-17 — Using AI does not create a compliance problem

> *As an* **administrator** *I want to* **personal data redacted before it
> reaches a model, per-department opt-out** *so that* **using AI does not create
> a compliance problem.**

**Requirement:** `007 FR-017` (Should)

**Preconditions**
- Requests containing names, phone numbers, national IDs and account references.

**Steps**
1. Generate a summary of such a request.
2. Inspect exactly what was sent to the external service.
3. Confirm identifying values were removed or masked first.
4. Turn the feature off for one department and confirm nothing is sent for its
   requests.
5. Confirm the redaction happens **before** the data leaves, not after it
   returns.

**Expected result**
- Step 3: the model receives the problem, not the person.
- Step 5 is the whole requirement. Redacting the output is not redaction — the
  data has already left.

**Status:** ⛔ **Not testable yet.** Directly connected to the unanswered
jurisdiction question at the top of this file.

---

## AI-18 — Capturing knowledge stops being unpaid extra work

> *As an* **agent** *I want to* **AI draft a knowledge article from a resolved
> ticket** *so that* **capturing knowledge stops being unpaid extra work.**

**Requirement:** `007 FR-018` (Could)

**Preconditions**
- A resolved request, and the knowledge base.

**Steps**
1. Generate an article draft from the request.
2. Confirm it is a **draft** entering review, never published.
3. Confirm customer-identifying detail has been removed.
4. Confirm internal notes did not become article content.

**Expected result**
- Steps 3 and 4: a request-to-article path is the easiest way for both a
  customer's personal details and an internal note to end up on a public page.

**Status:** ⛔ **Not testable yet.**

---

## AI-19 — Intervene before the SLA is lost

> *As a* **support manager** *I want to* **predicted breach risk on open
> tickets** *so that* **I intervene before the SLA is lost.**

**Requirement:** `007 FR-019` (Could)

**Preconditions**
- The service-level engine working, with history.

**Steps**
1. Open the team queue and read the predicted risk.
2. Compare predictions against what actually happened over a month.
3. Confirm a prediction is visibly distinct from the actual clock.

**Expected result**
- Step 3: a predicted risk must never be confused with a real measured
  countdown. An agent acting on a guess believing it to be a fact is worse than
  having neither.

**Status:** ⛔ **Not testable yet.** Depends on the service-level engine.

---

## AI-20 — Not misled about who I am talking to

> *As a* **customer** *I want to* **see clearly when a reply or summary was
> AI-generated** *so that* **I am not misled about who I am talking to.**

**Requirement:** `007 FR-020` (Should)

**Preconditions**
- AI-03 and AI-07 working.

**Steps**
1. Receive a chatbot answer as a customer and look for the label.
2. Receive a reply an agent generated and sent **unedited**.
3. Receive a reply an agent generated and **rewrote**.
4. Ask the chatbot whether it is a person.

**Expected result**
- Step 1 is labelled.
- Steps 2 and 3 need a deliberate answer: a reply an agent read, approved and
  sent under their own name is arguably theirs. A reply sent unedited is
  arguably not. **Whatever is decided must be decided, not defaulted.**
- Step 4: it says it is not a person, plainly.

**Status:** ⛔ **Not testable yet.** Steps 2 and 3 are an open question for the
client, not an implementation detail — this is about what the organisation is
willing to represent to its customers.

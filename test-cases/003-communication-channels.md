# Test cases — 003 Communication channels

**25 cases.** Email, WhatsApp, live chat, SMS and web forms — every route by
which a customer reaches support, and the single timeline they all feed.

**Coverage:** 0 automated · 0 partial · 0 manual · 25 not testable yet

---

## Before you start

⛔ **Nothing in this module is built.** No mailbox is connected, no messaging
provider account exists, no chat transport exists. Every case below is written
and none can be run today.

That is the point of writing them now. When the first channel starts, its
acceptance criteria are already agreed, and the arguments about what "threading"
or "channel health" means have already been had.

**What each channel is blocked on**, so nobody re-investigates:

| Channel | Blocked on |
|---|---|
| Email | A mailbox and its credentials, and a decision on how a reply is matched back to its request — by the hidden identifiers mail clients carry, or by a reference in the subject line. The two behave differently when a customer forwards a thread, so it cannot be left to implementation. |
| WhatsApp | A WhatsApp Business provider account and pre-approved message templates. Also the 24-hour reply window, which no other channel has and no specification addresses. |
| SMS | A gateway, and a registered sender identity the client must obtain. Inbound SMS has nothing to identify the sender by except the phone number — the exact case where a shared number becomes a disclosure risk. |
| Live chat | A live connection type the stack does not provide, and a model of agent availability no specification defines. |
| Web forms | The least blocked of the five. Needs no third party. |

**A rule that applies to every case here.** A message arriving on a channel goes
through the *same* validation as one created by hand. A channel is a new front
door, not a way around the rules.

---

## CH-01 — Inbound email becomes requests without forwarding

> *As an* **administrator** *I want to* **connect a mailbox over IMAP, Exchange
> or Microsoft 365** *so that* **inbound email becomes tickets without
> forwarding.**

**Requirement:** `003 FR-001` (Must)

**Preconditions**
- A mailbox and its credentials.

**Steps**
1. Connect the mailbox in the administration screens.
2. Send an email to that address from an address belonging to a known customer.
3. Wait, then open the request list.
4. Send another from an address belonging to nobody.

**Expected result**
- Step 3: a request exists, with the email's subject as its subject and its body
  as the first message.
- It is linked to the known customer automatically.
- Step 4 also creates a request; an unrecognised sender is a new customer, not
  an error.
- Nobody had to set up forwarding rules in a mail client.

**Status:** ⛔ **Not testable yet** — no mailbox connected.

---

## CH-02 — The customer sees an ordinary email thread

> *As an* **agent** *I want to* **reply by email from inside the ticket** *so
> that* **the customer sees an ordinary email thread.**

**Requirement:** `003 FR-002` (Must)

**Preconditions**
- CH-01 working, and a request that arrived by email.

**Steps**
1. Open the request and write a reply.
2. Send it.
3. Read the email as the customer receives it.
4. Reply to it from the customer's mail client.

**Expected result**
- The customer receives a normal email that continues the thread they started —
  not a notification telling them to log in somewhere.
- Step 4 lands back on the same request, not a new one.

**Status:** ⛔ **Not testable yet.**

---

## CH-03 — One conversation does not become six requests

> *As the* **system** *I want to* **thread replies onto the existing ticket by
> message reference** *so that* **one conversation does not become six
> tickets.**

**Requirement:** `003 FR-003` (Must)

**Preconditions**
- CH-02 working.

**Steps**
1. Exchange three messages back and forth by email.
2. Check how many requests exist.
3. Have the customer forward the thread to a colleague, who replies.
4. Have the customer change the subject line and reply again.

**Expected result**
- Step 2: **one** request with six messages, not six requests.
- Step 3 is the case that decides the threading design — the reply arrives from
  a different address on the same thread. Whatever the system does here, it must
  be deliberate and documented.
- Step 4 still threads. A customer editing the subject is ordinary behaviour.

**Status:** ⛔ **Not testable yet.** The threading method is an open decision,
not merely unbuilt.

---

## CH-04 — Replies reach the inbox, not the spam folder

> *As an* **administrator** *I want to* **send from our branded domain with SPF
> and DKIM set** *so that* **our replies reach the inbox, not the spam folder.**

**Requirement:** `003 FR-004` (Must)

**Preconditions**
- Control of the sending domain's DNS.

**Steps**
1. Configure the sending domain.
2. Send a reply to an address at a major mail provider.
3. Inspect the received message's authentication results.
4. Check which folder it landed in.

**Expected result**
- The message is signed and passes both checks.
- It arrives in the inbox.
- The sender shows the client's own domain, not the platform's.

**Status:** ⛔ **Not testable yet.**

---

## CH-05 — The queue is not padded with machine noise

> *As an* **administrator** *I want to* **suppress out-of-office replies and
> bounce notices** *so that* **the queue is not padded with machine noise.**

**Requirement:** `003 FR-005` (Should)

**Preconditions**
- CH-01 working.

**Steps**
1. Trigger an out-of-office auto-reply to a support email.
2. Send a message to an address that will bounce.
3. Check the request list.
4. Check that the bounce is recorded **somewhere**.

**Expected result**
- Neither creates a new request or wakes an agent.
- The bounce is still recorded against the original request — an agent needs to
  know their reply did not arrive, even though the bounce is not itself a
  customer message.

**Status:** ⛔ **Not testable yet.**

---

## CH-06 — Customers open requests where they already are

> *As an* **administrator** *I want to* **connect the WhatsApp Business API**
> *so that* **customers open tickets where they already are.**

**Requirement:** `003 FR-006` (Must)

**Preconditions**
- A WhatsApp Business provider account.

**Steps**
1. Connect the account.
2. Send a WhatsApp message to the business number from a known customer's phone.
3. Check the request list.

**Expected result**
- A request appears, linked to the customer by their phone number.
- Its source records WhatsApp.

**Status:** ⛔ **Not testable yet** — no provider account.

---

## CH-07 — Show me the problem instead of describing it

> *As an* **agent** *I want to* **send and receive images, PDFs, voice notes and
> location** *so that* **the customer shows me the problem instead of describing
> it.**

**Requirement:** `003 FR-007` (Should)

**Preconditions**
- CH-06 working.

**Steps**
1. Have the customer send a photograph.
2. Have them send a voice note, a PDF and their location.
3. Open the request and view each.
4. Send an image back.

**Expected result**
- All four arrive, are attached to the request, and are viewable without leaving
  it.
- They are subject to the same scanning and size limits as any other upload.

**Status:** ⛔ **Not testable yet.** Also depends on attachments, which are not
built on any surface.

---

## CH-08 — My reply still reaches them

> *As an* **agent** *I want to* **be warned when the WhatsApp window closed, and
> offered a template** *so that* **my reply still reaches them.**

**Requirement:** `003 FR-008` (Should)

**Preconditions**
- CH-06 working, and a conversation whose last customer message was more than
  24 hours ago.

**Steps**
1. Open the request and start typing a reply.
2. Read the warning.
3. Choose an approved template instead.
4. Send it.

**Expected result**
- Step 2 warns **before** the agent writes a long reply that cannot be sent —
  not after they press send.
- Step 3 offers only templates that are approved and appropriate.
- Step 4 delivers.

**Status:** ⛔ **Not testable yet.** This constraint exists on no other channel
and no specification addresses it, so the behaviour above is the proposal to
agree when the channel is built.

---

## CH-09 — Notifications comply in both languages

> *As an* **administrator** *I want to* **manage approved WhatsApp templates in
> Arabic and English** *so that* **notifications comply with policy in both
> languages.**

**Requirement:** `003 FR-009` (Should)

**Preconditions**
- CH-06 working.

**Steps**
1. Create a template with both an Arabic and an English body.
2. Try to save one with only English.
3. Submit for provider approval and track its state.
4. Send it to a customer whose preferred language is Arabic.

**Expected result**
- Step 2 is refused — both languages, always.
- Step 4 sends the **Arabic** body, chosen from the customer's preference rather
  than the agent's interface language.

**Status:** ⛔ **Not testable yet.**

---

## CH-10 — Help now rather than waiting for a reply

> *As a* **customer** *I want to* **start a live chat from the website or
> portal** *so that* **I get help now rather than waiting for a reply.**

**Requirement:** `003 FR-010` (Must)

**Preconditions**
- Chat available and an agent online.

**Steps**
1. As a customer, open the chat from the portal.
2. Send a message.
3. Confirm an agent receives it and can reply.
4. Check whether a request was created.

**Expected result**
- The conversation is live, both directions.
- Whether a chat always creates a request is an open question — see CH-13.

**Status:** ⛔ **Not testable yet.** Needs a live connection type the stack does
not provide.

---

## CH-11 — Only conversations I can handle

> *As an* **agent** *I want to* **chats routed by availability, skill and
> language** *so that* **I only receive conversations I can handle.**

**Requirement:** `003 FR-011` (Should)

**Preconditions**
- CH-10 working; two agents with different languages and skills.

**Steps**
1. Set one agent available, the other away.
2. Start a chat in Arabic.
3. Check who receives it.
4. Set the Arabic-speaking agent to busy and start another.

**Expected result**
- Only an available agent receives a chat.
- Language and skill are respected, so a customer is not handed to somebody who
  cannot answer them.

**Status:** ⛔ **Not testable yet.** Also depends on agent presence, which is
part of the unbuilt agent workspace.

---

## CH-12 — Escalating does not restart the customer

> *As an* **agent** *I want to* **transfer a live chat with its full context**
> *so that* **escalating mid-conversation does not restart the customer.**

**Requirement:** `003 FR-012` (Should)

**Preconditions**
- CH-10 working, two agents, a chat in progress.

**Steps**
1. Transfer the chat to the second agent.
2. As the second agent, read what you receive.
3. As the customer, observe the handover.

**Expected result**
- The second agent sees the **whole conversation so far**, plus the customer's
  record — they do not ask the customer to explain again.
- The customer is told they have been handed over, and to whom.

**Status:** ⛔ **Not testable yet.**

---

## CH-13 — Late-night problems are not simply lost

> *As a* **customer** *I want to* **an offline form out of hours that becomes a
> ticket** *so that* **late-night problems are not simply lost.**

**Requirement:** `003 FR-013` (Should)

**Preconditions**
- Business hours configured; current time outside them.

**Steps**
1. As a customer, open the chat outside business hours.
2. Observe what is offered.
3. Submit the form.
4. Check the request list the next morning.

**Expected result**
- Step 2 offers a form and says when somebody will be available — it does not
  silently queue forever or pretend an agent is coming.
- Step 4: a request is waiting.

**Status:** ⛔ **Not testable yet.** What happens when nobody is available is
one of the undecided points that determines whether a chat can exist without a
request behind it.

---

## CH-14 — We both hold the same record of what was said

> *As a* **customer** *I want to* **the chat transcript emailed and kept on the
> ticket** *so that* **we both hold the same record of what was said.**

**Requirement:** `003 FR-014` (Should)

**Preconditions**
- CH-10 working, a finished chat.

**Steps**
1. End the chat.
2. Check the customer's email.
3. Open the request and read the conversation.
4. Compare the two.

**Expected result**
- The transcript is emailed to the customer.
- The same conversation is on the request.
- They match. If an internal note was made during the chat, it is on the request
  and **not** in the customer's transcript.

**Status:** ⛔ **Not testable yet.**

---

## CH-15 — Confirmations, codes and short replies

> *As an* **administrator** *I want to* **connect an SMS gateway** *so that*
> **we send confirmations, one-time codes and short replies.**

**Requirement:** `003 FR-015` (Should)

**Preconditions**
- An SMS gateway account and a registered sender identity.

**Steps**
1. Connect the gateway.
2. Send a test message.
3. Check delivery status is reported back.

**Expected result**
- The message arrives from the registered sender identity.
- Delivery, or its failure, is visible in the system rather than assumed.

**Status:** ⛔ **Not testable yet.** Note this channel is what one-time-code
sign-in for the customer portal is waiting on.

---

## CH-16 — The thread stays whole on a channel with no threading

> *As the* **system** *I want to* **attach inbound SMS to the originating
> ticket** *so that* **the thread stays whole on a channel with no threading.**

**Requirement:** `003 FR-016` (Should)

**Preconditions**
- CH-15 working.

**Steps**
1. Send an SMS to a customer from a request.
2. Have them reply.
3. Check where the reply lands.
4. Repeat where the phone number is shared by **two** customer records.

**Expected result**
- Step 3: on the same request.
- Step 4 is the hard case. SMS carries nothing to identify the sender but the
  number, so a shared number is genuinely ambiguous. The system must not guess —
  it must surface the ambiguity to a person.

**Status:** ⛔ **Not testable yet.** Step 4 is the case worth designing first.

---

## CH-17 — Intake arrives structured instead of as free text

> *As an* **administrator** *I want to* **build web forms with fields,
> validation and required attachments** *so that* **intake arrives structured
> instead of as free text.**

**Requirement:** `003 FR-017` (Must)

**Preconditions**
- Administrator access.

**Steps**
1. Build a form with a text field, a select, a required attachment and a
   validated field.
2. Give every label both languages.
3. Submit the form leaving the required attachment out.
4. Submit it correctly.
5. Open the resulting request.

**Expected result**
- Step 2 is enforced — a form facing the public cannot be half-translated.
- Step 3 is refused with a clear message in the visitor's language.
- Step 5: the answers arrive as structured fields, not pasted into the
  description.

**Status:** ⛔ **Not testable yet.** Least blocked of the five channels — needs
no third party.

---

## CH-18 — Customers submit through the right front door

> *As an* **administrator** *I want to* **embed a form on any page or share it
> as a link** *so that* **customers submit through the right front door.**

**Requirement:** `003 FR-018` (Should)

**Preconditions**
- CH-17 working.

**Steps**
1. Embed the form in an external page.
2. Share the same form as a direct link.
3. Submit through each.
4. Check the requests.

**Expected result**
- Both work and produce identical requests.
- The request records which form and which route it came from, so the client can
  tell which front door is used.

**Status:** ⛔ **Not testable yet.**

---

## CH-19 — A bot cannot flood the queue overnight

> *As an* **administrator** *I want to* **CAPTCHA and rate limiting on public
> forms and chat** *so that* **a bot cannot flood the queue overnight.**

**Requirement:** `003 FR-019` (Should)

**Preconditions**
- CH-17 working.

**Steps**
1. Submit the form normally.
2. Submit it twenty times in a minute from one source.
3. Attempt automated submission without solving the challenge.
4. Check that a legitimate customer is not blocked.

**Expected result**
- Step 2 is throttled.
- Step 3 is refused.
- Step 4 still works — protection that blocks real customers has traded one
  problem for a worse one.

**Status:** ⛔ **Not testable yet.** Related: the customer portal currently has
no rate limiting either, which is only acceptable while it is not reachable from
the internet.

---

## CH-20 — One story rather than five fragments

> *As an* **agent** *I want to* **one unified timeline showing every channel in
> order** *so that* **I read one story rather than five fragments.**

**Requirement:** `003 FR-020` (Must)

**Preconditions**
- A request touched by email, WhatsApp, a chat and a logged phone call.

**Steps**
1. Open the request.
2. Read the conversation top to bottom.
3. Check each entry says which channel it came in on.

**Expected result**
- One list in time order, mixing channels.
- Each message is labelled with its channel, so an agent knows whether the
  customer is expecting an email or a WhatsApp reply.

**Status:** ⛔ **Not testable yet.** The request conversation exists and is
already ordered; it has only one channel to show. This case becomes runnable
with the second channel.

---

## CH-21 — Starting on chat and finishing by email

> *As an* **agent** *I want to* **switch channel mid-conversation without
> leaving the ticket** *so that* **starting on chat and finishing by email is
> seamless.**

**Requirement:** `003 FR-021` (Should)

**Preconditions**
- CH-20 working.

**Steps**
1. On a request that arrived by chat, choose to reply by email.
2. Send.
3. Check the customer receives an email.
4. Check the request shows both.

**Expected result**
- The agent chooses the channel per reply, without leaving the request.
- The customer's own preferred channel is offered as the default.

**Status:** ⛔ **Not testable yet.**

---

## CH-22 — A dead mailbox noticed in minutes, not on Monday

> *As an* **administrator** *I want to* **channel health with connection status,
> last sync and failures** *so that* **a dead mailbox is noticed in minutes, not
> on Monday.**

**Requirement:** `003 FR-022` (Should)

**Preconditions**
- At least one channel connected.

**Steps**
1. Open the channel health screen.
2. Read each channel's status, last successful sync and recent failures.
3. Deliberately break a channel's credentials.
4. Wait, then check the screen again, and check whether anybody was **alerted**.

**Expected result**
- Step 4: the channel shows as failing within minutes.
- Somebody is **told**. A status screen nobody opens on a Friday evening does not
  satisfy this story — the promise is "noticed", not "visible".

**Status:** ⛔ **Not testable yet.** Alerting is also part of the unbuilt
production-monitoring work.

---

## CH-23 — Voice appears in history alongside everything else

> *As an* **agent** *I want to* **log a phone call with direction, duration and
> notes** *so that* **voice appears in history alongside everything else.**

**Requirement:** `003 FR-023` (Should)

**Preconditions**
- A request.

**Steps**
1. Log an outbound call with a duration and notes.
2. Log an inbound call.
3. Open the conversation and find both.

**Expected result**
- Both appear in the same timeline as messages, marked as calls with their
  direction and duration.
- Notes on a call follow the same visibility rules as any other note — internal
  stays internal.

**Status:** ⛔ **Not testable yet.** This is the **least** blocked case in the
file: logging a call needs no third party at all, only a form and the existing
message model.

---

## CH-24 — Customers know when to expect a human

> *As an* **administrator** *I want to* **business hours and auto-acknowledgement
> text per channel** *so that* **customers know when to expect a human.**

**Requirement:** `003 FR-024` (Should)

**Preconditions**
- At least one channel connected.

**Steps**
1. Set business hours for the branch.
2. Write acknowledgement text per channel, in both languages.
3. Send a message inside hours, and another outside.
4. Read both acknowledgements.

**Expected result**
- The acknowledgement differs inside and outside hours, and is sent in the
  customer's language.
- Outside hours it says when somebody will be available, derived from the
  configured hours rather than typed into the text.

**Status:** ⛔ **Not testable yet.** Business hours and holiday sets are
referenced by the branch record but **do not exist** as anything a person can
configure.

---

## CH-25 — A gateway error never silently swallows a reply

> *As an* **administrator** *I want to* **an outbound queue with retries and
> failure alerts** *so that* **a gateway error never silently swallows a
> reply.**

**Requirement:** `003 FR-025` (Should)

**Preconditions**
- At least one outbound channel.

**Steps**
1. Break the gateway.
2. Send a reply.
3. Watch the outbound queue.
4. Restore the gateway.
5. Check the reply eventually arrives, and that the agent was told what happened.

**Expected result**
- The reply is queued and retried, not lost.
- If retries are exhausted, **the agent who wrote it is told**. The failure mode
  this story exists to prevent is an agent believing they answered a customer
  when they did not.

**Status:** ⛔ **Not testable yet.**

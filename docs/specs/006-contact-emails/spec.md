# Spec 006 — Contact message emails

| | |
|---|---|
| **Status** | Approved (2026-10-06) |
| **Owner** | ShopNest |
| **Created** | 2026-10-06 |
| **Builds on** | [Spec 001 — Email notifications](../001-email-notifications/spec.md) |

## 1. Problem

Messages sent from the Contact page ("Ask us") are saved and appear in the admin **Messages**
inbox, but **nobody is told**. The owner only finds out when they happen to open the admin
panel, and the shopper gets no confirmation beyond the on-page "Thanks".

## 2. Goals

1. The owner is emailed as soon as a message arrives, and can **reply straight from their inbox**.
2. The shopper gets a short email confirming the message was received.

## 3. User stories & acceptance criteria

### US-1 — Tell the owner

- **AC-1.1** Each new message sends one email to the store's alert address (the same as new-order
  alerts). The subject is *"New message from Ahmed"*.
- **AC-1.2** The email shows the name, email, time and the **full message** (as plain text, never
  rendered as HTML), plus an **Open in admin** button to that message.
- **AC-1.3** Pressing **Reply** in the owner's mail app addresses the **shopper** (reply-to = the
  shopper's email).

### US-2 — Reassure the shopper

- **AC-2.1** The shopper receives *"We've received your message"*. It says we usually reply within
  **24 hours** (Mon–Sat) and gives the store phone/WhatsApp.
- **AC-2.2** Replying to it reaches the store's address.

### US-3 — Never break the form

- **AC-3.1** If email is off or fails, the message is still saved and the shopper still sees
  "Thanks". The page answers as fast as today, give or take the send.

## 4. Rules

- **R-1 — No spam relay.** Anyone can type any email into the form. The confirmation email
  therefore contains **no text the visitor typed**: no message and no name. It starts with
  "Hi there". This way it can't be used to send someone else spam in ShopNest's name.
- **R-2 — One confirmation per address per day.** An address receives at most one confirmation in
  24 hours, however many messages are sent with it. The owner is still alerted for each one.
- **R-3 — Bots get nothing.** Honeypot submissions and rate-limited requests send no email
  (unchanged: they're not saved).
- **R-4 — Spec 001 rules apply.** Same sender, no secrets in logs, masked addresses, `.test`
  addresses skipped, and email turns off cleanly without configuration.

## 5. Out of scope

- Replying from inside the admin panel
- Email threads/tickets; attachments
- Notifying about messages sent before this feature

## 6. Definition of done

- A message from the live Contact page produces an owner alert (Reply goes to the shopper) and
  one confirmation to the shopper. A second message from the same address the same day produces
  an alert only.

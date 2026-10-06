# Plan 006 — Contact message emails

| | |
|---|---|
| **Spec** | [`spec.md`](spec.md) |
| **Status** | Approved (2026-10-06) |

## Changes

| File | Change |
|---|---|
| `services/email/send.js` | Optional `replyTo` argument (default: the store sender). AC-1.3. |
| `services/email/templates/contactAlert.js` | **New.** Owner alert: name, email, time, the message (escaped, line breaks kept), Open in admin → `/admin/messages/:id`. |
| `services/email/templates/contactReceived.js` | **New.** Fixed text only (R-1): "Hi there, we've received your message…", 24-hour promise, phone/WhatsApp from `config/store.js`. |
| `services/contactNotifications.js` | **New.** `notifyContactMessage(msg)`: sends the alert (`replyTo` = shopper) and, if no other message from this address in the last 24 h (`ContactMessage.countDocuments`), the confirmation (R-2). Both in parallel, awaited (serverless, spec 001), never throws (AC-3.1). |
| `controllers/contactController.js` | After `create`, `await notifyContactMessage(doc)`. Honeypot path untouched (R-3). |

## Testing

- Local: post a message, check the server log for two `[email]` lines with tags `contact-alert` and
  `contact-received`. Post a second one from the same address and check there's only an alert.
  Post with a `.test` address: both skipped. With email off: still 201.
- Template check: a message containing `<script>` and line breaks renders as text.
- Live: the owner sends from their phone, then checks both inboxes and that Reply addresses the
  shopper.

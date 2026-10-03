# Plan 001 — Email notifications

| | |
|---|---|
| **Spec** | [spec.md](spec.md) (approved 2026-10-03) |
| **Status** | Approved (2026-10-03) |
| **Next** | `tasks.md` → implementation |

How we will build what `spec.md` asks for. Every decision points back to the spec
(US = user story, AC = acceptance criterion, R = rule).

---

## 1. Architecture at a glance

```
             ┌──────────────── order is confirmed ────────────────┐
checkout()   │ COD: right after the order is created              │
  (COD) ─────┤                                                    ├──► notifyOrderConfirmed(order)
applyStripe- │ Card: when Stripe says "paid" — from the thank-you │        │  claims each email once (R-1)
Session()  ──┤ page check OR the Stripe webhook                   │        ├──► customer receipt   (US-2, US-3)
             └────────────────────────────────────────────────────┘        └──► owner alert        (US-4)

forgotPassword() ─────────────────────────────────────────────────────────► password reset email (US-1)

                    every email ──► services/email/send.js ──► Brevo HTTP API
                                     (guards: off / .test / timeout / logging)
```

One entry point, `notifyOrderConfirmed(order)`, is called wherever an order becomes
confirmed. It doesn't look at *how* the customer paid — that's what makes a future
payment method get emails for free (R-7).

## 2. New and changed files

```
server/
  services/email/
    send.js                 sendEmail(): Brevo API call, guards, timeout, safe logging
    layout.js               shared branded HTML shell + escapeHtml + money/date helpers
    templates/
      passwordReset.js      → { subject, html, text }
      orderConfirmation.js  → { subject, html, text }   (customer receipt)
      ownerAlert.js         → { subject, html, text }   (new-order alert)
  services/orderNotifications.js
                            notifyOrderConfirmed(order) + the payment-line map
  models/Order.js           + notifications.{confirmation, ownerAlert} timestamps
  controllers/orderController.js
                            call notifyOrderConfirmed() for COD and after Stripe payment
  controllers/authController.js
                            send the reset email; console link only when email is off
  config/email.js           reads the email settings once
  .env.example              documents the new settings
```

No new npm packages: Node 20+ has `fetch` built in, and Brevo's REST API is a single
`POST` request.

## 3. Configuration (env vars)

| Variable | Example | Purpose |
|---|---|---|
| `BREVO_API_KEY` | `xkeysib-…` | **Secret.** Without it, email is off (R-8). |
| `EMAIL_FROM` | `owner@gmail.com` | Sender address, verified in Brevo (open question 2). |
| `EMAIL_FROM_NAME` | `ShopNest` | Sender display name. |
| `STORE_NOTIFY_EMAIL` | `owner@gmail.com` | Owner alerts (US-4, AC-4.4). Empty = alerts off. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | Already supported by the code; now set in production (AC-3.3). |

The real addresses and keys go only into `server/.env` (local) and the Vercel project
settings — never into the repo.

## 4. Sending: `services/email/send.js`

```js
sendEmail({ to, subject, html, text, tag }) → { sent: true } | { sent: false, reason }
```

- `POST https://api.brevo.com/v3/smtp/email` with header `api-key`, JSON body
  `{ sender, to:[{email}], subject, htmlContent, textContent, tags:[tag] }`.
- **Never throws** (R-2). Returns a result; callers decide whether to retry.
- **Timeout 5 s** via `AbortSignal.timeout(5000)`, so a slow provider can't hang a request (R-2).
- **Guards, checked first:**
  - no API key → `{ sent:false, reason:"disabled" }` (R-8);
  - recipient domain is `.test` → `"test-address"`, nothing is sent (R-6).
- **Logging (R-5):** one line per email — tag, masked recipient (`sh***@gmail.com`),
  result, Brevo message id. Never the subject's links, the body, or the key.

## 5. Exactly once: claiming a notification (R-1)

Two places can confirm the same card payment (thank-you page and webhook), sometimes
within milliseconds of each other, and the thank-you page can be refreshed. A flag
written *after* sending would race. So we **claim first, atomically**:

```js
// Only one caller can flip null → now; MongoDB guarantees it per document.
const claimed = await Order.updateOne(
  { _id: order._id, "notifications.confirmation": null },
  { $set: { "notifications.confirmation": new Date() } }
);
if (claimed.modifiedCount === 1) {
  const result = await sendEmail(...);
  if (!result.sent && result.reason === "error") {
    // release the claim so the next trigger (webhook retry / page refresh) can try again
    await Order.updateOne({ _id: order._id }, { $unset: { "notifications.confirmation": 1 } });
  }
}
```

The same applies to `notifications.ownerAlert`. The customer receipt and the owner
alert are claimed separately, so one failing doesn't block the other.

Model change, in `Order`:

```js
notifications: {
  confirmation: { type: Date, default: null },
  ownerAlert:   { type: Date, default: null },
},
```

Demo orders and existing orders have no flags. That's fine, because they are only
notified when they *become* confirmed, which they already are.

## 6. When an order is confirmed (R-7)

| Code path | Change |
|---|---|
| `checkout()` — COD | after `Order.create`, `await notifyOrderConfirmed(order)` before responding |
| `applyStripeSession()` — card | after the order is saved as paid, `await notifyOrderConfirmed(order)` |
| Stripe webhook | already calls `applyStripeSession()`, so it's covered (AC-3.3) |
| Future payment methods | call `notifyOrderConfirmed(order)` when they confirm; add one line to `PAYMENT_LINES` |

```js
// services/orderNotifications.js — the only payment-specific part of emails
const PAYMENT_LINES = {
  COD:  (o) => `Pay ${rs(o.totalPrice)} in cash on delivery`,
  Card: ()  => "Paid by card",
};
const paymentLine = (o) => (PAYMENT_LINES[o.paymentMethod] || (() => o.paymentMethod))(o);
```

`notifyOrderConfirmed` runs the receipt and the owner alert **in parallel** and never
throws. A failure is logged and the order flow continues (R-2).

## 7. Serverless: why we `await` the send

On Vercel, work started after `res.json()` can be frozen or cut off. Options:

| Option | Verdict |
|---|---|
| Fire-and-forget (don't await) | ❌ Email may silently never leave on Vercel |
| `waitUntil()` from `@vercel/functions` | Works, but ties the code to Vercel and adds a dependency |
| **Await, with a 5 s timeout, both emails in parallel** | ✅ **Chosen.** Adds about 0.3–0.8 s to "Place order" and the paid thank-you page; portable to any host |

A queue (e.g. a background job runner) would be the next step at higher volume. It is
out of scope here.

## 8. Templates (R-3, R-4)

- **Layout:** 600 px table-based email, inline styles only (Gmail strips `<style>`
  blocks for some clients), black header with the SHOPNEST wordmark, white card, grey
  footer with the store's contact details from one shared config.
- **Every interpolated value goes through `escapeHtml()`** (R-3). URLs are built by our
  code from ids and tokens, never from user input.
- **Plain-text version** generated alongside each HTML version (R-4).
- **Receipt:** order no. and date, item rows (thumbnail, name, colour/size, qty × price),
  subtotal, shipping, total, payment line, shipping address, and a
  **"View your order"** button linking to
  `${CLIENT_URL}/checkout/thank-you/<id>?token=<accessToken>`. That's the same link Stripe
  already uses, and it works for guests (AC-2.3).
- **Owner alert:** subject `New order #<n> — Rs <total> (<payment line short>)`, customer
  name, phone, city, items, total, and **"Open in admin"** →
  `${CLIENT_URL}/admin/orders/<id>`. It contains no access token, because the admin page
  requires admin login.
- **Reset email:** short message, button to the reset link, "expires in 30 minutes",
  "ignore this email if you didn't ask".

## 9. Password reset changes (US-1)

`forgotPassword()`:

- If the user exists, create the token (unchanged) and `await sendEmail(passwordReset)`.
- **Same response either way** (AC-1.3), and the same response if sending fails (AC-1.4).
- Console link only when **email is off and `NODE_ENV !== "production"`** (R-8, R-5).

## 10. Stripe webhook in production (AC-3.3)

The endpoint already exists: `POST /api/orders/webhook`, with a raw body and a signature
check. Steps:

1. Stripe Dashboard → Developers → Webhooks → add endpoint
   `https://shopnest-api.vercel.app/api/orders/webhook`, event `checkout.session.completed`.
2. Copy its signing secret (`whsec_…`) into Vercel as `STRIPE_WEBHOOK_SECRET`, then redeploy.
3. **Verify on Vercel** that the raw body survives: we send a correctly signed test event
   built with `stripe.webhooks.generateTestHeaderString()` and expect `200`. A bad
   signature must return `400`.

## 11. How each acceptance criterion is verified

| Criterion | Test |
|---|---|
| AC-1.1/1.2 | Live: Forgot password with the owner's account → email arrives → link resets → reusing it fails |
| AC-1.3/1.4 | API: unknown email and known email get identical responses; with a wrong API key, still 200 + log line |
| AC-2.1–2.3 | Live: COD order with the owner's Gmail → receipt content checked → "View your order" opens it signed-out |
| AC-3.1/3.4 | Live: start a card checkout and cancel on Stripe → no email |
| AC-3.2/3.3 | Live: pay with `4242…` and **close the tab on Stripe's success redirect** → receipt still arrives (via webhook) |
| AC-4.x | Owner alert for both orders above; subject format checked |
| R-1 | Script: call `notifyOrderConfirmed` 5× in parallel on one order → exactly 1 send per email type |
| R-3 | Order with name `<b>Ali</b><img src=x>` → shows literally in the email |
| R-5 | Read Vercel logs after the tests → no key, token or reset link |
| R-6 | Demo `.test` order → `skipped test-address` in logs, nothing sent |
| R-8 | Local without `BREVO_API_KEY` → app works, reset link printed in dev |
| Visual | Templates rendered to HTML and screenshotted at 600 px and 375 px |

Test orders use the owner's Gmail and are deleted afterwards. Demo data is untouched.

## 12. Rollout

1. Implement and test locally. Brevo key in `server/.env`, local MongoDB.
2. Owner creates the Brevo account and verifies the sender. The API key is entered via
   the local password window → `server/.env` + clipboard → Vercel settings.
3. Add the 4 env vars and the webhook secret to the `shopnest-api` Vercel project, then push.
4. Run the live checks from section 11, and mark the spec **Done**.

## 13. Risks

| Risk | Mitigation |
|---|---|
| Gmail puts mail in Spam (no own domain) | Accepted (spec §7); the owner marks "Not spam" once; a domain later needs only env changes |
| Brevo account needs activation before sending | Do the Brevo signup first, before coding is finished |
| Raw body broken on Vercel → webhook 400s | Verified explicitly in section 10 step 3 before relying on it |
| 300/day limit | ShopNest sends about 3 emails per order; far below the limit; failures are logged |

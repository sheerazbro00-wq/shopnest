# Spec 001 — Email notifications

| | |
|---|---|
| **Status** | Live (2026-10-03) — final owner checks T5.4 and T5.5 pending |
| **Owner** | ShopNest |
| **Created** | 2026-10-03 |
| **Next steps** | `plan.md` (how) → `tasks.md` (steps) → implementation |

This spec says **what** ShopNest must do and **how we'll know it works**. It deliberately
says nothing about code; technical choices belong in `plan.md`.

---

## 1. Problem

ShopNest sends no email at all today:

- **Forgot password is broken in production.** The reset link is only printed to the
  server console in development, so a real customer who forgets their password is stuck.
- **Customers get no receipt.** After paying by card or placing a Cash on Delivery
  order, the only confirmation is the thank-you page. Close the tab and it's gone.
- **The store owner isn't told about new orders.** Someone has to keep the admin panel
  open to notice a sale.

## 2. Goals

1. A customer who forgets their password can reset it from their inbox.
2. Every customer gets an order confirmation as soon as their order is **confirmed** —
   **whatever the payment method** (Cash on Delivery and card today; any method added later).
3. The store owner gets an alert for every confirmed order, so no sale goes unnoticed.

**"Confirmed"** is the single trigger for order emails and is defined per payment method:

| Payment method | Order is confirmed when… |
|---|---|
| Cash on Delivery | the order is placed |
| Card (Stripe) | Stripe reports the payment succeeded |
| Any future method (e.g. JazzCash, Easypaisa, bank transfer) | that method's provider/admin reports the payment succeeded — or, for pay-later methods, the order is placed |

## 3. Users

| Who | Needs |
|---|---|
| **Customer** (signed in or guest) | Password reset link; order receipt they can keep and reopen |
| **Store owner / admin** | Instant alert when an order is confirmed, with a link to it in the admin panel |

## 4. User stories & acceptance criteria

### US-1 — Reset my password by email

> As a customer who forgot my password, I want a reset link in my inbox, so I can get
> back into my account.

- **AC-1.1** Submitting "Forgot password" with a registered email sends one email with a
  reset link that opens `/account/reset-password` on the live store.
- **AC-1.2** The link works once and expires after **30 minutes** (current behaviour, unchanged).
- **AC-1.3** The page shows the **same message** whether or not the email has an account
  (no account enumeration).
- **AC-1.4** If the email can't be sent, the customer still sees the same message; the
  failure is logged for the team.

### US-2 — Receipt for a Cash on Delivery order

> As a customer paying cash on delivery, I want a confirmation email right after I place my
> order, so I know it went through and what I'll pay the courier.

- **AC-2.1** Placing a COD order sends one confirmation to the email entered at checkout.
- **AC-2.2** It shows: order number, date, every item (name, colour, size, quantity, price),
  subtotal, shipping, total, **"Pay Rs X in cash on delivery"**, shipping address, and a
  **"View your order"** button.
- **AC-2.3** "View your order" opens that order on the live store — for guests too,
  without signing in.

### US-3 — Receipt after paying by card (Stripe)

> As a customer paying by card, I want my confirmation only once payment has succeeded,
> so a failed or abandoned payment never looks like a real order.

- **AC-3.1** No email is sent when the customer is sent to Stripe (status "Awaiting payment").
- **AC-3.2** One confirmation is sent **as soon as Stripe confirms the payment**, showing
  **"Paid by card"** instead of the cash line; otherwise the same content as AC-2.2.
- **AC-3.3** It arrives **even if the customer closes the tab** right after paying and never
  sees the thank-you page.
- **AC-3.4** Abandoned or failed card payments send nothing.

### US-4 — New-order alert for the store owner

> As the store owner, I want an email for every confirmed order, so I can start
> preparing it without watching the admin panel.

- **AC-4.1** Every confirmed order — **any payment method** — sends one alert to the
  store's notification address.
- **AC-4.2** Subject names the payment method, e.g.
  `New order #1094 — Rs 10,950 (Cash on Delivery)` or `(Paid by card)`.
- **AC-4.3** Body: customer name, phone, city, items, total, and an **"Open in admin"**
  button linking to `/admin/orders/<id>`.
- **AC-4.4** The notification address is a setting, not hard-coded, and can be left empty
  to switch alerts off.

## 5. Rules that apply to every email

- **R-1 — Exactly once.** Each email is sent at most once per event, even if Stripe
  reports the payment twice, the thank-you page is refreshed, or two requests race.
- **R-2 — Never block the shopper.** If email fails or is slow, the order, payment and
  password reset still succeed; the failure is logged.
- **R-3 — Safe content.** Anything a customer typed (names, address) is shown as plain
  text — it can never inject HTML or links into an email.
- **R-4 — Looks right everywhere.** Branded with the ShopNest name; readable on a phone and
  in Gmail and Outlook; includes a plain-text version.
- **R-5 — No secrets in emails or logs.** Logs never contain API keys, reset tokens or
  full reset links in production.
- **R-6 — No mail to fake addresses.** Demo data (`@demo.shopnest.test`, any `.test`
  domain) never sends real email.
- **R-7 — Payment-method independent.** Order emails react to "order confirmed" (Section 2),
  never to a specific payment method. Adding a new payment method must give it the
  customer receipt (with a payment line for that method) and the owner alert without
  changing the email feature itself.
- **R-8 — Off without configuration.** With no email settings (e.g. local development),
  nothing is sent and the app works as it does today, including printing the reset link
  to the console in development.

## 6. Out of scope (v1)

- "Your order has shipped" / "delivered" / "cancelled" emails
- Marketing emails and newsletters (the `acceptsMarketing` flag stays unused)
- Welcome email on sign-up
- Replying to Contact-page messages from inside the admin panel
- Using a custom domain sender (`orders@shopnest.pk`) — see Constraints

## 7. Constraints & assumptions

- **Provider: Brevo free plan** — 300 emails/day, no card. Well above ShopNest's volume.
- **No custom domain yet.** Mail is sent from a verified personal address. Brevo rewrites
  the sender to `@brevosend.com` for Gmail/Yahoo compliance, so some emails may land in
  **Spam**. Accepted for the portfolio phase; buying and authenticating a domain later
  must only require changing settings, not code.
- The API runs on **Vercel serverless functions**: there is no long-running process, so
  work started after the response is sent may be cut off.
- Card payments are confirmed by Stripe either when the shopper returns to the thank-you
  page or by a **Stripe webhook**. AC-3.3 requires the webhook to be configured in
  production (today it is not).

## 8. Open questions (resolved)

1. **Which inbox receives the owner alerts (US-4)?** — **Resolved:** the owner's Gmail
   address. It lives only in configuration, never in the repo (the repo is public).
2. **Which address is the sender?** — **Resolved:** the same Gmail address, verified in
   Brevo, with the display name "ShopNest".
3. Should the owner also be copied on password-reset emails? — **Resolved: no.**

## 9. Definition of done

- Every acceptance criterion above has been checked on the **live** store
  (COD order, test-card order with the tab closed, forgot password, owner alert).
- Repeating the same event (refresh, duplicate webhook) sends no duplicate email.
- With email settings removed, local development still works.

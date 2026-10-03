# Tasks 001 — Email notifications

| | |
|---|---|
| **Spec / Plan** | [spec.md](spec.md) · [plan.md](plan.md) (both approved 2026-10-03) |
| **Status** | Done (2026-10-03) — all 23 tasks verified |

Small steps in build order. Each task is done only when its **Check** passes.
`[P]` = can be done in parallel with the task before it.

---

## Phase 0 — Setup

- [x] **T0.1 — Brevo account.** Free plan, sender "ShopNest" verified.
  *Check:* sender shows **Verified** in Brevo → Senders. ✅ 2026-10-03
- [x] **T0.2 — Phone verification in Brevo** (required before Brevo sends anything).
  *Check:* the "verify your phone" banner is gone.
- [x] **T0.3 — API key.** Create a Brevo API key; store it via the local password window
  in `server/.env` (never in chat or the repo).
  *Check:* `GET https://api.brevo.com/v3/account` with the key returns 200 (plan: free).
- [x] **T0.4 — Config.** `server/config/email.js` reads `BREVO_API_KEY`, `EMAIL_FROM`,
  `EMAIL_FROM_NAME`, `STORE_NOTIFY_EMAIL`; document them in `server/.env.example`.
  *Check:* `emailEnabled` is false without a key, true with one. *(R-8)*

## Phase 1 — Sending foundation

- [x] **T1.1 — `sendEmail()`** in `services/email/send.js`: Brevo request, 5 s timeout,
  never throws, `.test` guard, masked one-line logs.
  *Check:* a script sends one real email to the owner's inbox; without a key it returns
  `disabled`; to `x@demo.shopnest.test` it returns `test-address`; a wrong key returns
  `error` without throwing. *(R-2, R-5, R-6, R-8)*
- [x] **T1.2 — Layout** `services/email/layout.js`: branded shell, `escapeHtml`, money and
  date helpers, plain-text helper.
  *Check:* `escapeHtml('<img src=x onerror=alert(1)>')` is inert; the shell renders at 600 px. *(R-3, R-4)*

## Phase 2 — Templates  [P after T1.2]

- [x] **T2.1 — Password reset template.** *Check:* rendered to HTML and screenshotted
  (600 px and 375 px); text version readable. *(US-1)*
- [x] **T2.2 — Order confirmation template** with the payment line from `PAYMENT_LINES`.
  *Check:* COD and Card variants rendered; "View your order" URL correct; a hostile name
  shows as plain text. *(US-2, US-3, R-3, R-7)*
- [x] **T2.3 — Owner alert template.** *Check:* subject is
  `New order #<n> — Rs <total> (<method>)`; "Open in admin" URL correct; no access token
  in it. *(US-4)*

## Phase 3 — Wiring

- [x] **T3.1 — Order model:** `notifications.confirmation` and `notifications.ownerAlert`
  dates (default `null`).
  *Check:* existing and demo orders still load and save.
- [x] **T3.2 — `notifyOrderConfirmed(order)`:** atomic claim → send → release on error,
  receipt and alert in parallel, never throws. *(R-1, R-2, R-7)*
  *Check:* 5 parallel calls on one order → exactly **1** receipt + **1** alert; a forced
  send error releases the claim so a later call sends.
- [x] **T3.3 — COD:** call it in `checkout()` after the order is created. *(AC-2.1)*
  *Check:* a local COD order to the owner's inbox → receipt + alert arrive.
- [x] **T3.4 — Card:** call it in `applyStripeSession()` after the order is saved as paid.
  *(AC-3.1, AC-3.2)*
  *Check:* a local card order → no email at "Awaiting payment"; one email after paying;
  refreshing the thank-you page sends nothing more.
- [x] **T3.5 — Forgot password:** send the reset email; console link only when email is
  off and not in production. *(US-1, R-5, R-8)*
  *Check:* known and unknown emails get identical responses; the email arrives and the link works.

## Phase 4 — Production

- [x] **T4.1 — Vercel env vars** on `shopnest-api`: the 4 email settings.
- [x] **T4.2 — Stripe webhook:** endpoint `https://shopnest-api.vercel.app/api/orders/webhook`,
  event `checkout.session.completed`; `STRIPE_WEBHOOK_SECRET` on Vercel. *(AC-3.3)*
  *Check:* a signed test event → 200; a bad signature → 400.
- [x] **T4.3 — Commit + push** (spec, plan, tasks, code); Vercel redeploys.

## Phase 5 — Verify on the live store (Definition of done)

- [x] **T5.1** COD order → receipt + owner alert; "View your order" works signed-out. *(US-2, US-4)*
- [x] **T5.2** Card order, **tab closed on Stripe's success redirect** → receipt + alert
  still arrive via the webhook. *(AC-3.3)*
- [x] **T5.3** Card checkout cancelled on Stripe → no email. *(AC-3.4)*
- [x] **T5.4** Forgot password → email → link resets → second use fails. *(US-1)*
- [x] **T5.5** Vercel logs contain no keys, tokens or reset links. *(R-5)*
- [x] **T5.6** Delete the test orders; set spec status to **Done**.

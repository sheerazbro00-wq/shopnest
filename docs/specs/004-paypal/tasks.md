# Tasks 004 — Pay with PayPal

| | |
|---|---|
| **Spec / Plan** | [`spec.md`](spec.md) · [`plan.md`](plan.md) |
| **Status** | In progress — Phases 1–5 done; go-live next |

## Phase 1 — Server foundation

- [x] **T1.1** `config/paypal.js`: mode, keys, rate, apiBase, `isReady()` with cached token; log reason when not ready. [AC-5.2, R-2]
- [x] **T1.2** `Order` model: `"PayPal"` method + `paypal` sub-document.
- [x] **T1.3** `services/payments/markPaid.js`: atomic paid + history + notify. [R-4]
- [x] **T1.4** `.env.example` documents the PayPal variables.

## Phase 2 — PayPal service

- [x] **T2.1** `createPayment()` — simulated (test page URL) and real (Orders API create, request id). [AC-2.1]
- [x] **T2.2** `confirmPayment()` — GET → capture (request id) → amount/currency check. [AC-2.3, R-1]
- [x] **T2.3** Mock PayPal server for tests (OAuth, create, get, capture, approval redirect).

## Phase 3 — Checkout API

- [x] **T3.1** `checkout` accepts PayPal when ready; stores usd/rate/mode; returns approval URL. [AC-1.3]
- [x] **T3.2** `getOrder` confirms unpaid PayPal orders on return. [AC-2.2, AC-2.3]
- [x] **T3.3** `POST /:id/paypal/simulate` with every guard from plan §5. [R-3]
- [x] **T3.4** Config endpoint returns `paypal {enabled, rate}`. [AC-1.1, AC-1.5]
- [x] **T3.5** My Account hides unpaid PayPal orders. [AC-3.3]
- [x] **T3.6** Email `PAYMENT.PayPal` line + TEST label in owner alert. [AC-2.4, AC-4.2]

## Phase 4 — Client

- [x] **T4.1** Checkout PayPal option, $/Rs panel, PayPal button, validation. [AC-1.1, 1.2, 1.4]
- [x] **T4.2** `?canceled=paypal` message, form kept. [AC-3.1]
- [x] **T4.3** `PayPalTest` page (TEST MODE bar, Pay now / Cancel). [R-5]
- [x] **T4.4** `PayPalReturn` page (token clash). [plan §1]
- [x] **T4.5** Thank-you + My Account labels. [AC-2.2]
- [x] **T4.6** Admin: payment filter, labels, $ amount, transaction id. [AC-4.1, AC-4.2]
- [x] **T4.7** Mobile 360 px + desktop check of checkout and test page.

## Phase 5 — Verify locally

- [x] **T5.1** Simulated: pay → paid, emails once, admin "PayPal (test)". [US-2, US-4]
- [x] **T5.2** Simulated: cancel → checkout message, no email, hidden from My Account. [US-3]
- [x] **T5.3** Mock sandbox: approve → captured; reload ×3 → one payment, one email set. [AC-2.3, R-4]
- [x] **T5.4** Mock sandbox: wrong amount → unpaid; bad keys → PayPal hidden. [R-1, AC-5.2]
- [x] **T5.5** Simulate endpoint refused for sandbox orders, wrong token, paid orders. [R-3]
- [x] **T5.6** Card and COD regression. [R-6]

## Phase 6 — Go live (simulated)

- [ ] **T6.1** Vercel: `PAYPAL_MODE=simulated`, `PAYPAL_USD_RATE=280`.
- [ ] **T6.2** Commit, push, deploys done.
- [ ] **T6.3** Owner's phone: full PayPal test order; receipt + TEST owner alert received.
- [x] **T6.4** Client hand-over notes (`README-client.md`).
- [ ] **T6.5** Mark spec and tasks Done.

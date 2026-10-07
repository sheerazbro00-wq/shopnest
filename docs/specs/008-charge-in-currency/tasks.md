# Tasks 008 — Charge in the shopper's currency

| | |
|---|---|
| **Status** | Done (2026-10-07) — owner tested on the live store |
| **Spec / plan** | [spec.md](spec.md) · [plan.md](plan.md) |

## Phase 1 — Server money core
- [x] **T1.1** Order schema: `currency`, `charge`, `orderItems[].unitCharge`, address `state` / `countryCode`. [plan §2.3]
- [x] **T1.2** `config/shop.js` countries + shipping table; `config/regions.js` (US states). [§3.1]
- [x] **T1.3** `services/pricing.js`: `toMinor`, `formatMinor`, `quote` (line rounding, PK+PayPal → USD, no rate → 503). [§2.2, §3.2]
- [x] **T1.4** `utils/address.js`: per-country address/phone validation with field errors. [§3.4, US-2]
- [x] **T1.5** Unit tests: pricing + validators. [§7.1]

## Phase 2 — Server checkout & payments
- [x] **T2.1** `GET /orders/config`: rates, countries, shipping; `no-store`. [§3.5]
- [x] **T2.2** Checkout: country, COD only PK, quote, 409 `PRICE_CHANGED`, save charge. [§3.5, US-5, R-1–R-3]
- [x] **T2.3** Stripe in the charge currency; paid only if amount + currency match. [§3.5, §3.6, US-3, R-4]
- [x] **T2.4** PayPal: charge currency, live USD rate for PK, confirm checks currency; simulated £. [§3.3, §3.6, US-4]
- [x] **T2.5** Emails + owner alert in the order currency. [§3.7, AC-3.2, AC-6.1]
- [x] **T2.6** Admin: currency + charged total in lists, currency filter. [§3.8, AC-6.2–6.4]
- [x] **T2.7** API tests: US card (Stripe test), UK PayPal (mock), tampering, COD refusal, 409, PK unchanged, old orders. [§7.2]

## Phase 3 — Client
- [x] **T3.1** `utils/orderMoney.js` + `utils/pricing.js` (mirrors server; same test cases). [§4.1]
- [x] **T3.2** Checkout: Country picker + per-country fields and validation. [§4.2, US-1, US-2]
- [x] **T3.3** Checkout: totals in currency, COD rule, PayPal text, 409 notice, draft/save keep country. [§4.2]
- [x] **T3.4** Thank-you, account orders, PayPal test page in the order currency. [§4.3]
- [x] **T3.5** Admin order list/detail: charged amount, rupees, rate; currency filter. [§4.3]
- [x] **T3.6** Browser checks 1440 / 390 incl. a full US card payment (4242). [§7.3]

## Phase 4 — Live
- [x] **T4.1** Push; live smoke test (config, US quote).
- [x] **T4.2** Owner tests: US card, UK PayPal, PK COD (Definition of Done).
- [x] **T4.3** Mark Done.

# Plan 004 — Pay with PayPal

| | |
|---|---|
| **Spec** | [`spec.md`](spec.md) (approved 2026-10-06) |
| **Status** | Done (2026-10-06) — live in simulated mode; sandbox/live verified against a mock PayPal (final check needs a client's keys, see README-client.md) |
| **Next step** | [`tasks.md`](tasks.md) |

How we build spec 004. Decisions point back to acceptance criteria (AC-x.y) and rules (R-n).

---

## 1. Flow at a glance

PayPal works like our Stripe flow: create on the server, send the shopper away to approve,
confirm on the server when they come back.

```
 Checkout (PayPal selected)
   │ POST /api/orders/checkout {paymentMethod:"PayPal"}
   ▼
 Server: price from DB → order (Awaiting payment) → USD = total ÷ rate (R-1)
   │  simulated: approval URL = our own test page
   │  sandbox/live: PayPal Orders API "create order" → PayPal's approval URL
   ▼
 Shopper approves ──────────────┐            Shopper cancels
   │                            │              └─▶ /checkout?canceled=paypal (AC-3.1)
   ▼                            ▼
 simulated: test page        sandbox/live: PayPal redirects to
 "Pay now" → POST /paypal/simulate   /checkout/paypal-return/:id?t=<access token>&token=<paypal id>
   │                            │   → client forwards to the thank-you page
   ▼                            ▼
 markPaid() — atomic, once (R-4)      GET /api/orders/:id → server asks PayPal → capture → markPaid()
   ▼
 notifyOrderConfirmed() — receipt + owner alert, once (spec 001)
```

### The `token` clash
PayPal appends `?token=<PayPal order id>&PayerID=…` to the return URL. Our thank-you link
already uses `?token=<order access token>`. Sending PayPal straight to the thank-you page
would give the URL two `token`s. So PayPal returns to a small **`/checkout/paypal-return/:id?t=`**
page, which replaces the URL with the normal thank-you link. Email links stay unchanged.

## 2. Modes (spec §4) and configuration

| Variable | Example | Secret? |
|---|---|---|
| `PAYPAL_MODE` | `off` (default) · `simulated` · `sandbox` · `live` | no |
| `PAYPAL_CLIENT_ID` | from the PayPal developer dashboard (sandbox/live only) | no |
| `PAYPAL_CLIENT_SECRET` | same place | **yes** — Vercel type Secret (R-2) |
| `PAYPAL_USD_RATE` | `280` (Rs per US dollar) | no |

`server/config/paypal.js` reads these. **Ready** means:
- `simulated` → always ready.
- `sandbox`/`live` → client id + secret present **and** PayPal accepts them (one OAuth call,
  token cached until it expires). Missing or rejected keys → not ready, PayPal hidden, one log
  line naming the reason, never the keys (AC-5.2).

`GET /api/orders/config` adds `paypal: { enabled, rate }`. The checkout only reads `enabled`
and `rate`; it never learns the mode, so it looks the same in every mode (AC-1.5).

## 3. Money (R-1, AC-1.3)

```
usd = round(totalPrice ÷ PAYPAL_USD_RATE, 2)        e.g. Rs 5,950 ÷ 280 = $21.25
```

Computed once at checkout and stored on the order with the rate used. Checkout shows the same
formula for display; the stored value is the one charged. On capture, PayPal's reported
`amount.value` and `currency_code` must equal the stored `usd` and `"USD"`, or the order is not
marked paid and the mismatch is logged.

## 4. Data changes — `models/Order.js`

```js
paymentMethod: { enum: ["COD", "Card", "PayPal"] },
paypal: {
  mode: String,        // "simulated" | "sandbox" | "live" — fixed when the order is placed
  usd: String,         // "21.25" — exact string sent to PayPal
  rate: Number,        // Rs per USD used
  orderId: String,     // PayPal's order id (or SIM-… in simulated mode)
  captureId: String,   // PayPal's transaction id, shown in the admin panel (AC-4.1)
},
```
History `by` gets `"PayPal"` (or `"PayPal (test)"`). No migration: existing orders are untouched.

## 5. Server modules

| File | Change |
|---|---|
| `config/paypal.js` | **New.** Env parsing, mode, rate, `apiBase` (sandbox/live), `isReady()` with cached OAuth token. |
| `services/payments/paypal.js` | **New.** `createPayment(order)` → `{ id, approveUrl }`; `confirmPayment(order)` → `{ paid, captureId }` via GET order → capture. Plain `fetch`, no SDK. |
| `services/payments/markPaid.js` | **New.** Atomic `updateOne({_id, isPaid:false}, {$set…, $push history})` — only one caller wins (R-4); then `notifyOrderConfirmed`. |
| `controllers/orderController.js` | `checkout` accepts `"PayPal"` when ready; `getOrder` confirms unpaid PayPal orders like it does Stripe; new `simulatePayPal`; `getMyOrders` hides every unpaid online order (AC-3.3). |
| `routes/orderRoutes.js` | `POST /api/orders/:id/paypal/simulate` (needs the order's access token). |
| `services/orderNotifications.js` | `PAYMENT.PayPal` line: *"Paid with PayPal — $21.25 (Rs 5,950)"*; owner-alert label *"PayPal"* or *"PayPal TEST"* (AC-2.4, AC-4.2). |
| `controllers/adminOrderController.js` | Payment filter `paypal`; detail returns `paypal.{mode, usd, rate, captureId}`. |
| `.env.example` | Documents the four variables. |

### PayPal API calls (sandbox/live)
- `POST /v1/oauth2/token` (client id + secret, Basic auth) → access token, cached.
- `POST /v2/checkout/orders` with `intent: "CAPTURE"`, one purchase unit
  (`reference_id` = our order id, `amount: {currency_code: "USD", value: usd}`), and
  `payment_source.paypal.experience_context` = `{ brand_name: "ShopNest", user_action: "PAY_NOW",
  shipping_preference: "NO_SHIPPING", return_url, cancel_url }`. Header
  `PayPal-Request-Id: create-<orderId>` makes a retried create return the same PayPal order.
  The approval link is the `payer-action` link in the response.
- On return: `GET /v2/checkout/orders/{id}`. `APPROVED` → `POST …/capture` with
  `PayPal-Request-Id: capture-<orderId>` (a repeat returns the same capture, never a second charge).
  `COMPLETED` → read the existing capture. Anything else → stays unpaid.

### Simulated mode (R-3, R-5)
- `createPayment` returns `approveUrl = /checkout/paypal-test/:id?t=<access token>` and id `SIM-<random>`.
- `POST /:id/paypal/simulate` works **only** if the server is in `simulated` mode **and** the order
  was placed in simulated mode, the access token matches, and the order is unpaid. Otherwise 404.
  So a real PayPal order can never be "paid" by the test page (R-3).

## 6. Client

| File | Change |
|---|---|
| `pages/Checkout.jsx` | PayPal option between Card and COD (AC-1.1); panel *"You'll pay $X (Rs Y) with PayPal"* (AC-1.2); yellow PayPal button replaces "Pay now"; `?canceled=paypal` message (AC-3.1). Same validation (AC-1.4). |
| `components/checkout/PayPalButton.jsx` | **New.** PayPal-style button: PayPal yellow (#FFC439), "Pay**Pal**" wordmark set in text in PayPal's blues. |
| `pages/PayPalTest.jsx` | **New.** `/checkout/paypal-test/:id` — *TEST MODE — no real money* bar, store name, $ and Rs amounts, **Pay now** / **Cancel**. No PayPal logo (R-5). |
| `pages/PayPalReturn.jsx` | **New.** `/checkout/paypal-return/:id?t=` → replaces URL with the thank-you link (§1). |
| `pages/ThankYou.jsx` | "Paid with PayPal", $ and Rs; unpaid PayPal treated like unpaid card. |
| `account/*`, `admin/*`, `admin/format.js` | One shared `paymentLabel(order)`: *Cash on Delivery* · *Card* · *PayPal* · *PayPal (test)* (AC-4.1, 4.2); PayPal in the admin payment filter; detail shows $ amount and transaction id. |

## 7. Testing

- **Unit-ish (node):** USD rounding; `markPaid` race (5 parallel calls → 1 paid, 1 history line, 1 email each).
- **Mock PayPal** (scratch Express server on a local port, `PAYPAL_API_BASE` override for tests only):
  implements OAuth, create, get, capture; an approval page that redirects to `return_url`.
  Cases: approve → paid; cancel; wrong amount returned → stays unpaid; capture called twice →
  one charge; bad keys → PayPal hidden.
- **Playwright, simulated mode:** mobile + desktop checkout → test page → paid → thank-you,
  emails, admin label; cancel path; Card and COD unchanged (R-6).
- **Live (simulated):** owner's phone, real emails, admin "PayPal (test)".

## 8. Rollout

1. Build + local tests (simulated and mock-sandbox).
2. Vercel `shopnest-api`: `PAYPAL_MODE=simulated`, `PAYPAL_USD_RATE=280`. No secrets needed.
3. Push; verify on the live store from the owner's phone.
4. `docs/specs/004-paypal/README-client.md`: 5 steps to switch a client's store to sandbox/live.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Shopper approves but closes the tab before returning | Not charged (we capture on return); order stays unpaid. Webhooks are out of scope (spec §8). |
| PayPal changes its API | Using the documented Orders v2 API; final check with real sandbox keys before any client goes live. |
| Someone uses simulated mode on a real store | Owner alert says TEST, admin says "PayPal (test)", and `live` mode can never run the simulator (R-3). |
| Rate becomes outdated | Owner edits one env var; shown amount always matches the charge. |

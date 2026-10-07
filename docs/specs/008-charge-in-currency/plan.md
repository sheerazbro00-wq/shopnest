# Plan 008 — Charge in the shopper's currency

| | |
|---|---|
| **Status** | Approved (2026-10-07) |
| **Spec** | [spec.md](spec.md) |

How we'll build [Spec 008](spec.md). Section numbers (§) are referenced from `tasks.md`.

---

## 1. Overview

```
 checkout (browser)                      server                                   provider
 country = US ──► GET /orders/config ──► rates + shipping table (same rate the server will use)
 shows $39.57                       
 Place order ──► { country:"US", expected:{ USD, 3957 } } ──► re-price in PKR (DB)
                                                             convert with today's rate → cents
                                                             expected ≠ computed? → 409 "prices updated"
                                                             save order: PKR prices + charge {USD, rate, cents}
                                                             ──► Stripe / PayPal in USD, 3957 cents
 return / webhook ◄────────────────────────────────────────── paid: check amount AND currency (R-4)
```

## 2. Money model

### 2.1 Two currencies per order

| Field | Meaning | Example (US card) | Example (PK PayPal) |
|---|---|---|---|
| `currency` | the order's currency: what the shopper sees on receipts | `USD` | `PKR` |
| `charge.currency` | what the payment provider charges | `USD` | `USD` |

They differ only for **Pakistan + PayPal**: PayPal has no rupees, so it is shown in Rs and
charged in $, exactly as Spec 004 does today.

### 2.2 Minor units, line-level rounding (R-2)

All charged amounts are **integers in minor units** (cents, pence, paisa), never floats:

```js
toMinor(pkr, currency, rate)   // PKR: pkr × 100 · USD/GBP: round(pkr / rate × 100)
unit    = toMinor(item.price, cur, rate)      // 10950 → 3957
line    = unit × qty                           // never round after multiplying
items   = Σ line
total   = items + toMinor(shippingPkr, cur, rate)
```

### 2.3 Order schema additions — `server/models/Order.js`

```js
currency: { type: String, enum: ["PKR", "USD", "GBP"], default: "PKR" },
charge: {                       // set on every new order; absent on old ones (R-7)
  currency: String,             // "USD"
  rate: Number,                 // rupees per unit at checkout (1 for PKR)  — R-1
  items: Number,                // minor units
  shipping: Number,
  total: Number,
},
orderItems[].unitCharge: Number // minor units, per item (for receipts and Stripe lines)
shippingAddress.state: String   // US state code / UK county
shippingAddress.countryCode: String // "PK" | "US" | "GB"
```

`totalPrice`, `itemsPrice` and `shippingPrice` stay in **rupees** (R-5), so the dashboard
aggregations don't change.

`paypal.usd` and `paypal.rate` stay for old orders. New orders read `charge`.

## 3. Server

### 3.1 Config — `server/config/shop.js`

```js
COUNTRIES: { PK: { name: "Pakistan", currency: "PKR", cod: true },
             US: { name: "United States", currency: "USD", cod: false },
             GB: { name: "United Kingdom", currency: "GBP", cod: false } },
SHIPPING: { PK: { fee: 250, freeMin: 2500 }, INTL: { fee: 4500, freeMin: 30000 } }, // rupees (spec §6)
```

The free-shipping check compares **rupee** item totals. One rule covers both currencies.

### 3.2 Pricing — `server/services/pricing.js` (new, pure functions)

- `toMinor(pkr, currency, rate)`, plus `formatMinor(minor, currency)` → `"$39.57"`, `"Rs 10,950"`.
- `quote({ items, countryCode, method, rates })` returns:
  ```
  { currency, charge: { currency, rate, items, shipping, total },
    itemsPrice, shippingPrice, totalPrice, unitCharges[] }
  ```
  - It picks the charge currency from the country and the method (PK+PayPal → USD).
  - It throws 503 *"International checkout is unavailable right now"* if a USD/GBP rate is
    missing (R-6).
- It is shared by checkout and by the unit tests.

### 3.3 Rates for PayPal

`config/paypal.js` → `PAYPAL_USD_RATE` becomes a **fallback only**. Pakistani PayPal orders use
the live USD rate from `getRates()` (spec AC-4.2).

### 3.4 Address & phone validation — `server/utils/address.js` (new)

`readCustomer(body)` moves here and branches on `body.country`, whose default is `PK`.

| | Postcode | Region | Phone (after stripping spaces, `-`, `()`) |
|---|---|---|---|
| PK | optional, ≤10 | — | `^(\+92\|0)?3\d{9}$` (unchanged) |
| US | `^\d{5}(-\d{4})?$` | `state` ∈ 50 states + DC | `^(\+?1)?[2-9]\d{2}[2-9]\d{6}$` |
| GB | `^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$` (case-insensitive; saved as `SW1A 1AA`) | county optional | `^(\+44\|0)\d{9,10}$` |

- Errors are returned **per field** (`err.errors = { postalCode: "Enter a valid ZIP code" }`).
  The error handler already passes `errors` through.
- The state list lives in `server/config/regions.js`, mirrored by `client/src/data/regions.js`
  (the same pattern as `imageLinks`).

### 3.5 Checkout — `orderController.checkout`

1. **Validate** the country and method. COD outside PK → **400** *"Cash on Delivery is only
   available in Pakistan"* (AC-5.2).
2. **Price and quote:** `priceItems()` (unchanged), then `quote(…, await getRates())`.
3. **Stale price guard (R-2):** the body carries `expected: { currency, total }` (minor). If it
   doesn't equal the server's quote, respond **409** `{ code: "PRICE_CHANGED", quote }`.
   - The checkout then shows *"Prices were updated to today's exchange rate. Please review
     your total."* and refreshes its totals.
   - This happens only when the rate refreshed between page load and submit.
4. **Save** the order with `currency`, `charge`, and each item's `unitCharge`.
5. **Hand off to the provider:**
   - **Stripe:**
     - `currency: charge.currency.toLowerCase()`
     - each line's `unit_amount: item.unitCharge`
     - shipping `fixed_amount: charge.shipping`
     - `adaptive_pricing: { enabled: false }` *(found in testing)*: otherwise Stripe offers to
       convert the order again into the visitor's local currency at its own rate (it showed
       *PKR 16,079* for a $55.83 order to a visitor in Pakistan).
     - `payment_method_types: ["card"]` *(found in testing)*: in USD, Stripe also adds Cash App,
       bank transfer and Klarna. Bank payments settle days later, which this flow doesn't
       handle, and the checkout only offers card.
   - **PayPal:** `amount: { currency_code: charge.currency, value: (total/100).toFixed(2) }`.

`getCheckoutConfig` adds `{ rates, countries, shipping }`. It is sent `Cache-Control:
no-store`, so the checkout always holds the rate the server will use.

### 3.6 Payment confirmation (R-4)

- **`applyStripeSession`:** paid only if `amount_total === charge.total` **and**
  `session.currency === charge.currency.toLowerCase()`. Old orders keep the PKR check.
- **`paypal.confirmPayment`:** the capture's `currency_code` and `value` must equal the
  order's charge. The existing 422 "already captured" path is unchanged.
- **Simulated PayPal:** the test page shows the charge as `£29.83`. Nothing else changes.

### 3.7 Emails & owner alert

- `email/layout.js` gets `money(minor, currency)`.
- `orderParts` shows the lines, subtotal, shipping and total in `order.currency`:
  - **US/UK:** uses `unitCharge` and `charge.*`.
  - **PK:** rupees, as today.
- **`PAYMENT` lines:**
  - Card: *"Paid by card — $39.57"*.
  - PayPal: *"Paid with PayPal — £29.83"*. Pakistan keeps *"$21.25 (Rs 5,950)"*.
- **Owner alert subject:** *"New order #1103 — $39.57 (Rs 10,950) (Paid by card)"* (AC-6.1).

### 3.8 Admin

- **List and dashboard "recent orders":** these return `currency` and `chargeTotal`, plus the
  rupee total.
- **Currency filter:** `?currency=USD|GBP|PKR` (AC-6.4). PKR also matches old orders that have
  no `currency`.
- **Sorting and dashboard totals** stay on rupee `totalPrice` (AC-6.3).

## 4. Client

### 4.1 Shared money helpers — `client/src/utils/orderMoney.js` (new)

```js
formatMinor(minor, currency)      // "$39.57", "£29.83", "Rs 10,950.00"
orderAmounts(order)                // { currency, items, shipping, total, line(i) } as display strings;
                                   // old orders → rupees (R-7)
chargedNote(order)                 // PK PayPal: "$21.25"; otherwise ""
```

These replace `usdOf`, and are used by ThankYou, account Orders/OrderDetail, admin
OrdersTable/OrderDetail and the PayPal test page.

### 4.2 Checkout — `pages/Checkout.jsx`

- **Country:**
  - A **Country** field sits at the top of *Delivery*, using the `CountryPicker` from spec 007.
  - It starts from `useCurrency().country`.
  - Changing it calls `setCountry()`, so the site currency follows (AC-1.2). It also resets
    the region and postcode fields.
- **Fields by country:**

  | | City | Region | Postcode | Phone placeholder |
  |---|---|---|---|---|
  | PK | City (datalist) | — | Postal code (optional) | 03001234567 |
  | US | City | **State** (select) | **ZIP code** | (201) 555-0123 |
  | GB | Town/City | County (optional) | **Postcode** | 07400 123456 |

  Client validation mirrors §3.4, with the same messages.
- **Totals:**
  - Computed with the same `toMinor` rules from `config.rates` (the server's rate). The `quote`
    logic is ported to `client/src/utils/pricing.js`, and both copies are covered by the same
    test cases.
  - `OrderSummary` and `CheckoutLayout` take a `format` prop instead of importing rupee
    `money`.
  - The total reads `<small>USD</small> $39.57`.
- **Payment methods:**
  - COD is hidden outside PK. If it was selected, the choice switches to Card (or PayPal when
    card is off) (AC-5.1).
  - The PayPal panel reads *"You'll pay **$39.57** with PayPal"*. PK keeps *"$21.25 (Rs
    5,950)"*.
  - The spec 007 rupee-charge note is **removed** (AC-1.4).
- **Submit and saved data:**
  - The request sends `country` and `expected`.
  - On 409 `PRICE_CHANGED`, the checkout updates its rates from `quote.charge.rate` and shows
    the notice.
  - The sessionStorage draft and "save my info" keep the country.
  - The account's default address prefills **only for Pakistan**, because the address book
    stays Pakistan-only (see §6).

### 4.3 Order views

ThankYou, account Orders/OrderDetail, admin OrdersTable/OrderDetail and PayPalTest switch to
`orderAmounts()`.

Admin OrderDetail also shows *"Charged $39.57 at Rs 276.74 per USD · Rs 10,950"* and the
currency filter on Orders.

## 5. Security

- The amount and the currency always come from the server's quote. The browser's `expected`
  is used only to detect staleness, never as a price (R-3).
- COD-country, address and phone rules are enforced on the server (AC-2.4, AC-5.2).
- The provider confirmation checks the amount **and** the currency (R-4). A tampered or
  mismatched capture leaves the order unpaid and logs one line, with no personal data.

## 6. Out of scope (technical)

- **Account address book:** stays Pakistan-only. US/UK shoppers type their address at
  checkout, and "Save this information" keeps it on that device.
- **Stripe account:** stays in test mode; it is a US account, so USD settles natively and
  GBP converts.

## 7. Testing

1. **Unit** (node):
   - `toMinor` and `quote` for PK/US/GB, including line-level rounding, e.g. 3 × Rs 3,333 in
     USD (lines add up exactly).
   - Free-shipping edges at Rs 2,500 and Rs 30,000.
   - PK+PayPal gives USD.
   - A missing rate gives 503.
   - Address and phone validators: valid and invalid samples per country.
   - The client and server pricing copies agree on the same cases.
2. **API** (local, real Stripe **test** key, mock PayPal from spec 004):
   - **US card:** the Stripe session has `currency=usd`, and `amount_total` equals the order's
     `charge.total`.
   - **UK PayPal (mock sandbox):** the capture is in GBP and the order is paid. A capture with
     a tampered currency or amount stays unpaid.
   - **COD with a US address:** 400.
   - **Wrong `expected`:** 409 with a quote.
   - **PK COD and PK PayPal:** unchanged.
   - **Old orders:** they still render.
3. **Browser** (Playwright, 1440 px / 390 px):
   - Switching country swaps the fields, the currency and COD.
   - Field errors appear for each country.
   - A full US card payment with Stripe's 4242 card leads to a thank-you page in $.
   - The admin shows $ with the rupee value.
4. **Live:** the Definition of Done in the spec.

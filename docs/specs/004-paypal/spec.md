# Spec 004 — Pay with PayPal

| | |
|---|---|
| **Status** | Approved (2026-10-06) |
| **Owner** | ShopNest |
| **Created** | 2026-10-06 |
| **Next steps** | `plan.md` (how) → `tasks.md` (steps) → implementation |

This spec says **what** ShopNest must do and **how we'll know it works**. Technical
choices belong in `plan.md`.

---

## 1. Problem

ShopNest takes Cash on Delivery and cards (Stripe). Many shoppers — and most clients in
the US and Europe — expect a **PayPal** button at checkout. The owner wants ShopNest to
show PayPal the way real stores do, and to have a PayPal integration ready for a future
client.

Two facts shape this spec:

- **PayPal doesn't serve Pakistan.** The owner can't open a PayPal account, so there are no
  PayPal keys today. A future client would supply their own.
- **PayPal doesn't accept Pakistani Rupees.** ShopNest prices are in PKR, so a PayPal
  payment must be charged in **US dollars**.

## 2. Goals

1. Checkout offers **PayPal** next to Card and Cash on Delivery, with a PayPal-style button.
2. **Without PayPal keys** the whole journey can be tried end to end in a clearly marked
   **test mode** (a simulated PayPal approval page — no real money, ever).
3. **With PayPal keys** (sandbox or live) the same button uses **real PayPal**; switching is
   configuration only, no code change.
4. A PayPal order behaves like every other order: receipt, owner alert, admin panel,
   My Account — exactly once.

## 3. Users

| Who | Needs |
|---|---|
| **Shopper** | A familiar PayPal button, a clear dollar amount, a smooth way back if they cancel |
| **Store owner / admin** | See which orders were paid by PayPal, and never mistake a test payment for real money |
| **Developer (future client work)** | Plug in a client's PayPal keys and go live in minutes |

## 4. Modes

PayPal has one setting with four values. The default is **off**.

| Mode | PayPal at checkout | Where "Pay" takes the shopper | Real money? |
|---|---|---|---|
| **off** | hidden | — | — |
| **simulated** | shown | ShopNest's own **test approval page**, marked *TEST MODE* | **Never** |
| **sandbox** | shown | **PayPal's sandbox** (needs sandbox keys) | No (PayPal test money) |
| **live** | shown | **Real PayPal** (needs live keys) | **Yes** |

The owner's portfolio store runs in **simulated** mode.

## 5. User stories & acceptance criteria

### US-1 — Choose PayPal at checkout

> As a shopper, I want to pay with PayPal, so I don't have to type my card details.

- **AC-1.1** When PayPal is on, checkout shows a **PayPal** option between Card and Cash on
  Delivery. When off, there is no trace of PayPal.
- **AC-1.2** Selecting PayPal shows the amount in **US dollars with the rupee total**
  (e.g. *"You'll pay **$21.40** (Rs 5,950) with PayPal"*) and replaces the submit button with
  a **PayPal-style button** (yellow, PayPal wordmark).
- **AC-1.3** The dollar amount is worked out **on the server** from the order total, using a
  rate the owner sets; the shopper's browser can't change it.
- **AC-1.4** Pressing the button with an incomplete form shows the usual field errors and
  goes nowhere.
- **AC-1.5** Checkout itself shows **no test label** — it looks the same in every mode
  (owner decision). Test labels appear only on the approval page, in the admin panel and in
  the owner alert (R-5, AC-4.2).

### US-2 — Pay and come back

> As a shopper, I want to approve the payment on PayPal and land on my order confirmation.

- **AC-2.1** The shopper is taken to PayPal (or, in simulated mode, the test approval page).
- **AC-2.2** After approving, they return to the **thank-you page**; the order shows
  **"Paid with PayPal"** with the dollar and rupee amounts, and the cart is emptied.
- **AC-2.3** The order is marked paid **only after ShopNest confirms the payment with PayPal
  on the server** (in simulated mode: after the shopper presses *Pay now* on the test page).
  Visiting the return link by hand, reloading it, or opening it twice never pays an order
  twice or pays an unapproved one.
- **AC-2.4** Customer receipt and owner alert are sent **exactly once**, naming PayPal as the
  method (spec 001 rules apply unchanged).

### US-3 — Cancel or fail

> As a shopper, I want to change my mind without losing my cart.

- **AC-3.1** Pressing **Cancel** on PayPal returns the shopper to checkout with their form
  still filled and the message *"PayPal payment was cancelled. Your cart is still here —
  try again or choose another payment method."*
- **AC-3.2** If PayPal refuses the payment, or ShopNest can't confirm it, the shopper sees a
  clear message on checkout and the order stays unpaid. Nothing is charged twice.
- **AC-3.3** Cancelled or unconfirmed PayPal orders send **no email** and are hidden from the
  shopper's **My Account** (same as unpaid card orders today).

### US-4 — See PayPal in the admin panel

> As the store owner, I want to see PayPal orders clearly and never confuse a test with a sale.

- **AC-4.1** Orders list and detail show **PayPal** as the payment method, filterable like
  Card and COD. The detail shows the **dollar amount** and PayPal's **transaction id**.
- **AC-4.2** Orders paid in **simulated** mode are labelled **"PayPal (test)"** in the admin
  panel, and their owner alert subject says **TEST**. Real PayPal orders have no such label.

### US-5 — Switch to real PayPal

> As the developer of a client's store, I want to plug in their PayPal keys and go live.

- **AC-5.1** Setting the mode to `sandbox` or `live` and adding the client's keys switches the
  same button to real PayPal. No code change.
- **AC-5.2** If the mode is `sandbox`/`live` but keys are missing or wrong, PayPal is
  **hidden** (not broken) and the server log says why — without printing the keys.

## 6. Rules

- **R-1 — Server decides the money.** The PKR total, the USD amount and the rate are
  computed on the server and stored on the order. What PayPal confirms must match the stored
  USD amount and currency, or the order is not marked paid.
- **R-2 — Secrets stay on the server.** PayPal's secret never reaches the browser, the repo or
  logs (as with Stripe, Brevo and Cloudinary).
- **R-3 — Test can't pass for real.** A simulated payment can never mark an order as paid by
  real PayPal; simulated mode is impossible when the mode is `sandbox` or `live`.
- **R-4 — Exactly once.** Paying, reloading and racing requests mark an order paid once and
  send each email once.
- **R-5 — Honest test page.** The simulated approval page (not checkout, AC-1.5) is plainly labelled *TEST MODE — no
  real money*, and doesn't use PayPal's logo, so it can't be mistaken for PayPal itself.
- **R-6 — Nothing else changes.** Card and Cash on Delivery behave exactly as before.

## 7. Out of scope (v1)

- Refunds from the admin panel (refund in PayPal's dashboard, as with Stripe today)
- Live exchange rates (the owner sets the rate)
- Pay Later, Venmo, PayPal credit/debit card fields, saved PayPal accounts
- PayPal webhooks (the shopper's return confirms the payment; see Constraints)
- Showing store prices in dollars anywhere except the PayPal step

## 8. Constraints & assumptions

- **No PayPal account is possible for the owner** (Pakistan unsupported). Sandbox/live modes
  are built against PayPal's documented API and verified with a **mock PayPal** locally; the
  final check needs a client's real sandbox keys (~15 minutes).
- **PayPal doesn't take PKR**, so PayPal orders are charged in USD at the owner's rate.
- **Without webhooks**, a shopper who approves on PayPal but closes the tab before returning
  is **not charged** (PayPal only takes the money when ShopNest confirms on return); the
  order stays unpaid like an abandoned card checkout.
- The API runs on Vercel serverless functions (spec 001 constraint applies).

## 9. Open questions (resolved)

1. **Exchange rate:** **Resolved:** a fixed rate the owner sets in configuration, starting at
   **1 USD = Rs 280**. Live rates are out of scope.
2. **Simulated mode on the live store:** **Resolved: yes**, with the TEST labels in US-4 and
   R-5 — but **no test label on checkout** (AC-1.5).
3. **Order of options:** **Resolved:** Card, **PayPal**, Cash on Delivery; Card stays the
   default selection.

## 10. Definition of done

- Every acceptance criterion checked locally in **simulated** mode and against a **mock
  PayPal** for sandbox mode.
- Live store (simulated mode): a full PayPal test order on a **real phone**, receipt + owner
  alert received, order labelled "PayPal (test)" in the admin panel.
- Card and COD orders re-tested and unchanged (R-6).
- Documented steps for plugging in a client's sandbox/live keys.

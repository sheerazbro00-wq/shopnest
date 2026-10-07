# Spec 008 — Charge in the shopper's currency

| | |
|---|---|
| **Status** | Done (2026-10-07) |
| **Owner** | ShopNest |
| **Created** | 2026-10-07 |
| **Builds on** | [Spec 007 — Country & currency](../007-country-currency/spec.md), [Spec 004 — PayPal](../004-paypal/spec.md) |
| **Next steps** | `plan.md` (how) → `tasks.md` (steps) → implementation |

This spec says **what** ShopNest must do and **how we'll know it works**. Technical
choices belong in `plan.md`.

---

## 1. Problem

Since Spec 007, a shopper in the USA browses in dollars. At checkout, though, everything
switches back to rupees. The card is charged *Rs 10,950*, the shopper's bank converts it at
its own rate (and often adds a foreign-transaction fee), and the statement doesn't match the
$39.57 they saw. The checkout form also only accepts a Pakistani address and mobile number,
so a US or UK shopper can't actually place an order.

## 2. Goals

1. A shopper in the **USA pays in US dollars** and one in the **UK pays in pounds**, by card
   or PayPal. The amount charged is **exactly** the amount shown at checkout.
2. US and UK shoppers can enter a **real local address and phone number**.
3. The owner sees each order's **charged currency and amount** alongside the rupee value.

## 3. Countries, currencies and payment methods

| Shipping country | Charged in | Card | PayPal | Cash on Delivery |
|---|---|---|---|---|
| 🇵🇰 Pakistan | PKR (Rs) | ✅ | ✅ in USD (as today) | ✅ |
| 🇺🇸 United States | USD ($) | ✅ | ✅ | ❌ |
| 🇬🇧 United Kingdom | GBP (£) | ✅ | ✅ | ❌ |

PayPal has no rupees, so Pakistani PayPal payments stay in dollars, as in Spec 004.

## 4. User stories & acceptance criteria

### US-1 — Checkout in my currency

- **AC-1.1** The checkout shows a **Country** choice (Pakistan / United States / United
  Kingdom). It starts on the shopper's Spec 007 country.
- **AC-1.2** The shipping country decides the currency. Changing it at checkout updates the
  whole site's currency too, with no surprise: the shopper sees the change before paying.
- **AC-1.3** Every amount on the checkout uses that currency:
  - the line items
  - the subtotal and shipping
  - the total, labelled with its code, e.g. *Total USD $39.57*
  - the mobile summary bar
- **AC-1.4** Spec 007's line *"You'll be charged Rs … (about $…)"* is removed for USD/GBP,
  because the amount shown **is** the charge.

### US-2 — A real local address

- **AC-2.1** **Pakistan:** the form is unchanged (city suggestions, optional postal code,
  mobile 03XXXXXXXXX).
- **AC-2.2** **United States:**
  - **State** is a dropdown of the 50 states + DC.
  - **ZIP code** is required, 5 digits or ZIP+4.
  - **Phone** must be a 10-digit US number; +1 is optional.
- **AC-2.3** **United Kingdom:**
  - **Postcode** is required and must be a valid UK format, e.g. *SW1A 1AA*.
  - **County** is optional.
  - **Phone** must be a UK number (07…, or +44).
- **AC-2.4** Errors appear next to the field in plain English, e.g. *"Enter a valid ZIP code"*.
  The server checks the same rules.

### US-3 — Pay by card in my currency

- **AC-3.1** The secure card page (Stripe) shows and charges **$39.57** or **£29.83**, not
  rupees.
- **AC-3.2** After paying, the thank-you page, the order email and the shopper's account all
  show the order in that currency.

### US-4 — Pay by PayPal in my currency

- **AC-4.1** A US shopper's PayPal payment is in **USD**, and a UK shopper's in **GBP**, for
  exactly the checkout total.
- **AC-4.2** PayPal's conversion uses the **same live rate** as the rest of the store (Spec
  007), instead of Spec 004's fixed Rs 280.
- **AC-4.3** Simulated mode keeps working exactly as in Spec 004, now with £ as well.

### US-5 — Cash on Delivery only in Pakistan

- **AC-5.1** For US and UK addresses, COD is not offered. If COD was selected and the country
  changes, the choice moves to Card.
- **AC-5.2** The server refuses COD for a non-Pakistan address, even if the browser is
  tampered with.

### US-6 — The owner sees what was charged

- **AC-6.1** The owner's new-order alert shows both values: *"Paid by card — $39.57 (Rs
  10,950)"*.
- **AC-6.2** The admin order list and order page show the charged amount, with the rupee value
  and rate used on the order page.
- **AC-6.3** The **dashboard's sales totals stay in rupees**, so they add up across currencies.
- **AC-6.4** The admin can filter orders by currency.

## 5. Rules

- **R-1 — The rate is locked when the order is placed.** The server uses the current rate and
  saves it on the order. Whatever happens to rates afterwards, that order's amounts never
  change.
- **R-2 — Shown = charged = stored.** The total on the checkout, the amount sent to
  Stripe/PayPal and the amount saved on the order are the same number, to the cent.
  - **Rounding:** each item's unit price is converted and rounded to the cent first, then
    multiplied by the quantity, so the lines always add up to the total.
- **R-3 — The server decides.** The browser only says which country. The server re-prices from
  the database and converts with its own rate, as checkout already does for rupees.
- **R-4 — Payment checks include the currency.** A PayPal/Stripe confirmation only marks an
  order paid if both the amount **and the currency** match the order (extends Spec 004's
  amount check).
- **R-5 — Rupees stay the truth.** Each order still keeps its rupee prices. Revenue, reports
  and stock logic keep using them.
- **R-6 — No rate, no foreign checkout.** If no good rate is available (Spec 007 AC-5.3), only
  Pakistan is offered at checkout.
- **R-7 — Old orders are unchanged.** Orders placed before this feature are rupee orders and
  display as today.

## 6. Shipping fees (approved)

Today: free shipping above **Rs 2,500**, otherwise **Rs 250**, which is a Pakistan courier
price. Sending a parcel abroad costs far more. Proposal:

| Country | Shipping fee | Free above |
|---|---|---|
| Pakistan | Rs 250 (unchanged) | Rs 2,500 (unchanged) |
| USA / UK | **Rs 4,500** (≈ $16 / £12) | **Rs 30,000** (≈ $108 / £82) |

Fees are set in rupees and converted like prices, so one setting covers both countries.

## 7. Out of scope

- Refunds (stay manual in the Stripe/PayPal dashboard, as today)
- Taxes and import duties (US sales tax, UK VAT)
- Real courier rates or tracking for international parcels
- More countries; per-country prices
- Changing an order's currency after it is placed

## 8. Definition of done

- On the live store (Stripe test mode, PayPal simulated):
  - A **US** shopper places a card order with a US address. Stripe shows **USD**, and the
    order, thank-you page, email and admin all show the same $ amount.
  - A **UK** shopper pays by PayPal (simulated) in **GBP**. Same checks.
  - A **Pakistan** COD order works exactly as before.
- COD is unavailable for US/UK, and the server refuses it if forced.
- A tampered amount or currency in a payment confirmation leaves the order unpaid.
- Dashboard totals are still in rupees and correct.

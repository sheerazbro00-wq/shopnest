# Spec 007 — Country & currency

| | |
|---|---|
| **Status** | Done (2026-10-07) |
| **Owner** | ShopNest |
| **Created** | 2026-10-07 |
| **Followed by** | Spec 008 — Charge in the shopper's currency |
| **Next steps** | `plan.md` (how) → `tasks.md` (steps) → implementation |

This spec says **what** ShopNest must do and **how we'll know it works**. Technical
choices belong in `plan.md`.

---

## 1. Problem

Every price on ShopNest is in Pakistani rupees. A shopper in the **USA** or **UK** sees
"Rs 4,990" and has to work out in their head what that is in dollars or pounds. Most won't
bother; they leave.

## 2. Goals

1. On their first visit, a shopper says **where they're shopping from**: Pakistan, the United
   States or the United Kingdom.
2. From then on, **every price on the store** is shown in that country's currency
   (Rs, $ or £), using **today's exchange rate**.
3. The shopper can **change the country at any time**.

Charging the card in that currency (and US/UK addresses at checkout) is **Spec 008**. Until
then, checkout clearly states the rupee amount that will be charged.

## 3. Countries

| Country | Currency | Example |
|---|---|---|
| 🇵🇰 Pakistan (default) | PKR | Rs 4,990.00 |
| 🇺🇸 United States | USD | $17.82 |
| 🇬🇧 United Kingdom | GBP | £14.05 |

## 4. User stories & acceptance criteria

### US-1 — Welcome popup on the first visit

- **AC-1.1** On a shopper's first visit, a popup opens **over the page they arrived on**
  (home, a product, a collection…). The page behind is dimmed and blurred. Opening a shared
  product link still shows that product behind the popup.
- **AC-1.2** It reads **"Welcome to ShopNest"**, *"Choose where you're shopping from to see
  prices in your currency."*, then **"Where are you from?"** with a country dropdown and a
  **Continue shopping** button. A small note says it can be changed later from the top of
  the page.
- **AC-1.3** **Pakistan** is selected by default, so most shoppers just press Continue.
- **AC-1.4** Desktop: a centred card. Phone: a sheet that slides up from the bottom (like
  Find My Size).
- **AC-1.5** Closing it with ✕, Esc or a tap outside counts as choosing **Pakistan**. Once
  chosen, the popup **never appears again** on that browser.
- **AC-1.6** The popup does not appear on the checkout, admin, account-login or PayPal test
  pages.

### US-2 — Prices in the chosen currency

- **AC-2.1** Every shopper-facing price is shown in the chosen currency:
  - product cards (sale and cut price)
  - the product page
  - search suggestions
  - cart drawer and cart page
  - the price filter
  - the free-shipping note in the announcement bar
- **AC-2.2** Rupees keep today's format (*Rs 4,990.00*). Dollars and pounds have two decimals
  (*$17.82*, *£14.05*).
- **AC-2.3** Prices update **instantly** when the country changes, without reloading the page.
- **AC-2.4** The price filter still filters correctly. The same products match, whatever
  currency the shopper sees.

### US-3 — Change the country later

- **AC-3.1** The header shows the current choice, e.g. **🇺🇸 USD ▾**. Tapping it opens the
  same three choices. On phones it is also available in the menu.
- **AC-3.2** The choice is remembered on that browser (no account needed).

### US-4 — Honest checkout (until Spec 008)

- **AC-4.1** If the shopper chose USD or GBP, the checkout shows the rupee total as today, and
  adds one line: *"You'll be charged Rs 4,990.00 (about $17.82)."*
- **AC-4.2** PayPal keeps its own existing dollar amount (Spec 004). Nothing about payment
  changes in this spec.

### US-5 — Today's exchange rate

- **AC-5.1** Rates come from a **live public source** and are refreshed **once a day** by the
  server, not by each visitor's browser.
- **AC-5.2** The store never breaks because of the rate source. If it is slow, down or returns
  nonsense, the **last good rate** is used.
- **AC-5.3** If no rate has ever been fetched, the store shows rupees only and the popup and
  switcher are hidden.

## 5. Rules

- **R-1 — Rupees are the truth.** Products, the cart, orders and filters stay in PKR in the
  database and the URL. Other currencies are only **converted for display**.
- **R-2 — Sanity check.** A new rate is accepted only if it is within a sensible range (for
  example $1 between Rs 100 and Rs 1,000) and has not moved more than 20% since the last good
  rate. Otherwise it is ignored and logged.
- **R-3 — Fast.** Rates come with the store's normal data, cached for the day. Changing the
  country makes no extra network request.
- **R-4 — Credit the source.** If the rate provider asks for credit, the footer shows it in
  small text.
- **R-5 — Private.** No location tracking. Only the chosen country is stored, and only in the
  shopper's browser.

## 6. Out of scope (this spec)

- Charging in USD or GBP; US/UK addresses; COD rules; currency in emails and admin. → **Spec 008**
- Guessing the country automatically from the visitor's location
- More countries or currencies
- Translations (the site stays in English)
- Different prices per country (prices are always the rupee price converted)

## 7. Definition of done

- On the live store, a first-time visitor opening a product link sees the popup over that
  product. Choosing **United States** shows every price in $, and the header shows **USD**.
- After a reload the choice is kept and the popup does not return. Switching to UK shows £.
- With the rate source unreachable, the store still works using the last good rate.
- Desktop and phone layouts checked.

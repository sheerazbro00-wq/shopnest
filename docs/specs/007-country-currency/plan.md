# Plan 007 — Country & currency

| | |
|---|---|
| **Status** | Approved (2026-10-07) |
| **Spec** | [spec.md](spec.md) |

How we'll build [Spec 007](spec.md). Section numbers (§) are referenced from `tasks.md`.

---

## 1. Overview

```
 once a day                        each visitor (once, cached)
 open.er-api.com ──► API ──► MongoDB          browser ──► GET /api/currency ──► { USD: 276.74, GBP: 367.04 }
 (live rates)        checks R-2   ExchangeRate                │
                                                             ▼
                              CurrencyContext: country (localStorage) + rates
                                                             │
                     useMoney() ──► ProductCard, Product, Cart, PriceRange, AnnouncementBar …
```

Prices stay in rupees everywhere (R-1). The browser converts **only when drawing a price**.

## 2. Rate source

**open.er-api.com** (ExchangeRate-API's free open endpoint):
- No key, no sign-up, and it includes PKR.
- It updates once a day. Its terms ask for a credit link, which goes in the footer (R-4).

```
GET https://open.er-api.com/v6/latest/USD
→ { result: "success", time_last_update_unix, rates: { PKR: 276.74, GBP: 0.754, … } }
```

We store **rupees per one unit** of each currency, because that is easy to read and check:
- USD = `PKR` = **276.74**
- GBP = `PKR / GBP` = **367.04**

`FX_API_URL` (env) overrides the address so tests can point at a local mock server, the same
trick used for PayPal in spec 004.

## 3. Server

### 3.1 Model — `server/models/ExchangeRate.js`

One document, `_id: "PKR"`:

| Field | Meaning |
|---|---|
| `rates` | `{ USD: 276.74, GBP: 367.04 }`, the last **good** rates |
| `sourceUpdatedAt` | when the provider published them |
| `checkedAt` | when we last *asked* (success or not) |
| `pending` | a rate that failed the 20% jump check: `{ rates, seenAt }` (§3.3) |
| `lastError` | short reason for the last rejected or failed fetch (no response body) |

### 3.2 Service — `server/services/exchangeRates.js`

`getRates()` **never throws**. It returns `{ rates, updatedAt }`, or `null` if no good rate
has ever been saved.

1. Read the document. If `checkedAt` is less than **12 h** old, return it. This is the normal
   path: one small DB read.
2. Otherwise **claim** the refresh atomically:
   `findOneAndUpdate({ _id, checkedAt < now−12h }, { checkedAt: now }, { upsert })`.
   Only the request that wins the claim fetches. The others keep using the stored rate.
   This is the same "atomic claim" idea as `markPaid` in spec 004.
3. Fetch with a **3 s timeout**, then check the result (§3.3) and save it.
4. Any failure (timeout, HTTP error, bad JSON) saves `lastError`, keeps the old rates and logs
   one line.

> Why 12 h and not 24 h? The provider updates daily at an unknown hour. Checking twice a day
> means we are never more than about half a day behind.

### 3.3 Checks (spec R-2)

| Check | Rule |
|---|---|
| Shape | `result === "success"`; PKR and GBP are positive numbers |
| Range | rupees per USD in **100–1,000**; rupees per GBP in **100–1,500** |
| Jump | each rate within **±20 %** of the last good one (skipped for the very first rate) |

If the jump check fails, the rate is saved as `pending`. If the **next** fetch (12 h or more
later) agrees with `pending` within 2 %, it is accepted as real: a genuine devaluation must
not freeze prices forever. A one-off glitch never repeats, so it never gets through.

### 3.4 Route — `GET /api/currency`

`server/routes/currencyRoutes.js` with `server/controllers/currencyController.js`. It is public.

```json
{ "base": "PKR",
  "rates": { "USD": 276.74, "GBP": 367.04 },
  "updatedAt": "2026-10-07T00:02:32Z",
  "credit": { "name": "ExchangeRate-API", "url": "https://www.exchangerate-api.com" } }
```

- It returns `"rates": null` when no good rate exists yet (AC-5.3).
- It sends `Cache-Control: public, max-age=600, s-maxage=3600, stale-while-revalidate=86400`.
  Vercel's CDN then answers most visitors without even calling our function (R-3).

## 4. Client

### 4.1 `client/src/utils/currency.js` (pure functions)

```js
export const COUNTRIES = [
  { code: "PK", name: "Pakistan",       currency: "PKR", flag: "🇵🇰" },
  { code: "US", name: "United States",  currency: "USD", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", currency: "GBP", flag: "🇬🇧" },
];
convert(pkr, currency, rates)      // 4990, "USD" → 18.03 (rounded to cents)
formatMoney(pkr, currency, rates, style)
```

- **PKR is unchanged:** `style: "store"` gives `Rs.4,990.00` (cards), and `"checkout"` gives
  `Rs 4,990.00`.
- **USD/GBP** use `Intl.NumberFormat("en-US", { style: "currency", currency })`, which gives
  `$18.03` and `£13.60`.
- If rates are missing, it falls back to PKR, so it never shows `$NaN`.

### 4.2 `client/src/context/CurrencyContext.jsx`

It provides `{ country, currency, rates, available, chosen, setCountry, money(pkr, style) }`.

- **Country:**
  - Stored in `localStorage` as `shopnest_country` (`"PK" | "US" | "GB"`).
  - Reads and writes are guarded, with a memory fallback, like `fitProfile.js`.
  - `chosen` is false until the shopper picks a country, or closes the popup.
- **Rates:**
  - The last rates are cached as `shopnest_rates`, so a returning visitor sees `$` **at once**
    with no rupee flash.
  - On app start they are refreshed in the background with one `GET /api/currency` (via
    `api/currency.js`).
- `available`: rates exist. If not, `currency` is forced to PKR, and the popup and switcher
  hide (AC-5.3).
- Changing the country only changes state. Every price re-renders instantly, with no request
  (AC-2.3, R-3).
- The provider wraps the app in `App.jsx`, next to the Cart and Auth providers.

`useMoney()` is a small hook returning `money`, so components change one import.

### 4.3 Prices that switch (AC-2.1)

| File | Change |
|---|---|
| `components/product/ProductCard.jsx` | `formatPrice` → `money` |
| `pages/Product.jsx` | price + cut price |
| `components/cart/CartDrawer.jsx`, `CartLineItem.jsx`, `pages/Cart.jsx` | subtotal + lines |
| `components/collection/PriceRange.jsx` | **labels only**: slider values and URL stay rupees (AC-2.4) |
| `components/layout/AnnouncementBar.jsx` | "Free shipping on orders above $9.03", from `store.freeShippingMin` |

- Search suggestions show no prices today, so nothing changes there.
- Checkout, thank-you, account orders, emails and admin stay in rupees: they are about the
  order, which is in rupees until spec 008.

### 4.4 Welcome popup — `components/currency/CountryPopup.jsx` + `.css`

- **Where it renders:** only in the **store** branch of `Shell` in `App.jsx`, so checkout,
  account, admin and PayPal pages never get it (AC-1.6).
- **When it shows:** `available && !chosen`, after first paint. The page behind loads
  normally (AC-1.1).
- **Layout:**
  - Backdrop: dim + `backdrop-filter: blur(4px)`, with a plain dim fallback.
  - ≥750 px: a centred card, max-width 420 px.
  - Phone: a bottom sheet with a grab handle. It reuses the Find My Size sheet pattern and
    animates `transform` only.
- **Content (AC-1.2):** the ShopNest logo, "Welcome to ShopNest", a sub-line, the label
  "Where are you from?", then a **native `<select>`**, the **Continue shopping** button and a
  small note.
  - A native select is the best dropdown on phones: it opens the system picker and is
    accessible out of the box.
  - Options read `🇵🇰 Pakistan — Rs PKR`.
- **Behaviour:**
  - `role="dialog"`, `aria-modal`, and focus starts on the select and is trapped.
  - Body scroll is locked.
  - ✕, Esc and a backdrop click all mean `setCountry("PK")` (AC-1.5).

### 4.5 Switcher — `components/currency/CurrencySwitcher.jsx`

- **Header (desktop):** a button in `header-item--icons` before search, `🇺🇸 USD ▾`. It opens
  a small menu (`role="menu"`, three `menuitemradio` items, ✓ on the current one). It closes
  on choice, Esc or an outside click.
- **Phone header:** too tight, so it shows only the flag + code (`🇺🇸 USD`), with the same menu.
- **MobileNav:** a "Country / currency" row with a native select at the bottom of the drawer
  (AC-3.1).
- It is hidden when `!available`.

### 4.6 Checkout note (US-4)

In `pages/Checkout.jsx`, under the total, when `currency !== "PKR"`:

*"You'll be charged Rs 4,990.00 (about $18.03)."*

PayPal's own `$` line from spec 004 is untouched (AC-4.2).

### 4.7 Footer credit (R-4)

In small muted text in the footer bottom row: *"Exchange rates by ExchangeRate-API"*. It shows
only when the currency is not PKR.

## 5. Security & privacy

- No IP or location lookup. Only the country code is stored, in the shopper's browser (R-5).
- The rate endpoint takes no input, so there is nothing to inject. The fetch has a timeout,
  and a slow provider costs at most 3 s, once per 12 h.
- No new secrets or env vars are needed in production (`FX_API_URL` is for tests only).

## 6. Testing

1. **Unit** (node script): `convert` and `formatMoney` for each currency, rounding, missing
   rates → PKR, and §3.3 checks (range, ±20 %, pending accepted on the second agreeing fetch,
   glitch rejected).
2. **Mock provider:** a local mock server reached through `FX_API_URL`, used to test:
   - a good rate
   - nonsense (`PKR: 5`)
   - a 30 % jump twice
   - a hang (timeout)
   - a 500 error
   In every case the store keeps answering with the last good rate.
3. **Browser** (Playwright, 1440 px and 390 px):
   - The first visit to a product link shows the popup over the product.
   - Choosing US makes cards, PDP, cart, filter labels and the announcement show `$`.
   - After a reload, the popup is gone and `$` is kept.
   - The header switch to UK shows `£`.
   - Checkout shows the rupee note.
   - With storage blocked, the popup still works for the visit.
4. **Live:** the Definition of Done in the spec, on desktop and the owner's phone.

# Tasks 007 — Country & currency

| | |
|---|---|
| **Status** | In progress |
| **Spec / plan** | [spec.md](spec.md) · [plan.md](plan.md) |

## Phase 1 — Server rates
- [x] **T1.1** `ExchangeRate` model. [plan §3.1]
- [x] **T1.2** `exchangeRates` service: 12 h cache, atomic claim, 3 s timeout, never throws. [§3.2, AC-5.1, AC-5.2]
- [x] **T1.3** Checks: shape, range, ±20 % jump with `pending` confirmation. [§3.3, R-2]
- [x] **T1.4** `GET /api/currency` with CDN cache headers; `rates: null` when none. [§3.4, AC-5.3, R-3]
- [x] **T1.5** Tests with a mock provider: good, nonsense, 30 % jump twice, hang, 500. [§6.1–6.2]

## Phase 2 — Client money
- [x] **T2.1** `utils/currency.js` (`COUNTRIES`, `convert`, `formatMoney`) + unit checks. [§4.1]
- [x] **T2.2** `CurrencyContext` + `useMoney`; cached rates, guarded storage. [§4.2]
- [x] **T2.3** Switch prices: cards, PDP, cart drawer/page, price filter labels, announcement. [§4.3, AC-2.1–2.4]

## Phase 3 — UI
- [x] **T3.1** `CountryPopup` (centred card / bottom sheet, native select, ✕/Esc/backdrop = Pakistan). [§4.4, US-1]
- [x] **T3.2** `CurrencySwitcher` in the header + MobileNav row. [§4.5, US-3]
- [x] **T3.3** Checkout "You'll be charged Rs … (about $…)" note. [§4.6, US-4]
- [x] **T3.4** Footer credit. [§4.7, R-4]
- [x] **T3.5** Browser checks at 1440 px and 390 px, incl. blocked storage. [§6.3]

## Phase 4 — Live
- [ ] **T4.1** Push; check `/api/currency` live and the CDN header.
- [ ] **T4.2** Owner tests on desktop + phone (Definition of Done).
- [ ] **T4.3** Mark Done.

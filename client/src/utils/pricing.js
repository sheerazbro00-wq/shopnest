import { money as rupees } from "../components/checkout/money";

// Checkout money in the shopper's currency (spec 008 plan §2, §4.2). A copy of
// server/services/pricing.js `quote` so the page shows exactly what the server will
// charge — keep the two in step (the same test cases run against both).
// Charged amounts are integers in minor units; each unit price is rounded first (R-2).

export const toMinor = (pkr, currency, rate) =>
  currency === "PKR" ? Math.round(Number(pkr) * 100) : Math.round((Number(pkr) / rate) * 100);

const formatters = {};
// 3957, "USD" → "$39.57" · 1095000, "PKR" → "Rs 10,950.00" (checkout style)
export function formatMinor(minor, currency) {
  if (currency === "PKR") return rupees(Number(minor) / 100);
  formatters[currency] ||= new Intl.NumberFormat("en-US", { style: "currency", currency });
  return formatters[currency].format(Number(minor) / 100);
}

export const chargeCurrencyFor = (country, method) =>
  method === "PayPal" && country.currency === "PKR" ? "USD" : country.currency;

// items: [{ price (rupees), qty }]; config: GET /orders/config. Returns null when the
// country can't be priced (no rate) — checkout then falls back to Pakistan (R-6).
export function quote({ items, countryCode, method, config }) {
  const country = config?.countries?.find((c) => c.code === countryCode);
  if (!country) return null;
  const rule = countryCode === "PK" ? config.shipping.PK : config.shipping.INTL;

  const itemsPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingPrice = itemsPrice >= rule.freeMin ? 0 : rule.fee;
  const chargeCurrency = chargeCurrencyFor(country, method);
  let rate = 1;
  if (chargeCurrency !== "PKR") {
    rate = Number(config.rates?.[chargeCurrency]);
    if (!(rate > 0) && countryCode === "PK") rate = Number(config.fallbackUsdRate);
    if (!(rate > 0)) return null;
  }
  const unitCharges = items.map((i) => toMinor(i.price, chargeCurrency, rate));
  const chargeItems = unitCharges.reduce((sum, unit, k) => sum + unit * items[k].qty, 0);
  const chargeShipping = toMinor(shippingPrice, chargeCurrency, rate);

  return {
    currency: country.currency,
    itemsPrice,
    shippingPrice,
    totalPrice: itemsPrice + shippingPrice,
    unitCharges,
    charge: { currency: chargeCurrency, rate, items: chargeItems, shipping: chargeShipping, total: chargeItems + chargeShipping },
  };
}

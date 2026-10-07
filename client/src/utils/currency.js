import { formatPrice } from "./format";
import { money as checkoutMoney } from "../components/checkout/money";

// Country & currency (spec 007 plan §4.1). Prices are always stored in rupees (R-1);
// these helpers only convert them for display. `rates` = rupees per unit, e.g. { USD: 276.74 }.

export const COUNTRIES = [
  { code: "PK", name: "Pakistan", currency: "PKR", symbol: "Rs", flag: "🇵🇰" },
  { code: "US", name: "United States", currency: "USD", symbol: "$", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£", flag: "🇬🇧" },
];

export const countryOf = (code) => COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];

// Only well-formed rates are ever used, so a bad cache can't print "$NaN".
export const validRates = (rates) =>
  rates && COUNTRIES.every((c) => c.currency === "PKR" || Number(rates[c.currency]) > 0) ? rates : null;

// 4990 rupees → 18.03 dollars (rounded to cents). Null when there's no rate.
export function convert(pkr, currency, rates) {
  const rate = validRates(rates)?.[currency];
  if (currency === "PKR" || !rate) return null;
  return Math.round((Number(pkr || 0) / rate) * 100) / 100;
}

const formatters = {};
const intl = (currency) =>
  (formatters[currency] ||= new Intl.NumberFormat("en-US", { style: "currency", currency }));

// Rupees keep today's look: "Rs.4,990.00" in the store, "Rs 4,990.00" in checkout.
// Dollars and pounds: "$18.03", "£13.60". Falls back to rupees without a rate.
export function formatMoney(pkr, currency, rates, style = "store") {
  const amount = convert(pkr, currency, rates);
  if (amount === null) return style === "checkout" ? checkoutMoney(pkr) : formatPrice(pkr);
  return intl(currency).format(amount);
}

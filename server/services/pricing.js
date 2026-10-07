const { COUNTRIES, SHIPPING } = require("../config/shop");

// Checkout money in the shopper's currency (spec 008 plan §2–3). Pure functions, so the
// client copy (client/src/utils/pricing.js) can be checked against the same cases.
//
// Charged amounts are integers in minor units (cents/pence/paisa). Each unit price is
// converted and rounded first, then multiplied, so lines always add up (R-2).

const httpError = (status, message) => Object.assign(new Error(message), { status });

// Rupees → minor units of `currency`. `rate` = rupees per unit (ignored for PKR).
function toMinor(pkr, currency, rate) {
  if (currency === "PKR") return Math.round(Number(pkr) * 100);
  return Math.round((Number(pkr) / rate) * 100);
}

const SYMBOLS = { USD: "$", GBP: "£" };

// 3957, "USD" → "$39.57" · 1095000, "PKR" → "Rs 10,950" (whole rupees, as the emails always showed)
function formatMinor(minor, currency) {
  const value = Number(minor) / 100;
  if (currency === "PKR") return `Rs ${Math.round(value).toLocaleString("en-US")}`;
  return `${SYMBOLS[currency] || `${currency} `}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// PayPal has no rupees: a Pakistani PayPal order is shown in Rs and charged in $ (spec §3).
const chargeCurrencyFor = (countryCode, method) => {
  const currency = COUNTRIES[countryCode].currency;
  return method === "PayPal" && currency === "PKR" ? "USD" : currency;
};

const shippingFor = (itemsPrice, countryCode) => {
  const rule = countryCode === "PK" ? SHIPPING.PK : SHIPPING.INTL;
  return itemsPrice >= rule.freeMin ? 0 : rule.fee;
};

// items: [{ price (rupees), qty }] from the database, never the browser (R-3).
// rates: { USD, GBP } rupees per unit (spec 007). fallbackUsdRate keeps Pakistani PayPal
// working on Spec 004's fixed rate if live rates are unavailable.
function quote({ items, countryCode, method, rates, fallbackUsdRate }) {
  const country = COUNTRIES[countryCode];
  if (!country) throw httpError(400, "We don't deliver to that country yet");

  const itemsPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingPrice = shippingFor(itemsPrice, countryCode);
  const totalPrice = itemsPrice + shippingPrice;

  const chargeCurrency = chargeCurrencyFor(countryCode, method);
  let rate = 1;
  if (chargeCurrency !== "PKR") {
    rate = Number(rates?.[chargeCurrency]);
    if (!(rate > 0) && countryCode === "PK") rate = Number(fallbackUsdRate);
    if (!(rate > 0)) throw httpError(503, "International checkout is unavailable right now. Please try again shortly."); // R-6
  }

  const unitCharges = items.map((i) => toMinor(i.price, chargeCurrency, rate));
  const chargeItems = unitCharges.reduce((sum, unit, k) => sum + unit * items[k].qty, 0);
  const chargeShipping = toMinor(shippingPrice, chargeCurrency, rate);

  return {
    currency: country.currency,
    itemsPrice,
    shippingPrice,
    totalPrice,
    unitCharges,
    charge: { currency: chargeCurrency, rate, items: chargeItems, shipping: chargeShipping, total: chargeItems + chargeShipping },
  };
}

// Receipt amounts as text, in the order's currency (plan §3.7). Orders before spec 008 and
// Pakistani orders → rupees (R-7). `charged` is what PayPal took when that differs from the
// receipt currency (a Pakistani PayPal order: "$21.50"), else null.
function orderAmounts(order) {
  const c = order.charge;
  if (c && order.currency && order.currency !== "PKR" && c.currency === order.currency) {
    const f = (minor) => formatMinor(minor, c.currency);
    return {
      currency: c.currency,
      line: (i) => f(i.unitCharge * i.qty),
      items: f(c.items),
      shipping: c.shipping ? f(c.shipping) : null,
      total: f(c.total),
      charged: null,
    };
  }
  const rs = (n) => formatMinor(Math.round(Number(n) * 100), "PKR");
  let charged = null;
  if (c && c.currency !== "PKR") charged = formatMinor(c.total, c.currency);
  else if (order.paypal?.usd) charged = `$${order.paypal.usd}`; // PayPal orders from spec 004
  return {
    currency: "PKR",
    line: (i) => rs(i.price * i.qty),
    items: rs(order.itemsPrice),
    shipping: order.shippingPrice ? rs(order.shippingPrice) : null,
    total: rs(order.totalPrice),
    charged,
  };
}

module.exports = { toMinor, formatMinor, quote, shippingFor, chargeCurrencyFor, orderAmounts };

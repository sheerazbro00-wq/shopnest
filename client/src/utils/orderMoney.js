import { money as rupees } from "../components/checkout/money";
import { formatMinor } from "./pricing";

// An order's amounts as text, in its own currency (spec 008 plan §4.1): $/£ for US/UK
// orders, rupees for Pakistani orders and for every order placed before spec 008 (R-7).
// `charged` is what PayPal took when that differs from the receipt currency
// (a Pakistani PayPal order: "$21.50"), else "".
export function orderAmounts(order) {
  const c = order.charge;
  if (c && order.currency && order.currency !== "PKR" && c.currency === order.currency) {
    const f = (minor) => formatMinor(minor, c.currency);
    return {
      currency: c.currency,
      line: (i) => f(i.unitCharge * i.qty),
      items: f(c.items),
      shipping: c.shipping ? f(c.shipping) : "",
      total: f(c.total),
      charged: "",
    };
  }
  let charged = "";
  if (c && c.currency !== "PKR") charged = formatMinor(c.total, c.currency);
  else if (order.paypal?.usd) charged = `$${order.paypal.usd}`; // PayPal orders from spec 004
  return {
    currency: "PKR",
    line: (i) => rupees(i.price * i.qty),
    items: rupees(order.itemsPrice),
    shipping: order.shippingPrice ? rupees(order.shippingPrice) : "",
    total: rupees(order.totalPrice),
    charged,
  };
}

// "$39.57" — or "$21.50 (Rs 5,950.00)" for a Pakistani PayPal order.
export function paidAmount(order) {
  const m = orderAmounts(order);
  return m.charged ? `${m.charged} (${m.total})` : m.total;
}

// Summary lines for <OrderSummary> from a saved order.
export const summaryOf = (order) => {
  const m = orderAmounts(order);
  return {
    currency: m.currency,
    lines: order.orderItems.map((i, k) => ({
      key: `${i.product}_${i.size}_${k}`,
      image: i.image,
      name: i.name,
      variant: [i.color, i.size].filter(Boolean).join(" / "),
      qty: i.qty,
      price: m.line(i),
    })),
    items: m.items,
    shipping: m.shipping,
    total: m.total,
  };
};

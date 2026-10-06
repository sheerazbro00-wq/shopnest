// One place for payment-method wording (spec 004 plan §6).

// Paid online at checkout; unpaid ones are abandoned checkouts, not orders.
export const isOnline = (order) => order.paymentMethod === "Card" || order.paymentMethod === "PayPal";

const isTestPayPal = (order) => (order.paypal?.mode ?? order.paypalMode) === "simulated";

// Shoppers never see "test" (spec 004 AC-1.5); the admin panel always does (AC-4.2).
export function paymentLabel(order, { admin = false } = {}) {
  if (order.paymentMethod === "COD") return "Cash on Delivery";
  if (order.paymentMethod === "PayPal") return admin && isTestPayPal(order) ? "PayPal (test)" : "PayPal";
  return "Card";
}

// "$21.25" for PayPal orders (charged in USD), else "".
export const usdOf = (order) => (order.paypal?.usd ? `$${order.paypal.usd}` : "");

// Same rounding as the server's toUsd(); the server's figure is the one charged.
export const toUsd = (rupees, rate) => (Math.round((rupees / rate) * 100) / 100).toFixed(2);

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

// Amounts in an order's currency: utils/orderMoney.js (spec 008).

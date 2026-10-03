const Order = require("../models/Order");
const { emailEnabled, storeNotifyEmail } = require("../config/email");
const { clientUrl } = require("../config/client");
const { sendEmail } = require("./email/send");
const { rupees } = require("./email/layout");
const orderConfirmation = require("./email/templates/orderConfirmation");
const ownerAlert = require("./email/templates/ownerAlert");

// The only payment-specific part of order emails (spec 001, R-7).
// A new payment method adds one entry here; everything else stays the same.
//   line:  shown in the receipt and the owner alert
//   label: short form for the owner alert's subject
const PAYMENT = {
  COD: { line: (o) => `Pay ${rupees(o.totalPrice)} in cash on delivery`, label: "Cash on Delivery" },
  Card: { line: () => "Paid by card", label: "Paid by card" },
};

const paymentOf = (order) => {
  const p = PAYMENT[order.paymentMethod];
  return p ? { line: p.line(order), label: p.label } : { line: `Payment: ${order.paymentMethod}`, label: order.paymentMethod };
};

// "Confirmed" (spec §2): placed and not waiting for, or lost, its payment.
// COD orders start as Pending; card orders only get there once paid.
const isConfirmed = (order) => !["Awaiting payment", "Cancelled"].includes(order.status);

// Atomically marks a notification as taken. Only one caller can turn null into
// a date, so two simultaneous triggers can never both send (R-1).
async function claim(orderId, field) {
  const res = await Order.updateOne({ _id: orderId, [`notifications.${field}`]: null }, { $set: { [`notifications.${field}`]: new Date() } });
  return res.modifiedCount === 1;
}

const release = (orderId, field) => Order.updateOne({ _id: orderId }, { $set: { [`notifications.${field}`]: null } });

async function deliver(order, field, to, build, tag) {
  if (!to) return "no-recipient";
  if (!(await claim(order._id, field))) return "already-sent";
  const result = await sendEmail({ to, tag, ...build() });
  // A failed send gives the claim back, so the next trigger (Stripe webhook
  // retry, thank-you page refresh) can try again.
  if (!result.sent && result.reason === "error") await release(order._id, field);
  return result.sent ? "sent" : result.reason;
}

// Call wherever an order may have become confirmed — for any payment method.
// Sends the customer receipt and the owner alert at most once each. Never
// throws: email trouble must not break checkout or payment (R-2).
async function notifyOrderConfirmed(order) {
  if (!emailEnabled || !isConfirmed(order)) return { confirmation: "skipped", ownerAlert: "skipped" };
  try {
    const payment = paymentOf(order);
    const { accessToken } = await Order.findById(order._id).select("+accessToken").lean();
    const orderUrl = `${clientUrl}/checkout/thank-you/${order._id}?token=${accessToken}`;
    const adminUrl = `${clientUrl}/admin/orders/${order._id}`;

    const [confirmation, alert] = await Promise.all([
      deliver(order, "confirmation", order.email, () => orderConfirmation({ order, orderUrl, paymentLine: payment.line }), "order-confirmation"),
      deliver(order, "ownerAlert", storeNotifyEmail, () => ownerAlert({ order, adminUrl, paymentLine: payment.line, paymentLabel: payment.label }), "owner-alert"),
    ]);
    return { confirmation, ownerAlert: alert };
  } catch (err) {
    console.error(`[email] order #${order.orderNumber} notifications failed: ${err.message}`);
    return { confirmation: "error", ownerAlert: "error" };
  }
}

module.exports = { PAYMENT, paymentOf, isConfirmed, notifyOrderConfirmed };

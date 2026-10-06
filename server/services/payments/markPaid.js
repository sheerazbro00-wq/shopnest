const Order = require("../../models/Order");
const { notifyOrderConfirmed } = require("../orderNotifications");

// Marks an order paid exactly once (spec 004 R-4). The filter only matches an order
// that is still awaiting payment, so of several simultaneous callers (page reloads,
// double clicks) exactly one changes it — and only that one writes the "paid" line.
// Every caller then runs the email step, which is itself exactly-once (spec 001), so
// a send that failed earlier is retried here.
async function markPaid(orderId, { by, paymentResult, set = {} }) {
  const paidAt = new Date();
  const res = await Order.updateOne(
    { _id: orderId, isPaid: false, status: "Awaiting payment" },
    {
      $set: { isPaid: true, paidAt, status: "Pending", paymentResult, ...set },
      $push: { history: { event: "paid", at: paidAt, by } },
    }
  );
  const order = await Order.findById(orderId);
  await notifyOrderConfirmed(order);
  return { order, changed: res.modifiedCount === 1 };
}

module.exports = { markPaid };

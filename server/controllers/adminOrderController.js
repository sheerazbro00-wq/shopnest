const mongoose = require("mongoose");
const Order = require("../models/Order");
const { httpError, clean } = require("../utils/validation");

const STATUSES = ["Awaiting payment", "Pending", "Shipped", "Delivered", "Cancelled"];
const PAGE_SIZE = 25;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORTS = {
  newest: { createdAt: -1, orderNumber: -1 },
  oldest: { createdAt: 1, orderNumber: 1 },
  "total-desc": { totalPrice: -1, createdAt: -1 },
  "total-asc": { totalPrice: 1, createdAt: -1 },
};

// Search box: "#1042" / "1042" -> order number; otherwise every word must match
// the customer's first name, last name, email or phone.
function searchFilter(q) {
  const text = clean(q, 80);
  if (!text) return {};
  const num = text.replace(/^#/, "");
  if (/^\d{3,7}$/.test(num)) {
    return { $or: [{ orderNumber: Number(num) }, { phone: { $regex: escapeRegex(num) } }] };
  }
  const words = text.split(/\s+/).slice(0, 4);
  return {
    $and: words.map((w) => {
      const rx = { $regex: escapeRegex(w), $options: "i" };
      return { $or: [{ "shippingAddress.firstName": rx }, { "shippingAddress.lastName": rx }, { email: rx }, { phone: rx }] };
    }),
  };
}

function paymentFilter(payment) {
  if (payment === "paid") return { isPaid: true };
  if (payment === "unpaid") return { isPaid: false };
  if (payment === "cod") return { paymentMethod: "COD" };
  if (payment === "card") return { paymentMethod: "Card" };
  if (payment === "paypal") return { paymentMethod: "PayPal" };
  return {};
}

// GET /api/admin/orders?status=&payment=&q=&sort=&page=
const listOrders = async (req, res) => {
  const base = { ...searchFilter(req.query.q), ...paymentFilter(req.query.payment) };
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  const filter = status ? { ...base, status } : base;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const sort = SORTS[req.query.sort] || SORTS.newest;

  const [orders, total, counts] = await Promise.all([
    Order.find(filter)
      .sort(sort)
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .select("orderNumber createdAt email shippingAddress.firstName shippingAddress.lastName shippingAddress.city paymentMethod paypal.mode isPaid status totalPrice orderItems.qty")
      .lean(),
    Order.countDocuments(filter),
    // Tab counts reflect the search + payment filters, but not the status tab itself.
    Order.aggregate([{ $match: base }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);

  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  res.json({
    orders: orders.map((o) => ({
      _id: o._id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      customer: `${o.shippingAddress?.firstName || ""} ${o.shippingAddress?.lastName || ""}`.trim() || o.email,
      city: o.shippingAddress?.city,
      paymentMethod: o.paymentMethod,
      paypalMode: o.paypal?.mode,
      isPaid: o.isPaid,
      status: o.status,
      totalPrice: o.totalPrice,
      items: o.orderItems.reduce((n, i) => n + i.qty, 0),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    pageSize: PAGE_SIZE,
    counts: { All: Object.values(byStatus).reduce((a, b) => a + b, 0), ...byStatus },
  });
};

async function loadOrder(id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, "Order not found");
  const order = await Order.findById(id).populate("user", "name email createdAt");
  if (!order) throw httpError(404, "Order not found");
  return order;
}

async function adminView(order) {
  const o = order.toObject();
  delete o.stripeSessionId;
  const [customerOrders, prev, next] = await Promise.all([
    Order.countDocuments({ email: o.email }),
    Order.findOne({ orderNumber: { $lt: o.orderNumber } }).sort({ orderNumber: -1 }).select("_id").lean(),
    Order.findOne({ orderNumber: { $gt: o.orderNumber } }).sort({ orderNumber: 1 }).select("_id").lean(),
  ]);
  return { ...o, customerOrders, prevId: prev?._id || null, nextId: next?._id || null };
}

// GET /api/admin/orders/:id
const getOrder = async (req, res) => {
  res.json(await adminView(await loadOrder(req.params.id)));
};

// Allowed fulfilment moves: action -> statuses it can start from.
const TRANSITIONS = {
  ship: { from: ["Pending"], to: "Shipped" },
  deliver: { from: ["Pending", "Shipped"], to: "Delivered" },
  cancel: { from: ["Awaiting payment", "Pending", "Shipped"], to: "Cancelled" },
};

// PATCH /api/admin/orders/:id  { action: "ship" | "deliver" | "cancel" } and/or { note }
const updateOrder = async (req, res) => {
  const order = await loadOrder(req.params.id);
  const { action } = req.body || {};

  if (action !== undefined) {
    const move = TRANSITIONS[action];
    if (!move) throw httpError(400, "Unknown action");
    if (!move.from.includes(order.status)) {
      throw httpError(409, `A ${order.status.toLowerCase()} order can't be ${move.to.toLowerCase()}.`);
    }
    const now = new Date();
    order.status = move.to;
    if (move.to === "Shipped") order.shippedAt = now;
    if (move.to === "Cancelled") order.cancelledAt = now;
    if (move.to === "Delivered") {
      order.deliveredAt = now;
      if (!order.shippedAt) order.shippedAt = now;
      if (order.paymentMethod === "COD" && !order.isPaid) {
        order.isPaid = true; // cash collected by the courier on delivery
        order.paidAt = now;
      }
    }
  }

  if (typeof req.body?.note === "string") order.adminNote = clean(req.body.note, 1000);

  order.$locals.actor = req.user.name;
  await order.save();
  res.json(await adminView(order));
};

module.exports = { listOrders, getOrder, updateOrder };

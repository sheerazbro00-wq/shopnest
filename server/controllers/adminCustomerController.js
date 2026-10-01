const mongoose = require("mongoose");
const Order = require("../models/Order");
const User = require("../models/User");
const ContactMessage = require("../models/ContactMessage");
const { httpError, clean } = require("../utils/validation");

const PAGE_SIZE = 25;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Revenue ignores cancelled orders and card checkouts that were never paid.
const NOT_A_SALE = ["Cancelled", "Awaiting payment"];

const TABS = {
  all: {},
  accounts: { userId: { $ne: null } },
  guests: { userId: null },
  returning: { orders: { $gte: 2 } },
  subscribed: { marketing: true },
};

const SORTS = {
  "last-order": { lastOrderAt: -1, _id: 1 },
  "spent-desc": { spent: -1, _id: 1 },
  "orders-desc": { orders: -1, spent: -1, _id: 1 },
  newest: { since: -1, _id: 1 },
  name: { name: 1, _id: 1 },
};

// A "customer" is an email address: everyone with an account, plus guests who
// checked out without one. Orders are grouped by email and merged with the
// user accounts, so a guest who later signs up becomes one customer.
//
// This runs over every order on each request — fine for a small store. A big
// one would keep these totals on a Customer document, updated when orders change.
const customerPipeline = [
  {
    $group: {
      _id: "$email",
      orders: { $sum: 1 },
      spent: { $sum: { $cond: [{ $in: ["$status", NOT_A_SALE] }, 0, "$totalPrice"] } },
      lastOrderAt: { $max: "$createdAt" },
      firstOrderAt: { $min: "$createdAt" },
      optIn: { $max: "$emailOptIn" },
      last: {
        $top: {
          sortBy: { createdAt: -1 },
          output: {
            orderId: "$_id",
            name: { $concat: ["$shippingAddress.firstName", " ", "$shippingAddress.lastName"] },
            city: "$shippingAddress.city",
            phone: "$phone",
          },
        },
      },
    },
  },
  {
    $unionWith: {
      coll: User.collection.name,
      pipeline: [
        {
          $project: {
            _id: "$email",
            userId: "$_id",
            accountName: "$name",
            joinedAt: "$createdAt",
            isAdmin: "$isAdmin",
            optIn: "$acceptsMarketing",
            addressCity: { $first: "$addresses.city" },
          },
        },
      ],
    },
  },
  {
    $group: {
      _id: "$_id",
      userId: { $max: "$userId" },
      isAdmin: { $max: "$isAdmin" },
      accountName: { $max: "$accountName" },
      joinedAt: { $max: "$joinedAt" },
      addressCity: { $max: "$addressCity" },
      orders: { $sum: { $ifNull: ["$orders", 0] } },
      spent: { $sum: { $ifNull: ["$spent", 0] } },
      lastOrderAt: { $max: "$lastOrderAt" },
      firstOrderAt: { $min: "$firstOrderAt" },
      marketing: { $max: { $ifNull: ["$optIn", false] } },
      last: { $max: "$last" },
    },
  },
  { $match: { isAdmin: { $ne: true } } }, // staff aren't customers
  {
    $project: {
      userId: 1,
      orders: 1,
      spent: 1,
      lastOrderAt: 1,
      marketing: 1,
      email: "$_id",
      name: { $ifNull: ["$accountName", { $ifNull: ["$last.name", "$_id"] }] },
      city: { $ifNull: ["$last.city", "$addressCity"] },
      phone: "$last.phone",
      lastOrderId: "$last.orderId",
      since: { $ifNull: ["$joinedAt", "$firstOrderAt"] },
    },
  },
];

// Every word must appear in the name, email or phone.
function searchMatch(q) {
  const text = clean(q, 80);
  if (!text) return {};
  return {
    $and: text
      .split(/\s+/)
      .slice(0, 4)
      .map((w) => {
        const rx = { $regex: escapeRegex(w), $options: "i" };
        return { $or: [{ name: rx }, { email: rx }, { phone: rx }] };
      }),
  };
}

// Accounts are addressed by user id; guests by their latest order id ("g-…"),
// so emails never end up in URLs, browser history or server logs.
const keyOf = (c) => (c.userId ? String(c.userId) : `g-${c.lastOrderId}`);

const listRow = (c) => ({
  key: keyOf(c),
  name: c.name,
  email: c.email,
  city: c.city || "",
  hasAccount: Boolean(c.userId),
  marketing: Boolean(c.marketing),
  orders: c.orders,
  spent: c.spent,
  lastOrderAt: c.lastOrderAt || null,
  since: c.since,
});

// GET /api/admin/customers?tab=&q=&sort=&page=
const listCustomers = async (req, res) => {
  const tab = TABS[req.query.tab] ? req.query.tab : "all";
  const sort = SORTS[req.query.sort] || SORTS["last-order"];
  const page = Math.max(1, parseInt(req.query.page) || 1);

  const [result] = await Order.aggregate([
    ...customerPipeline,
    { $match: searchMatch(req.query.q) },
    {
      $facet: {
        rows: [{ $match: TABS[tab] }, { $sort: sort }, { $skip: (page - 1) * PAGE_SIZE }, { $limit: PAGE_SIZE }],
        total: [{ $match: TABS[tab] }, { $count: "n" }],
        // Tab counts follow the search box but not the selected tab.
        counts: [
          {
            $group: {
              _id: null,
              all: { $sum: 1 },
              accounts: { $sum: { $cond: [{ $ifNull: ["$userId", false] }, 1, 0] } },
              guests: { $sum: { $cond: [{ $ifNull: ["$userId", false] }, 0, 1] } },
              returning: { $sum: { $cond: [{ $gte: ["$orders", 2] }, 1, 0] } },
              subscribed: { $sum: { $cond: ["$marketing", 1, 0] } },
            },
          },
        ],
      },
    },
  ]);

  const total = result.total[0]?.n || 0;
  const { _id, ...counts } = result.counts[0] || { all: 0, accounts: 0, guests: 0, returning: 0, subscribed: 0 };
  res.json({
    customers: result.rows.map(listRow),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    pageSize: PAGE_SIZE,
    counts,
  });
};

// Resolves a customer key to { email, user }.
async function resolveKey(key) {
  const notFound = () => httpError(404, "Customer not found");
  if (typeof key !== "string") throw notFound();
  if (key.startsWith("g-")) {
    const orderId = key.slice(2);
    if (!mongoose.isValidObjectId(orderId)) throw notFound();
    const order = await Order.findById(orderId).select("email").lean();
    if (!order) throw notFound();
    // If that guest has since created an account, show the account instead.
    const user = await User.findOne({ email: order.email }).lean();
    if (user?.isAdmin) throw notFound();
    return { email: order.email, user };
  }
  if (!mongoose.isValidObjectId(key)) throw notFound();
  const user = await User.findById(key).lean();
  if (!user || user.isAdmin) throw notFound();
  return { email: user.email, user };
}

// GET /api/admin/customers/:key
const getCustomer = async (req, res) => {
  const { email, user } = await resolveKey(req.params.key);
  const byCustomer = user ? { $or: [{ email }, { user: user._id }] } : { email };

  const [summary, orders, lastOrder, messages] = await Promise.all([
    Order.aggregate([
      { $match: byCustomer },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          sales: { $sum: { $cond: [{ $in: ["$status", NOT_A_SALE] }, 0, 1] } },
          spent: { $sum: { $cond: [{ $in: ["$status", NOT_A_SALE] }, 0, "$totalPrice"] } },
          items: { $sum: { $cond: [{ $in: ["$status", NOT_A_SALE] }, 0, { $sum: "$orderItems.qty" }] } },
          firstOrderAt: { $min: "$createdAt" },
          lastOrderAt: { $max: "$createdAt" },
          optIn: { $max: "$emailOptIn" },
        },
      },
    ]),
    Order.find(byCustomer)
      .sort({ createdAt: -1 })
      .limit(10)
      .select("orderNumber createdAt paymentMethod isPaid status totalPrice orderItems.qty shippingAddress.city")
      .lean(),
    Order.findOne(byCustomer).sort({ createdAt: -1 }).select("-accessToken -stripeSessionId -history -adminNote").lean(),
    ContactMessage.find({ email }).sort({ createdAt: -1 }).limit(5).select("message status createdAt").lean(),
  ]);

  const s = summary[0] || { orders: 0, sales: 0, spent: 0, items: 0 };
  const shipTo = lastOrder?.shippingAddress;
  const lastName = shipTo ? `${shipTo.firstName} ${shipTo.lastName}` : "";
  const defaultAddress = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0] || (shipTo && { ...shipTo, phone: lastOrder.phone });

  res.json({
    key: user ? String(user._id) : req.params.key,
    name: user?.name || lastName || email,
    email,
    phone: lastOrder?.phone || defaultAddress?.phone || "",
    hasAccount: Boolean(user),
    joinedAt: user?.createdAt || null,
    marketing: Boolean(user?.acceptsMarketing || s.optIn),
    stats: {
      orders: s.orders,
      spent: s.spent,
      aov: s.sales ? Math.round(s.spent / s.sales) : 0,
      items: s.items,
      firstOrderAt: s.firstOrderAt || null,
      lastOrderAt: s.lastOrderAt || null,
    },
    address: defaultAddress || null,
    addressCount: user?.addresses?.length || 0,
    lastOrder: lastOrder && {
      _id: lastOrder._id,
      orderNumber: lastOrder.orderNumber,
      createdAt: lastOrder.createdAt,
      status: lastOrder.status,
      isPaid: lastOrder.isPaid,
      paymentMethod: lastOrder.paymentMethod,
      totalPrice: lastOrder.totalPrice,
      orderItems: lastOrder.orderItems.map(({ name, color, size, qty, price, image, handle }) => ({ name, color, size, qty, price, image, handle })),
    },
    orders: orders.map((o) => ({
      _id: o._id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      city: o.shippingAddress?.city || "",
      paymentMethod: o.paymentMethod,
      isPaid: o.isPaid,
      status: o.status,
      totalPrice: o.totalPrice,
      items: o.orderItems.reduce((n, i) => n + i.qty, 0),
    })),
    messages,
  });
};

// Customer link for a message sender (null when they never ordered or signed up).
async function customerKeyFor(email) {
  const user = await User.findOne({ email }).select("_id isAdmin").lean();
  if (user) return user.isAdmin ? null : String(user._id);
  const order = await Order.findOne({ email }).sort({ createdAt: -1 }).select("_id").lean();
  return order ? `g-${order._id}` : null;
}

module.exports = { listCustomers, getCustomer, customerKeyFor };

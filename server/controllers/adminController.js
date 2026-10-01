const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const ContactMessage = require("../models/ContactMessage");

const TZ = "Asia/Karachi"; // day buckets follow the store's local calendar
const RANGES = [7, 30, 90];
const DAY = 24 * 60 * 60 * 1000;

// Orders that count as sales: not cancelled, and not card orders left unpaid.
const SALE = { status: { $nin: ["Cancelled", "Awaiting payment"] } };

// "YYYY-MM-DD" for a date in the store's time zone.
const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

async function totals(from, to) {
  const [row] = await Order.aggregate([
    { $match: { ...SALE, createdAt: { $gte: from, $lt: to } } },
    { $group: { _id: null, sales: { $sum: "$totalPrice" }, orders: { $sum: 1 } } },
  ]);
  const customers = await User.countDocuments({ isAdmin: { $ne: true }, createdAt: { $gte: from, $lt: to } });
  const sales = row?.sales || 0;
  const orders = row?.orders || 0;
  return { sales, orders, aov: orders ? Math.round(sales / orders) : 0, customers };
}

// GET /api/admin/dashboard?range=7|30|90
const getDashboard = async (req, res) => {
  const range = RANGES.includes(Number(req.query.range)) ? Number(req.query.range) : 30;
  const now = new Date();
  // Current period = the last `range` local days including today.
  const todayStart = new Date(`${dayKey(now)}T00:00:00+05:00`);
  const from = new Date(todayStart.getTime() - (range - 1) * DAY);
  const prevFrom = new Date(from.getTime() - range * DAY);

  const [current, previous, daily, statusCounts, recent, top, outOfStock, productCount, newMessages] = await Promise.all([
    totals(from, now),
    totals(prevFrom, from),
    Order.aggregate([
      { $match: { ...SALE, createdAt: { $gte: from } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
          sales: { $sum: "$totalPrice" },
          orders: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.find({}).sort({ createdAt: -1, orderNumber: -1 }).limit(6)
      .select("orderNumber createdAt shippingAddress.firstName shippingAddress.lastName email paymentMethod isPaid status totalPrice orderItems.qty")
      .lean(),
    Order.aggregate([
      { $match: { ...SALE, createdAt: { $gte: from } } },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.handle",
          name: { $first: "$orderItems.name" },
          color: { $first: "$orderItems.color" },
          image: { $first: "$orderItems.image" },
          qty: { $sum: "$orderItems.qty" },
          revenue: { $sum: { $multiply: ["$orderItems.qty", "$orderItems.price"] } },
        },
      },
      { $sort: { qty: -1, revenue: -1 } },
      { $limit: 5 },
    ]),
    Product.countDocuments({ available: false }),
    Product.countDocuments(),
    ContactMessage.countDocuments({ status: "New" }),
  ]);

  // One point per day, zero-filled, oldest first.
  const byDay = Object.fromEntries(daily.map((d) => [d._id, d]));
  const series = Array.from({ length: range }, (_, i) => {
    const date = dayKey(new Date(from.getTime() + i * DAY + 12 * 60 * 60 * 1000));
    return { date, sales: byDay[date]?.sales || 0, orders: byDay[date]?.orders || 0 };
  });

  const status = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));

  res.json({
    range,
    current,
    previous,
    series,
    status,
    toFulfill: status.Pending || 0,
    outOfStock,
    productCount,
    newMessages,
    recent: recent.map((o) => ({
      _id: o._id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      customer: `${o.shippingAddress?.firstName || ""} ${o.shippingAddress?.lastName || ""}`.trim() || o.email,
      items: o.orderItems.reduce((n, i) => n + i.qty, 0),
      paymentMethod: o.paymentMethod,
      isPaid: o.isPaid,
      status: o.status,
      totalPrice: o.totalPrice,
    })),
    topProducts: top.map((t) => ({ handle: t._id, name: t.name, color: t.color, image: t.image, qty: t.qty, revenue: t.revenue })),
  });
};

// GET /api/admin/counts — small badge numbers for the admin sidebar.
const getCounts = async (req, res) => {
  const [toFulfill, newMessages] = await Promise.all([
    Order.countDocuments({ status: "Pending" }),
    ContactMessage.countDocuments({ status: "New" }),
  ]);
  res.json({ toFulfill, newMessages });
};

module.exports = { getDashboard, getCounts };

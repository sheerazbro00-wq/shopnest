// Demo data for the admin panel: ~60 days of realistic orders, a few
// customers and some Contact-page messages, built from the real catalogue. Everything it creates uses the
// @demo.shopnest.test email domain, so it can be removed cleanly.
//
//   npm run demo:orders   -> add demo customers + orders
//   npm run demo:clear    -> remove them again
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Counter = require("../models/Counter");
const ContactMessage = require("../models/ContactMessage");
const { FREE_SHIPPING_MIN, SHIPPING_FEE } = require("../config/shop");

const DOMAIN = "demo.shopnest.test";
const DEMO_EMAIL = new RegExp(`@${DOMAIN.replace(/\./g, "\\.")}$`);
const DAYS = 60;
const DAY = 24 * 60 * 60 * 1000;

// Seeded PRNG so every run produces the same demo data.
let seed = 20260930;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;

const FIRST = ["Ahmed", "Ali", "Hamza", "Usman", "Bilal", "Hassan", "Zain", "Omar", "Saad", "Fahad", "Taimoor", "Danish", "Waqas", "Imran", "Farhan", "Kamran", "Asad", "Junaid", "Shahzaib", "Rehan"];
const LAST = ["Khan", "Malik", "Qureshi", "Sheikh", "Butt", "Chaudhry", "Raza", "Siddiqui", "Mirza", "Abbasi", "Hashmi", "Iqbal", "Javed", "Aslam", "Nawaz"];
const CITIES = [
  ["Lahore", 0.34],
  ["Karachi", 0.28],
  ["Islamabad", 0.14],
  ["Rawalpindi", 0.08],
  ["Faisalabad", 0.06],
  ["Multan", 0.05],
  ["Peshawar", 0.05],
];
const STREETS = ["Main Boulevard", "Canal Road", "Jinnah Avenue", "Shahrah-e-Faisal", "Mall Road", "University Road", "Satellite Town"];

function weightedCity() {
  let r = rand();
  for (const [city, w] of CITIES) if ((r -= w) <= 0) return city;
  return CITIES[0][0];
}

// Busier in recent weeks and on weekends, so the chart has a believable shape.
function ordersForDay(daysAgo, date) {
  const trend = 0.9 + ((DAYS - daysAgo) / DAYS) * 1.1;
  const weekend = [0, 6].includes(date.getDay()) ? 1.4 : 1;
  const expected = trend * weekend;
  return Math.max(0, Math.round(expected + (rand() - 0.5) * 2.2));
}

function statusFor(daysAgo, paymentMethod) {
  if (paymentMethod === "Card" && daysAgo < 20 && chance(0.05)) return "Awaiting payment"; // abandoned card checkout
  if (chance(0.06)) return "Cancelled";
  if (daysAgo >= 10) return chance(0.93) ? "Delivered" : "Shipped";
  if (daysAgo >= 3) return pick(["Shipped", "Shipped", "Delivered", "Pending"]);
  return chance(0.8) ? "Pending" : "Shipped";
}

async function clear() {
  const orders = await Order.deleteMany({ email: DEMO_EMAIL });
  const users = await User.deleteMany({ email: DEMO_EMAIL });
  const messages = await ContactMessage.deleteMany({ email: DEMO_EMAIL });
  // Only rewind order numbering when no real orders are left.
  if ((await Order.countDocuments()) === 0) await Counter.deleteOne({ _id: "order" });
  console.log(`Removed ${orders.deletedCount} demo orders and ${users.deletedCount} demo customers, ${messages.deletedCount} demo messages.`);
}

async function create() {
  if (await Order.exists({ email: DEMO_EMAIL })) {
    console.log("Demo orders already exist — run `npm run demo:clear` first.");
    return;
  }

  const products = await Product.find({ available: true, "variants.available": true }).select("title handle color images price variants").lean();
  if (!products.length) throw new Error("No products found — seed the catalogue first.");
  // A smaller pool so some products clearly sell more than others.
  const pool = Array.from({ length: 45 }, () => pick(products));
  const popular = pool.slice(0, 6);

  // Customers: some sign up during the period (the "new customers" metric).
  const customers = [];
  for (let i = 0; i < 18; i++) {
    const firstName = pick(FIRST);
    const lastName = pick(LAST);
    const user = await User.create({
      firstName,
      lastName,
      email: `${firstName}.${lastName}.${i}@${DOMAIN}`.toLowerCase(),
      password: crypto.randomBytes(12).toString("hex"),
      acceptsMarketing: chance(0.4),
    });
    const joined = new Date(Date.now() - Math.floor(rand() * DAYS * 1.4) * DAY - Math.floor(rand() * DAY));
    await User.collection.updateOne({ _id: user._id }, { $set: { createdAt: joined, updatedAt: joined } });
    customers.push({ ...user.toObject(), createdAt: joined });
  }

  const docs = [];
  for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
    const day = new Date(Date.now() - daysAgo * DAY);
    const count = ordersForDay(daysAgo, day);
    for (let n = 0; n < count; n++) {
      const createdAt = new Date(day);
      createdAt.setHours(9 + Math.floor(rand() * 14), Math.floor(rand() * 60), Math.floor(rand() * 60));
      if (createdAt > new Date()) createdAt.setTime(Date.now() - Math.floor(rand() * 3) * 60 * 60 * 1000);

      // ~45% of orders come from a signed-in customer who had joined by then.
      const eligible = customers.filter((c) => c.createdAt < createdAt);
      const customer = eligible.length && chance(0.45) ? pick(eligible) : null;
      const firstName = customer?.firstName || pick(FIRST);
      const lastName = customer?.lastName || pick(LAST);

      const lines = [];
      const lineCount = chance(0.55) ? 1 : chance(0.7) ? 2 : 3;
      for (let l = 0; l < lineCount; l++) {
        const p = chance(0.35) ? pick(popular) : pick(pool);
        const variant = pick(p.variants.filter((v) => v.available));
        if (lines.some((x) => x.handle === p.handle && x.size === variant.size)) continue;
        lines.push({
          product: p._id,
          handle: p.handle,
          name: p.title,
          color: p.color,
          size: variant.size,
          sku: variant.sku,
          qty: chance(0.85) ? 1 : 2,
          price: p.price,
          image: p.images?.[0],
        });
      }

      const itemsPrice = lines.reduce((s, i) => s + i.qty * i.price, 0);
      const shippingPrice = itemsPrice >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
      const paymentMethod = chance(0.32) ? "Card" : "COD";
      const status = statusFor(daysAgo, paymentMethod);
      const isPaid = (paymentMethod === "Card" && status !== "Awaiting payment") || (paymentMethod === "COD" && status === "Delivered");
      // Fulfilment timestamps, never in the future.
      const cap = (ms) => new Date(Math.min(ms, Date.now() - 30 * 60 * 1000));
      const shippedAt = ["Shipped", "Delivered"].includes(status) ? cap(createdAt.getTime() + (0.4 + rand()) * DAY) : undefined;
      const deliveredAt = status === "Delivered" ? cap(shippedAt.getTime() + (1.5 + rand() * 2) * DAY) : undefined;
      const cancelledAt = status === "Cancelled" ? cap(createdAt.getTime() + (0.1 + rand() * 0.8) * DAY) : undefined;
      const staff = "Admin";
      const history = [{ event: "placed", at: createdAt, by: customer ? customer.name : "Customer" }];
      if (paymentMethod === "Card" && isPaid) history.push({ event: "paid", at: createdAt, by: "Stripe" });
      if (shippedAt) history.push({ event: "shipped", at: shippedAt, by: staff });
      if (deliveredAt) history.push({ event: "delivered", at: deliveredAt, by: staff });
      if (deliveredAt && paymentMethod === "COD") history.push({ event: "paid", at: deliveredAt, by: staff });
      if (cancelledAt) history.push({ event: "cancelled", at: cancelledAt, by: staff });

      docs.push({
        shippedAt,
        cancelledAt,
        history,
        user: customer?._id,
        email: customer?.email || `${firstName}.${lastName}.${docs.length}@${DOMAIN}`.toLowerCase(),
        emailOptIn: customer ? customer.acceptsMarketing : chance(0.2),
        phone: `03${Math.floor(rand() * 5)}${String(Math.floor(rand() * 1e8)).padStart(8, "0")}`,
        orderItems: lines,
        shippingAddress: {
          firstName,
          lastName,
          address: `House ${1 + Math.floor(rand() * 250)}, ${pick(STREETS)}`,
          city: weightedCity(),
          country: "Pakistan",
        },
        paymentMethod,
        itemsPrice,
        shippingPrice,
        totalPrice: itemsPrice + shippingPrice,
        isPaid,
        paidAt: isPaid ? (paymentMethod === "Card" ? createdAt : deliveredAt) : undefined,
        status,
        deliveredAt,
        createdAt,
        updatedAt: deliveredAt && deliveredAt < new Date() ? deliveredAt : createdAt,
      });
    }
  }

  docs.sort((a, b) => a.createdAt - b.createdAt);
  const prepared = [];
  for (const d of docs) {
    const order = new Order({ ...d, orderNumber: await Counter.next("order") });
    await order.validate();
    // Raw insert keeps our historical createdAt (Mongoose would stamp "now").
    prepared.push({ ...order.toObject(), createdAt: d.createdAt, updatedAt: d.updatedAt });
  }
  await Order.collection.insertMany(prepared);

  const messageCount = await createMessages(prepared, customers);

  const sales = prepared.filter((o) => !["Cancelled", "Awaiting payment"].includes(o.status)).reduce((s, o) => s + o.totalPrice, 0);
  console.log(`Created ${customers.length} demo customers and ${prepared.length} demo orders, ${messageCount} messages (sales Rs ${sales.toLocaleString("en-US")}).`);
}

// Contact-page messages. Some come from customers with orders, some from
// guests, some from people who never bought — like a real inbox.
async function createMessages(orders, customers) {
  const withOrders = customers.filter((c) => orders.some((o) => o.email === c.email));
  const guestOrders = orders.filter((o) => !o.user);
  const orderOf = (email) => [...orders].reverse().find((o) => o.email === email);
  const nameOf = (o) => `${o.shippingAddress.firstName} ${o.shippingAddress.lastName}`;
  const stranger = (i) => {
    const first = pick(FIRST);
    const last = pick(LAST);
    return { name: `${first} ${last}`, email: `${first}.${last}.m${i}@${DOMAIN}`.toLowerCase() };
  };

  const templates = [
    (o) => `Hi, I placed order #${o.orderNumber} a few days ago and haven't received a tracking number yet. Can you tell me when it will be shipped?`,
    (o) => `Assalam o Alaikum. The shirt from order #${o.orderNumber} is a little tight on the shoulders. Can I exchange it for one size up? The tags are still on.`,
    () => "Do you deliver to Gilgit and Skardu? And is Cash on Delivery available there or only card payment?",
    (o) => `I cancelled order #${o.orderNumber} which I had paid by card. How many days will the refund take to show in my account?`,
    (o) => `I received the wrong size in order #${o.orderNumber} — I ordered L but the polo inside is M. Please arrange a replacement.`,
    () => "We are looking to order around 60 polo shirts for our office team with our logo. Do you take corporate orders and what would the pricing be?",
    () => "When will the white Oxford shirt be back in XL? It has been sold out for two weeks. Please let me know if I can get notified.",
    () => "What sizes do your loafers run in? I usually wear UK 9 — should I pick EU 43 or 44?",
    () => "Do you have a physical store in Lahore where I can try the trousers before buying? If yes, please share the address and timings.",
    (o) => `It's been 8 days since I ordered (#${o.orderNumber}) and it still hasn't arrived in Karachi. This is really disappointing, please look into it.`,
    (o) => `Just wanted to say thanks — order #${o.orderNumber} arrived in two days and the fabric quality is excellent. Will definitely order again!`,
    () => "Hello, I'm a fashion content creator with 45K followers on Instagram. I'd love to collaborate with ShopNest on a menswear shoot. Who should I contact?",
  ];

  const docs = templates.map((make, i) => {
    let from;
    let order;
    const needsOrder = make.length > 0;
    if (needsOrder && i % 2 === 0 && withOrders.length) {
      const c = pick(withOrders);
      order = orderOf(c.email);
      from = { name: c.name, email: c.email, user: c._id };
    } else if (needsOrder) {
      order = pick(guestOrders);
      from = { name: nameOf(order), email: order.email };
    } else {
      from = stranger(i);
    }
    const daysAgo = Math.max(0, 18 - i * 1.5 + rand());
    const createdAt = new Date(Date.now() - daysAgo * DAY - Math.floor(rand() * 5 * 60 * 60 * 1000));
    const status = daysAgo < 6.5 ? "New" : chance(0.6) ? "Replied" : "Read";
    return { ...from, message: make(order), status, createdAt, updatedAt: createdAt };
  });

  for (const d of docs) await new ContactMessage(d).validate();
  await ContactMessage.collection.insertMany(docs);
  return docs.length;
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => (process.argv.includes("--clear") ? clear() : create()))
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

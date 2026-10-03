const crypto = require("crypto");
const mongoose = require("mongoose");
const Stripe = require("stripe");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Counter = require("../models/Counter");
const { CURRENCY, FREE_SHIPPING_MIN, SHIPPING_FEE, MAX_QTY, MAX_LINES } = require("../config/shop");
const { clientUrl } = require("../config/client");
const { notifyOrderConfirmed } = require("../services/orderNotifications");

// Card payments switch on only when a real-looking key is configured, so the
// store still works (Cash on Delivery) with the placeholder key.
const stripeKey = process.env.STRIPE_SECRET_KEY || "";
const cardEnabled = /^sk_(test|live)_[A-Za-z0-9]{20,}$/.test(stripeKey);
const stripe = cardEnabled ? Stripe(stripeKey) : null;

const httpError = (status, message) => Object.assign(new Error(message), { status });
const shippingFor = (itemsPrice) => (itemsPrice >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE);
const clean = (v, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Never trust prices from the browser: re-read every line from the database.
async function priceItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw httpError(400, "Your cart is empty");
  if (items.length > MAX_LINES) throw httpError(400, "Too many items in cart");

  const ids = items.map((i) => i.productId).filter((id) => mongoose.isValidObjectId(id));
  const products = await Product.find({ ...Product.LIVE, _id: { $in: ids } }).lean(); // drafts can't be bought
  const byId = Object.fromEntries(products.map((p) => [String(p._id), p]));

  return items.map((i) => {
    const p = byId[i.productId];
    if (!p) throw httpError(409, "An item in your cart is no longer available");
    const variant = p.variants.find((v) => v.size === i.size);
    if (!variant || !variant.available) throw httpError(409, `${p.title} (${i.size}) is sold out`);
    const qty = Number(i.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw httpError(400, "Invalid quantity");

    return {
      product: p._id,
      handle: p.handle,
      name: p.title,
      color: p.color,
      size: variant.size,
      sku: variant.sku,
      qty,
      price: variant.price,
      image: p.images?.[0],
    };
  });
}

function readCustomer(body) {
  const email = clean(body.email, 254).toLowerCase();
  const phone = clean(body.phone, 20).replace(/[\s-]/g, "");
  const a = body.shippingAddress || {};
  const shippingAddress = {
    firstName: clean(a.firstName, 60),
    lastName: clean(a.lastName, 60),
    address: clean(a.address, 200),
    apartment: clean(a.apartment, 100),
    city: clean(a.city, 60),
    postalCode: clean(a.postalCode, 10),
    country: "Pakistan",
  };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, "Enter a valid email");
  if (!/^(\+92|0)?3\d{9}$/.test(phone)) throw httpError(400, "Enter a valid mobile number, e.g. 03001234567");
  for (const field of ["firstName", "lastName", "address", "city"]) {
    if (!shippingAddress[field]) throw httpError(400, "Please complete your shipping address");
  }
  return { email, phone, shippingAddress, emailOptIn: Boolean(body.emailOptIn) };
}

// Marks a card order paid once Stripe confirms it. Used by both the webhook
// and the thank-you page, so it must be idempotent.
async function applyStripeSession(order, session) {
  if (order.isPaid) {
    // Already marked paid by the other trigger. Its emails are claimed, so this is
    // a no-op — unless that send failed, in which case this is the retry (R-1, R-2).
    await notifyOrderConfirmed(order);
    return order;
  }
  if (session.payment_status !== "paid") return order;
  if (session.amount_total !== Math.round(order.totalPrice * 100)) {
    console.error(`Amount mismatch on order ${order.orderNumber}`);
    return order;
  }
  order.isPaid = true;
  order.paidAt = new Date();
  order.status = "Pending";
  order.$locals.actor = "Stripe";
  order.paymentResult = {
    id: String(session.payment_intent || session.id),
    status: session.payment_status,
    email: session.customer_details?.email,
  };
  await order.save();
  await notifyOrderConfirmed(order); // receipt + owner alert, once (spec 001, US-3)
  return order;
}

const publicOrder = (order) => {
  const o = order.toObject();
  delete o.accessToken;
  delete o.stripeSessionId;
  return o;
};

// GET /api/orders/config
const getCheckoutConfig = (req, res) => {
  res.json({ cardEnabled, freeShippingMin: FREE_SHIPPING_MIN, shippingFee: SHIPPING_FEE, maxQty: MAX_QTY });
};

// POST /api/orders/checkout  (guest or signed in)
const checkout = async (req, res) => {
  const paymentMethod = req.body.paymentMethod === "Card" ? "Card" : "COD";
  if (paymentMethod === "Card" && !cardEnabled) throw httpError(400, "Card payments are not available right now");

  const customer = readCustomer(req.body);
  const orderItems = await priceItems(req.body.items);
  const itemsPrice = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingPrice = shippingFor(itemsPrice);

  const order = await Order.create({
    ...customer,
    orderNumber: await Counter.next("order"),
    user: req.user?._id,
    orderItems,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    totalPrice: itemsPrice + shippingPrice,
    status: paymentMethod === "Card" ? "Awaiting payment" : "Pending",
  });
  const { accessToken } = await Order.findById(order._id).select("+accessToken").lean();
  const result = { orderId: order._id, token: accessToken };

  // Confirmed orders (COD) get their emails now; card orders wait for payment.
  await notifyOrderConfirmed(order);
  if (paymentMethod === "COD") return res.status(201).json(result);

  // Card: hand off to Stripe's hosted Checkout page (card data never touches our server).
  const client = clientUrl;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customer.email,
      client_reference_id: String(order._id),
      metadata: { orderId: String(order._id), orderNumber: String(order.orderNumber) },
      line_items: orderItems.map((i) => ({
        quantity: i.qty,
        price_data: {
          currency: CURRENCY,
          unit_amount: Math.round(i.price * 100),
          product_data: {
            name: i.name,
            description: [i.color, i.size].filter(Boolean).join(" / ") || undefined,
            images: i.image ? [i.image] : undefined,
          },
        },
      })),
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: shippingPrice ? "Standard Shipping" : "Free Shipping",
            fixed_amount: { amount: Math.round(shippingPrice * 100), currency: CURRENCY },
          },
        },
      ],
      success_url: `${client}/checkout/thank-you/${order._id}?token=${accessToken}`,
      cancel_url: `${client}/checkout?canceled=1`,
    });
    order.stripeSessionId = session.id;
    await order.save();
    res.status(201).json({ ...result, url: session.url });
  } catch (err) {
    console.error("Stripe session error:", err.message);
    order.status = "Cancelled";
    order.$locals.actor = "System";
    await order.save();
    throw httpError(502, "Could not start card payment. Please try again or choose Cash on Delivery.");
  }
};

// GET /api/orders/:id?token=  — order status page (owner, admin, or anyone with the link token)
const getOrder = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, "Order not found");
  let order = await Order.findById(req.params.id).select("+accessToken +stripeSessionId");
  if (!order) throw httpError(404, "Order not found");

  const token = String(req.query.token || "");
  const tokenOk =
    token.length === order.accessToken.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(order.accessToken));
  const ownerOk = req.user && (req.user.isAdmin || String(order.user) === String(req.user._id));
  if (!tokenOk && !ownerOk) throw httpError(404, "Order not found");

  // Returning from Stripe: confirm payment directly with Stripe (works without webhooks locally).
  if (order.paymentMethod === "Card" && !order.isPaid && order.stripeSessionId && stripe) {
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    order = await applyStripeSession(order, session);
  }
  res.json(publicOrder(order));
};

// POST /api/orders/webhook — Stripe calls this; body must be the raw bytes for signature checks.
const stripeWebhook = async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return res.status(503).send("Webhook not configured");

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], secret);
  } catch (err) {
    return res.status(400).send(`Webhook signature error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const order = await Order.findById(session.metadata?.orderId);
    if (order) await applyStripeSession(order, session);
  }
  res.json({ received: true });
};

// GET /api/orders/mine
// Card checkouts that were never paid are abandoned carts, not orders — hide them.
const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id, $nor: [{ paymentMethod: "Card", isPaid: false }] })
    .select("-stripeSessionId -paymentResult")
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(orders);
};

// Admin order management lives in adminOrderController (/api/admin/orders).
module.exports = {
  getCheckoutConfig,
  checkout,
  getOrder,
  stripeWebhook,
  getMyOrders,
};

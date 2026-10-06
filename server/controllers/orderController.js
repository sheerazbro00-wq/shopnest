const crypto = require("crypto");
const mongoose = require("mongoose");
const Stripe = require("stripe");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Counter = require("../models/Counter");
const { CURRENCY, FREE_SHIPPING_MIN, SHIPPING_FEE, MAX_QTY, MAX_LINES } = require("../config/shop");
const { clientUrl } = require("../config/client");
const { notifyOrderConfirmed } = require("../services/orderNotifications");
const paypalConfig = require("../config/paypal");
const paypal = require("../services/payments/paypal");
const { markPaid } = require("../services/payments/markPaid");

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

// Paid online at checkout (card, PayPal): unpaid ones are abandoned checkouts, not orders.
const ONLINE_METHODS = ["Card", "PayPal"];
const METHODS = ["COD", ...ONLINE_METHODS];

// GET /api/orders/config
// PayPal reports only enabled + rate, never its mode: checkout looks the same in every mode (spec 004 AC-1.5).
const getCheckoutConfig = async (req, res) => {
  res.json({
    cardEnabled,
    paypal: { enabled: await paypalConfig.isReady(), rate: paypalConfig.rate },
    freeShippingMin: FREE_SHIPPING_MIN,
    shippingFee: SHIPPING_FEE,
    maxQty: MAX_QTY,
  });
};

// Returning from real PayPal: take the money and check it (spec 004 AC-2.3, R-1).
// Simulated orders are only paid through simulatePayPal (R-3).
async function confirmPayPal(order) {
  const p = order.paypal || {};
  if (order.isPaid || order.status !== "Awaiting payment" || !p.orderId) return order;
  if (p.mode === "simulated" || p.mode !== paypalConfig.mode || !(await paypalConfig.isReady())) return order;
  try {
    const result = await paypal.confirmPayment(order);
    if (!result.paid) return order;
    const { order: paid } = await markPaid(order._id, {
      by: "PayPal",
      paymentResult: { id: result.captureId, status: "COMPLETED", email: result.payerEmail },
      set: { "paypal.captureId": result.captureId },
    });
    return paid;
  } catch (err) {
    console.error(`[paypal] confirm failed for order #${order.orderNumber}: ${err.message}`);
    return order;
  }
}

// POST /api/orders/checkout  (guest or signed in)
const checkout = async (req, res) => {
  const paymentMethod = METHODS.includes(req.body.paymentMethod) ? req.body.paymentMethod : "COD";
  if (paymentMethod === "Card" && !cardEnabled) throw httpError(400, "Card payments are not available right now");
  if (paymentMethod === "PayPal" && !(await paypalConfig.isReady())) throw httpError(400, "PayPal is not available right now");

  const customer = readCustomer(req.body);
  const orderItems = await priceItems(req.body.items);
  const itemsPrice = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingPrice = shippingFor(itemsPrice);
  const totalPrice = itemsPrice + shippingPrice;

  const order = await Order.create({
    ...customer,
    orderNumber: await Counter.next("order"),
    user: req.user?._id,
    orderItems,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    totalPrice,
    status: paymentMethod === "COD" ? "Pending" : "Awaiting payment",
    // The dollar amount is fixed here, on the server, and is what PayPal must confirm (R-1).
    ...(paymentMethod === "PayPal" && {
      paypal: { mode: paypalConfig.mode, rate: paypalConfig.rate, usd: paypal.toUsd(totalPrice) },
    }),
  });
  const { accessToken } = await Order.findById(order._id).select("+accessToken").lean();
  const result = { orderId: order._id, token: accessToken };

  // Confirmed orders (COD) get their emails now; online payments wait to be paid.
  await notifyOrderConfirmed(order);
  if (paymentMethod === "COD") return res.status(201).json(result);

  if (paymentMethod === "PayPal") {
    try {
      const { id, approveUrl } = await paypal.createPayment(order, accessToken);
      order.paypal.orderId = id;
      await order.save();
      return res.status(201).json({ ...result, url: approveUrl });
    } catch (err) {
      console.error(`[paypal] create failed for order #${order.orderNumber}: ${err.message}`);
      order.status = "Cancelled";
      order.$locals.actor = "System";
      await order.save();
      throw httpError(502, "Could not start PayPal payment. Please try again or choose another payment method.");
    }
  }

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
  if (order.paymentMethod === "PayPal") order = await confirmPayPal(order);
  res.json(publicOrder(order));
};

// POST /api/orders/:id/paypal/simulate  { token }
// The "Pay now" button of the test approval page. Works only in simulated mode, for an
// order placed in simulated mode, with that order's link token (spec 004 R-3).
const simulatePayPal = async (req, res) => {
  const notFound = () => httpError(404, "Order not found");
  if (paypalConfig.mode !== "simulated" || !mongoose.isValidObjectId(req.params.id)) throw notFound();
  const order = await Order.findById(req.params.id).select("+accessToken");
  if (!order || order.paymentMethod !== "PayPal" || order.paypal?.mode !== "simulated") throw notFound();
  const token = String(req.body?.token || "");
  const tokenOk = token.length === order.accessToken.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(order.accessToken));
  if (!tokenOk) throw notFound();
  if (order.isPaid) return res.json({ paid: true });
  if (order.status !== "Awaiting payment") throw httpError(409, "This order can no longer be paid");

  await markPaid(order._id, {
    by: "PayPal (test)",
    paymentResult: { id: order.paypal.orderId, status: "COMPLETED (test)" },
    set: { "paypal.captureId": order.paypal.orderId },
  });
  res.json({ paid: true });
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
// Online checkouts that were never paid are abandoned carts, not orders — hide them.
const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id, $nor: [{ paymentMethod: { $in: ONLINE_METHODS }, isPaid: false }] })
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
  simulatePayPal,
  getMyOrders,
};

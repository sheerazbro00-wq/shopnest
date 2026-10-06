const crypto = require("crypto");
const paypal = require("../../config/paypal");
const { clientUrl } = require("../../config/client");

// PayPal Orders v2 over plain fetch (plan 004 §5). Two steps, like Stripe:
//   createPayment  — at checkout: where to send the shopper to approve
//   confirmPayment — when they come back: take the money, check the amount (R-1)

// Rs → USD with 2 decimals, as the exact string PayPal expects (plan §3).
const toUsd = (rupees, rate = paypal.rate) => (Math.round((rupees / rate) * 100) / 100).toFixed(2);

const returnUrl = (order, token) => `${clientUrl}/checkout/paypal-return/${order._id}?t=${token}`;
const cancelUrl = () => `${clientUrl}/checkout?canceled=paypal`;

async function api(path, { method = "GET", body, requestId } = {}) {
  const res = await fetch(`${paypal.apiBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await paypal.getAccessToken()}`,
      "Content-Type": "application/json",
      // Same id on a retry → PayPal returns the first result instead of acting twice.
      ...(requestId && { "PayPal-Request-Id": requestId }),
    },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`PayPal ${method} ${path.split("/").slice(0, 4).join("/")} → ${res.status} ${data.name || ""}`), { status: res.status, data });
  return data;
}

// → { id, approveUrl }
async function createPayment(order, accessToken) {
  if (paypal.mode === "simulated") {
    return {
      id: `SIM-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
      approveUrl: `${clientUrl}/checkout/paypal-test/${order._id}?t=${accessToken}`,
    };
  }
  const data = await api("/v2/checkout/orders", {
    method: "POST",
    requestId: `create-${order._id}`,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: String(order._id),
          custom_id: String(order.orderNumber),
          description: `ShopNest order #${order.orderNumber}`,
          amount: { currency_code: "USD", value: order.paypal.usd },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "ShopNest",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url: returnUrl(order, accessToken),
            cancel_url: cancelUrl(),
          },
        },
      },
    },
  });
  const approveUrl = data.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
  if (!data.id || !approveUrl) throw new Error("PayPal create order: no approval link");
  return { id: data.id, approveUrl };
}

const captureOf = (data) => data.purchase_units?.[0]?.payments?.captures?.[0];

// Real PayPal only. → { paid, captureId?, reason? }. Safe to call repeatedly.
async function confirmPayment(order) {
  let data = await api(`/v2/checkout/orders/${order.paypal.orderId}`);
  if (data.status === "APPROVED") {
    try {
      data = await api(`/v2/checkout/orders/${order.paypal.orderId}/capture`, {
        method: "POST",
        requestId: `capture-${order._id}`,
        body: {},
      });
    } catch (err) {
      // Captured meanwhile by a parallel request: read the result instead of failing.
      if (err.status !== 422 || !JSON.stringify(err.data || {}).includes("ORDER_ALREADY_CAPTURED")) throw err;
      data = await api(`/v2/checkout/orders/${order.paypal.orderId}`);
    }
  }
  if (data.status !== "COMPLETED") return { paid: false, reason: `order ${data.status}` };

  const capture = captureOf(data);
  if (!capture || capture.status !== "COMPLETED") return { paid: false, reason: `capture ${capture?.status || "missing"}` };
  if (capture.amount?.currency_code !== "USD" || capture.amount?.value !== order.paypal.usd) {
    console.error(`[paypal] amount mismatch on order #${order.orderNumber}: got ${capture.amount?.currency_code} ${capture.amount?.value}`);
    return { paid: false, reason: "amount mismatch" };
  }
  return { paid: true, captureId: capture.id, payerEmail: data.payment_source?.paypal?.email_address };
}

module.exports = { toUsd, createPayment, confirmPayment };

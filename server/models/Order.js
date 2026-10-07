const crypto = require("crypto");
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Product" },
    handle: String,
    name: { type: String, required: true },
    color: String,
    size: String,
    sku: String,
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }, // unit price from the DB at order time
    unitCharge: Number, // the same unit price in the charge currency, minor units (spec 008)
    image: String,
  },
  { _id: false }
);

// What the payment provider charges (spec 008 plan §2). Amounts are integers in minor
// units (cents/pence/paisa) and the rate is locked when the order is placed (R-1).
const chargeSchema = new mongoose.Schema(
  {
    currency: { type: String, enum: ["PKR", "USD", "GBP"], required: true },
    rate: { type: Number, required: true }, // rupees per unit (1 for PKR)
    items: { type: Number, required: true },
    shipping: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: Number, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // empty for guest checkout
    // Guests view their order via /checkout/thank-you/:id?token= (like Shopify's order status URL)
    accessToken: { type: String, default: () => crypto.randomBytes(16).toString("hex"), select: false },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    emailOptIn: { type: Boolean, default: false },
    orderItems: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    shippingAddress: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      address: { type: String, required: true },
      apartment: String,
      city: { type: String, required: true },
      state: String, // US state code / UK county (spec 008)
      postalCode: String,
      country: { type: String, default: "Pakistan" },
      countryCode: { type: String, enum: ["PK", "US", "GB"], default: "PK" },
    },
    paymentMethod: { type: String, enum: ["COD", "Card", "PayPal"], required: true },
    stripeSessionId: String,
    // PayPal charges in USD (spec 004 R-1): the exact amount and rate are fixed at checkout.
    paypal: {
      mode: { type: String, enum: ["simulated", "sandbox", "live"] },
      usd: String, // "21.25" — the exact value sent to PayPal
      rate: Number, // Rs per USD used
      orderId: String, // PayPal's order id (SIM-… in simulated mode)
      captureId: String, // PayPal's transaction id
    },
    paymentResult: { id: String, status: String, email: String },
    // Receipt currency. Differs from charge.currency only for Pakistan + PayPal (PayPal has no PKR).
    currency: { type: String, enum: ["PKR", "USD", "GBP"], default: "PKR" },
    charge: { type: chargeSchema, default: undefined }, // absent on orders before spec 008 (R-7)
    // Rupee prices stay the source of truth for revenue and reports (R-5).
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    status: {
      type: String,
      enum: ["Awaiting payment", "Pending", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    adminNote: { type: String, maxlength: 1000, default: "" }, // staff-only, never shown to customers
    // Timeline for the admin order page. Filled in automatically by the hook below.
    history: [
      {
        _id: false,
        event: { type: String, enum: ["placed", "paid", "shipped", "delivered", "cancelled"], required: true },
        at: { type: Date, default: Date.now },
        by: String, // staff name, or "Stripe" / "Customer"
      },
    ],
    // When each confirmation email was claimed (spec 001, R-1). null = not sent yet.
    notifications: {
      confirmation: { type: Date, default: null }, // customer receipt
      ownerAlert: { type: Date, default: null }, // new-order alert to the store
    },
  },
  { timestamps: true }
);

const STATUS_EVENT = { Shipped: "shipped", Delivered: "delivered", Cancelled: "cancelled" };

// Record what changed on every save. Callers can set order.$locals.actor to
// say who did it (defaults to the customer for new orders).
orderSchema.pre("save", function () {
  const by = this.$locals.actor;
  if (this.isNew) {
    this.history.push({ event: "placed", at: this.createdAt || new Date(), by: by || "Customer" });
    if (this.isPaid) this.history.push({ event: "paid", at: this.paidAt || new Date(), by });
    return;
  }
  if (this.isModified("status") && STATUS_EVENT[this.status]) this.history.push({ event: STATUS_EVENT[this.status], by });
  if (this.isModified("isPaid") && this.isPaid) this.history.push({ event: "paid", at: this.paidAt || new Date(), by });
});

module.exports = mongoose.model("Order", orderSchema);

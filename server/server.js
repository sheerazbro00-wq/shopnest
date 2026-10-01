require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { clientOrigins } = require("./config/client");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const accountRoutes = require("./routes/accountRoutes");
const contactRoutes = require("./routes/contactRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { stripeWebhook } = require("./controllers/orderController");

connectDB();

const app = express();

// Render (and most hosts) sit behind one reverse proxy; trusting it makes
// req.ip the visitor's address, which the rate limiters key on.
app.set("trust proxy", 1);

// Browsers may only call the API from our own storefront (CLIENT_URL).
// When it's unset (local dev) every origin is allowed.
app.use(cors(clientOrigins.length ? { origin: clientOrigins } : undefined));
// Stripe signs the exact bytes it sends, so this route must skip JSON parsing.
app.post("/api/orders/webhook", express.raw({ type: "application/json" }), stripeWebhook);
app.use(express.json({ limit: "100kb" }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => res.send("ShopNest API is running"));

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err.stack); // 4xx are expected user errors
  // Errors we raised on purpose (httpError sets .status) carry a user-facing message;
  // anything unexpected gets a generic one so internals never leak.
  res.status(status).json({
    message: err.status ? err.message : "Server error",
    ...(err.status && err.errors ? { errors: err.errors } : {}),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

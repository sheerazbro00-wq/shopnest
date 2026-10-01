const express = require("express");
const { getCheckoutConfig, checkout, getOrder, getMyOrders } = require("../controllers/orderController");
const { protect, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// POST /webhook is mounted in server.js (it needs the raw request body).
// Admin order management is under /api/admin/orders.
router.get("/config", getCheckoutConfig);
router.post("/checkout", optionalAuth, checkout);
router.get("/mine", protect, getMyOrders);
router.get("/:id", optionalAuth, getOrder);

module.exports = router;

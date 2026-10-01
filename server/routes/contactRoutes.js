const express = require("express");
const rateLimit = require("express-rate-limit");
const { sendMessage } = require("../controllers/contactController");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

// Anti-spam: at most 5 messages per IP per hour (rejected forms don't count).
const sendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  skipFailedRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "You've sent several messages already. Please try again later." },
});

router.post("/", sendLimiter, optionalAuth, sendMessage);
// Reading and answering messages lives under /api/admin/messages.

module.exports = router;

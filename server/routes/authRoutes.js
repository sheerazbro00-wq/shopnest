const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  registerUser,
  loginUser,
  getProfile,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Slows password guessing: each route gets its own budget of 10 failed
// attempts per IP per 15 minutes (successful requests don't count).
const limiter = () =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many attempts. Please wait a few minutes and try again." },
  });

router.post("/register", limiter(), registerUser);
router.post("/login", limiter(), loginUser);
router.post("/forgot-password", limiter(), forgotPassword);
router.post("/reset-password", limiter(), resetPassword);
router.get("/profile", protect, getProfile);

module.exports = router;

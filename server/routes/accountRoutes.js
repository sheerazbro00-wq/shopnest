const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  getAccount,
  updateAccount,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
} = require("../controllers/accountController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Everything here belongs to the signed-in customer.
router.use(protect);

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
});

router.get("/", getAccount);
router.patch("/", updateAccount);
router.put("/password", passwordLimiter, changePassword);
router.post("/addresses", addAddress);
router.put("/addresses/:addressId", updateAddress);
router.delete("/addresses/:addressId", deleteAddress);

module.exports = router;

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    // A valid signature isn't enough: the account may have been deleted since.
    if (!req.user) return res.status(401).json({ message: "Not authorized, account not found" });
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, invalid token" });
  }
};

// Guest checkout: attach req.user when a valid token is sent, never reject.
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
    } catch {
      /* expired/invalid token — continue as guest */
    }
  }
  next();
};

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Not authorized as admin" });
};

module.exports = { protect, optionalAuth, admin };

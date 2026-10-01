const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { clientUrl } = require("../config/client");

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

const httpError = (status, message) => Object.assign(new Error(message), { status });

// Coerce to string: stops NoSQL injection like { "email": { "$ne": null } }.
const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const MIN_PASSWORD = 8;

const authResponse = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  name: user.name,
  email: user.email,
  isAdmin: user.isAdmin,
  token: generateToken(user._id),
});

// POST /api/auth/register
const registerUser = async (req, res) => {
  const firstName = str(req.body.firstName, 60);
  const lastName = str(req.body.lastName, 60);
  const email = str(req.body.email, 254).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!firstName) throw httpError(400, "Enter your first name");
  if (!isEmail(email)) throw httpError(400, "Enter a valid email");
  if (password.length < MIN_PASSWORD) throw httpError(400, `Password must be at least ${MIN_PASSWORD} characters`);
  if (password.length > 128) throw httpError(400, "Password is too long");

  if (await User.exists({ email })) {
    throw httpError(409, "An account with this email already exists. Sign in instead.");
  }

  const acceptsMarketing = req.body.acceptsMarketing === true;
  const user = await User.create({ firstName, lastName, email, password, acceptsMarketing });
  res.status(201).json(authResponse(user));
};

// POST /api/auth/login
const loginUser = async (req, res) => {
  const email = str(req.body.email, 254).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";

  const user = email && (await User.findOne({ email }).select("+password"));
  // Same message whether the email or the password is wrong, so emails can't be probed.
  if (!user || !(await user.matchPassword(password))) throw httpError(401, "Incorrect email or password");

  res.json(authResponse(user));
};

// GET /api/auth/profile
const getProfile = async (req, res) => {
  res.json(req.user);
};

// POST /api/auth/forgot-password  — always answers the same, so it can't reveal who has an account.
const forgotPassword = async (req, res) => {
  const email = str(req.body.email, 254).toLowerCase();
  if (!isEmail(email)) throw httpError(400, "Enter a valid email");

  const user = await User.findOne({ email });
  if (user) {
    const token = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    const link = `${clientUrl}/account/reset-password?token=${token}`;
    // TODO(email): send `link` with an email service (Resend / Gmail SMTP) before going live.
    if (process.env.NODE_ENV !== "production") console.log(`[dev] Password reset link for ${email}: ${link}`);
  }

  res.json({ message: "If an account exists for this email, we've sent a link to reset your password." });
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  const token = str(req.body.token, 100);
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (password.length < MIN_PASSWORD) throw httpError(400, `Password must be at least ${MIN_PASSWORD} characters`);

  const user = token
    ? await User.findOne({
        resetPasswordHash: User.hashToken(token),
        resetPasswordExpires: { $gt: new Date() },
      })
    : null;
  if (!user) throw httpError(400, "This reset link is invalid or has expired. Please request a new one.");

  user.password = password;
  user.resetPasswordHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  res.json(authResponse(user));
};

module.exports = { registerUser, loginUser, getProfile, forgotPassword, resetPassword };

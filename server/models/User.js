const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const addressSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  apartment: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  postalCode: { type: String, trim: true },
  country: { type: String, default: "Pakistan" },
  phone: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    name: { type: String, required: true, trim: true }, // "First Last", kept for display
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select:false — the hash is only loaded where it is needed (login, password change)
    password: { type: String, required: true, minlength: 8, select: false },
    isAdmin: { type: Boolean, default: false },
    acceptsMarketing: { type: Boolean, default: false },
    addresses: { type: [addressSchema], default: [] },
    // Only a SHA-256 of the reset token is stored, so a DB leak can't be used to reset passwords.
    resetPasswordHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre("validate", function () {
  if (this.firstName || this.lastName) this.name = [this.firstName, this.lastName].filter(Boolean).join(" ");
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(String(enteredPassword), this.password);
};

userSchema.statics.hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Returns the plain token (sent to the user); only its hash is saved.
userSchema.methods.createPasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.resetPasswordHash = this.constructor.hashToken(token);
  this.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  return token;
};

module.exports = mongoose.model("User", userSchema);

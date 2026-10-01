const User = require("../models/User");
const { httpError, clean, readAddress } = require("../utils/validation");

const MAX_ADDRESSES = 10;
const MIN_PASSWORD = 8;

const accountJson = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  name: user.name,
  email: user.email,
  acceptsMarketing: user.acceptsMarketing,
  addresses: user.addresses,
  createdAt: user.createdAt,
});

// Keeps exactly one default address (when any exist).
function ensureOneDefault(user, preferId) {
  if (!user.addresses.length) return;
  const target = user.addresses.id(preferId) || user.addresses.find((a) => a.isDefault) || user.addresses[0];
  user.addresses.forEach((a) => (a.isDefault = a._id.equals(target._id)));
}

// GET /api/account
const getAccount = async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json(accountJson(user));
};

// PATCH /api/account  { firstName, lastName, acceptsMarketing }
const updateAccount = async (req, res) => {
  const user = await User.findById(req.user._id);
  if ("firstName" in req.body) {
    const firstName = clean(req.body.firstName, 60);
    if (!firstName) throw httpError(400, "Enter your first name");
    user.firstName = firstName;
  }
  if ("lastName" in req.body) user.lastName = clean(req.body.lastName, 60);
  if ("acceptsMarketing" in req.body) user.acceptsMarketing = req.body.acceptsMarketing === true;
  await user.save();
  res.json(accountJson(user));
};

// PUT /api/account/password  { currentPassword, newPassword }
const changePassword = async (req, res) => {
  const current = typeof req.body.currentPassword === "string" ? req.body.currentPassword : "";
  const next = typeof req.body.newPassword === "string" ? req.body.newPassword : "";
  if (next.length < MIN_PASSWORD) throw httpError(400, `New password must be at least ${MIN_PASSWORD} characters`);

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.matchPassword(current))) throw httpError(400, "Current password is incorrect");
  if (await user.matchPassword(next)) throw httpError(400, "New password must be different from the current one");

  user.password = next;
  await user.save();
  res.json({ message: "Password updated" });
};

// POST /api/account/addresses
const addAddress = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.addresses.length >= MAX_ADDRESSES) throw httpError(400, `You can save up to ${MAX_ADDRESSES} addresses`);
  user.addresses.push(readAddress(req.body));
  const added = user.addresses[user.addresses.length - 1];
  ensureOneDefault(user, req.body.isDefault === true || user.addresses.length === 1 ? added._id : undefined);
  await user.save();
  res.status(201).json(accountJson(user));
};

// PUT /api/account/addresses/:addressId
const updateAddress = async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw httpError(404, "Address not found");
  address.set(readAddress(req.body));
  ensureOneDefault(user, req.body.isDefault === true ? address._id : undefined);
  await user.save();
  res.json(accountJson(user));
};

// DELETE /api/account/addresses/:addressId
const deleteAddress = async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw httpError(404, "Address not found");
  address.deleteOne();
  ensureOneDefault(user);
  await user.save();
  res.json(accountJson(user));
};

module.exports = { getAccount, updateAccount, changePassword, addAddress, updateAddress, deleteAddress };

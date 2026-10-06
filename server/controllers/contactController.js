const ContactMessage = require("../models/ContactMessage");
const { clean, isEmail } = require("../utils/validation");
const { notifyContactMessage } = require("../services/contactNotifications");

const MIN_MESSAGE = 10;

// POST /api/contact — public. `website` is a honeypot: the field is hidden from
// people, so only bots fill it in. They get the normal success reply (so they
// don't learn to skip it) but nothing is saved.
const sendMessage = async (req, res) => {
  const body = req.body || {};
  if (clean(body.website)) return res.status(201).json({ message: "Thanks for contacting us." });

  const name = clean(body.name, 100);
  const email = clean(body.email, 254).toLowerCase();
  const message = clean(body.message, 5000);

  const errors = {};
  if (!name) errors.name = "Enter your name";
  if (!email) errors.email = "Enter your email";
  else if (!isEmail(email)) errors.email = "Enter a valid email";
  if (!message) errors.message = "Enter a message";
  else if (message.length < MIN_MESSAGE) errors.message = `Message should be at least ${MIN_MESSAGE} characters`;
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: "Please check the highlighted fields", errors });
  }

  const saved = await ContactMessage.create({ name, email, message, user: req.user?._id });
  await notifyContactMessage(saved); // owner alert + "we've received it" (spec 006); never throws
  res.status(201).json({ message: "Thanks for contacting us." });
};

module.exports = { sendMessage };

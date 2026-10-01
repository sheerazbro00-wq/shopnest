const mongoose = require("mongoose");
const ContactMessage = require("../models/ContactMessage");
const { httpError, clean } = require("../utils/validation");
const { customerKeyFor } = require("./adminCustomerController");

const STATUSES = ["New", "Read", "Replied"];
const PAGE_SIZE = 25;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function searchFilter(q) {
  const text = clean(q, 80);
  if (!text) return {};
  return {
    $and: text
      .split(/\s+/)
      .slice(0, 4)
      .map((w) => {
        const rx = { $regex: escapeRegex(w), $options: "i" };
        return { $or: [{ name: rx }, { email: rx }, { message: rx }] };
      }),
  };
}

// GET /api/admin/messages?status=&q=&page=
const listMessages = async (req, res) => {
  const base = searchFilter(req.query.q);
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  const filter = status ? { ...base, status } : base;
  const page = Math.max(1, parseInt(req.query.page) || 1);

  const [messages, total, counts] = await Promise.all([
    ContactMessage.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .select("name email message status createdAt")
      .lean(),
    ContactMessage.countDocuments(filter),
    ContactMessage.aggregate([{ $match: base }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);

  const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  res.json({
    // The list only needs a preview; the full text comes with GET /:id.
    messages: messages.map(({ message, ...m }) => ({ ...m, preview: message.replace(/\s+/g, " ").slice(0, 160) })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    pageSize: PAGE_SIZE,
    counts: { All: Object.values(byStatus).reduce((a, b) => a + b, 0), ...byStatus },
  });
};

async function loadMessage(id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, "Message not found");
  const msg = await ContactMessage.findById(id);
  if (!msg) throw httpError(404, "Message not found");
  return msg;
}

async function adminView(msg) {
  const m = msg.toObject();
  const [customerKey, earlier] = await Promise.all([
    customerKeyFor(m.email),
    ContactMessage.countDocuments({ email: m.email, _id: { $ne: m._id } }),
  ]);
  return { ...m, customerKey, otherMessages: earlier };
}

// GET /api/admin/messages/:id — read-only. Opening a message doesn't change it;
// the client marks it as read with a PATCH (GET requests must stay safe).
const getMessage = async (req, res) => {
  res.json(await adminView(await loadMessage(req.params.id)));
};

// PATCH /api/admin/messages/:id  { status }
const updateMessage = async (req, res) => {
  const status = clean(req.body?.status, 20);
  if (!STATUSES.includes(status)) throw httpError(400, "Invalid status");
  const msg = await loadMessage(req.params.id);
  msg.status = status;
  await msg.save();
  res.json(await adminView(msg));
};

// DELETE /api/admin/messages/:id
const deleteMessage = async (req, res) => {
  const msg = await loadMessage(req.params.id);
  await msg.deleteOne();
  res.json({ message: "Message deleted" });
};

module.exports = { listMessages, getMessage, updateMessage, deleteMessage };

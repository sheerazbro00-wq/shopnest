const mongoose = require("mongoose");

// A message sent from the Contact page; read and answered from the admin panel.
const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // set when signed in
    status: { type: String, enum: ["New", "Read", "Replied"], default: "New" },
  },
  { timestamps: true }
);

contactMessageSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("ContactMessage", contactMessageSchema);

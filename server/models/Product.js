const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    sku: String,
    size: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: null },
    available: { type: Boolean, default: true },
  },
  { _id: false }
);

// One document per colourway; colourways of the same garment share a styleCode.
const productSchema = new mongoose.Schema(
  {
    handle: { type: String, required: true, unique: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    styleCode: { type: String, required: true, index: true },
    productType: String,
    color: String,
    colorHex: String,
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: null },
    // Derived at seed time: whole-number % off compareAtPrice, and whether any size is in stock.
    discount: { type: Number, default: 0 },
    available: { type: Boolean, default: true },
    variants: [variantSchema],
    images: [String],
    description: String,
    sizeChart: String, // sanitized <table> HTML
    care: [String],
    tags: [String],
    // collection handle -> position within that collection (merchandised order)
    collections: { type: Map, of: Number, default: {} },
    publishedAt: Date,
    // Drafts are hidden from the store (and can't be bought) until set Active.
    // Catalogue documents without the field count as active.
    status: { type: String, enum: ["active", "draft"], default: "active", index: true },
  },
  { timestamps: true }
);

productSchema.index({ title: "text" });

// Store queries add this so drafts never reach shoppers.
productSchema.statics.LIVE = { status: { $ne: "draft" } };

productSchema.pre("validate", function () {
  this.discount =
    this.compareAtPrice && this.compareAtPrice > this.price
      ? Math.round((1 - this.price / this.compareAtPrice) * 100)
      : 0;
  this.available = (this.variants || []).some((v) => v.available);
});

module.exports = mongoose.model("Product", productSchema);

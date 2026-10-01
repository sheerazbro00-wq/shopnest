const mongoose = require("mongoose");
const Product = require("../models/Product");
const collections = require("../config/collections");
const { httpError, clean } = require("../utils/validation");
const { sanitizeHtml } = require("../utils/sanitizeHtml");

const PAGE_SIZE = 25;
const MAX_PRICE = 1_000_000;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const COLLECTION_HANDLES = new Set(collections.map((c) => c.handle));
const GROUPS = { apparel: "Apparel", shoes: "Shoes", accessories: "Accessories" };

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

// ---------- validation ----------

// Validates the product form. Returns clean values or throws a 400 whose
// `errors` object maps each bad field to a message (shown inline in the UI).
function readProduct(body = {}) {
  const errors = {};
  const out = {};

  out.title = clean(body.title, 120);
  if (!out.title) errors.title = "Enter a title";

  out.styleCode = clean(body.styleCode, 40).toUpperCase();
  if (!/^[A-Z0-9-]{2,40}$/.test(out.styleCode)) errors.styleCode = "Use 2–40 letters, numbers or dashes";

  out.productType = clean(body.productType, 40).toUpperCase();
  out.color = clean(body.color, 30).toUpperCase();
  if (!out.color) errors.color = "Enter a colour";
  const hex = clean(body.colorHex, 7);
  out.colorHex = /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : "";

  out.description = sanitizeHtml(clean(body.description, 8000)).slice(0, 5000);

  const price = Number(body.price);
  if (!Number.isInteger(price) || price < 1 || price > MAX_PRICE) errors.price = "Enter a whole-rupee price above 0";
  out.price = price;

  const compare = body.compareAtPrice === "" || body.compareAtPrice == null ? null : Number(body.compareAtPrice);
  if (compare !== null && (!Number.isInteger(compare) || compare > MAX_PRICE)) errors.compareAtPrice = "Enter a whole-rupee amount";
  else if (compare !== null && Number.isInteger(price) && compare < price) errors.compareAtPrice = "Must be higher than the price (it's the original, before-sale price)";
  out.compareAtPrice = compare;

  // Sizes: all sizes share the product price (as in the catalogue).
  const variants = Array.isArray(body.variants) ? body.variants.slice(0, 20) : [];
  const seen = new Set();
  out.variants = [];
  for (const v of variants) {
    const size = clean(v?.size, 12).toUpperCase();
    if (!size) continue;
    if (seen.has(size)) {
      errors.variants = `Size ${size} is listed twice`;
      continue;
    }
    seen.add(size);
    out.variants.push({ size, sku: clean(v.sku, 40).toUpperCase(), available: v.available === true });
  }
  if (!out.variants.length && !errors.variants) errors.variants = "Add at least one size";

  // Images: https URLs only (they're rendered as <img src>).
  const images = Array.isArray(body.images) ? body.images.slice(0, 12) : [];
  out.images = [];
  for (const raw of images) {
    try {
      const url = new URL(clean(raw, 600));
      if (url.protocol !== "https:") throw new Error();
      if (!out.images.includes(url.href)) out.images.push(url.href);
    } catch {
      errors.images = "Image links must be full https:// URLs";
    }
  }
  if (!out.images.length && !errors.images) errors.images = "Add at least one image";

  out.collections = (Array.isArray(body.collections) ? body.collections : []).filter((h) => COLLECTION_HANDLES.has(h));
  out.status = body.status === "draft" ? "draft" : "active";

  if (Object.keys(errors).length) {
    const err = httpError(400, "Please fix the highlighted fields");
    err.errors = errors;
    throw err;
  }
  return out;
}

// Keep existing collection positions; new memberships go to the end.
async function collectionMap(handles, existing = new Map()) {
  const map = new Map();
  for (const h of handles) {
    if (existing.has(h)) {
      map.set(h, existing.get(h));
      continue;
    }
    const [last] = await Product.find({ [`collections.${h}`]: { $exists: true } })
      .sort({ [`collections.${h}`]: -1 })
      .limit(1)
      .select("collections")
      .lean();
    map.set(h, (last?.collections?.[h] ?? -1) + 1);
  }
  return map;
}

function applyFields(product, data) {
  const { variants, collections: _c, ...rest } = data;
  product.set(rest);
  product.variants = variants.map((v) => ({ ...v, price: data.price, compareAtPrice: data.compareAtPrice }));
}

// ---------- handlers ----------

const listSort = {
  newest: { createdAt: -1, _id: -1 },
  updated: { updatedAt: -1, _id: -1 },
  "title-asc": { title: 1, _id: 1 },
  "price-asc": { price: 1, _id: 1 },
  "price-desc": { price: -1, _id: 1 },
};

// GET /api/admin/products?tab=all|active|draft|out&q=&type=&collection=&sort=&page=
const listProducts = async (req, res) => {
  const base = {};
  const q = clean(req.query.q, 80);
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    base.$or = [{ title: rx }, { styleCode: rx }, { handle: rx }, { color: rx }, { "variants.sku": rx }];
  }
  const type = clean(req.query.type, 40);
  if (type) base.productType = type;
  const col = clean(req.query.collection, 80);
  if (COLLECTION_HANDLES.has(col)) base[`collections.${col}`] = { $exists: true };

  const TABS = { active: { status: { $ne: "draft" } }, draft: { status: "draft" }, out: { available: false } };
  const tab = TABS[req.query.tab] ? req.query.tab : "all";
  const filter = { ...base, ...(TABS[tab] || {}) };
  const page = Math.max(1, parseInt(req.query.page) || 1);

  const [items, total, all, active, draft, out] = await Promise.all([
    Product.find(filter)
      .sort(listSort[req.query.sort] || listSort.newest)
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .select("handle title color colorHex productType styleCode images price compareAtPrice discount available status variants.available updatedAt")
      .lean(),
    Product.countDocuments(filter),
    Product.countDocuments(base),
    Product.countDocuments({ ...base, ...TABS.active }),
    Product.countDocuments({ ...base, ...TABS.draft }),
    Product.countDocuments({ ...base, ...TABS.out }),
  ]);

  res.json({
    products: items.map((p) => ({
      _id: p._id,
      handle: p.handle,
      title: p.title,
      color: p.color,
      productType: p.productType,
      styleCode: p.styleCode,
      image: p.images?.[0],
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      discount: p.discount,
      status: p.status || "active",
      available: p.available,
      sizesInStock: p.variants.filter((v) => v.available).length,
      sizes: p.variants.length,
      updatedAt: p.updatedAt,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    pageSize: PAGE_SIZE,
    counts: { all, active, draft, out },
  });
};

// GET /api/admin/products/meta — options for the form and filters.
const getMeta = async (req, res) => {
  const [types, colors] = await Promise.all([Product.distinct("productType"), Product.distinct("color")]);
  res.json({
    productTypes: types.filter(Boolean).sort(),
    colors: colors.filter(Boolean).sort(),
    collections: collections.map((c) => ({
      handle: c.handle,
      title: c.title,
      group: c.group ? GROUPS[c.group] : "Other",
    })),
  });
};

async function loadProduct(id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, "Product not found");
  const product = await Product.findById(id);
  if (!product) throw httpError(404, "Product not found");
  return product;
}

async function adminView(product) {
  const p = product.toObject({ flattenMaps: true });
  const colourways = await Product.find({ styleCode: p.styleCode, _id: { $ne: p._id } })
    .select("color colorHex images status")
    .lean();
  return {
    ...p,
    status: p.status || "active",
    collections: Object.keys(p.collections || {}),
    colourways: colourways.map((c) => ({ _id: c._id, color: c.color, colorHex: c.colorHex, image: c.images?.[0], status: c.status || "active" })),
  };
}

// GET /api/admin/products/:id
const getProduct = async (req, res) => {
  res.json(await adminView(await loadProduct(req.params.id)));
};

// POST /api/admin/products
const createProduct = async (req, res) => {
  const data = readProduct(req.body);
  // Unique, readable URL handle: title + style code + colour, suffixed if taken.
  const stem = slugify(`${data.title} ${data.styleCode} ${data.color}`) || "product";
  let handle = stem;
  for (let i = 2; await Product.exists({ handle }); i++) handle = `${stem}-${i}`;

  const product = new Product({ handle, publishedAt: new Date() });
  applyFields(product, data);
  product.collections = await collectionMap(data.collections);
  await product.save();
  res.status(201).json(await adminView(product));
};

// PATCH /api/admin/products/:id — full form save (the handle never changes, so links keep working)
const updateProduct = async (req, res) => {
  const product = await loadProduct(req.params.id);
  const data = readProduct(req.body);
  applyFields(product, data);
  product.collections = await collectionMap(data.collections, product.collections);
  await product.save();
  res.json(await adminView(product));
};

// DELETE /api/admin/products/:id — past orders keep their own copy of the item.
const deleteProduct = async (req, res) => {
  const product = await loadProduct(req.params.id);
  await product.deleteOne();
  res.json({ message: "Product deleted" });
};

module.exports = { listProducts, getMeta, getProduct, createProduct, updateProduct, deleteProduct };

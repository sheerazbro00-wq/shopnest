const Product = require("../models/Product");
const collections = require("../config/collections");

const CARD_FIELDS = "handle title styleCode color colorHex price compareAtPrice images variants";

const toCard = (p) => ({
  _id: p._id,
  handle: p.handle,
  title: p.title,
  styleCode: p.styleCode,
  color: p.color,
  colorHex: p.colorHex,
  price: p.price,
  compareAtPrice: p.compareAtPrice,
  images: (p.images || []).slice(0, 4),
  sizes: (p.variants || []).map((v) => ({ size: v.size, available: v.available })),
});

// Attach every colourway (same styleCode) to each product for the swatch row.
async function withSiblings(products) {
  const codes = [...new Set(products.map((p) => p.styleCode))];
  const all = await Product.find({ ...Product.LIVE, styleCode: { $in: codes } })
    .select(CARD_FIELDS + " publishedAt")
    .sort({ publishedAt: -1 })
    .lean();

  const byCode = {};
  for (const s of all) (byCode[s.styleCode] ||= []).push(s);

  return products.map((p) => ({
    ...toCard(p),
    siblings: (byCode[p.styleCode] || []).map(toCard),
  }));
}

const SORTS = {
  "price-ascending": { price: 1 },
  "price-descending": { price: -1 },
  "created-descending": { publishedAt: -1 },
  "created-ascending": { publishedAt: 1 },
  "title-ascending": { title: 1 },
  "title-descending": { title: -1 },
};

const list = (v) => (v ? String(v).split(",").map((s) => s.trim()).filter(Boolean) : []);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isHandle = (h) => /^[a-z0-9-]+$/.test(h || "");

// Search terms: lower-cased words, max 6, with a trailing plural "s" dropped so
// "shirts" still finds "COTTON STRIPED SHIRT" (substring match does the rest).
const SEARCH_FIELDS = ["title", "productType", "color", "styleCode"];
function searchTerms(q) {
  return String(q || "")
    .toLowerCase()
    .slice(0, 100)
    .split(/[^a-z0-9'"-]+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((t) => (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t));
}

// Collection names as a shopper would type them ("Man Shirts", "Man Shoes New In").
const GROUP_NAMES = { apparel: "Apparel", shoes: "Shoes", accessories: "Accessories" };
const searchableCollections = collections
  .filter((c) => c.handle !== "man")
  .map((c) => ({
    handle: c.handle,
    group: c.group,
    title: c.group && c.title === "New In" ? `Man ${GROUP_NAMES[c.group]} New In` : c.group ? `Man ${c.title}` : c.title,
  }));

const matchCollections = (terms) =>
  searchableCollections.filter((c) => {
    const text = `${c.title} ${c.handle}`.toLowerCase();
    return terms.every((t) => text.includes(t));
  });

function baseFilter({ collection, q, handles }) {
  const filter = { ...Product.LIVE };
  const handleList = list(handles).filter(isHandle).slice(0, 60);
  if (handleList.length) filter.handle = { $in: handleList };
  if (isHandle(collection)) filter[`collections.${collection}`] = { $exists: true };
  // A product matches when every term hits one of its fields (AND across terms,
  // OR across fields), or when the query names its category ("shoes" -> loafers).
  const terms = searchTerms(q);
  if (terms.length) {
    const byFields = {
      $and: terms.map((t) => ({
        $or: SEARCH_FIELDS.map((f) => ({ [f]: { $regex: escapeRegex(t), $options: "i" } })),
      })),
    };
    const byCategory = matchCollections(terms)
      .filter((c) => c.group)
      .map((c) => ({ [`collections.${c.handle}`]: { $exists: true } }));
    filter.$or = [byFields, ...byCategory];
  }
  return filter;
}

// Relevance score for search results: the whole phrase in the title beats
// individual words in the title, which beat matches on type/colour only.
function relevanceScore(q) {
  const terms = searchTerms(q);
  const has = (field, text, points) => ({
    $cond: [{ $regexMatch: { input: { $ifNull: [`$${field}`, ""] }, regex: escapeRegex(text), options: "i" } }, points, 0],
  });
  const phrase = String(q).trim().slice(0, 100);
  return {
    $add: [
      has("title", phrase, 10),
      { $cond: [{ $regexMatch: { input: "$title", regex: "^" + escapeRegex(terms[0] || ""), options: "i" } }, 3, 0] },
      ...terms.map((t) => has("title", t, 4)),
      ...terms.map((t) => has("productType", t, 2)),
      ...terms.map((t) => has("color", t, 1)),
    ],
  };
}

// Values within one group are OR'd; different groups are AND'd.
function buildFilter(query) {
  const filter = baseFilter(query);
  const sizes = list(query.size);
  const discounts = list(query.discount).map(Number).filter(Number.isFinite);
  const colors = list(query.color);
  const types = list(query.type);
  const availability = list(query.availability);

  if (sizes.length) filter["variants.size"] = { $in: sizes };
  if (discounts.length) filter.discount = { $in: discounts };
  if (colors.length) filter.color = { $in: colors };
  if (types.length) filter.productType = { $in: types };
  if (availability.length === 1) filter.available = availability[0] === "in";

  const min = parseFloat(query.price_min);
  const max = parseFloat(query.price_max);
  if (Number.isFinite(min) || Number.isFinite(max)) {
    filter.price = {};
    if (Number.isFinite(min)) filter.price.$gte = min;
    if (Number.isFinite(max)) filter.price.$lte = max;
  }
  return filter;
}

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const sizeRank = (s) => {
  const i = SIZE_ORDER.indexOf(s);
  if (i >= 0) return i;
  const n = parseFloat(s);
  return Number.isFinite(n) ? 100 + n : 1000;
};

// GET /api/products/facets?collection=
const getFacets = async (req, res) => {
  const [f] = await Product.aggregate([
    { $match: baseFilter(req.query) },
    {
      $facet: {
        sizes: [
          { $unwind: "$variants" },
          { $group: { _id: { p: "$_id", s: "$variants.size" } } },
          { $group: { _id: "$_id.s", count: { $sum: 1 } } },
        ],
        discounts: [{ $match: { discount: { $gt: 0 } } }, { $group: { _id: "$discount", count: { $sum: 1 } } }],
        colors: [{ $match: { color: { $ne: null } } }, { $group: { _id: "$color", count: { $sum: 1 } } }],
        types: [{ $match: { productType: { $nin: [null, ""] } } }, { $group: { _id: "$productType", count: { $sum: 1 } } }],
        availability: [{ $group: { _id: "$available", count: { $sum: 1 } } }],
        price: [{ $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" }, total: { $sum: 1 } } }],
      },
    },
  ]);

  const pairs = (arr) => arr.map((x) => ({ value: x._id, count: x.count }));
  const byName = (a, b) => String(a.value).localeCompare(String(b.value));

  res.json({
    total: f.price[0]?.total || 0,
    sizes: pairs(f.sizes).sort((a, b) => sizeRank(a.value) - sizeRank(b.value)),
    discounts: pairs(f.discounts).sort((a, b) => a.value - b.value),
    colors: pairs(f.colors).sort(byName),
    types: pairs(f.types).sort(byName),
    availability: {
      in: f.availability.find((a) => a._id === true)?.count || 0,
      out: f.availability.find((a) => a._id === false)?.count || 0,
    },
    price: { min: f.price[0]?.min || 0, max: f.price[0]?.max || 0 },
  });
};

// GET /api/products?handles=a,b (cart sync, recently viewed)&collection=&sort_by=&size=&discount=&color=&type=&availability=&price_min=&price_max=&q=&page=&limit=
const getProducts = async (req, res) => {
  const { collection, sort_by } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(60, Math.max(1, parseInt(req.query.limit) || 24));
  const filter = buildFilter(req.query);
  const skip = (page - 1) * limit;
  const byRelevance = searchTerms(req.query.q).length > 0 && !SORTS[sort_by];

  let sort = SORTS[sort_by];
  if (!sort) sort = isHandle(collection) ? { [`collections.${collection}`]: 1 } : { publishedAt: -1 };
  sort = { ...sort, _id: 1 }; // stable order across infinite-scroll pages

  const project = Object.fromEntries((CARD_FIELDS + " publishedAt").split(" ").map((f) => [f, 1]));
  const findItems = byRelevance
    ? Product.aggregate([
        { $match: filter },
        { $addFields: { _score: relevanceScore(req.query.q) } },
        { $sort: { available: -1, _score: -1, publishedAt: -1, _id: 1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: project },
      ])
    : Product.find(filter).select(CARD_FIELDS + " publishedAt").sort(sort).skip(skip).limit(limit).lean();

  const [items, total] = await Promise.all([findItems, Product.countDocuments(filter)]);

  res.json({
    products: await withSiblings(items),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
};

const getProductByHandle = async (req, res) => {
  const product = await Product.findOne({ ...Product.LIVE, handle: req.params.handle }).lean();
  if (!product) return res.status(404).json({ message: "Product not found" });

  const [withSibs] = await withSiblings([product]);
  res.json({ ...product, siblings: withSibs.siblings });
};

// GET /api/products/:handle/recommendations — "You may also like".
// Same product type first, then the product's collections; one colourway per
// style, never the product's own style, in-stock only.
const getRecommendations = async (req, res) => {
  const limit = Math.min(12, parseInt(req.query.limit) || 4);
  const product = await Product.findOne({ ...Product.LIVE, handle: req.params.handle }).select("styleCode productType collections").lean();
  if (!product) return res.status(404).json({ message: "Product not found" });

  const seen = new Set([product.styleCode]);
  const picks = [];
  const take = (docs) => {
    for (const d of docs) {
      if (picks.length >= limit) return;
      if (seen.has(d.styleCode)) continue;
      seen.add(d.styleCode);
      picks.push(d);
    }
  };

  const base = { ...Product.LIVE, available: true, styleCode: { $nin: [...seen] } };
  take(await Product.find({ ...base, productType: product.productType }).select(CARD_FIELDS).sort({ publishedAt: -1 }).limit(limit * 4).lean());
  for (const handle of Object.keys(product.collections || {})) {
    if (picks.length >= limit) break;
    take(await Product.find({ ...base, [`collections.${handle}`]: { $exists: true } }).select(CARD_FIELDS).sort({ [`collections.${handle}`]: 1 }).limit(limit * 4).lean());
  }

  res.json(await withSiblings(picks));
};

// GET /api/products/suggest?q= — predictive search: a few products + matching collections.
const getSuggestions = async (req, res) => {
  const terms = searchTerms(req.query.q);
  if (!terms.length) return res.json({ products: [], collections: [] });

  const products = await Product.aggregate([
    { $match: baseFilter({ q: req.query.q }) },
    { $addFields: { _score: relevanceScore(req.query.q) } },
    { $sort: { available: -1, _score: -1, publishedAt: -1, _id: 1 } },
    { $limit: 4 },
    { $project: { handle: 1, title: 1, color: 1, price: 1, compareAtPrice: 1, image: { $first: "$images" } } },
  ]);

  const matches = matchCollections(terms).map(({ handle, title }) => ({ handle, title }));
  res.json({ products, collections: matches.slice(0, 4) });
};

const getCollections = (req, res) => res.json(collections);

// Creating/editing/deleting products lives in adminProductController (/api/admin/products).
module.exports = {
  getProducts,
  getFacets,
  getSuggestions,
  getProductByHandle,
  getRecommendations,
  getCollections,
};

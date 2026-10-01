// Downloads the Men's catalog from the reference Shopify store into
// seed/data/catalog.json so seeding works offline and is reproducible.
// usage: node seed/importCatalog.js
const fs = require("fs");
const path = require("path");
const collections = require("../config/collections");

const SOURCE = "https://pk.lamaretail.com";
const OUT = path.join(__dirname, "data", "catalog.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    await sleep(1500 * attempt);
  }
  throw new Error(`Failed: ${url}`);
}

async function fetchCollectionProducts(handle) {
  const all = [];
  for (let page = 1; page < 40; page++) {
    const data = await fetchJson(`${SOURCE}/collections/${handle}/products.json?limit=250&page=${page}`);
    if (!data || data.products.length === 0) break;
    all.push(...data.products);
    if (data.products.length < 250) break;
    await sleep(400);
  }
  return all;
}

// Image filenames embed the swatch colour, e.g. ...-PANTS-45322e-_4.jpg.
// Lowercase-only so uppercase words in the product name never match.
const hexFromImages = (images) => {
  for (const { src } of images) {
    const file = src.split("/").pop();
    const m = file.match(/-([0-9a-f]{6})(?=[-_.])/);
    if (m) return `#${m[1]}`;
  }
  return null;
};

const NAMED_COLORS = {
  BLACK: "#000000", WHITE: "#ffffff", "OFF WHITE": "#f2efe8", "OAT WHITE": "#ece6da", IVORY: "#e7e2de",
  CREAM: "#efe6d2", ECRU: "#e3dccb", SAND: "#e0dbd5", BEIGE: "#d8c8b0", KHAKI: "#7b654e", TAUPE: "#8b7d6b",
  TAN: "#b08a5f", CAMEL: "#b58a57", HONEY: "#c18f3e", MUSTARD: "#c9a227", RUST: "#a0522d", BROWN: "#5a3a26",
  "DARK BROWN": "#24150e", "ASH BROWN": "#6b5a4e", COFFEE: "#4b3621", CHOCOLATE: "#3d2314",
  GREY: "#8e8e8e", "LIGHT GREY": "#cfcfcf", "DARK GREY": "#4a4a4a", "MOUSE GREY": "#7d7a74", CHARCOAL: "#34343c",
  "MELANGE CHARCOAL": "#4a4a50", "MAROON GREY": "#6d5a5f",
  NAVY: "#172434", "MELANGE NAVY": "#2c3a52", BLUE: "#3b5b92", "LIGHT BLUE": "#a9c4e0", "MID BLUE": "#5b7fae",
  "DARK BLUE": "#1f2f4f", "SLATE BLUE": "#6a7fa3", INDIGO: "#2e3a63",
  GREEN: "#3f6b45", "LIGHT GREEN": "#a8c3a0", "FOREST GREEN": "#22402c", "NAVY GREEN": "#27392f", OLIVE: "#6b6b3a",
  MAROON: "#5c1a2a", PINK: "#e7b8c3", "LIGHT PINK": "#f1d3d8",
};

const hexFor = (p, colorName) => hexFromImages(p.images) || NAMED_COLORS[(colorName || "").toUpperCase()] || null;

const styleCodeFrom = (p) => {
  const sku = p.variants.find((v) => v.sku)?.sku || "";
  return sku.split("-")[0] || p.handle;
};

const cleanText = (html = "") => html.replace(/lama retail/gi, "ShopNest").replace(/\blama\b/gi, "ShopNest");

(async () => {
  const products = new Map();

  for (const c of collections) {
    const list = await fetchCollectionProducts(c.handle);
    console.log(`${c.handle.padEnd(34)} ${list.length}`);

    list.forEach((p, index) => {
      if (!products.has(p.handle)) {
        const colorOpt = p.options.find((o) => /colou?r/i.test(o.name));
        const sizeOpt = p.options.find((o) => /size/i.test(o.name));
        const colorPos = colorOpt ? `option${colorOpt.position}` : null;
        const sizePos = sizeOpt ? `option${sizeOpt.position}` : null;
        const first = p.variants[0];

        products.set(p.handle, {
          handle: p.handle,
          title: p.title,
          styleCode: styleCodeFrom(p),
          productType: p.product_type,
          color: colorPos ? first[colorPos] : null,
          colorHex: hexFor(p, colorPos ? first[colorPos] : null),
          price: Number(first.price),
          compareAtPrice: first.compare_at_price ? Number(first.compare_at_price) : null,
          variants: p.variants.map((v) => ({
            sku: v.sku,
            size: sizePos ? v[sizePos] : v.title,
            price: Number(v.price),
            compareAtPrice: v.compare_at_price ? Number(v.compare_at_price) : null,
            available: v.available,
          })),
          images: p.images.map((i) => i.src),
          description: cleanText(p.body_html),
          tags: p.tags,
          publishedAt: p.published_at,
          collections: {},
        });
      }
      products.get(p.handle).collections[c.handle] = index;
    });

    await sleep(500);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify([...products.values()]));
  console.log(`\nSaved ${products.size} unique products -> ${OUT}`);
})();

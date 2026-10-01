// Size charts and care instructions are not in Shopify's products.json —
// they live in each product page's HTML. Scrape them once per style
// (colourways share both) into seed/data/details.json.
// usage: node seed/importDetails.js   (run after importCatalog.js)
const fs = require("fs");
const path = require("path");
const catalog = require("./data/catalog.json");

const SOURCE = "https://pk.lamaretail.com";
const OUT = path.join(__dirname, "data", "details.json");
const CONCURRENCY = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Returns null on 404 or after repeated failures (e.g. rate limiting) so one
// bad page never aborts the run; re-running the script retries the gaps.
async function fetchHtml(url) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }).catch(() => null);
    if (res?.ok) return res.text();
    if (res?.status === 404) return null;
    await sleep((res?.status === 429 ? 10000 : 2000) * attempt);
  }
  console.warn(`Skipped: ${url}`);
  return null;
}

const { sanitizeHtml } = require("../utils/sanitizeHtml");

// Keep only table/text markup; every attribute except colspan/rowspan is dropped.
const sanitize = (html) => sanitizeHtml(html, { allowTables: true });

function parse(html) {
  const chart = html.match(/data-tool-tip-content[^>]*>([\s\S]*?)<\/span>\s*<\/tool-tip-trigger>/);
  const care = html.match(/custom-accordion__inner rte">([\s\S]*?)<\/div>/);
  return {
    sizeChart: chart && /<table/i.test(chart[1]) ? sanitize(chart[1]) : "",
    care: care
      ? care[1]
          .split(/<br\s*\/?>/i)
          .map((l) => l.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/^[\s•'\-]+/, "").trim())
          .filter(Boolean)
      : [],
  };
}

async function run() {
  const byStyle = new Map();
  for (const p of catalog) if (!byStyle.has(p.styleCode)) byStyle.set(p.styleCode, p.handle);

  // Resume: keep styles fetched by a previous run.
  const details = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  const entries = [...byStyle].filter(([style]) => !details[style]);
  let done = 0;

  async function worker() {
    while (entries.length) {
      const [style, handle] = entries.shift();
      const html = await fetchHtml(`${SOURCE}/products/${handle}`);
      if (html) details[style] = parse(html);
      if (++done % 50 === 0) {
        console.log(`${done} fetched this run`);
        fs.writeFileSync(OUT, JSON.stringify(details)); // checkpoint for resume
      }
      await sleep(200);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  fs.writeFileSync(OUT, JSON.stringify(details));
  const withChart = Object.values(details).filter((d) => d.sizeChart).length;
  const withCare = Object.values(details).filter((d) => d.care.length).length;
  console.log(`Saved ${Object.keys(details).length} styles (${withChart} size charts, ${withCare} care) -> ${OUT}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

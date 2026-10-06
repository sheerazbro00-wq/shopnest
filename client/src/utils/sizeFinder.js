// Find My Size engine (spec 005, plan §2–3). Pure functions: no React, no network,
// so they run the same in the browser and in Node tests.
// All internal maths is in centimetres, as full circumferences.

// ---------- units ----------

const CM_PER_IN = 2.54;
const KG_PER_LB = 0.45359237;

export const ftInToCm = (ft, inch = 0) => (Number(ft) * 12 + Number(inch)) * CM_PER_IN;
export const cmToFtIn = (cm) => {
  const total = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(total / 12), in: total % 12 };
};
export const lbToKg = (lb) => Number(lb) * KG_PER_LB;
export const kgToLb = (kg) => Number(kg) / KG_PER_LB;
export const inToCm = (inch) => Number(inch) * CM_PER_IN;
export const cmToIn = (cm) => Number(cm) / CM_PER_IN;

// "116 cm" / "45½ in" — lengths shown in the shopper's chosen unit (AC-1.3).
export function formatLength(cm, units = "cm") {
  if (units === "in") {
    const half = Math.round(cmToIn(cm) * 2) / 2;
    const whole = Math.floor(half);
    return `${whole}${half > whole ? "½" : ""} in`;
  }
  return `${Math.round(cm)} cm`;
}

// ---------- reading the chart (plan §2) ----------

const decode = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

function tableRows(html) {
  const rows = [];
  for (const table of String(html || "").match(/<table[\s\S]*?<\/table>/gi) || []) {
    for (const tr of table.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
      rows.push((tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []).map(decode));
    }
  }
  return rows;
}

// Header cell → our column key.
function columnKey(cell) {
  const c = cell.replace(/[^A-Z/ ]/g, "").trim();
  if (c === "CHEST") return "chest";
  if (c === "WAIST") return "waist";
  if (c === "HIP" || c === "HIP WIDTH") return "hip";
  if (c === "EU" || c === "UK" || c === "US") return c.toLowerCase();
  return null;
}

// "24.1-24.7" → 24.4 ; "54" → 54 ; "" → NaN
function number(cell) {
  const range = cell.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const m = cell.match(/^\d+(?:\.\d+)?$/);
  return m ? Number(m[0]) : NaN;
}

const ALIASES = { "2XL": "XXL", "3XL": "XXXL", "XXL": "XXL", "XXXL": "XXXL" };

// The reference store pairs letters and waist sizes ("30 / S", "32 / M", …); used when a
// chart says S but the product's buttons say 30, or the other way round.
const LETTER_WAIST = { XS: "28", S: "30", M: "32", L: "34", XL: "36", XXL: "38", XXXL: "40" };
const WAIST_LETTER = Object.fromEntries(Object.entries(LETTER_WAIST).map(([l, w]) => [w, l]));

// "30 / S", "S/30", "38 /2 XL" → whichever token the product actually sells.
function matchSize(label, sizes) {
  const tokens = label
    .replace(/\s+/g, "")
    .split("/")
    .map((t) => ALIASES[t] || t)
    .filter(Boolean);
  const direct = tokens.find((t) => sizes.has(t));
  if (direct) return direct;
  return tokens.map((t) => LETTER_WAIST[t] || WAIST_LETTER[t]).find((t) => t && sizes.has(t)) || null;
}

// A real adult garment (full circumference, cm). Anything else is a broken chart (R-2).
const PLAUSIBLE = { chest: [80, 170], waist: [60, 140] };

// Centre of the regular-fit ease window (see RULES below), used for body-measurement charts.
const REGULAR_EASE = { chest: 14, waist: 3 };

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};

// Same rule as the size guide (Product.jsx guideSection).
export const BOTTOM_TYPES = /JEANS|PANTS|TROUSERS|CHINOS|CARGOS|SHORTS|SWEATPANTS|BOXERS/;

/**
 * Size chart HTML → { kind: "tops"|"bottoms"|"shoes", rows } or null when unusable (AC-1.1).
 * rows (cm, full circumference): tops {size, chest}, bottoms {size, waist},
 * shoes {size (EU button), eu, uk, us, footCm}. Only sizes the product sells are kept.
 */
export function parseChart(html, { sizes = [], productType = "" } = {}) {
  const sold = new Set(sizes.map(String));
  const blocks = [];
  let block = null;
  // A note before the table or a one-cell row can say "Body measurements (Inches)":
  // that sets the next block's unit, and marks it as body (not garment) sizes.
  const intro = decode(String(html || "").split(/<table/i)[0] || "");
  let note = { unit: /INCH/.test(intro) ? "in" : null, body: /BODY/.test(intro) };
  for (const row of tableRows(html)) {
    if (!row.length) continue;
    const keys = row.map(columnKey);
    if (keys.some(Boolean)) {
      // A header row starts a block. Unit: its first cell ("SIZE (INCHES)"), else the note.
      const unit = /INCH/.test(row[0]) ? "in" : /\bCM\b/.test(row[0]) ? "cm" : note.unit || "cm";
      block = { unit, body: note.body, keys, rows: [] };
      blocks.push(block);
      note = { unit: null, body: false };
    } else if (!block || row.length !== block.keys.length) {
      const text = row.join(" ");
      if (/INCH|\bCM\b/.test(text)) note = { unit: /INCH/.test(text) ? "in" : "cm", body: /BODY/.test(text) };
    } else {
      block.rows.push(row);
    }
  }

  // Shoes: a block with EU + UK/US columns; the first column is foot length.
  const shoe = blocks.find((b) => b.keys.includes("eu") && b.rows.length);
  if (shoe) {
    const col = (k) => shoe.keys.indexOf(k);
    const rows = shoe.rows
      .map((r) => ({
        size: String(number(r[col("eu")])),
        eu: number(r[col("eu")]),
        uk: col("uk") >= 0 ? number(r[col("uk")]) : NaN,
        us: col("us") >= 0 ? number(r[col("us")]) : NaN,
        footCm: number(r[0]),
      }))
      .filter((r) => sold.has(r.size));
    return rows.length ? { kind: "shoes", rows } : null;
  }

  // Clothing: prefer a cm block; fall back to inches × 2.54.
  const usable = (b) => b.rows.length && (b.keys.includes("chest") || b.keys.includes("waist"));
  const chosen = blocks.find((b) => usable(b) && b.unit === "cm") || blocks.find(usable);
  if (!chosen) return null;

  const isBottom = (!chosen.keys.includes("chest") && chosen.keys.includes("waist")) || BOTTOM_TYPES.test(productType);
  const key = isBottom && chosen.keys.includes("waist") ? "waist" : "chest";
  if (!chosen.keys.includes(key)) return null;
  const idx = chosen.keys.indexOf(key);
  const scale = chosen.unit === "in" ? CM_PER_IN : 1;

  let rows = chosen.rows
    .map((r) => ({ size: matchSize(r[0], sold), value: number(r[idx]) * scale }))
    .filter((r) => r.size && Number.isFinite(r.value));
  if (rows.length < 2) return null;

  if (chosen.body) {
    // A body chart gives the body each size is cut for ("37-40" → 38.5): turn it into the
    // garment it implies by adding the middle of the regular-fit ease.
    rows = rows.map((r) => ({ ...r, value: r.value + REGULAR_EASE[key] }));
  } else if (median(rows.map((r) => r.value)) < (key === "chest" ? 80 : 60)) {
    // Flat (half) measurements are doubled (plan §2 step 5).
    rows = rows.map((r) => ({ ...r, value: r.value * 2 }));
  }
  rows.sort((a, b) => a.value - b.value);
  const [min, max] = PLAUSIBLE[key];
  if (rows[0].value < min || rows[rows.length - 1].value > max) return null;

  return { kind: isBottom ? "bottoms" : "tops", rows: rows.map((r) => ({ size: r.size, [key]: r.value })) };
}

// ---------- body estimates (plan §3) ----------

// Chest circumference (cm) from height and weight — an approximation, labelled as such.
export function estimateChest(heightCm, weightKg) {
  const bmi = weightKg / (heightCm / 100) ** 2;
  return 49 + 2.05 * bmi + 0.1 * (heightCm - 175);
}

// ---------- recommending (plan §3) ----------

// Each garment is read against its own design (plan §3, revised after verification):
// a slim henley is meant to be close, an oversized tee roomy. The brand's middle size is
// cut for a standard body, so `design` = how much room that size has on that body.
// We then pick the size that gives the shopper the same room the designer intended.
const STD_CHEST = { XS: 86, S: 92, M: 100, L: 108, XL: 116, XXL: 124, XXXL: 132 }; // cm, men's body
const stdWaist = (size) => inToCm(/^\d+$/.test(size) ? size : LETTER_WAIST[size] || NaN); // "32" or M → 32 in

const RULES = {
  tops: { measure: "chest", std: (s) => STD_CHEST[s], tol: 3, accept: 8, shift: true },
  // Trouser waists can't be sized up or down for style: fit only breaks ties.
  bottoms: { measure: "waist", std: stdWaist, tol: 2, accept: 5, shift: false },
};

// dev = room beyond what the design intends (cm): < 0 closer, > 0 looser.
const fitWord = (kind, dev) => (dev < -RULES[kind].tol ? "a snug fit" : dev > RULES[kind].tol ? "a relaxed fit" : "a regular fit");

function designRoom(rows, rule) {
  const anchor = rows.find((r) => r.size === "M" || r.size === "32") || rows[Math.floor(rows.length / 2)];
  const std = rule.std(anchor.size);
  return Number.isFinite(std) ? anchor.garment - std : rule.measure === "chest" ? 14 : 3;
}

function clothing(chart, answers) {
  const rule = RULES[chart.kind];
  const fit = ["slim", "regular", "relaxed"].includes(answers.fit) ? answers.fit : "regular";
  const body =
    chart.kind === "tops"
      ? answers.chestCm || estimateChest(answers.heightCm, answers.weightKg)
      : answers.waistCm || inToCm(answers.waistSize);
  const estimated = chart.kind === "tops" ? !answers.chestCm : !answers.waistCm;
  let rows = chart.rows.map((r) => ({ size: r.size, garment: r[rule.measure], ease: r[rule.measure] - body }));
  const design = designRoom(rows, rule);
  rows = rows.map((r) => ({ ...r, dev: r.ease - design }));
  const acceptable = (r) => r && Math.abs(r.dev) <= rule.accept;
  const base = { kind: chart.kind, measure: rule.measure, body, estimated, fit, design, rows };

  if (rows.every((r) => r.dev < -rule.accept)) return { ...base, status: "noFit", why: "tooSmall" };
  if (rows[0].dev > rule.accept) return { ...base, status: "noFit", why: "tooBig" };

  // 1. The size closest to the intended fit.
  const best = rows.reduce((a, b) => (Math.abs(b.dev) < Math.abs(a.dev) ? b : a));
  let pick = best;
  if (Math.abs(best.dev) > rule.tol) {
    // Not close to any size: the shopper sits between two (AC-1.5).
    const below = [...rows].reverse().find((r) => r.dev < 0 && acceptable(r));
    const above = rows.find((r) => r.dev > 0 && acceptable(r));
    if (below && above) {
      const prefer = fit === "slim" ? below : fit === "relaxed" ? above : Math.abs(below.dev) <= Math.abs(above.dev) ? below : above;
      return { ...base, status: "between", pick: prefer, alt: prefer === below ? above : below };
    }
    pick = below || above;
    if (!pick) return { ...base, status: "noFit", why: best.dev > 0 ? "tooBig" : "tooSmall" };
  }

  // 2. Tops: slim = one size down, relaxed = one size up, while that size still fits.
  const i = rows.indexOf(pick);
  if (rule.shift && fit === "slim" && acceptable(rows[i - 1])) pick = rows[i - 1];
  if (rule.shift && fit === "relaxed" && acceptable(rows[i + 1])) pick = rows[i + 1];
  return { ...base, status: "ok", pick };
}

function shoes(chart, answers) {
  const system = ["uk", "eu", "us"].includes(String(answers.system).toLowerCase()) ? String(answers.system).toLowerCase() : "uk";
  const want = Number(answers.size);
  const rows = chart.rows.filter((r) => Number.isFinite(r[system])).sort((a, b) => a[system] - b[system]);
  const base = { kind: "shoes", system, want, rows };
  const exact = rows.find((r) => r[system] === want);
  if (exact) return { ...base, status: "ok", pick: exact };
  const below = [...rows].reverse().find((r) => r[system] < want);
  const above = rows.find((r) => r[system] > want);
  // Half sizes (e.g. UK 8.5): go up for comfort, name both.
  if (below && above && above[system] - below[system] <= 1) return { ...base, status: "between", pick: above, alt: below };
  return { ...base, status: "noFit", why: !above ? "tooSmall" : "tooBig" };
}

/**
 * chart: parseChart() result; answers: the saved answers for chart.kind;
 * available: sizes in stock. → { status: "ok"|"between"|"soldOut"|"noFit", pick?, alt?, … }
 */
export function recommend(chart, answers, available = []) {
  if (!chart || !answers) return null;
  const result = chart.kind === "shoes" ? shoes(chart, answers) : clothing(chart, answers);
  if (!result.pick) return result;

  const inStock = new Set(available.map(String));
  if (inStock.has(result.pick.size)) return result;
  // Recommended size sold out (AC-1.6): offer the neighbouring size only if it still fits —
  // for clothes, within the acceptable room; for shoes, only the other half-size option.
  let alt = result.alt && inStock.has(result.alt.size) ? result.alt : null;
  if (!alt && result.kind !== "shoes") {
    const accept = RULES[result.kind].accept;
    const i = result.rows.indexOf(result.pick);
    const fits = (r) => r && inStock.has(r.size) && Math.abs(r.dev) <= accept;
    alt = [result.rows[i + 1], result.rows[i - 1]].find(fits) || null; // prefer one size up
  }
  return { ...result, status: "soldOut", soldOut: result.pick, alt };
}

// ---------- words (AC-1.4, AC-3.1) ----------

// One sentence for the result card, in the shopper's unit.
export function reasonFor(result, units = "cm") {
  if (!result) return "";
  const f = (cm) => formatLength(cm, units);
  if (result.kind === "shoes") {
    const label = result.system.toUpperCase();
    if (result.status === "noFit") return `We don't stock ${label} ${result.want} in this style.`;
    const p = result.soldOut || result.pick;
    if (result.status === "between") return `${label} ${result.want} falls between EU ${result.alt.size} and EU ${result.pick.size} — we suggest the larger one for comfort.`;
    return `EU ${p.size} is the same as ${label} ${result.want}${Number.isFinite(p.footCm) ? ` (a foot about ${f(p.footCm)} long)` : ""}.`;
  }
  const part = result.measure;
  if (result.status === "noFit")
    return result.why === "tooSmall"
      ? `Even the largest size of this style would be tight on you. Please check the size chart.`
      : `Even the smallest size of this style would be loose on you. Please check the size chart.`;
  const p = result.soldOut || result.pick;
  // A garment smaller than the body is a close-cut (usually stretch) style: say so.
  const roomier = p.ease >= 0 ? `about ${f(p.ease)} roomier than you` : `about ${f(-p.ease)} smaller than you, as this style is cut close to the body`;
  if (result.status === "between")
    return `You're between ${result.alt.size} and ${result.pick.size}. ${result.pick.size} gives ${fitWord(result.kind, result.pick.dev)} (${f(result.pick.garment)} around the ${part}); ${result.alt.size} gives ${fitWord(result.kind, result.alt.dev)}.`;
  return `The ${part} is ${f(p.garment)} around — ${roomier}: ${fitWord(result.kind, p.dev)}.`;
}

const ExchangeRate = require("../models/ExchangeRate");
const fx = require("../config/currency");

// Live exchange rates for display (spec 007 plan §3.2). getRates() never throws: it
// returns { rates, updatedAt } — the last good rates — or null if there never were any.

const ID = "PKR";
const round2 = (n) => Math.round(n * 100) / 100;

// Provider body (base USD) → rupees per unit. Returns null when the shape is wrong.
function parse(body) {
  const pkr = body?.rates?.PKR;
  const gbp = body?.rates?.GBP;
  if (body?.result !== "success" || !(pkr > 0) || !(gbp > 0)) return null;
  const published = Number(body.time_last_update_unix) * 1000;
  return {
    rates: { USD: round2(pkr), GBP: round2(pkr / gbp) },
    publishedAt: published > 0 ? new Date(published) : new Date(),
  };
}

const moved = (a, b) => Math.abs(a - b) / b;

// R-2: accept, hold as pending (a big jump must repeat), or reject (plan §3.3).
function evaluate(next, current) {
  for (const c of fx.CURRENCIES) {
    const [lo, hi] = fx.LIMITS[c];
    if (!(next[c] >= lo && next[c] <= hi)) return { action: "reject", reason: `${c} ${next[c]} out of range` };
  }
  if (!current?.rates) return { action: "accept" };

  const jumped = fx.CURRENCIES.find((c) => moved(next[c], current.rates[c]) > fx.MAX_JUMP);
  if (!jumped) return { action: "accept" };

  const confirmed = current.pending?.rates && fx.CURRENCIES.every((c) => moved(next[c], current.pending.rates[c]) <= fx.CONFIRM_WITHIN);
  return confirmed ? { action: "accept" } : { action: "pending", reason: `${jumped} jumped to ${next[jumped]}` };
}

async function fetchProvider() {
  const res = await fetch(fx.FX_API_URL, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(fx.TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const parsed = parse(await res.json().catch(() => null)); // never log the body itself
  if (!parsed) throw new Error("unexpected response");
  return parsed;
}

const view = (doc) => (doc?.rates ? { rates: doc.rates, updatedAt: doc.sourceUpdatedAt || null } : null);

async function refresh(current, now) {
  let next;
  try {
    next = await fetchProvider();
  } catch (err) {
    const reason = err.name === "TimeoutError" ? "timeout" : err.message;
    console.warn(`[fx] fetch failed: ${reason} — keeping the last good rate`);
    await ExchangeRate.updateOne({ _id: ID }, { $set: { lastError: reason } });
    return view(current);
  }

  const verdict = evaluate(next.rates, current);
  if (verdict.action === "accept") {
    const saved = { rates: next.rates, sourceUpdatedAt: next.publishedAt, pending: null, lastError: null };
    await ExchangeRate.updateOne({ _id: ID }, { $set: saved });
    return view(saved);
  }
  console.warn(`[fx] rate ${verdict.action === "pending" ? "held for confirmation" : "rejected"}: ${verdict.reason}`);
  const update = { lastError: verdict.reason };
  if (verdict.action === "pending") update.pending = { rates: next.rates, seenAt: new Date(now) };
  await ExchangeRate.updateOne({ _id: ID }, { $set: update });
  return view(current);
}

async function getRates(now = Date.now()) {
  let current = null;
  try {
    current = await ExchangeRate.findById(ID).lean();
    const every = current?.rates ? fx.REFRESH_MS : fx.RETRY_MS;
    if (current?.checkedAt && now - current.checkedAt < every) return view(current);

    // Atomic claim: only the request that moves checkedAt forward fetches; the
    // others keep serving the stored rate (plan §3.2).
    const stale = new Date(now - every);
    try {
      current = await ExchangeRate.findOneAndUpdate(
        { _id: ID, $or: [{ checkedAt: null }, { checkedAt: { $lt: stale } }] },
        { $set: { checkedAt: new Date(now) } },
        { upsert: true, returnDocument: "before", lean: true }
      );
    } catch (err) {
      if (err.code === 11000) return view(await ExchangeRate.findById(ID).lean()); // someone else claimed it
      throw err;
    }
    return await refresh(current, now);
  } catch (err) {
    console.error(`[fx] ${err.message}`);
    return view(current);
  }
}

module.exports = { getRates, parse, evaluate };

// PayPal settings (spec 004 §4, plan §2).
//   PAYPAL_MODE = off (default) | simulated | sandbox | live
// simulated needs no keys and never moves money; sandbox/live need the store's
// PayPal REST app keys. PAYPAL_API_BASE is a test-only override (mock PayPal).
const read = (name) => (typeof process.env[name] === "string" ? process.env[name].trim() : "");

const MODES = ["off", "simulated", "sandbox", "live"];
const API_BASES = { sandbox: "https://api-m.sandbox.paypal.com", live: "https://api-m.paypal.com" };

const rawMode = read("PAYPAL_MODE").toLowerCase();
const mode = MODES.includes(rawMode) ? rawMode : "off";
if (rawMode && !MODES.includes(rawMode)) console.warn(`[paypal] unknown PAYPAL_MODE "${rawMode}" — PayPal is off`);

const rate = Number(read("PAYPAL_USD_RATE")) || 280; // Rs per US dollar (spec §9.1)
const clientId = read("PAYPAL_CLIENT_ID");
const clientSecret = read("PAYPAL_CLIENT_SECRET");
const apiBase = read("PAYPAL_API_BASE") || API_BASES[mode] || "";

// Sandbox/live are ready only once PayPal accepts the keys. One OAuth call, then the
// token is reused until shortly before it expires (plan §2, AC-5.2).
let cached = null; // { token, expires }
let lastProblem = "";

const note = (problem) => {
  if (problem !== lastProblem) console.warn(`[paypal] ${mode} mode not ready: ${problem} — PayPal is hidden`);
  lastProblem = problem;
};

async function getAccessToken() {
  if (cached && Date.now() < cached.expires) return cached.token;
  const res = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw Object.assign(new Error(`PayPal rejected the keys (HTTP ${res.status})`), { status: res.status });
  const data = await res.json();
  cached = { token: data.access_token, expires: Date.now() + (Number(data.expires_in) - 60) * 1000 };
  return cached.token;
}

async function isReady() {
  if (mode === "off") return false;
  if (mode === "simulated") return true;
  if (!clientId || !clientSecret) {
    note("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET missing");
    return false;
  }
  try {
    await getAccessToken();
    lastProblem = "";
    return true;
  } catch (err) {
    note(err.name === "TimeoutError" ? "PayPal didn't answer" : err.message);
    return false;
  }
}

module.exports = { mode, rate, apiBase, isReady, getAccessToken };

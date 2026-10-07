// Exchange-rate settings (spec 007, plan §2–3). Prices stay in rupees; these rates
// only convert them for display. FX_API_URL is a test-only override (mock provider).
const read = (name) => (typeof process.env[name] === "string" ? process.env[name].trim() : "");

module.exports = {
  FX_API_URL: read("FX_API_URL") || "https://open.er-api.com/v6/latest/USD",
  CURRENCIES: ["USD", "GBP"],
  // Sensible rupees-per-unit ranges (R-2); anything outside is a broken response.
  LIMITS: { USD: [100, 1000], GBP: [100, 1500] },
  MAX_JUMP: 0.2, // a bigger move must be seen twice before we believe it (plan §3.3)
  CONFIRM_WITHIN: 0.02,
  REFRESH_MS: 12 * 60 * 60 * 1000,
  RETRY_MS: 10 * 60 * 1000, // no good rate yet: try again sooner
  TIMEOUT_MS: 3000,
  CREDIT: { name: "ExchangeRate-API", url: "https://www.exchangerate-api.com" }, // R-4
};

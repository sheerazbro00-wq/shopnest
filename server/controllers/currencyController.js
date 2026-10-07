const { getRates } = require("../services/exchangeRates");
const { CREDIT } = require("../config/currency");

// GET /api/currency — public. Display rates as rupees per unit (spec 007 plan §3.4).
// The CDN keeps the answer for an hour, so most visitors never reach this function (R-3).
const getCurrency = async (req, res) => {
  const data = await getRates();
  res.set(
    "Cache-Control",
    data ? "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" : "public, max-age=60, s-maxage=60"
  );
  res.json({ base: "PKR", rates: data?.rates || null, updatedAt: data?.updatedAt || null, credit: CREDIT });
};

module.exports = { getCurrency };

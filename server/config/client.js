// Where the storefront lives. CLIENT_URL may list several origins separated by
// commas (e.g. the production domain and a preview URL); the first is the main one.
const clientOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

// Used to build links (Stripe return URLs, password-reset emails).
const clientUrl = clientOrigins[0] || "http://localhost:5173";

module.exports = { clientOrigins, clientUrl };

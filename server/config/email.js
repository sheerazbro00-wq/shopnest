// Email settings (spec 001). Without BREVO_API_KEY and EMAIL_FROM, email is
// switched off and the app behaves exactly as before (R-8).
const read = (name) => (typeof process.env[name] === "string" ? process.env[name].trim() : "");

const brevoApiKey = read("BREVO_API_KEY");
const fromEmail = read("EMAIL_FROM");

module.exports = {
  emailEnabled: Boolean(brevoApiKey && fromEmail),
  brevoApiKey,
  from: { email: fromEmail, name: read("EMAIL_FROM_NAME") || "ShopNest" },
  // Owner alerts for new orders (US-4); empty = alerts off.
  storeNotifyEmail: read("STORE_NOTIFY_EMAIL"),
};

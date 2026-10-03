const { emailEnabled, brevoApiKey, from } = require("../../config/email");

// Sends one email through Brevo's transactional API (plan 001 §4).
// Never throws: callers get { sent: true } or { sent: false, reason }, where
// reason is "disabled" | "test-address" | "error" (R-2).

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 5000; // a slow provider must not hang a checkout (R-2)

// "someone@gmail.com" -> "so***@gmail.com" — enough to debug, not a full address in logs.
const mask = (email) => {
  const [user = "", domain = ""] = String(email).split("@");
  return `${user.slice(0, 2)}***@${domain}`;
};

// Demo data and tests use reserved .test domains; those never get real mail (R-6).
const isTestAddress = (email) => /\.test$/i.test(String(email).split("@")[1] || "");

async function sendEmail({ to, subject, html, text, tag = "email" }) {
  const log = (result) => console.log(`[email] ${tag} -> ${mask(to)}: ${result}`);

  if (!emailEnabled) return { sent: false, reason: "disabled" };
  if (!to || isTestAddress(to)) {
    log("skipped (test address)");
    return { sent: false, reason: "test-address" };
  }

  try {
    const res = await fetch(BREVO_URL, {
      method: "POST",
      headers: { "api-key": brevoApiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: from,
        replyTo: from,
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
        tags: [tag],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // Brevo's error code is safe to log; its message can echo request data, so skip it (R-5).
      const body = await res.json().catch(() => ({}));
      log(`failed (HTTP ${res.status}${body.code ? ` ${body.code}` : ""})`);
      return { sent: false, reason: "error" };
    }
    const { messageId } = await res.json().catch(() => ({}));
    log("sent");
    return { sent: true, messageId };
  } catch (err) {
    log(`failed (${err.name === "TimeoutError" ? "timeout" : err.name})`);
    return { sent: false, reason: "error" };
  }
}

module.exports = { sendEmail, isTestAddress, mask };

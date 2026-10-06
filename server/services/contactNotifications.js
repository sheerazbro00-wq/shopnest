const ContactMessage = require("../models/ContactMessage");
const { emailEnabled, storeNotifyEmail } = require("../config/email");
const { clientUrl } = require("../config/client");
const { sendEmail } = require("./email/send");
const contactAlert = require("./email/templates/contactAlert");
const contactReceived = require("./email/templates/contactReceived");

const DAY_MS = 24 * 60 * 60 * 1000;

// Spec 006: tell the owner about a new Contact message (Reply → the visitor), and confirm
// receipt to the visitor at most once a day per address (R-2). Both are awaited, as the
// API is serverless (spec 001), and nothing here ever throws (AC-3.1).
async function notifyContactMessage(message) {
  if (!emailEnabled) return { alert: "skipped", received: "skipped" };
  try {
    const earlier = await ContactMessage.countDocuments({
      _id: { $ne: message._id },
      email: message.email,
      createdAt: { $gte: new Date(Date.now() - DAY_MS) },
    });

    const sendAlert = storeNotifyEmail
      ? sendEmail({
          to: storeNotifyEmail,
          replyTo: { email: message.email, name: message.name },
          tag: "contact-alert",
          ...contactAlert({ message, adminUrl: `${clientUrl}/admin/messages/${message._id}` }),
        })
      : Promise.resolve({ sent: false, reason: "no-recipient" });
    const sendReceived = earlier === 0 ? sendEmail({ to: message.email, tag: "contact-received", ...contactReceived() }) : Promise.resolve({ sent: false, reason: "already-confirmed-today" });

    const [alert, received] = await Promise.all([sendAlert, sendReceived]);
    return { alert: alert.sent ? "sent" : alert.reason, received: received.sent ? "sent" : received.reason };
  } catch (err) {
    console.error(`[email] contact notifications failed: ${err.message}`);
    return { alert: "error", received: "error" };
  }
}

module.exports = { notifyContactMessage };

const { FONT, escapeHtml, formatDate, button, heading, layout, textFooter } = require("../layout");

// Spec 006 US-1: a new Contact-page message, for the store owner. Everything the visitor
// typed is escaped and shown as text; "Reply" goes to the visitor (set by the caller).
module.exports = function contactAlert({ message, adminUrl }) {
  // One line, whatever was typed: line breaks in a subject could smuggle in extra headers.
  const subject = `New message from ${String(message.name).replace(/\s+/g, " ").trim().slice(0, 60)}`;

  const detail = (label, value) => `
    <tr>
      <td style="padding:4px 12px 4px 0;font:400 14px ${FONT};color:#777777;white-space:nowrap;vertical-align:top">${label}</td>
      <td style="padding:4px 0;font:600 14px ${FONT};color:#111111">${value}</td>
    </tr>`;

  const body = `
    ${heading("New message")}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px">
      ${detail("From", escapeHtml(message.name))}
      ${detail("Email", escapeHtml(message.email))}
      ${detail("Sent", escapeHtml(formatDate(message.createdAt)))}
    </table>
    <div style="margin:0 0 20px;padding:14px 16px;border-left:3px solid #111111;background:#f6f6f6;font:400 15px/1.6 ${FONT};color:#222222;white-space:pre-wrap">${escapeHtml(message.message)}</div>
    ${button(adminUrl, "Open in admin")}
    <p style="margin:16px 0 0;font:400 13px/1.6 ${FONT};color:#777777">Reply to this email to answer ${escapeHtml(message.name)} directly.</p>`;

  const text = `New message from ${message.name} <${message.email}>
${formatDate(message.createdAt)}

${message.message}

Open in admin: ${adminUrl}
Reply to this email to answer them directly.
${textFooter()}`;

  return { subject, html: layout({ title: subject, preheader: String(message.message).slice(0, 90), body }), text };
};

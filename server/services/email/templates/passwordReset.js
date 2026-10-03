const { escapeHtml, button, heading, paragraph, muted, layout, textFooter } = require("../layout");

// US-1: password reset link (valid 30 minutes, single use).
module.exports = function passwordReset({ name, link }) {
  const first = String(name || "").split(/\s+/)[0] || "there";
  const subject = "Reset your ShopNest password";

  const body = `
    ${heading("Reset your password")}
    ${paragraph(`Hi ${escapeHtml(first)}, we received a request to reset the password for your ShopNest account.`)}
    ${button(link, "Choose a new password")}
    ${muted("This link expires in 30 minutes and can be used once. If you didn't ask to reset your password, you can ignore this email — your password won't change.")}`;

  const text = `Hi ${first},

We received a request to reset the password for your ShopNest account.

Choose a new password: ${link}

This link expires in 30 minutes and can be used once. If you didn't ask to reset your password, you can ignore this email.
${textFooter()}`;

  return { subject, html: layout({ title: subject, preheader: "Your password reset link (valid for 30 minutes)", body }), text };
};

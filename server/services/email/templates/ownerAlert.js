const { FONT, escapeHtml, rupees, formatDate, button, heading, layout, textFooter } = require("../layout");
const { itemsHtml, totalsHtml, itemsText, totalsText } = require("./orderParts");

// US-4: new-order alert for the store owner. Links to the admin panel, which
// requires an admin login — so no access token is ever put in this email.
module.exports = function ownerAlert({ order, adminUrl, paymentLine, paymentLabel }) {
  const a = order.shippingAddress || {};
  const customer = `${a.firstName || ""} ${a.lastName || ""}`.trim();
  const subject = `New order #${order.orderNumber} — ${rupees(order.totalPrice)} (${paymentLabel})`;
  const count = order.orderItems.reduce((n, i) => n + i.qty, 0);

  const detail = (label, value) => `
    <tr>
      <td style="padding:4px 12px 4px 0;font:400 14px ${FONT};color:#777777;white-space:nowrap;vertical-align:top">${label}</td>
      <td style="padding:4px 0;font:600 14px ${FONT};color:#111111">${value}</td>
    </tr>`;

  const body = `
    ${heading(`New order #${order.orderNumber}`)}
    <p style="margin:0 0 18px;font:400 13px ${FONT};color:#777777">${escapeHtml(formatDate(order.createdAt))} · ${count} ${count === 1 ? "item" : "items"}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px">
      ${detail("Customer", escapeHtml(customer))}
      ${detail("Phone", escapeHtml(order.phone))}
      ${detail("City", escapeHtml(a.city))}
      ${detail("Email", escapeHtml(order.email))}
    </table>
    ${itemsHtml(order.orderItems)}
    ${totalsHtml(order, paymentLine)}
    ${button(adminUrl, "Open in admin")}`;

  const text = `New order #${order.orderNumber} — ${formatDate(order.createdAt)}

Customer: ${customer}
Phone: ${order.phone}
City: ${a.city || ""}
Email: ${order.email}

${itemsText(order.orderItems)}

${totalsText(order, paymentLine)}

Open in admin: ${adminUrl}
${textFooter()}`;

  return { subject, html: layout({ title: subject, preheader: `${customer} · ${a.city || ""} · ${paymentLine}`, body }), text };
};

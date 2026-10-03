const { FONT, escapeHtml, rupees, thumb } = require("../layout");

// Pieces shared by the customer receipt and the owner alert.

const variantOf = (item) => [item.color, item.size].filter(Boolean).join(" / ");

const itemsHtml = (items) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #eeeeee">
    ${items
      .map(
        (i) => `
    <tr>
      <td width="64" style="padding:14px 12px 14px 0;border-bottom:1px solid #eeeeee;vertical-align:top">
        ${i.image ? `<img src="${escapeHtml(thumb(i.image))}" width="56" height="70" alt="" style="display:block;width:56px;height:70px;object-fit:cover;border-radius:6px;background:#f2f2f2">` : ""}
      </td>
      <td style="padding:14px 0;border-bottom:1px solid #eeeeee;vertical-align:top;font:400 14px/1.5 ${FONT};color:#111111">
        <strong style="font-weight:600">${escapeHtml(i.name)}</strong><br>
        <span style="color:#777777;font-size:13px">${escapeHtml(variantOf(i))}${variantOf(i) ? " · " : ""}Qty ${escapeHtml(i.qty)}</span>
      </td>
      <td align="right" style="padding:14px 0 14px 12px;border-bottom:1px solid #eeeeee;vertical-align:top;white-space:nowrap;font:600 14px ${FONT};color:#111111">
        ${rupees(i.price * i.qty)}
      </td>
    </tr>`
      )
      .join("")}
  </table>`;

const totalsHtml = (order, paymentLine) => {
  const row = (label, value, strong = false) => `
    <tr>
      <td style="padding:4px 0;font:${strong ? 700 : 400} ${strong ? 16 : 14}px ${FONT};color:${strong ? "#111111" : "#555555"}">${label}</td>
      <td align="right" style="padding:4px 0;font:${strong ? 700 : 400} ${strong ? 16 : 14}px ${FONT};color:#111111;white-space:nowrap">${value}</td>
    </tr>`;
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px">
    ${row("Subtotal", rupees(order.itemsPrice))}
    ${row("Shipping", order.shippingPrice ? rupees(order.shippingPrice) : "Free")}
    ${row("Total", rupees(order.totalPrice), true)}
  </table>
  <p style="margin:14px 0 0;padding:12px 14px;background:#f6f6f6;border-radius:6px;font:600 14px ${FONT};color:#111111">${escapeHtml(paymentLine)}</p>`;
};

const addressLines = (order) => {
  const a = order.shippingAddress || {};
  return [`${a.firstName || ""} ${a.lastName || ""}`.trim(), a.address, a.apartment, [a.city, a.postalCode].filter(Boolean).join(" "), a.country, order.phone].filter(Boolean);
};

const addressHtml = (order) => `
  <h2 style="margin:24px 0 6px;font:700 14px ${FONT};color:#111111">Shipping address</h2>
  <p style="margin:0;font:400 14px/1.6 ${FONT};color:#555555">${addressLines(order).map(escapeHtml).join("<br>")}</p>`;

const itemsText = (items) => items.map((i) => `- ${i.name}${variantOf(i) ? ` (${variantOf(i)})` : ""} x${i.qty}  ${rupees(i.price * i.qty)}`).join("\n");

const totalsText = (order, paymentLine) =>
  `Subtotal: ${rupees(order.itemsPrice)}\nShipping: ${order.shippingPrice ? rupees(order.shippingPrice) : "Free"}\nTotal: ${rupees(order.totalPrice)}\n${paymentLine}`;

module.exports = { itemsHtml, totalsHtml, addressHtml, addressLines, itemsText, totalsText };

const { escapeHtml, formatDate, button, heading, paragraph, muted, layout, textFooter } = require("../layout");
const { itemsHtml, totalsHtml, addressHtml, addressLines, itemsText, totalsText } = require("./orderParts");

// US-2 / US-3: the customer's receipt. Knows nothing about payment methods —
// it just prints the `paymentLine` it is given (R-7).
module.exports = function orderConfirmation({ order, orderUrl, paymentLine }) {
  const first = order.shippingAddress?.firstName || "there";
  const subject = `Order #${order.orderNumber} confirmed`;

  const body = `
    ${heading(`Thank you, ${first}!`)}
    ${paragraph(`Your order <strong>#${escapeHtml(order.orderNumber)}</strong> is confirmed. We're getting it ready and will let you know when it ships.`)}
    <p style="margin:0 0 18px;font:400 13px Helvetica, Arial, sans-serif;color:#777777">Placed on ${escapeHtml(formatDate(order.createdAt))}</p>
    ${itemsHtml(order)}
    ${totalsHtml(order, paymentLine)}
    ${addressHtml(order)}
    ${button(orderUrl, "View your order")}
    ${muted("Questions about your order? Just reply to this email.")}`;

  const text = `Thank you, ${first}!

Your order #${order.orderNumber} is confirmed. Placed on ${formatDate(order.createdAt)}.

${itemsText(order)}

${totalsText(order, paymentLine)}

Shipping address:
${addressLines(order).join("\n")}

View your order: ${orderUrl}

Questions about your order? Just reply to this email.
${textFooter()}`;

  return { subject, html: layout({ title: subject, preheader: `${paymentLine} — we're preparing your order.`, body }), text };
};

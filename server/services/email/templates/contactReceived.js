const store = require("../../../config/store");
const { escapeHtml, heading, paragraph, muted, layout, textFooter } = require("../layout");

// Spec 006 US-2: "we've got your message". Fixed text only — nothing the visitor typed,
// not even their name — so the form can't be used to send other people spam (R-1).
module.exports = function contactReceived() {
  const subject = "We've received your message";
  const whatsapp = `https://wa.me/${store.phone.replace(/\D/g, "")}`;

  const body = `
    ${heading("Thanks for getting in touch")}
    ${paragraph("Hi there, we've received your message and a member of our team will reply by email, usually within 24 hours (Monday to Saturday).")}
    ${paragraph(`Need us sooner? Call or WhatsApp us on <a href="${escapeHtml(whatsapp)}" style="color:#111111">${escapeHtml(store.phone)}</a>, ${escapeHtml(store.hours)}.`)}
    ${muted("If you didn't contact ShopNest, you can ignore this email.")}`;

  const text = `Hi there,

We've received your message and a member of our team will reply by email, usually within 24 hours (Monday to Saturday).

Need us sooner? Call or WhatsApp us on ${store.phone}, ${store.hours}.

If you didn't contact ShopNest, you can ignore this email.
${textFooter()}`;

  return { subject, html: layout({ title: subject, preheader: "We'll reply within 24 hours.", body }), text };
};

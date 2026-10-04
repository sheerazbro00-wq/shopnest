const store = require("../../config/store");

// Shared building blocks for every ShopNest email (plan 001 §8).
// Emails are table-based with inline styles: many mail apps ignore <style>
// blocks, flexbox and grid.

const FONT = "Helvetica, Arial, sans-serif";

// Everything a customer typed passes through this before it reaches HTML (R-3).
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const rupees = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString("en-US")}`;

// "3 October 2026, 10:36 pm" in the store's time zone.
const formatDate = (d) =>
  new Date(d)
    .toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
    .replace(" at ", ", ")
    .replace(/\s?([ap])m$/i, " $1m");

// Product photos come from Shopify's CDN or Cloudinary (spec 002); both resize on request.
// Email clients get plain JPG: some can't show WebP/AVIF.
const thumb = (url, width = 128) => {
  if (!url) return "";
  if (/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url))
    return url.replace("/image/upload/", `/image/upload/f_jpg,q_auto,c_limit,w_${width}/`);
  if (!/cdn\.shopify\.com/.test(url)) return url;
  return url + (url.includes("?") ? "&" : "?") + `width=${width}`;
};

// A button that renders in Outlook too (a padded table cell, not just a styled link).
const button = (url, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px">
    <tr><td style="background:#111111;border-radius:6px">
      <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 28px;font:600 15px ${FONT};color:#ffffff;text-decoration:none;letter-spacing:.02em">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;

const heading = (text) => `<h1 style="margin:0 0 12px;font:700 22px/1.3 ${FONT};color:#111111">${escapeHtml(text)}</h1>`;

const paragraph = (html) => `<p style="margin:0 0 14px;font:400 15px/1.6 ${FONT};color:#333333">${html}</p>`;

const muted = (html) => `<p style="margin:16px 0 0;font:400 13px/1.6 ${FONT};color:#777777">${html}</p>`;

// Full email document. `preheader` is the grey preview line in the inbox list.
function layout({ title, preheader = "", body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f2f2f2">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f2f2">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
      <tr><td align="center" style="background:#111111;border-radius:10px 10px 0 0;padding:22px 24px">
        <span style="font:400 22px ${FONT};letter-spacing:.32em;color:#ffffff">SHOPNEST</span>
      </td></tr>
      <tr><td style="background:#ffffff;padding:32px 28px;border-radius:0 0 10px 10px">
        ${body}
      </td></tr>
      <tr><td align="center" style="padding:20px 12px 8px;font:400 12px/1.7 ${FONT};color:#888888">
        ${escapeHtml(store.name)} · ${escapeHtml(store.address)}<br>
        ${escapeHtml(store.phone)} · ${escapeHtml(store.hours)}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// Plain-text footer shared by the text versions (R-4).
const textFooter = () => `\n--\n${store.name} · ${store.address}\n${store.phone} · ${store.hours}\n`;

module.exports = { FONT, escapeHtml, rupees, formatDate, thumb, button, heading, paragraph, muted, layout, textFooter };

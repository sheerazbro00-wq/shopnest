// Allowlist HTML sanitizer for the small bits of rich text we store
// (product descriptions, size charts).
//
// It tokenises instead of deleting tags in one regex pass: a single pass is
// bypassable (`<scr<i>ipt>` -> remove `<i>` -> `<script>`). Here every text
// run between tags is escaped, so leftover fragments can never re-form a tag.

const TEXT_TAGS = ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "h3", "h4"];
const TABLE_TAGS = ["table", "thead", "tbody", "tr", "td", "th"];
const VOID = new Set(["br"]);

const escapeText = (s) =>
  s
    .replace(/&(?!(?:[a-z]+|#\d+|#x[0-9a-f]+);)/gi, "&amp;") // keep existing entities
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function sanitizeHtml(html, { allowTables = false } = {}) {
  const allowed = new Set(allowTables ? [...TEXT_TAGS, ...TABLE_TAGS] : TEXT_TAGS);
  const src = String(html || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|noscript|template|colgroup)\b[\s\S]*?<\/\1\s*>/gi, "");

  const TAG = /<\/?([a-z][a-z0-9]*)\b([^<>]*)>/gi;
  let out = "";
  let last = 0;
  let m;
  while ((m = TAG.exec(src))) {
    out += escapeText(src.slice(last, m.index));
    last = TAG.lastIndex;
    const name = m[1].toLowerCase();
    if (!allowed.has(name)) continue;
    if (m[0].startsWith("</")) {
      if (!VOID.has(name)) out += `</${name}>`;
      continue;
    }
    // Only colspan/rowspan survive, and only as plain numbers.
    const keep = allowTables ? (m[2].match(/\s(colspan|rowspan)="\d{1,2}"/gi) || []).join("") : "";
    out += `<${name}${keep}>`;
  }
  out += escapeText(src.slice(last));
  return out.replace(/&nbsp;/g, " ").replace(/[ \t\r\n]+/g, " ").trim();
}

module.exports = { sanitizeHtml };

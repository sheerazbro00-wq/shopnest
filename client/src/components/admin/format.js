// Formatting helpers shared by the admin screens.

export const rupees = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString("en-US")}`;

// Axis/tile compact form: Rs 12.9K, Rs 1.2M
export function rupeesCompact(n) {
  const v = Number(n) || 0;
  if (v >= 1e6) return `Rs ${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (v >= 1e3) return `Rs ${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1).replace(/\.0$/, "")}K`;
  return `Rs ${Math.round(v)}`;
}

const time = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();

// "Today at 3:12 pm" / "Yesterday at 9:05 am" / "Sep 21 at 1:40 pm"
export function orderDate(value) {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  if (d.toDateString() === today.toDateString()) return `Today at ${time(d)}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday at ${time(d)}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${time(d)}`;
}

// "2026-09-21" -> "Sep 21" (dates from the API are store-local calendar days)
export const shortDay = (ymd) => new Date(`${ymd}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Fulfilment status -> badge label + tone. Tones map to reserved status colours.
export const STATUS_BADGE = {
  Pending: { label: "Unfulfilled", tone: "warning" },
  Shipped: { label: "Shipped", tone: "info" },
  Delivered: { label: "Delivered", tone: "success" },
  Cancelled: { label: "Cancelled", tone: "neutral" },
  "Awaiting payment": { label: "Awaiting payment", tone: "critical" },
};

export const paymentBadge = (order) =>
  order.isPaid
    ? { label: "Paid", tone: "neutral" }
    : order.status === "Cancelled"
      ? { label: "Voided", tone: "neutral" }
      : { label: order.paymentMethod === "COD" ? "Payment pending (COD)" : "Payment pending", tone: "warning" };

// Inbox-style: "3:12 pm" today, "Yesterday", "Sep 21", or "Sep 21, 2025" for older years.
export function shortDate(value) {
  const d = new Date(value);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return time(d);
  if (d.toDateString() === new Date(today.getTime() - 86400000).toDateString()) return "Yesterday";
  const opts = { month: "short", day: "numeric", ...(d.getFullYear() !== today.getFullYear() && { year: "numeric" }) };
  return d.toLocaleDateString("en-US", opts);
}

// "September 21, 2026 at 3:12 pm"
export const fullDate = (value) => {
  const d = new Date(value);
  return `${d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at ${time(d)}`;
};

// Initials for avatars: "Ahmed Khan" -> "AK"
export const initials = (name = "") =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

export const waLink = (phone) => `https://wa.me/${String(phone).replace(/[\s-]/g, "").replace(/^\+/, "").replace(/^0/, "92")}`;

// Safe mailto: the address is URL-encoded too, so an address like
// "a?cc=x@y.z" can't smuggle extra headers into the link.
export function mailto(email, { subject, body } = {}) {
  const query = [subject && `subject=${encodeURIComponent(subject)}`, body && `body=${encodeURIComponent(body)}`].filter(Boolean).join("&");
  return `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}${query ? `?${query}` : ""}`;
}

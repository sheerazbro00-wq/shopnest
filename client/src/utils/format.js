export const formatPrice = (amount) =>
  `Rs.${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

// Both image CDNs resize on the fly: Shopify via the `width` query param, Cloudinary
// (uploaded photos, spec 002) via a transformation in the path. f_auto serves
// WebP/AVIF where supported; q_auto picks the smallest sharp file (AC-4.1).
export const sized = (url, width) => {
  if (!url) return "";
  const u = url.replace(/^\/\//, "https://");
  if (CLOUDINARY.test(u)) return u.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
  return `${u}${u.includes("?") ? "&" : "?"}width=${width}`;
};

export const srcSet = (url, widths = [360, 540, 720, 900, 1080]) =>
  widths.map((w) => `${sized(url, w)} ${w}w`).join(", ");

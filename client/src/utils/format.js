export const formatPrice = (amount) =>
  `Rs.${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Shopify's CDN resizes on the fly via the `width` query param.
export const sized = (url, width) => {
  if (!url) return "";
  const u = url.replace(/^\/\//, "https://");
  return `${u}${u.includes("?") ? "&" : "?"}width=${width}`;
};

export const srcSet = (url, widths = [360, 540, 720, 900, 1080]) =>
  widths.map((w) => `${sized(url, w)} ${w}w`).join(", ");

// Checks for pasted image links (spec 002 US-3). The server has the same search-page
// rule in server/utils/imageLinks.js; keep the two in step.

const SEARCH_HOSTS = /(^|\.)(google\.[a-z.]+|bing\.com|search\.yahoo\.com|duckduckgo\.com|yandex\.[a-z.]+|baidu\.com)$/i;
const LOAD_TIMEOUT_MS = 10000;

export const SEARCH_PAGE_MESSAGE =
  "This is a search page, not a photo. Open the image, then copy the image address — or use Upload images.";
export const NOT_IMAGE_MESSAGE = "This link isn't a picture. Open the image itself and copy its address — or use Upload images.";

// A Google "imgres" link wraps the real picture in its imgurl parameter; use that.
function unwrap(url) {
  if (/(^|\.)google\.[a-z.]+$/i.test(url.hostname) && url.pathname === "/imgres") {
    try {
      const inner = new URL(url.searchParams.get("imgurl") || "");
      if (inner.protocol === "https:") return inner;
    } catch {
      /* treated as a search page below */
    }
  }
  return url;
}

// Resolves when the browser can actually draw the link as an image.
const loadsAsImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    const done = (ok) => {
      clearTimeout(timer);
      img.onload = img.onerror = null;
      resolve(ok);
    };
    const timer = setTimeout(() => done(false), LOAD_TIMEOUT_MS);
    img.onload = () => done(img.naturalWidth > 0);
    img.onerror = () => done(false);
    img.src = src;
  });

// → { url } ready to add, or { error } to show the owner.
export async function checkImageLink(raw) {
  let url;
  try {
    url = unwrap(new URL(raw.trim()));
    if (url.protocol !== "https:") throw new Error();
  } catch {
    return { error: "Paste a full image link starting with https://" };
  }
  if (SEARCH_HOSTS.test(url.hostname)) return { error: SEARCH_PAGE_MESSAGE };
  if (!(await loadsAsImage(url.href))) return { error: NOT_IMAGE_MESSAGE };
  return { url: url.href };
}

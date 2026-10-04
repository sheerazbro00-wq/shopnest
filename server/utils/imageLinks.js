// Image-link checks shared by the product save (spec 002 US-3). The editor has a
// matching copy in client/src/utils/imageUrl.js; keep the two rules in step.

const SEARCH_HOSTS = /(^|\.)(google\.[a-z.]+|bing\.com|search\.yahoo\.com|duckduckgo\.com|yandex\.[a-z.]+|baidu\.com)$/i;

// A Google "imgres" link wraps the real picture in its imgurl parameter; use that.
function unwrapImageLink(url) {
  if (/(^|\.)google\.[a-z.]+$/i.test(url.hostname) && url.pathname === "/imgres") {
    try {
      const inner = new URL(url.searchParams.get("imgurl") || "");
      if (inner.protocol === "https:") return inner;
    } catch {
      /* fall through: treated as a search page below */
    }
  }
  return url;
}

// Search engines' own pages (results, image results, redirects) are never photos.
// Their image CDNs (e.g. *.gstatic.com, *.googleusercontent.com) don't match.
const isSearchPage = (url) => SEARCH_HOSTS.test(url.hostname);

const SEARCH_PAGE_MESSAGE =
  "This is a search page, not a photo. Open the image, then copy the image address — or use Upload images.";

module.exports = { unwrapImageLink, isSearchPage, SEARCH_PAGE_MESSAGE };

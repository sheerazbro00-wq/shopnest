// Handles of recently opened products, newest first, kept in this browser only.
const KEY = "shopnest_recently_viewed";
const MAX = 10;

export function getRecentlyViewed() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(handle) {
  try {
    const list = [handle, ...getRecentlyViewed().filter((h) => h !== handle)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage blocked — the section simply stays hidden */
  }
}

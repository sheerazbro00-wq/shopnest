// Find My Size answers, kept only on this device (spec 005 R-1, plan §4).
// Stored in metric (the charts are cm); the panel converts for display.
// Storage can be blocked or empty (private mode, previews): every access is guarded,
// and the feature still works for the visit from memory.

const KEY = "shopnest_fit";
let memory = null; // fallback when localStorage is unavailable

export const EMPTY_PROFILE = { units: null, weightUnit: "kg", tops: null, bottoms: null, shoes: null };

export function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved === "object") return { ...EMPTY_PROFILE, ...saved };
  } catch {
    /* blocked or corrupt — fall through */
  }
  return { ...EMPTY_PROFILE, ...(memory || {}) };
}

export function saveProfile(profile) {
  memory = profile;
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* kept in memory for this visit */
  }
  window.dispatchEvent(new Event("shopnest:fit-changed"));
}

// "Forget my measurements" (AC-2.2): the device was the only copy.
export function forgetProfile() {
  memory = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing stored */
  }
  window.dispatchEvent(new Event("shopnest:fit-changed"));
}

// Sensible ranges (AC-1.3), in metric. Messages use the shopper's unit.
export const LIMITS = {
  heightCm: [140, 210],
  weightKg: [40, 160],
  chestCm: [70, 150],
  waistSize: [26, 44],
  waistCm: [60, 130],
};

export const inRange = (key, value) => Number.isFinite(value) && value >= LIMITS[key][0] && value <= LIMITS[key][1];

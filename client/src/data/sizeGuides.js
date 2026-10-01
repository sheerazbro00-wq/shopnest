// Body-measurement size guides. Values are stored in inches (shoes: foot
// length in cm) and converted for the IN/CM toggle, so the two units can
// never disagree.

// Tops — body measurements (from the store's own product size charts).
export const tops = {
  columns: ["Chest", "Waist", "Collar", "Shoulder"],
  rows: [
    { size: "XS", values: [[30, 33], [26, 29], 13.5, 16] },
    { size: "S", values: [[33, 37], [29, 32], 14.5, 16.5] },
    { size: "M", values: [[37, 40], [32, 35], 15.5, 17] },
    { size: "L", values: [[40, 43], [35, 38], 16.5, 17.5] },
    { size: "XL", values: [[43, 46], [38, 41], 17.5, 18] },
    { size: "XXL", values: [[46, 49], [41, 44], 18.5, 18.5] },
  ],
};

// Bottoms sold in waist sizes (28-40): the size is the waist in inches.
export const bottomsWaist = {
  columns: ["Waist"],
  rows: [28, 30, 32, 34, 36, 38, 40].map((w) => ({ size: String(w), values: [w] })),
};

// Bottoms sold in letter sizes map to the same body waist as tops.
export const bottomsLetter = {
  columns: ["Waist"],
  rows: [
    { size: "S", values: [[29, 32]] },
    { size: "M", values: [[32, 35]] },
    { size: "L", values: [[35, 38]] },
    { size: "XL", values: [[38, 41]] },
    { size: "XXL", values: [[41, 44]] },
  ],
};

// Shoes — foot length in cm (heel to longest toe) with EU / UK / US sizes.
export const shoes = [
  { foot: [24.1, 24.7], eu: 39, uk: 5, us: 6 },
  { foot: [24.8, 25.4], eu: 40, uk: 6, us: 7 },
  { foot: [25.5, 26.0], eu: 41, uk: 7, us: 8 },
  { foot: [26.1, 26.7], eu: 42, uk: 8, us: 9 },
  { foot: [26.8, 27.4], eu: 43, uk: 9, us: 10 },
  { foot: [27.5, 28.0], eu: 44, uk: 10, us: 11 },
  { foot: [28.1, 28.7], eu: 45, uk: 11, us: 12 },
  { foot: [28.8, 29.4], eu: 46, uk: 12, us: 13 },
];

const round = (n, step) => Math.round(n / step) * step;
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ""));

// Format an inch value (number or [min, max]) in the chosen unit.
export function inches(value, unit) {
  const conv = (n) => (unit === "cm" ? fmt(round(n * 2.54, 0.5)) : fmt(n));
  return Array.isArray(value) ? `${conv(value[0])} - ${conv(value[1])}` : conv(value);
}

// Format a cm value (number or [min, max]) in the chosen unit.
export function centimetres(value, unit) {
  const conv = (n) => (unit === "in" ? fmt(round(n / 2.54, 0.1)) : fmt(n));
  return Array.isArray(value) ? `${conv(value[0])} - ${conv(value[1])}` : conv(value);
}

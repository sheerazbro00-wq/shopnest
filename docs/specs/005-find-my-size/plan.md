# Plan 005 — Find My Size

| | |
|---|---|
| **Spec** | [`spec.md`](spec.md) (approved 2026-10-06) |
| **Status** | Approved (2026-10-06) |
| **Next step** | [`tasks.md`](tasks.md) |

---

## 1. Shape of the solution

Everything runs **in the browser** (spec R-1, R-4). The product API already returns
`sizeChart` (sanitised HTML) with the product. A pure module reads that table and the
shopper's saved answers, and returns a recommendation. No new endpoint, no database change,
no migration.

```
Product page ──product.sizeChart (HTML)──▶ parseChart() ──▶ { kind, rows:[{size, chest|waist|eu…}] }
                                                                   │
localStorage "shopnest_fit" (answers) ─────────────────────────────▶ recommend() ──▶ { size, alt?, reason, status }
                                                                   │
                                     "Your size: L" chip  ◀────────┴──▶  Find-my-size sheet
```

Files:

| File | Purpose |
|---|---|
| `client/src/utils/sizeFinder.js` | **New.** Pure functions: `parseChart`, `kindOf`, `estimateChest`, `recommend`. No React, so they're testable in Node. |
| `client/src/utils/fitProfile.js` | **New.** Read, save and forget answers in `localStorage` (try/catch; works without storage). |
| `client/src/components/product/FindMySize.jsx` + `.css` | **New.** The sheet: questions → result → "Select L". |
| `client/src/pages/Product.jsx` | "Find my size" link / "Your size: L" chip beside the Size legend; selecting a size from the sheet. |

## 2. Reading the size chart (`parseChart`)

Charts are imported HTML tables with varying headers (spec §7). Steps:

1. Take each `<table>`. Turn rows into arrays of plain cell text (uppercase, trimmed).
2. Split the table into **blocks** at any row whose first cell starts with `SIZE` or
   `MEASUREMENT POINTS`. The block's unit comes from that cell: `(CM)` / `(INCH…)`; no unit →
   cm. **Prefer the cm block**; else use an inch block × 2.54.
3. Column names are normalised: `CHEST`; `WAIST`; `HIP`/`HIP WIDTH`; `EU`/`UK`/`US`. The first
   column is the size.
4. Size labels are mapped onto the product's own size buttons: `2XL`→`XXL`, `3XL`→`XXXL`;
   `30 / S`, `S/30` or `S /30` → whichever of `S` or `30` the product sells. Rows with no
   matching size button are dropped.
5. **Flat or full?** A chest under 80 cm, or a waist under 60 cm, is a flat (half)
   measurement → × 2. All maths below uses full circumference in cm.
6. If no usable column is found, the result is `null`, which means "no chart" (AC-1.1, R-5).

`kindOf(product, chart)` decides the questions to ask. A `EU` column means **shoes**. A `WAIST`
column, or a bottoms product type (the same regex as the size guide), means **bottoms**. A
`CHEST` column means **tops**.

## 3. Recommending (`recommend`)

### Tops and bottoms: read each style against its own design
*(Revised after the verification table: one fixed "room" window for every garment sent slim and
stretch styles two or three sizes too big.)*

- **Body**: the exact chest or waist if given. Otherwise:
  - **chest** is estimated from height and weight (spec Q1):
    `chest ≈ 49 + 2.05 × BMI + 0.1 × (height − 175)` cm, where BMI = kg ÷ m².
    Examples: 170 cm/60 kg → 91 · 175/75 → 99 · 180/85 → 103 · 185/100 → 109.
    The result says this is an estimate (AC-3.1).
  - **waist** = the usual waist size × 2.54.
- **Design room**: the style's **M** (or **32**) is cut for a standard body: chest 100 cm, waist
  32 in. So `design = garment(M) − standard body`. For example, an oversized tee might have
  +19 cm, and a slim henley −6 cm.
- For each size: `dev = (garment − shopper's body) − design`. This is how much looser (+) or closer (−)
  than intended the size would be on this shopper.
- **Pick** the size with the smallest |dev|. If it's within ±3 cm (tops) or ±2 cm (waist), that's
  the answer. If not, and there's a size on each side within the acceptable range, the result is
  **between sizes** (AC-1.5): name both, and lean the way of the fit preference.
- **Fit preference**: for tops, Slim moves one size down and Relaxed one size up, as long as that
  size is still acceptable. Trouser waists don't move for style; for bottoms, fit only breaks
  ties.
- **Acceptable** means |dev| ≤ 8 cm (tops) or 5 cm (waist). If no size is acceptable, the result is
  **no fit** (AC-1.7, R-2).
- **Wording**: a negative room means a close-cut style, and the reason says so ("…smaller than you,
  as this style is cut close to the body").

### Shoes
- Find the chart row where the shopper's system (EU, UK or US) equals their usual size; that
  row's **EU** value is the size button. A half size (e.g. UK 8.5) lands between rows →
  **between sizes**: suggest the larger one for comfort, and name both.
- Not in the chart → no fit (AC-1.7).

### Sold out (AC-1.6)
If the recommended size is sold out, the status is `soldOut`. A neighbouring size is offered
only if it is **also inside the acceptable range**; otherwise we say so plainly.

### Output
`{ status: "ok" | "between" | "soldOut" | "noFit", size, alt, reason, detail }`
- `reason`: one sentence, e.g. *"L — 116 cm around the chest, about 14 cm roomier than you: a
  regular fit."*
- `detail`: the numbers for "How we worked this out" (AC-3.1).

## 4. Remembering (`fitProfile.js`, US-2, R-1)

```js
localStorage["shopnest_fit"] = {
  units: "cm" | "in",          // chosen first (AC-1.3)
  weightUnit: "kg" | "lb",     // inches shoppers default to kg (Pakistani usage)
  tops:    { heightCm, weightKg, fit, chestCm? },
  bottoms: { waistSize, fit, waistCm? },
  shoes:   { system: "UK" | "EU" | "US", size },   // UK first in the dropdown
}
```
- Stored values are always **metric** (the charts are cm); the panel converts input and every
  displayed number to the chosen unit. Inches results are rounded to the nearest ½ in;
  feet + inches for height (AC-1.3).
- Range checks: height 140–210 cm, weight 40–160 kg, chest 70–150 cm, waist size 26–44,
  waist 60–130 cm, shoe sizes within the chart's range (AC-1.3).
- **Forget me** removes the key (AC-2.2). Nothing goes to the server; the device is the only
  copy (R-1).

## 5. UI

**Product page** (inside the Size fieldset, next to the legend):
- No answers yet → `Find my size` link (underlined, small).
- Answers saved → chip **`Your size: L`** with an `Edit` link. If the status is "between", the
  chip says `M or L`; for "no fit" it says `Check size chart`. Shoppers who never open the
  panel see the page as today (R-5).

**Sheet** (`FindMySize.jsx`): a modal `<dialog>`. On phones it's a **bottom sheet** (full
width, rounded top, ≥44 px touch targets). On desktop it's a centred card like the size-chart
modal.
1. **Unit** (first visit, tops/bottoms): two big buttons — **cm** (cm · kg) / **inches**
   (ft · in · kg). Remembered; changeable from the questions screen.
2. **Questions**: fields for the kind (tops/bottoms/shoes) in that unit; for inches a small
   kg/lb toggle on weight; fit as three pill buttons. A "Show my size" button.
3. **Result**: big size letter, `reason`, "How we worked this out" (collapsible), and
   **Select L** (selects the size and closes). Below that: *Edit answers*, *View size chart*,
   *Forget my measurements*.

Accessibility: focus moves into the dialog; Esc closes it; labelled inputs; the result is
announced (`aria-live`).

## 6. Testing

- **Node tests** on `sizeFinder.js`:
  - Every chart in `seed/data/details.json` is parsed. Report how many are usable per kind, and
    list the ones that fail.
  - Fixed cases: the S/M/L/XL tee chart for 4 sample shoppers; a "30 / S" pants chart; the
    shoe chart for EU 42, UK 8, US 9 and UK 8.5; a sold-out size; a too-small and a too-large
    shopper.
- **Verification table (DoD):** 20 real products × sample shoppers → recommended size. Checked
  by hand against the chart and saved in `docs/specs/005-find-my-size/verification.md`.
- **Playwright**: phone (360 px) and desktop — open, answer, Select L, reload → chip shows L;
  another shirt shows its own size; Forget → link returns; a product without a chart has no
  link.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Height/weight estimate wrong for unusual builds | Labelled as an estimate; exact chest is optional and always wins; a "between sizes" answer instead of false precision. |
| Odd charts misread | Parser drops what it can't map; node test lists every unusable chart; unusable = no link (R-5). |
| Shopper clears storage | They answer again — 3 fields. |

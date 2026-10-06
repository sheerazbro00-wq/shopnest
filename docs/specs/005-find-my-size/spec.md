# Spec 005 — Find My Size

| | |
|---|---|
| **Status** | Approved (2026-10-06) |
| **Owner** | ShopNest |
| **Created** | 2026-10-06 |
| **Next steps** | `plan.md` (how) → `tasks.md` (steps) → implementation |

This spec says **what** ShopNest must do and **how we'll know it works**. Technical
choices belong in `plan.md`.

---

## 1. Problem

Shoppers can't try clothes on. The product page offers a size chart, but it lists **garment**
measurements ("CHEST 54 cm" — half the chest, laid flat), which most people can't turn into
"so I need an M". So they guess:

- A wrong guess means an **exchange or return** — the most common reason online clothing
  comes back, and a cost for the store.
- Unsure shoppers often **don't buy at all**.

ShopNest already has the data to answer the question: **559 styles** carry a size chart
(chest/shoulder for tops, waist/hip for bottoms, EU/UK/US and foot length for shoes).

## 2. Goals

1. On a product page, a shopper answers a few quick questions and gets **one recommended
   size for this product**, with a plain reason.
2. Answers are **remembered**, so every later product page shows *"Your size: L"* at once.
3. Body measurements stay **private**.

## 3. Users

| Who | Needs |
|---|---|
| **Shopper** (guest or signed in) | A confident size in under 30 seconds, without a tape measure |
| **Store owner** | Fewer wrong-size exchanges |

## 4. User stories & acceptance criteria

### US-1 — Get my size for this product

> As a shopper unsure of my size, I want the store to tell me which size to pick.

- **AC-1.1** Product pages show a **"Find my size"** link next to the size buttons whenever the
  product has a usable size chart (tops, bottoms or shoes). Products without one show no link.
- **AC-1.2** It opens a short panel (full-screen sheet on phones) with questions that fit the
  product:
  - **Tops** (shirts, T-shirts, polos, jackets, …): height, weight, preferred fit
    (*Slim · Regular · Relaxed*). Optional: *"I know my chest measurement"*.
  - **Bottoms** (trousers, jeans, shorts, …): waist size the shopper usually wears
    (e.g. 32), preferred fit. Optional: exact waist measurement.
  - **Shoes**: the shopper's usual size in **UK, EU or US** — UK listed first, as most
    Pakistani shoppers know their UK size (Bata, Servis); the store's own buttons are EU.
- **AC-1.3** The panel first asks **how the shopper measures**: **cm** (height in cm, weight in
  kg) or **inches** (height in **feet + inches**, weight in **kg** by default with a **lb**
  option — the usual Pakistani way). The questions, the result and "How we worked this out"
  all use the chosen unit, and the choice is remembered. Answers are checked for sensible
  ranges (e.g. height 4'7" – 6'11" / 140–210 cm) with a friendly message.
- **AC-1.4** The result names **one size** and a short reason, e.g. *"**L** — the chest is
  116 cm around, about 14 cm roomier than you: a regular fit."* (or *"46 in around, about 5½ in
  roomier"* for an inches shopper) Tapping **Select L** picks
  that size on the product page.
- **AC-1.5** When the shopper falls **between two sizes**, the result says so and names both
  (*"M for a closer fit, L for a relaxed one"*), recommending the one matching their
  preferred fit.
- **AC-1.6** If the recommended size is **sold out**, the result says so instead of selecting
  it, and points to the nearest available size only if it would still fit.
- **AC-1.7** If no size in the chart fits (very small or very large), the result says so
  honestly and links to the full size chart — it never recommends a size that won't fit.

### US-2 — Remember me

> As a returning shopper, I don't want to answer again on every product.

- **AC-2.1** After the first answer, every product page with a chart shows **"Your size: L"**
  (for that product) next to the size buttons, without opening anything.
- **AC-2.2** The shopper can **edit** their answers or **forget them** from the panel at any
  time.
- **AC-2.3** Tops, bottoms and shoes are remembered separately (answering for a shirt doesn't
  need re-answering for another shirt, but a first pair of shoes asks the shoe question).

### US-3 — Understand the recommendation

> As a cautious shopper, I want to see why a size was chosen.

- **AC-3.1** The result has a **"How we worked this out"** line showing the product's
  measurement for the recommended size next to the shopper's (e.g. *chest 116 cm vs you
  102 cm*), and states that estimates from height and weight are approximate.
- **AC-3.2** A link opens the product's full size chart.

## 5. Rules

- **R-1 — Private by default.** Body measurements are stored **only on the shopper's device**
  (v1). They are never sent to the server, to analytics or to any third party, and are never
  visible in the admin panel.
- **R-2 — Never over-promise.** A recommendation is shown only when the chart clearly covers
  the shopper; otherwise the shopper is told and sent to the chart (AC-1.7).
- **R-3 — Product-specific.** The same shopper can get **M** for a slim shirt and **L** for a
  relaxed one — each recommendation uses that product's own chart.
- **R-4 — Fast and offline-friendly.** Recommending needs no extra network request; the panel
  opens instantly on a phone.
- **R-5 — Nothing breaks.** Products without a chart, and shoppers who never use the feature,
  see the product page exactly as today.

## 6. Out of scope (v1)

- Saving measurements to the customer account / syncing across devices
- Women's sizing, kids' sizing
- Learning from returns or from what other shoppers bought ("most people your height chose…")
- Accessories (belts, hats, socks) and products with one size
- Photo/camera body scanning

## 7. Constraints & assumptions

- Size charts are stored as HTML tables imported from the reference store; headers vary
  (e.g. *CHEST*, *TOTAL LENGTH FROM HPS*, *SIZE (CM)*, *SIZE (INCHES)*, sizes like *M/32*).
  Charts that can't be read reliably are treated as "no chart" (AC-1.1).
- Garment measurements are **flat** (half circumference) unless the chart says otherwise.
- Height-and-weight estimates of chest/waist are approximations; the optional exact
  measurement always wins (AC-1.2).

## 8. Open questions

1. **Questions for tops:** Recommendation — **height + weight + fit**, with the exact chest
   as an optional extra. Most people don't own a tape measure.
2. **Where to remember answers:** Recommendation — **on the device only** (R-1). Account sync
   can come later.
3. **Shoes:** Recommendation — ask the **usual size (EU/UK/US)** rather than foot length;
   almost everyone knows it.

## 9. Definition of done

- Every acceptance criterion checked locally and on the live store from a **real phone**.
- A table of at least **20 real products** (tops, bottoms, shoes) with sample shoppers, showing
  the recommended size and that it matches the chart by hand.
- Product pages without charts unchanged (R-5).

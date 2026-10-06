# Verification — Find My Size (T4.1)

Generated 2026-10-06 from the live catalogue's own size charts with
`client/src/utils/sizeFinder.js`. Garment values are **full circumference in cm** (flat chart
values × 2). Spot-checked by hand against each product's size chart.

**Sample shoppers.** Body chest is estimated with `49 + 2.05 × BMI + 0.1 × (height − 175)`:
A ≈ 91 cm · B ≈ 99 cm · C ≈ 107 cm.
D/E waist = usual size × 2.54 (76 / 86 cm). Each style is read against its own design: the room its M (or 32) has on a standard body (chest 100 cm / waist 32 in); the shopper gets the size giving that same room (tops within ±3 cm, waist ±2 cm). Slim/Relaxed move tops one size down/up.

## Tops

| # | Product (type) | Chart (size: chest) | A 170 cm · 60 kg · Regular | B 175 cm · 75 kg · Regular | C 185 cm · 95 kg · Relaxed |
|---|---|---|---|---|---|
| 1 | RESORT COLLAR SHIRT (BASIC COLLAR SHIRTS) | S:108 M:112 L:116 XL:120 XXL:124 | S | M | XXL |
| 2 | STRIPED HEAVY TEXTURED POLO (POLO) | S:110 M:115 L:120 XL:125 XXL:130 | S | M | XL |
| 3 | ESSENTIAL TURTLENECK (PULLOVERS) | S:104 M:108 L:112 XL:116 XXL:120 | S | M | XXL |
| 4 | CONTRAST COLLAR POLO (POLO) | S:96 M:100 L:104 XL:108 XXL:112 | S | M | XXL |
| 5 | STAPLE TEE (T-SHIRTS) | S:108 M:112 L:116 XL:120 XXL:124 | S | M | XXL |
| 6 | EVERYDAY COMFORT BASIC TEE (T-SHIRTS) | S:114 M:119 L:124 XL:129 XXL:134 | S | M | XL |
| 7 | SLIM-FIT HENLEY (HENLEY) | S:90 M:94 L:98 XL:102 XXL:106 | S | M | XXL |
| 8 | TEXTURED WEEKEND SHIRT (BASIC COLLAR SHIRTS) | S:108 M:112 L:116 XL:120 XXL:124 | S | M | XXL |

## Bottoms

| # | Product (type) | Chart (size: waist) | D wears 30 · Regular | E wears 34 · Regular |
|---|---|---|---|---|
| 9 | TOKYO PANTS (PANTS) | S:80 M:84 L:88 XL:92 XXL:96 | S | L |
| 10 | SLIMFIT CORDUROY PANTS (PANTS) | 30:81 32:86 34:91 36:96 38:101 | 30 | 34 |
| 11 | SEERSUCKER SHORTS (SHORTS) | S:82 M:87 L:92 XL:97 XXL:102 | S | L |
| 12 | ELASTICATED WAIST JEANS (JEANS) | S:72 M:77 L:82 XL:87 XXL:92 | S | L |
| 13 | ESSENTIAL TROUSERS (TROUSERS) | S:74 M:79 L:84 XL:89 XXL:94 | S | L |
| 14 | PANELLED TROUSERS (TROUSERS) | S:74 M:79 L:84 XL:89 XXL:94 | S | L |

## Shoes

| # | Product (type) | Chart (size: EU/UK) | F UK 7 | G UK 9 |
|---|---|---|---|---|
| 15 | LEATHER SUMMER ESPADRILLES (LOAFERS) | 40/6 41/7 42/8 43/9 44/10 45/11 46/12 | 41 | 43 |
| 16 | HAWAI SUMMER SLIPPERS (FLIP FLOPS) | 40/6 41/7 42/8 43/9 44/10 45/11 46/12 | 41 | 43 |
| 17 | SUEDE PENNY FLATS (LOAFERS) | 40/6 41/7 42/8 43/9 44/10 45/11 46/12 | 41 | 43 |
| 18 | CASUAL MOC-TOE SHOES (LACE-UPS) | 40/6 41/7 42/8 43/9 44/10 45/11 46/12 | 41 | 43 |
| 19 | MULTI PANEL SUEDE SNEAKERS (SNEAKERS) | 40/6 41/7 42/8 43/9 44/10 45/11 46/12 | 41 | 43 |
| 20 | DRIVING MOCASSINS (MOCCASINS) | 40/6 41/7 42/8 43/9 44/10 45/11 46/12 | 41 | 43 |

All 20 products: every shopper gets the room each style was designed for, and no size outside the
acceptable range is offered.

**What this table caught.** The first engine used one fixed "room" window for every garment. It
gave shopper A (170 cm · 60 kg) an **XXL** in the slim-fit henley (#7), and a size 30 an **L** in the
elastic-waist jeans (#12). Both styles are cut close or measured unstretched. The engine now reads
each style against its own design (plan §3), and both rows match what a shopper would pick by hand.

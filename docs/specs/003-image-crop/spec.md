# Spec 003 — Crop product photos

| | |
|---|---|
| **Status** | Deferred (2026-10-04) — owner chose not to build it for now. Tip instead: shoot in the phone camera's default 3 : 4 with the product centred; the store trims only ~6 % per side. |
| **Owner** | ShopNest |
| **Created** | 2026-10-04 |
| **Builds on** | [Spec 002 — Product image upload](../002-image-upload/spec.md) (cropping was out of scope there) |
| **Next steps** | `plan.md` (how) → `tasks.md` (steps) → implementation |

This spec says **what** ShopNest must do and **how we'll know it works**. Technical
choices belong in `plan.md`.

---

## 1. Problem

Since spec 002 the owner uploads photos straight from their phone. Phone photos rarely
have the shape the store needs:

- **Store cards and the product page show photos in a tall 2 : 3 frame.** A square or
  wide photo gets its edges cut off by the store, and the owner can't choose which part.
  (e.g. the "Ring" photo is square, so the store trims its sides.)
- **Camera photos include clutter** — a table edge, a wall, the owner's hand — with the
  product small in the middle.
- The owner noticed the phone's own camera offers cropping and expects the same in the
  admin panel.

Today the only fix is to crop in another app before uploading.

## 2. Goals

1. The owner can **crop any uploaded photo** inside the product editor, on a phone or a
   computer.
2. The crop frame defaults to the **store's 2 : 3 shape**, so a cropped photo appears
   exactly as framed — nothing more is cut off by the store.
3. A mistake is never permanent: the owner can **re-crop or undo** later.

## 3. Users

| Who | Needs |
|---|---|
| **Store owner / admin** | Frame each photo quickly with a finger or mouse, see the result before saving |
| **Shopper** | Product photos filled by the product, all the same shape across the store |

## 4. User stories & acceptance criteria

### US-1 — Crop a photo

> As the store owner, I want to crop a photo in the editor, so the product fills the frame.

- **AC-1.1** Every **uploaded** photo tile in the Media section has a **Crop** button.
- **AC-1.2** Crop opens a full-screen cropper showing the whole photo with a crop frame.
  The frame can be **moved and resized** by dragging (touch and mouse) and the photo can be
  **zoomed** (pinch on phones, slider or wheel on computers).
- **AC-1.3** The frame starts as the **largest 2 : 3 area in the centre** of the photo. The
  owner can switch the shape to **Square (1 : 1)** or **Free**.
- **AC-1.4** **Apply** replaces the tile with the cropped version; **Cancel** changes
  nothing. As with any other edit, the product isn't changed until **Save**.
- **AC-1.5** The cropped photo is what appears everywhere: product cards, product page,
  cart, checkout, order emails and the admin panel.
- **AC-1.6** The cropper works at **360 px** phone width, buttons reachable with a thumb,
  and with the keyboard on a computer (arrow keys move the frame, Esc cancels).

### US-2 — Change my mind

> As the store owner, I want to fix a bad crop, so one slip doesn't ruin a photo.

- **AC-2.1** Opening Crop on an already-cropped photo shows the **full original photo** with
  the **previous frame** in place, ready to adjust.
- **AC-2.2** The cropper has **Reset**, which goes back to the full, uncropped photo.
- **AC-2.3** Cropping never needs a new upload and never loses quality from cropping
  repeatedly (cropping an already-cropped photo starts from the original each time).

### US-3 — Spot photos that need cropping

> As the store owner, I want to see which photos the store will trim, so I know what to crop.

- **AC-3.1** An uploaded photo whose shape isn't 2 : 3 shows a small hint on its tile:
  *"Store trims the edges — Crop to choose"*. A 2 : 3 photo shows no hint.

## 5. Rules

- **R-1 — Originals are kept.** Cropping never overwrites or deletes the uploaded original
  (needed for AC-2.1 – 2.3).
- **R-2 — No new security surface.** Cropping uses no new secret and no new upload
  permission; only an admin can change a product's photos (unchanged).
- **R-3 — Privacy stays intact.** Cropped versions contain no GPS / camera data either
  (spec 002 R-3).
- **R-4 — Fast for shoppers.** A cropped photo is resized and compressed for shoppers exactly
  like any uploaded photo (spec 002 AC-4.1).

## 6. Out of scope (v1)

- Cropping **pasted links** (photos hosted on other sites, incl. the ~1,250 existing Shopify
  images) — they aren't ShopNest's files
- Rotate, flip, filters, brightness, background removal
- Cropping during the upload itself (crop is done right after, on the tile)
- Bulk cropping several photos at once

## 7. Constraints & assumptions

- Builds on spec 002: uploaded photos live on **Cloudinary**, which can produce cropped
  versions on request.
- Must stay on free plans with no new paid service.
- Phone screens are small: the cropper must use the full screen on phones.

## 8. Open questions

1. **Default frame shape?** Recommendation: **2 : 3**, the store's own shape (AC-1.3).
   Square and Free remain one tap away.
2. **Should Crop open automatically after each upload?** Recommendation: **no** — an
   optional Crop button plus the hint (AC-3.1) keeps quick uploads quick.
3. **Crop pasted links too?** Recommendation: **not in v1** (Out of scope).

## 9. Definition of done

- Every acceptance criterion checked on the **live** admin from a **real phone** and a
  computer.
- The "Ring" (square) and "Bag" (camera) photos cropped to 2 : 3 and shown correctly on the
  live store.
- Re-cropping a photo three times still starts from the original, with no quality loss.

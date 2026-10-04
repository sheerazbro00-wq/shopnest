# Spec 002 — Product image upload

| | |
|---|---|
| **Status** | Done (2026-10-04) — every acceptance criterion verified, live phone test passed |
| **Owner** | ShopNest |
| **Created** | 2026-10-04 |
| **Next steps** | `plan.md` (how) → `tasks.md` (steps) → implementation |

This spec says **what** ShopNest must do and **how we'll know it works**. It deliberately
says nothing about code; technical choices belong in `plan.md`.

---

## 1. Problem

The admin product editor only accepts **image links**. To add a product photo today the
owner must already have the picture hosted somewhere on the internet and paste its URL.

- **Photos on the owner's phone or computer can't be used.** There is no way to take a
  picture of a new shirt and put it on the store.
- **Wrong links are accepted.** Any `https://` address passes, so a Google search page
  (`https://www.google.com/search?...`) is saved as a "photo". The editor then shows a
  broken image, and the product can't look right on the store. This is exactly what
  happened with the owner's test product "Tshirts".
- **Borrowed links are fragile.** A picture linked from another website can disappear or
  change at any time, and using it may break that site's copyright.

## 2. Goals

1. The owner can add product photos **straight from their phone gallery, camera or
   computer** in the admin panel.
2. Photos are stored by ShopNest itself, so they never disappear because another site
   changed.
3. Uploaded photos load **fast** on the storefront, even when the original was a large
   phone photo.
4. Pasting a link that is **not a picture** is stopped with a clear, friendly message.

## 3. Users

| Who | Needs |
|---|---|
| **Store owner / admin** | Upload photos from phone or laptop, see progress, fix mistakes easily |
| **Shopper** | Product photos that look sharp and load quickly, on mobile data too |

## 4. User stories & acceptance criteria

### US-1 — Upload photos from my device

> As the store owner, I want to pick photos from my phone or computer, so I can list a
> new product without hosting the pictures anywhere first.

- **AC-1.1** The Images section of the product editor has an **"Upload images"** button.
  On a phone it opens the normal picker (gallery, camera, files); on a computer it opens
  the file chooser. **Dragging photos** onto the section also works on a computer.
- **AC-1.2** Several photos can be chosen at once. They are added in the order chosen,
  after any images already on the product.
- **AC-1.3** Accepted formats: **JPG, PNG, WebP and HEIC** (iPhone photos). Each file can
  be up to **10 MB**, so a full-size phone photo works without the owner resizing it.
- **AC-1.4** Each photo shows **upload progress** while it uploads. The owner can keep
  editing the rest of the form meanwhile.
- **AC-1.5** When a photo finishes uploading it appears in the image list exactly like a
  linked image today: it can be **reordered, set as main (first), and removed**.
- **AC-1.6** The product can't be **saved while a photo is still uploading**. The Save
  button says why (e.g. "Wait for 2 images to finish uploading").
- **AC-1.7** The existing limit of **12 images per product** still applies, counting
  uploaded and linked images together.

### US-2 — Clear errors when something goes wrong

> As the store owner, I want to know exactly what went wrong and what to do, so a bad
> file or weak signal doesn't leave me stuck.

- **AC-2.1** A file that is not an accepted image (PDF, video, etc.) is refused before
  uploading: *"'menu.pdf' isn't a photo. Use JPG, PNG, WebP or HEIC."*
- **AC-2.2** A file over 10 MB is refused before uploading, with its name and the limit.
- **AC-2.3** If an upload fails (e.g. no internet), that one photo shows **"Upload failed
  — Retry"**, and the other photos are not affected.
- **AC-2.4** Picking more photos than the 12-image limit allows uploads only the photos
  that fit, and says how many were skipped.

### US-3 — Pasting a link that isn't a picture

> As the store owner, I want a clear message when I paste the wrong kind of link, so I
> don't save a broken product.

- **AC-3.1** Pasting a link to a **search results page** (Google, Bing, etc.) shows:
  *"This is a search page, not a photo. Open the image, then copy the image address — or
  use Upload images."*
- **AC-3.2** Pasting any other link that **doesn't load as an image** is not added, and
  the owner is told the link isn't a picture.
- **AC-3.3** Valid image links keep working exactly as today (the existing ~1,250
  products use them).

### US-4 — Fast, sharp photos for shoppers

> As a shopper, I want product photos to load quickly and look sharp, on any screen.

- **AC-4.1** A 5 MB phone photo is **not** sent to shoppers at full size. Product
  listings and the product page get a resized, compressed version that fits the screen.
- **AC-4.2** Uploaded photos appear correctly everywhere a product image appears: product
  cards, product page, cart, checkout, order emails and the admin panel.
- **AC-4.3** Photos taken sideways on a phone appear the **right way up**.

## 5. Security & privacy rules

- **R-1 — Admins only.** Only a signed-in admin can upload. Nobody else can put files on
  ShopNest's storage, even by calling the API directly.
- **R-2 — No secret keys in the browser or the repo.** Storage credentials live only in
  server configuration (as with Stripe and Brevo). The public repo contains none.
- **R-3 — Location data is removed.** Phone photos can contain the **GPS location** where
  they were taken (often the owner's home or shop). Published photos must have this and
  other camera data removed.
- **R-4 — Only images are stored.** A file renamed to `.jpg` that isn't really an image
  is rejected by the storage service, not just by the browser.
- **R-5 — Abuse can't run up costs.** Size and count limits (AC-1.3, AC-1.7) are enforced
  on the server side too, not only in the editor.

## 6. Out of scope (v1)

- Cropping, rotating, filters or background removal inside the editor
- Uploading **videos**
- Moving the existing ~1,250 linked product images into ShopNest's own storage
- Automatically **deleting** a photo from storage when it is removed from a product
  (removed photos stay in storage; fine at portfolio scale — see Open question 3)
- Image upload anywhere other than the product editor (e.g. customer avatars)

## 7. Constraints & assumptions

- **Free plan, no card.** The image service must have a free plan that needs no card.
  Expected use is small: a few hundred photos.
- **The API runs on Vercel serverless functions,** which reject request bodies larger than
  about **4.5 MB**. A 10 MB phone photo therefore can't simply be sent through our API;
  `plan.md` must handle this.
- **Shoppers in Pakistan, often on mobile data.** Image size matters more than usual.
- Existing linked images are hosted by Shopify's CDN; the storefront already asks that
  CDN for resized versions. Uploaded images need an equivalent.

## 8. Open questions

1. **Which image service?** Recommendation: **Cloudinary free plan** — no card, enough
   free storage and bandwidth for this store, resizes and compresses images on the fly,
   converts iPhone HEIC photos, removes GPS data. *(Alternatives considered in
   `plan.md`.)*
2. **Keep the "paste a link" box?** Recommendation: **yes**, as a secondary option under
   the Upload button, with the new checks from US-3.
3. **Delete removed photos from storage?** Recommendation: **not in v1** (see Out of
   scope). Can be added later as a cleanup job.

## 9. Definition of done

- Every acceptance criterion above has been checked on the **live** admin panel, from a
  **real phone** (gallery photo and camera photo) and a computer.
- The owner's "Tshirts" test product has a real uploaded photo and can be published.
- A downloaded published photo contains **no GPS location** (R-3).
- An upload request without an admin login is rejected (R-1).
- No storage secret appears in the repo, the browser's network traffic or Vercel logs (R-2).

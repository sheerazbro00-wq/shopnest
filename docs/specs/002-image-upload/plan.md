# Plan 002 — Product image upload

| | |
|---|---|
| **Spec** | [`spec.md`](spec.md) (approved 2026-10-04) |
| **Status** | Approved (2026-10-04) |
| **Next step** | [`tasks.md`](tasks.md) |

This plan says **how** we build spec 002. Every decision points back to the spec's
acceptance criteria (AC-x.y) and rules (R-n).

---

## 1. Architecture at a glance

The photo goes **straight from the admin's browser to Cloudinary**. Our API never
touches the file; it only signs a short-lived "permission slip".

```
 Admin browser                    ShopNest API (Vercel)            Cloudinary
 ─────────────                    ─────────────────────            ──────────
 1. picks photos
 2. POST /api/admin/uploads/sign ─▶ checks admin login (R-1)
                                    signs the upload rules
                                    with the API secret (R-2)
    ◀──────────── { signature, timestamp, apiKey, cloudName, folder, … }
 3. POST file + signature ───────────────────────────────────────▶ checks signature,
    (XHR, shows progress AC-1.4)                                     checks it's a real image (R-4),
                                                                      strips GPS/EXIF (R-3), rotates (AC-4.3)
    ◀──────────────────────────────────────────── { secure_url }
 4. adds secure_url to the image list (AC-1.5)
 5. Save product ─▶ PATCH /api/admin/products/:id  (unchanged: images are still just URLs)

 Shopper browser ─▶ res.cloudinary.com/.../upload/f_auto,q_auto,w_540/... (AC-4.1)
```

**Why direct-to-Cloudinary?** Vercel rejects request bodies over ~4.5 MB (spec §7), and a
phone photo can be 10 MB. Sending the file through our API would fail for exactly the
photos the owner takes most. A **signed** direct upload keeps the secret on the server
while the heavy file skips our API entirely.

**Why nothing changes in the database:** `Product.images` is already an array of URLs.
An uploaded photo is just another URL, so the storefront, cart, orders, emails and
Stripe keep working with no schema change or migration (AC-3.3, AC-4.2).

## 2. Choosing the image service (Open question 1)

| Option | Free, no card | Resizes on the fly (AC-4.1) | Strips GPS (R-3) | HEIC (AC-1.3) | Verdict |
|---|---|---|---|---|---|
| **Cloudinary** | ✅ | ✅ URL transforms | ✅ | ✅ | **Chosen** |
| ImageKit | ✅ | ✅ | ✅ | ✅ | Close second; smaller community, fewer docs |
| Vercel Blob | ✅ (Hobby) | ❌ stores files only | ❌ | ❌ | We'd have to resize & strip ourselves |
| Save in MongoDB | ✅ | ❌ | ❌ | ❌ | 16 MB document limit, slow, wastes the free 512 MB |
| Save on server disk (multer) | — | ❌ | ❌ | ❌ | Serverless functions have no lasting disk |

Cloudinary's free plan covers far more than a few hundred photos and caps one image at
**10 MB**, which matches AC-1.3.

## 3. New and changed files

| File | Change |
|---|---|
| `server/config/cloudinary.js` | **New.** Reads `CLOUDINARY_URL`; exposes `uploadsEnabled`, `cloudName`, `apiKey`, `apiSecret`. |
| `server/services/cloudinarySign.js` | **New.** `signUpload()` builds the upload params and their SHA-1 signature (§5). |
| `server/controllers/adminUploadController.js` | **New.** `POST /sign`: 503 when uploads are off, else returns the signed params. |
| `server/routes/adminRoutes.js` | Adds `router.post("/uploads/sign", …)`, behind the existing `protect, admin` (R-1). |
| `server/controllers/adminProductController.js` | Image checks: rejects search-page URLs (AC-3.1); keeps the 12-image cap (R-5). |
| `server/services/email/layout.js` | `thumb()` learns Cloudinary URLs so order emails get small thumbnails (AC-4.2). |
| `client/src/utils/format.js` | `sized()` learns Cloudinary URLs (§6) — every product `<img>` already uses it. |
| `client/src/utils/imageUrl.js` | **New.** `checkImageLink(url)` for US-3 (§7). |
| `client/src/api/admin.js` | `signImageUpload()` and `uploadToCloudinary(file, signed, onProgress)` (XHR for progress). |
| `client/src/pages/admin/ProductEdit.jsx` | `ImagesEditor`: Upload button, drag & drop, upload tiles with progress/retry; Save blocked while uploading (AC-1.6). |
| `client/src/pages/admin/ProductEdit.css` | Styles for the upload button, drop zone and progress tiles (mobile-first). |
| `server/.env.example` | Documents `CLOUDINARY_URL`. |

**No new npm packages.** Signing is ~10 lines of Node's built-in `crypto`, and the browser
upload is a plain `XMLHttpRequest` (the only browser API that reports upload progress).

## 4. Configuration

| Variable | Where | Example | Secret? |
|---|---|---|---|
| `CLOUDINARY_URL` | `server/.env`, Vercel (type **Secret**) | `cloudinary://<api_key>:<api_secret>@<cloud_name>` | **Yes** |

One variable, in Cloudinary's own standard format, so it's copied from the Cloudinary
dashboard in one go and entered through the usual masked popup. Without it,
`/uploads/sign` answers **503 "Image upload isn't set up"**, and the editor hides the
Upload button but keeps the link box. Local development without Cloudinary keeps working.

The **API key** and **cloud name** are not secret (they appear in every upload request and
image URL). Only the **API secret** is, and it never leaves the server (R-2).

## 5. Signing an upload (R-1, R-2, R-4, R-5)

The server decides the upload rules; the browser can't change them, because any change
breaks the signature.

```js
// params the browser must send unchanged
{
  timestamp,                       // Cloudinary refuses signatures older than 1 hour
  folder: "shopnest/products",
  allowed_formats: "jpg,jpeg,png,webp,heic,heif",   // R-4
  transformation: "c_limit,w_2400,h_2400/q_auto:good",  // see below
  format: "jpg",                   // HEIC is converted, so every browser can show it
}
signature = sha1( sorted "key=value" pairs joined with "&"  +  apiSecret )
```

- **`allowed_formats`** — Cloudinary inspects the actual file, not its name; a PDF renamed
  `photo.jpg` is refused (R-4).
- **`transformation` (incoming)** — the stored original is re-encoded at most 2400 px on its
  long side. This **removes all EXIF metadata, including GPS** (R-3), applies the phone's
  rotation (AC-4.3), and stops a huge photo from eating the free storage.
- **10 MB limit** — enforced by Cloudinary's free plan on its side (R-5). The editor checks it
  first only to give a friendlier message (AC-2.2).
- **Count limit** — the 12-image cap is enforced when the product is saved (already on the
  server, R-5).
- The sign endpoint is behind `protect, admin`, so only an admin can get a valid slip (R-1).
  A slip is good for one hour; leaking one lets someone upload images into our folder for
  that hour, nothing more (no delete, no account access).

## 6. Fast photos for shoppers (US-4)

`sized(url, width)` is the single place every product image gets its size today
(it adds `?width=` for Shopify's CDN). It learns one more case:

```
https://res.cloudinary.com/<cloud>/image/upload/v123/shopnest/products/abc.jpg
      ↓ sized(url, 540)
https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,c_limit,w_540/v123/shopnest/products/abc.jpg
```

- `w_540` — resized to the slot (the existing `srcSet` sizes 360–1080 keep working).
- `f_auto` — WebP/AVIF for browsers that support it, JPG for others.
- `q_auto` — Cloudinary picks the smallest file that still looks sharp.

The server's email `thumb()` gets the same rule (AC-4.2). Shopify URLs are untouched (AC-3.3).

## 7. Catching links that aren't photos (US-3)

**In the editor** (`checkImageLink`), when **Add image** is pressed:

1. **Search page?** Host is Google/Bing/Yahoo/DuckDuckGo and the path is a search/images
   results page → AC-3.1 message. *Bonus:* a Google "imgres" link carries the real image
   address in its `imgurl` parameter — we use that instead of rejecting.
2. **Does it load as a picture?** Load it in a hidden `new Image()` (10 s timeout). Not an
   image → *"This link isn't a picture. Open the image itself and copy its address — or
   use Upload images."* (AC-3.2)
3. Otherwise it's added exactly as today (AC-3.3).

**On the server**, the save check also rejects search-page URLs (step 1), so a direct API
call can't save one either. The server does **not** download links to test them; that would
let anyone make our server fetch any URL (an SSRF risk) and slows every save.

## 8. Editor UX (US-1, US-2)

```
 IMAGES
 ┌──────────────────────────────────────────────┐
 │   ⇪  Upload images                           │   ← big button; on desktop the whole
 │   JPG, PNG, WebP or HEIC · up to 10 MB each  │     box is also a drop zone (AC-1.1)
 └──────────────────────────────────────────────┘
 [img Main] [img] [▓▓▓░ 62%] [⚠ Upload failed · Retry ✕]
 or paste an image link  [https://…            ] [Add]
```

- `<input type="file" accept="image/*,.heic,.heif" multiple>` opens the picker (AC-1.1, AC-1.2).
  It must be the broad `image/*`: a list of exact types makes many Android phones open the
  gallery only, with no camera option (found in live testing).
- On touch screens a second **Take photo** button uses `capture="environment"`, which always
  opens the back camera, whatever the phone's picker offers.
- Each chosen file gets a tile immediately, in the order picked (AC-1.2). Tiles upload **two
  at a time** to stay smooth on mobile data.
- Before upload: type and size are checked (AC-2.1, AC-2.2); files beyond the 12-image cap are
  skipped with one message (AC-2.4).
- A tile shows a local preview while uploading (HEIC can't be previewed by most browsers, so
  it shows its file name instead) and swaps to the Cloudinary image when done (AC-1.5).
- Failed tiles keep the `File` in memory so **Retry** re-uploads without re-picking (AC-2.3).
- `uploading > 0` disables **Save** with "Wait for N images to finish uploading" (AC-1.6).
- If the sign endpoint says 503, the Upload box is hidden and the link box stays.

## 9. How each acceptance criterion is verified

| AC / Rule | How |
|---|---|
| AC-1.1–1.2 | Real phone (Android, live site): gallery pick of 3 photos + camera photo; desktop drag & drop |
| AC-1.3 | Upload a HEIC (iPhone) photo and a ~9 MB JPG |
| AC-1.4, 1.6 | Playwright with network throttling: progress visible, Save disabled until done |
| AC-1.5, 1.7 | Reorder/remove uploaded tiles; try a 13th image |
| AC-2.1–2.4 | Pick a PDF, an 11 MB file, go offline mid-upload then Retry, pick 15 files |
| AC-3.1–3.3 | Paste a Google search URL, a Google imgres URL, a web page URL, a valid Shopify URL |
| AC-4.1 | Network tab: card image request is the `w_540` variant and far smaller than the original |
| AC-4.2 | Uploaded image visible on card, PDP, cart, checkout, Stripe page, order email, admin |
| AC-4.3 | Sideways phone photo appears upright |
| R-1 | `POST /uploads/sign` without login → 401, as a customer → 403 |
| R-2 | Grep repo + browser network log + Vercel logs for the API secret → none |
| R-3 | Download the published photo of a GPS-tagged original; `exif` dump shows no GPS |
| R-4 | Rename a PDF to `.jpg`, upload → refused by Cloudinary |

## 10. Rollout

1. Owner creates a free Cloudinary account (no card) and copies the `CLOUDINARY_URL`.
2. Masked popup → `server/.env`; clipboard → Vercel env var `CLOUDINARY_URL` (type Secret).
3. Build and verify locally (§9), then push; Vercel deploys.
4. Verify on the live admin from the owner's phone; fix the "Tshirts" product with a real photo.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Free plan limits reached | Usage at portfolio scale is tiny; `c_limit,w_2400` keeps stored files small. Dashboard shows usage. |
| Removed photos pile up in storage | Accepted for v1 (spec §6). A cleanup job can list the folder and delete unused files later. |
| Owner closes the editor mid-upload | Photos already uploaded but never saved stay in storage — same as above. |
| Cloudinary down | Link box still works; existing images unaffected (different CDN). |

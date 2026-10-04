# Tasks 002 — Product image upload

| | |
|---|---|
| **Spec / Plan** | [`spec.md`](spec.md) · [`plan.md`](plan.md) |
| **Status** | Done (2026-10-04) — all 31 tasks complete |

Each task is small enough to check on its own. The ids in brackets say which acceptance
criterion (AC) or rule (R) the task serves.

## Phase 1 — Setup

- [x] **T1.1** Owner creates a free Cloudinary account (no card) and copies the API
      environment variable `CLOUDINARY_URL`.
- [x] **T1.2** Masked popup saves `CLOUDINARY_URL` to `server/.env`; check it parses
      (cloud name, key, secret present — print lengths only). [R-2]
- [x] **T1.3** `server/.env.example` documents `CLOUDINARY_URL` with a placeholder. [R-2]

## Phase 2 — Server

- [x] **T2.1** `config/cloudinary.js`: parse `CLOUDINARY_URL`; `uploadsEnabled` false when missing.
- [x] **T2.2** `services/cloudinarySign.js`: `signUpload()` with folder, allowed formats,
      incoming transformation, format; SHA-1 signature. [R-3, R-4, AC-4.3]
- [x] **T2.3** `adminUploadController.sign` + `POST /api/admin/uploads/sign` behind
      `protect, admin`; 503 when uploads are off. [R-1]
- [x] **T2.4** Product save rejects search-page image URLs; 12-image cap unchanged. [AC-3.1, R-5]
- [x] **T2.5** Email `thumb()` handles Cloudinary URLs. [AC-4.2]
- [x] **T2.6** Check: sign without login → 401, as customer → 403, as admin → 200;
      a real upload with the signed params succeeds; a tampered param is refused. [R-1, R-2]

## Phase 3 — Storefront images

- [x] **T3.1** `sized()` inserts `f_auto,q_auto,c_limit,w_N` for Cloudinary URLs;
      Shopify URLs unchanged. [AC-4.1, AC-3.3]
- [x] **T3.2** Check an uploaded image on card, PDP, cart, checkout and admin list. [AC-4.2]

## Phase 4 — Editor

- [x] **T4.1** `api/admin.js`: `signImageUpload()`, `uploadToCloudinary()` with XHR progress. [AC-1.4]
- [x] **T4.2** Upload button + hidden file input (`multiple`, image types incl. HEIC). [AC-1.1–1.3]
- [x] **T4.3** Drag & drop onto the Images box on desktop. [AC-1.1]
- [x] **T4.4** Upload tiles: preview / file name, progress, done → normal image tile. [AC-1.4, 1.5]
- [x] **T4.5** Pre-checks: wrong type, over 10 MB, over the 12-image cap. [AC-2.1, 2.2, 2.4, 1.7]
- [x] **T4.6** Failed tile with Retry and remove; two uploads at a time. [AC-2.3]
- [x] **T4.7** Save disabled with "Wait for N images…" while uploading. [AC-1.6]
- [x] **T4.8** `checkImageLink()`: search-page detection, Google imgres unwrap, load test. [AC-3.1–3.3]
- [x] **T4.9** Upload box hidden when the server says uploads are off.
- [x] **T4.10** Mobile layout check at 360 px and desktop at 1440 px.

## Phase 5 — Verify locally

- [x] **T5.1** Playwright: pick files, throttled progress, Save blocked, reorder/remove, save. [US-1]
- [x] **T5.2** Error cases: PDF, 11 MB file, offline → Retry, 15 files. [US-2]
- [x] **T5.3** Links: Google search, Google imgres, web page, valid Shopify image. [US-3]
- [x] **T5.4** GPS-tagged photo → published file has no GPS; sideways photo upright. [R-3, AC-4.3]
- [x] **T5.5** PDF renamed to `.jpg` refused. [R-4]
- [x] **T5.6** Card image request is the small `w_540` variant. [AC-4.1]

## Phase 6 — Go live

- [x] **T6.1** Add `CLOUDINARY_URL` to Vercel (`shopnest-api`, type Secret) via clipboard. [R-2]
- [x] **T6.2** Commit, push, wait for both deploys.
- [x] **T6.3** Owner, on their phone: upload a gallery photo and a camera photo on the live admin. [AC-1.1] — gallery ("Ring") and camera ("Bag", 1800×2400, no GPS) on 2026-10-04
- [x] **T6.4** Fix the "Tshirts" product with a real photo and publish it. [DoD] — owner replaced it with a camera-photo product ("Bag")
- [x] **T6.5** Secret check: repo, browser network log and Vercel logs contain no API secret. [R-2]
- [x] **T6.6** Mark spec and tasks Done.

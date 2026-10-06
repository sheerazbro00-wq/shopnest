# Tasks 005 — Find My Size

| | |
|---|---|
| **Spec / Plan** | [`spec.md`](spec.md) · [`plan.md`](plan.md) |
| **Status** | In progress — Phases 1–4 done; live phone test next |

## Phase 1 — Size engine (pure functions)

- [x] **T1.1** `parseChart()`: tables → blocks → cm preferred → normalised columns → product's own size labels → flat × 2. [AC-1.1]
- [x] **T1.2** `kindOf()`: shoes / bottoms / tops. [AC-1.2]
- [x] **T1.3** `estimateChest()` (BMI formula) + unit conversions. [AC-1.2, AC-1.3]
- [x] **T1.4** `recommend()` for tops, bottoms, shoes; statuses ok / between / soldOut / noFit; reason + detail. [AC-1.4–1.7, AC-3.1, R-2, R-3]
- [x] **T1.5** Node test: parse every chart in `details.json`, report usable/unusable per kind.
- [x] **T1.6** Node test: fixed cases (tee, pants, shoes incl. half size, sold out, too small/large).

## Phase 2 — Memory

- [x] **T2.1** `fitProfile.js`: load / save / forget, metric storage, range checks, storage-safe. [US-2, R-1, AC-1.3]

## Phase 3 — UI

- [x] **T3.1** `FindMySize` sheet: questions per kind, units toggle, fit pills, validation. [AC-1.2, AC-1.3]
- [x] **T3.2** Result view: size, reason, "How we worked this out", Select, Edit, chart link, Forget. [AC-1.4–1.7, US-3, AC-2.2]
- [x] **T3.3** Product page: link / "Your size" chip, select from sheet. [AC-1.1, AC-2.1]
- [x] **T3.4** Mobile bottom sheet (360 px) + desktop card; focus, Esc, aria-live.

## Phase 4 — Verify locally

- [x] **T4.1** `verification.md`: 20 real products × sample shoppers, checked by hand. [DoD]
- [x] **T4.2** Playwright: answer → select → reload chip → other product → forget → no-chart product. [US-1, US-2, R-5]
- [x] **T4.3** No network request when recommending; storage blocked → still works for the visit. [R-1, R-4]

## Phase 5 — Go live

- [x] **T5.1** Commit, push, deploys done.
- [ ] **T5.2** Owner's phone: a shirt, a pair of trousers and shoes on the live store. [DoD]
- [ ] **T5.3** Mark spec and tasks Done.

# Tasks 006 — Contact message emails

| | |
|---|---|
| **Status** | In progress — built and checked locally; live test next |

- [x] **T1** `send.js`: optional `replyTo`. [AC-1.3, AC-2.2]
- [x] **T2** `contactAlert` template (escaped message, admin link). [AC-1.1, AC-1.2]
- [x] **T3** `contactReceived` template, fixed text only. [AC-2.1, R-1]
- [x] **T4** `notifyContactMessage`: parallel, once-per-day confirmation, never throws. [R-2, AC-3.1]
- [x] **T5** Wire into `sendMessage`. [R-3]
- [x] **T6** Local checks (two emails, second message alert-only, `.test` skipped, `<script>` escaped, email off).
- [ ] **T7** Push; owner tests on live: alert + Reply → shopper; confirmation once. [DoD]
- [ ] **T8** Mark Done.

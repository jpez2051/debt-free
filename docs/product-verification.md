# Product verification and remaining gates

## What changed in v0.14.0

The focus is recording once, correcting safely, and explaining what is actually known. This is still a manual tracker, not a bank connection or guaranteed financial recommendation.

| Area | Implemented behavior |
| --- | --- |
| Obligation math | One read-only projection supplies cash forecasts and reserves. Later invoices cannot hide intervening expected months. Same-day dues are reserved before an uncertain deposit. |
| Bill entry | Both Add menus have Bill/subscription. Existing expenses/transfers can be matched instead of recorded twice. The bill month is explicit; changed future months require acknowledgement. |
| Bill exceptions | Skip/waive one explicit month, partial payment remains supported, and cancel future estimates from a date. Existing actual invoices/payments remain. Refunds are recorded separately; a refund does not automatically reopen or cancel an invoice. |
| Balances | New accounts record an opening balance date. Existing account editing was already read-only for balance; the save handler now preserves it too. Reconciliation uses cleared balances. |
| Pending entries | Pending outgoing amounts reduce working cash, not cleared balances. Pending income is not spendable. Clearing applies the balance effect once; pending repayments do not meet statement minimums. |
| Historical corrections | Balance-affecting backdated changes invalidate relevant balance checks. Changed spending months lose their completed designation until reviewed again. Already-included history stays balance-neutral. |
| Forms | Shared mobile scrolling/footer behavior, dirty-form reload guards, and account-scoped drafts for major record and cash-plan editors. CSV file previews are guarded while open but must be selected again after a reload. Drafts are not cloud transactions or cross-device drafts. |
| Recovery | IndexedDB pending journals, competing-writer archives, protected-before-accept behavior, acknowledged record cache, explicit device-protection failures and downloadable in-memory pending copies. Browser storage can still be cleared/evicted. Offline records require the app and sign-in to already be available; this is not an offline-install guarantee. |
| Spending | Exact category splits, bounded linked expense refunds, bulk imported-category confirmation and exclusion of unreviewed import defaults from merchant recommendations. |
| Guidance | Relevant blockers versus informational notes, clearer non-payable projections, supporting panels collapsed, and direct spending review. Comparisons still depend on complete user-entered history. |

## Adversarial checks

Use synthetic records, never a signed-in real financial workspace, for destructive/correction tests.

1. Pay October, enter December's invoice early, and verify November is still reserved and recordable. Repeat after November's due day passes.
2. Put a bill on payday and verify coverage assumes the debit could post before the deposit.
3. Mark a card payment pending. Verify cash is reserved once, the minimum remains unpaid, and clearing changes bank/card balances once. Repeat with a different funding bank that lacks cash.
4. Convert a pending expense to a bill. Its pending status and single balance effect must survive conversion and clearing.
5. Edit an old amount after reconciliation; the checkpoint must require review. Add historical-only spending to a completed month; balances stay unchanged but completion must be reviewed again.
6. Split an expense into two categories. Totals must match the original cent amount and the account must change once. Reject mismatched totals.
7. Link partial refunds; reject totals exceeding the original expense or edits that orphan the link.
8. Skip a missing month, waive a remainder, restore normal status, and cancel a schedule. Do not fabricate payments. Actual final invoices after cancellation remain due.
9. Disconnect cloud access, reopen a protected pending copy, retry, and compare conflicting complete copies. Test failed device protection separately from failed cloud access.
10. Check expense, bill, income-schedule, refund, statement and score editors at 390×844 and a shortened 390×500 viewport; Save remains reachable while fields scroll. Repeat on actual iOS Safari and Android Chrome with their keyboards open.

The local `/debt-free/tests/ui/product-readiness.html` uses an isolated synthetic cloud adapter. `/debt-free/tests/ui/device-recovery.html` checks real IndexedDB reopen, competing writers, account isolation and the acknowledged offline cache without Firebase.

## Independent uncoached usability test

Ask several people unfamiliar with the app to add checking/card accounts, record a subscription paid this month, correct a wrong bill month, enter a historical payment, and record a pending expense followed by clearing it. Do not explain the controls while they work. Record mistaken selections, time to completion and whether they can explain cleared cash versus working cash. Repeat on desktop and actual phones. These tests have not been performed with independent users.

## Remaining release gates / critique

- Deploy and validate the gated privacy backend and owner-only Firestore rules separately; follow `privacy-backend.md`. Do not advertise permanent deletion as available before capability verification.
- Actual-device keyboard, interruption, browser-storage eviction and multi-device tests, plus an independent security review, are still necessary before a paid launch.
- Manual entry still costs effort. The app should prove people can record a bill without coaching before adding more features.
- Some legacy UI remains densely implemented. New financial concepts have separate helpers, but further UI decomposition would reduce regression risk.
- The Firebase bundle remains relatively large. Measure real-phone startup before deciding on further loading optimizations.
- Bill refunds are separate financial entries, not automatic provider invoice-state changes. Do not imply that receiving a refund means the provider forgave a future bill.
- Opening-balance dates describe new account setup; no date or reconstructed historical opening balance is invented for existing accounts.

Unexpected defects found during this implementation included pending cash being reserved twice, a corrected forecast still paired with a misleading bill-month label, anonymized exports retaining free-text exception reasons, refund links becoming orphaned after original edits, mobile navigation remaining accessible behind a dialog, and recovery retries potentially leaving the screen on the pre-recovery copy. These received targeted safeguards rather than being deferred as cosmetic enhancements.

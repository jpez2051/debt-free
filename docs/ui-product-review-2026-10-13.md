# Debt Free UI and product review — October 13, 2026

## Scope and evidence

This review excludes bank-account connections and Firebase recovery. It inspected the page/component source, styles and financial helpers and reproduced three defects using synthetic records. Live Windows browser inspection was stopped by the computer-use safety check because it could not confidently determine the browser URL. Therefore this is **not** a claim that every screen passed live visual testing, or that actual phones were tested.

The supplied screenshot's field mismatch is fixed in v0.14.1. Both temporary-boost controls now share 50px geometry, themed borders, visible focus and responsive layout. The preview also rejects invalid month counts and avoids comparing savings against an unpayable original plan.

## New correctness risks — resolve first

### 1. A credit on one card offsets debt on a different card in the dashboard

Reproduced: one card owes $900 and another has a $100 credit. Dashboard card debt sums to $800, but the payoff model correctly still has $900 to eliminate. The credit cannot automatically pay the other issuer. Overall utilization is affected by the same signed aggregation.

Recommendation: sum positive card balances for debt and show card credits separately. Give credit-balance tiles an explicit label, not a negative debt amount that users must interpret. Use the same definition in dashboard, insights, ordering and payoff summaries.

### 2. Monthly-to-annual schedule changes can create a phantom renewal

Reproduced: a subscription originally started January 6, then changed to annual renewal on June 6, 2027. Its projection includes an estimated January 6 charge **and** the recorded June 6 charge. The annual projection takes its month from the old schedule start, not the new annual renewal.

Recommendation: give cadence changes an effective date and an explicit new recurrence anchor. Preserve old invoices, but do not use the monthly schedule's original month to project an annual renewal. Test monthly→annual, annual→monthly and changes of due day.

### 3. A linked full refund does not undo the original split categories

Reproduced: a $30 purchase split into $10 groceries and $20 shopping, then a linked $30 refund categorized as Other. Net spending is correctly $0, but groceries still show $10, shopping $20 and Other −$30. The category leaders can therefore remain misleading.

Recommendation: offer refund allocation among the original expense's category parts, particularly for partial item returns. Default a full refund to the original split; do not assume a partial return is proportional unless the user confirms it. Refund dates should still describe when money returned.

### 4. Pending scheduled income can be confirmed as a second income entry

Source-confirmed workflow risk: a pending deposit linked to a payday is intentionally excluded from received-income matching, so that payday remains Ready to confirm. The confirmation action opens a new entry without the existing pending entry's ID. Later clearing the original pending entry can count the same deposit again, especially when its date or amount changed and the generic duplicate check no longer matches.

Recommendation: make that action resume/clear the linked pending deposit, or explicitly handle partial deposits. The schedule occurrence is the identity to check, not only merchant/date/amount similarity.

## New interaction / presentation risks

### 5. The permanent payment presets have misleading plus signs

Source-confirmed: clicking “+$50” calls `setExtra(50)`. It replaces the extra amount rather than adding $50. A $500 plan can unexpectedly become $50. Recommend “Set $50” labels or genuinely additive behavior. The permanent input also saves on each keystroke; an Apply action with local editing state would distinguish trying numbers from committing a plan.

### 6. Mobile navigation can miss its active-page observer

`AdaptiveNav` attaches its observer once. Production initially displays the loading/sign-in screen without `.sidebar nav`, so the observer may never attach when the workspace later appears. The bottom navigation can remain highlighted as Home while another section is open. Recommend shared navigation state or reattachment when the workspace becomes available. This was identified in source, not verified visually on production during this turn.

### 7. Charts imply more precision and consistency than they provide

Credit-score points are equally spaced by entry number, not elapsed time. A one-day gap and a three-month gap look equal. Spending-chart colors are assigned by current category rank; adding history can change which category is green. Small stacked segments are difficult touch targets, and some phone amount labels are vertical/tiny.

Recommendation: real date spacing for scores, fixed category colors and a readable exact-value list/table beside charts. Preserve category colors across themes. Keep charts for patterns, not as the only way to read values.

### 8. History-heavy screens will become cluttered and expensive to render

Activity renders all matches, spending renders every group and detail, score history renders all entries even while collapsed, and Bills repeatedly projects all bills inside each bill render. These are separate from cloud storage concerns: thousands of records create a large page and repeated computation.

Recommendation: show a manageable batch with Load more/search, collapse merchant details, and compute bill projections once per data/window change. Reports must still total the full filtered dataset, not only visible rows.

### 9. Historical reporting and browser navigation are weak

Spending/Insights offer This month, Last 30 days and All time, but no exact previous-month/custom-date report. Activity has custom dates, so reporting controls differ by page. Page selection is local React state, not a URL; a refresh returns to Dashboard and browser Back does not traverse the app's pages.

Recommendation: add exact calendar-month/custom-range reporting and URL-backed navigation/filter state. This is basic navigation, not a new financial feature.

### 10. Small contradictory labels still undermine trust

Reconciliation's new editor says use the cleared/posted balance, while `ReconcileReview` still says available or posted consistently. “Difference vs alternative” hides which method wins because it shows an absolute dollar difference. Some tiny inline messages and mixed icon/text controls make important actions less readable than decorative numbers.

Recommendation: one balance vocabulary throughout; name the compared strategy and direction (“Avalanche: about $X less modeled interest”); standardize action labels and numeric alignment. This is more valuable than adding more themes.

## Component coverage / aesthetic recommendations

| Area reviewed in source | Recommendation |
| --- | --- |
| Dashboard / CashDecision / IncomeForecast / UpcomingSummary / SetupGuide | Keep one clear next action. Make known amounts, estimates and recorded pending items distinct. Show the relevant checking account, not just a pooled figure. |
| Accounts / account actions / reconciliation | Distinguish card credits and pending cash; keep primary totals prominent and secondary metadata quieter. Remove contradictory balance language. |
| Activity / CSV preview / category review / change history | Reduce long action-heavy rows, paginate matches, preserve date/account filters, and keep monetary values aligned. |
| Bills / bill picker / recording / invoice / exception / Undo forms | Current month versus next expected is useful. Keep month selection prominent, separate schedule changes from invoice corrections, and make primary actions visually consistent. |
| Debts / statement review / payment assignment / payment effort | State which statement an amount concerns. Keep historical assignment tools secondary and expose a clear edit path for posted-date/amount corrections. |
| Payoff Plan / temporary boost | The screenshot mismatch and unpayable comparison are fixed. Preset semantics and saved-versus-experimental editing still need correction. |
| Spending / merchant/account/category breakdown / trends | Exact month selection, fixed colors, readable values and collapsed merchant detail would help more than cosmetic chart embellishments. |
| Insights / credit score cards / history / chart / Data Health | Separate observed facts from suggested actions; use real time spacing for scores and keep exceptional reporting states understandable. |
| Settings / appearance | Existing theme controls are sufficient for now. Focus on common field/button tokens and readable contrast rather than more accent choices. Recovery controls are outside this review's scope. |
| Shared entry modes / fields / date controls / category controls / splits / previews / dialogs / confirmations / mobile navigation | Use one consistent control geometry and focus treatment. Keep keyboard/footer behavior intact, distinguish edit versus confirmation states and avoid ambiguous plus signs or unlabeled icon actions. |

## Harsh product verdict

The app looks increasingly organized, but apparently sensible numbers can still mean different things on different pages. More panels or themes will not fix that. Prioritize the four correctness/lifecycle risks, then preset/navigation/reporting clarity, then history performance and chart polish. No claim is made that the remaining items are implemented in this patch.

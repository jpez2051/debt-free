# Changelog

All notable Debt Free builds are tracked here.

## v0.9.4 — Actionable payment review and richer visuals

- Treat unassigned payments marked Already included as historical/general records: keep them in history without changing current balances, counting toward a statement, or creating permanent dashboard warnings.
- Keep recent current-balance payments actionable until assigned or deliberately classified as general; add bulk Historical/general classification under Debts.
- Preserve the browser's pre-v0.9.4 records as a recovery snapshot before the first successful save.
- Break six-month net-spending bars into the largest spending categories, group smaller categories as Other, and preserve refund-adjusted monthly totals.
- Replace account rows with responsive account tiles using private, built-in account-type icons and deterministic accents rather than external image searches.

## v0.9.3 — Filterable account activity

- Add account, date range, activity type, and merchant/description search filters with a matching entry count and Reset filters.
- Include existing card payments, recurring bill payments/charges, and balance adjustments alongside ledger activity without copying or changing records.
- Match card payments to both source bank and destination card, displaying each payment once in All accounts. Card-funded recurring bills remain charges, not card payments.
- Preserve existing expense/income/transfer edit and removal controls; link payment and adjustment records to their existing management pages.
- Default to All time, use device-local calendar dates with inclusive custom boundaries, and show clear empty/invalid-range states. Stack filters on narrow screens.

## v0.9.2 — Explicit historical payment assignments

- Stop guessing which statement an older payment satisfies. Legacy assignments require one-time confirmation because earlier releases did not record their provenance; preserve the previous link for review.
- Keep unassigned payments in history and overall totals, but exclude them from statement minimums. Preserve all payment amounts, dates, and account balances during reassignment.
- Add bulk payment review under Debts: filter by card, inspect dates and amounts, and assign one or multiple payments to a statement or leave them unassigned.
- Allow new and historical payments without a statement; default to Unassigned rather than an inferred statement. Explicit early and extra payments can count toward the same statement.
- Warn that amounts due may be overstated until assignments are reviewed; distinguish Edit statement from Review statement.
- Preserve a pre-v0.9.2 browser recovery snapshot on the first successful save, alongside existing backups.

## v0.9.1 — One dashboard row per card

- Select one relevant statement per card for Upcoming obligations: oldest unpaid overdue first, otherwise the nearest upcoming due date.
- Keep completed minimums visible through their due date; request a new statement when no upcoming one is recorded.
- Surface other unpaid/overdue statements and imported records needing review without merging their amounts or changing history and cash calculations.
- Add a View statements shortcut and narrow-screen wrapping for the summary rows.
- Verify subscription price changes against the real bill-edit handler using fictional records, preserving previous invoices and payments.

## v0.9.0 — Financial reliability and recovery

- Separate original statement minimums from current balances; keep extra payments on an explicitly selected statement and support corrected allocations.
- Preserve distinct recurring-bill occurrences, overdue commitments, and expected/actual amounts. Keep historical invoices unchanged when future estimates change.
- Rename Safe to Spend to Cash after tracked obligations, explain its limitations, and remove the indefinite extra reserve for card-funded subscriptions.
- Default new payoff plans to zero extra and expose forecast assumptions.
- Add refunds, signed credit balances, explained balance reconciliation, and adjustment history.
- Preserve entered calendar dates, reject future completed transactions, and compare spending over matching elapsed periods with net refunds.
- Validate backup identities/references, detect stale tabs, retain recovery snapshots, and keep forms open when saving fails.
- Add keyboard focus containment to Settings/mobile navigation and responsive controls for the new forms.
- Pin dependency versions and commit a lockfile; add end-to-end domain workflows, actual form-handler tests, and server rendering of each main screen.
- Flag imported statement/bill assignments for user review; do not silently reinterpret historical financial facts. Full transform consolidation and Firebase remain deferred.

## v0.8.1 — Clearer minimum-payment status

- Show the remaining amount due or “Minimum met” for card obligations.
- Show actual cycle payments in supporting details, including payments above the minimum.
- Keep extra payment display separate from minimum-credit calculations and exclude payments tagged to other cycles.

## v0.8.0 — Recurring subscriptions and card charges

- Added credit cards as recurring-bill payment methods with correct card-balance increases.
- Distinguished cash payments from card charges throughout bill status, entry, and history.
- Conservatively retained card-funded bills in Safe to Spend instead of releasing cash prematurely.
- Added monthly and annual schedules, expected versus actual amounts, and autopay/manual status.
- Added likely-duplicate protection for recurring entries and matching expenses.
- Added archival for bills with history and prevented linked accounts from changing type.
- Preserved backward compatibility for existing monthly bills and prior payment records.

## v0.7.1 — Reliability and data integrity

- Switched default dates and billing-cycle calculations to the user's device-local calendar.
- Show cash shortfalls instead of hiding negative Safe to Spend results.
- Protected account and bill deletion when bill-payment history is linked.
- Defaulted bill payments to the remaining cycle amount and added overpayment and insufficient-funds confirmations.
- Replaced misleading empty-dashboard projections with honest not-yet-calculated states.
- Strengthened required fields, backup validation and payment counts.
- Refreshed setup progress immediately after backup and excluded future entries from spending trends.
- Improved modal focus handling and mobile navigation keyboard behavior.

## v0.7.0 — Financial clarity and guided setup

- Added recurring-bill payment logging with partial/paid status, balance updates, and payment history.
- Made Safe to Spend reserve only unpaid bills and card minimums.
- Added month-over-month and six-month spending trends, including paid recurring bills.
- Added a guided setup checklist and clearer required-field validation.
- Added comparable credit-score trend charts by source, bureau, and scoring model.

## v0.6.0 — Trustworthy reporting foundation

- Added explicit This month, Last 30 days and All time reporting periods.
- Replaced sample finances with safe first-account onboarding for new browsers.
- Applied reporting periods consistently to financial activity and improved dialog accessibility.
- Preserved existing browser data without migration or key changes.

## v0.5.18 — Card minimum obligations

- Added all active card minimums to Upcoming obligations alongside bills.
- Track partial and paid minimum status from current-cycle card payments.
- Reserve only unpaid minimums in Safe to spend.

## v0.5.17 — Unified themes and icon colors

- Fixed black mobile-navigation icons in light mode.
- Applied accent colors consistently across navigation, settings and status icons.
- Improved light-mode surfaces, borders, controls and overlays.

## v0.5.16 — Credit-score entry modal

- Replaced the always-visible score form with an Add score button.
- Open score entry in a focused, responsive modal while preserving visible history.

## v0.5.15 — Account-aware spending

- Group Spending by account as well as category or merchant.
- Show which account or card funded each category and merchant detail.
- Show category and merchant context within account groups.

## v0.5.14 — Spending breakdown and merchant memory

- Group spending by category or merchant and inspect the totals underneath each group.
- Sort spending by highest total, name or most recent activity.
- Reuse frequently entered merchants from local expense history.

## v0.5.13 — Credit score history

- Added manual credit-score history under Insights with source, bureau, model, date, and score.
- Defaulted Aura entries to Equifax VantageScore 3.0, matching Aura's disclosed score source.
- Added Credit Karma and Citi presets while keeping unlike scoring models in separate comparisons.
- Added responsive score-entry and history layouts.

## v0.5.12 — Expense and interest entry

- Renamed user-facing purchase actions to expense actions so non-purchase card charges fit naturally.
- Added Interest as an expense category for finance charges that increase a selected credit-card balance.
- Constrained native date controls to their modal columns so payment, due-date, and statement-date fields align with adjacent fields.
- Added responsive coverage for shared date-field sizing and release wording.

## v0.5.11 — Click-to-open date pickers

- Made every transaction date field open the native calendar when the field is clicked.
- Applied the same calendar behavior to income, purchases, transfers, card payments, card due dates, and statement closing dates.
- Preserved native iOS and Android date-picker behavior and verified phone-width modal layouts.
- Made the release transform pipeline tolerant of Windows CRLF checkouts.
- Added automated coverage for all generated date fields.

## v0.4.0 — Personal finance assistant

- Rebuilt the app around multi-page navigation: Dashboard, Accounts, Transactions, Debts, Payoff Plan, Spending, and Insights.
- Added checking, savings, and credit-card account balances.
- Added categorized credit-card and debit/checking purchases.
- Credit-card purchases increase the selected card balance.
- Debit/checking purchases reduce the selected bank balance.
- Credit-card payments now reduce both the selected bank account and card balance without double-counting the payment as spending.
- Added card utilization, payment history, category spending summaries, discretionary-spending opportunities, and contextual finance insights.
- Kept avalanche/snowball payoff projections integrated with live card balances.
- Added desktop sidebar and mobile bottom navigation.

## v0.3.0 — Pre-test hardening

- Extracted and tested the payoff calculation engine.
- Fixed rollover of freed minimum payments after an account is paid off.
- Added production build verification with GitHub Actions.
- Added payment undo with balance restoration.
- Added backup restore/import alongside export.
- Added payoff trajectory visualization and progress milestones.
- Added safer reset behavior that only clears Debt Free storage keys.
- Added stricter debt and payment validation.
- Improved projection handling for plans with no viable payment budget.
- Expanded payment history and responsive UI polish.

## v0.2.0 — Usable tracker

- Added editable debt accounts.
- Added payment logging and recent payment history.
- Persisted strategy and extra-payment settings.
- Added JSON backup export and reset controls.

## v0.1.0 — Foundation

- Initial React/Vite app.
- Debt account tracking.
- Avalanche and snowball payoff strategies.
- Extra-payment planning and projected debt-free date.
- Local-first browser storage.

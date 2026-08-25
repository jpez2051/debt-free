# Changelog

All notable Debt Free builds are tracked here.

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

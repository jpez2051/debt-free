# Debt Free

**Current build: v0.9.6**

Debt Free is a privacy-first debt payoff planner and progress tracker built to make the path out of debt visible, measurable, and motivating.

## What v0.9.6 can do

- Track multiple debts with balance, APR, and minimum payment.
- Compare debt avalanche and debt snowball strategies.
- Project payoff timing and estimated interest.
- Roll freed minimum payments into the next payoff target.
- Adjust extra monthly payments and instantly recalculate the plan.
- Record payments and update balances.
- Undo recent payment entries and restore balances.
- Edit and remove debt accounts.
- Visualize the projected balance decline over time.
- Track recorded payoff progress and milestones.
- Export a versioned JSON backup.
- Export a diagnostic review file with account, merchant, bill, and income-source names anonymized.
- Restore from a Debt Free backup file.
- Store data locally on the user's device.
- Run automated payoff-engine tests and a production build on GitHub Actions.
- Open native calendar pickers from every transaction, payment, and credit-card date field.
- Record card interest as an expense that increases the selected card balance.
- Track credit-score history by source, bureau, scoring model, and date.
- Edit credit-score history, warn about same-series/date duplicates, and avoid assuming Aura's bureau.
- Review possible duplicates, schedule mismatches, statement gaps, stale reconciliations, unusual score changes, and historical coverage in Data Health.
- Track recurring-bill payments, partial payments, and remaining obligations.
- Show month-over-month and six-month spending trends.
- Guide initial setup and chart comparable credit-score trends.
- Track recurring subscriptions paid from cash or charged to credit cards.
- Support monthly and annual schedules, expected versus actual amounts, autopay status, and archiving.
- Assign payments to explicit card statements without automatically advancing due dates.
- Preserve overdue bill occurrences and confirm each invoice's actual amount and due date.
- Record refunds separately from income, and reconcile balances with an adjustment history.
- Detect conflicting tabs, handle failed saves, and retain local recovery snapshots.

## Important changes in v0.9.0

v0.9.1 simplifies Upcoming obligations to one row per credit card. Overdue minimums take priority; a completed statement stays visible through its due date. Other unpaid/imported statements are flagged with a link to Debts. This is display-only: no records or cash calculations are changed.

For a subscription price increase, edit the bill's Expected amount for newly generated occurrences. Under Bill occurrences, Confirm actual on the first affected occurrence, then log its payment/charge once. Existing occurrences and historical payments retain their previous amounts. Use the exact billed amount, including tax where applicable.

- Under **Debts → Statements**, confirm imported statement dates/minimums and review payment allocations. Older records did not preserve every statement fact; the app flags those assignments instead of silently guessing they are verified.
- Add a new statement when your issuer provides it. Extra payments stay on the selected statement. If a new minimum includes past-due minimums, explicitly carry those earlier obligations forward to avoid reserving them twice.
- Under **Bills → Bill occurrences**, confirm the actual invoice and date. Existing occurrences retain their amounts when a future estimate changes. Autopay does not automatically record a payment.
- **Cash after tracked obligations** is not a spending allowance. It includes savings, subtracts tracked cash bills and card minimums, and does not protect groceries, an emergency fund, or other unlogged needs. Card-funded subscriptions become debt; they are not separately reserved as cash.
- New profiles start with **$0 extra** in the payoff plan. Existing choices are preserved. Projections assume no new borrowing or fees and use approximate monthly interest.
- Use **Accounts → Reconcile balance** for corrections and **Activity → Log refund** for money returned by a merchant. Refund corrections can be made by removing and re-entering the refund.
- The first successful save retains the prior stored data locally. Settings provides a previous-state recovery option and raw-data download. Keep an external backup: browser clearing removes local recovery copies too.

## Development

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

Run verification locally with:

```bash
pnpm run check
```

Use Node 22 and pnpm 11.19.0. Verification runs unit/workflow and server-render tests, release-version checks, and a production Vite build. Dependencies and the package manager are pinned; CI installs the committed lockfile.

## Product direction

Full code consolidation and Firebase sync remain explicitly deferred. See `release-notes/v0.9.0-qa.md` for the manual usability and mobile checklist; automated rendering is not a substitute for device testing.

See [CHANGELOG.md](CHANGELOG.md) for build history.

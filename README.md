# Debt Free

**Current build: v0.8.1**

Debt Free is a privacy-first debt payoff planner and progress tracker built to make the path out of debt visible, measurable, and motivating.

## What v0.8.1 can do

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
- Restore from a Debt Free backup file.
- Store data locally on the user's device.
- Run automated payoff-engine tests and a production build on GitHub Actions.
- Open native calendar pickers from every transaction, payment, and credit-card date field.
- Record card interest as an expense that increases the selected card balance.
- Track credit-score history by source, bureau, scoring model, and date.
- Track recurring-bill payments, partial payments, and remaining obligations.
- Show month-over-month and six-month spending trends.
- Guide initial setup and chart comparable credit-score trends.
- Track recurring subscriptions paid from cash or charged to credit cards.
- Support monthly and annual schedules, expected versus actual amounts, autopay status, and archiving.

## Development

```bash
npm install
npm run dev
```

Run verification locally with:

```bash
npm run check
```

That command runs the payoff test suite followed by a production Vite build.

## Product direction

Future releases can add full amortization tables, richer reports, recurring-payment workflows, onboarding, cloud accounts/sync, and optional multi-device backup while preserving a privacy-first experience.

See [CHANGELOG.md](CHANGELOG.md) for build history.

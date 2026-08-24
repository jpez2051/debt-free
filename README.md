# Debt Free

**Current build: v0.5.11**

Debt Free is a privacy-first debt payoff planner and progress tracker built to make the path out of debt visible, measurable, and motivating.

## What v0.5.11 can do

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

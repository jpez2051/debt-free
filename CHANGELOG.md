# Changelog

All notable Debt Free builds are tracked here.

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

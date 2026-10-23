# v0.15.0 verification scope

- Never rewrite historical balances on load or silently infer the already-included choice. Pre-opening entry confirmation is bound to the date and affected account opening dates. CSV history can remain balance-neutral; unusual non-included pre-opening entries use the individual editor.
- Keep posted balances separate from pending amounts. Pending withdrawals must be visible in the same breakdown that subtracts them. Pending card charges are not recorded statement payments.
- Editing payoff numbers or choosing a Set preset must not persist until Apply. Failed device protection must retain the draft, and repeated clicks must not create competing saves.
- Month reports use device-local calendar boundaries, include leap days, and exclude future records. Changing reporting dates must not change balances or reserve windows.
- Navigation must work after delayed sign-in and be absent before the workspace mounts and after sign-out. Bills belongs under Money.
- Check the package-sourced version in built HTML before JavaScript, cloud screens, and Settings. Never maintain a second hardcoded release number.
- Exact chart values remain available when segments are small or negative. Category colors are stable across category-ranking changes; score spacing uses elapsed days.
- Verification uses synthetic data and rendered-component tests; no live Firebase records are modified. Actual-device visual testing is distinct from automated layout/source checks.
- Date-only opening balances cannot determine whether a same-day purchase happened before or after the snapshot. That case still requires the user's already-included choice; the app must not guess a transaction time.
- Release verification: 294 automated tests passed, plus the focused new edge-case rerun; package-version validation and the production build succeeded. The existing SDK bundle-size warning remains a performance consideration, not a failed build.

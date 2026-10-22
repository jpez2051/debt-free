# Changelog

All notable Debt Free builds are tracked here.

## v0.14.3 — Find refunds and record statement closing dates

- Put Refund beside Expense, in the phone Add menu and at the top of Activity. Add an Expense-form shortcut and allow direct refund editing in Activity, reusing the same allocation form and balance rules.
- Preview refund balance effects, including historical and pending entries, without treating refunds as income.
- Store optional closing dates on individual card statements and collect them alongside the due date and minimum. Show the closing date for the displayed statement, never a stale account-wide date or a guessed next month. A November due date may correctly have an October closing date.
- Validate closing dates, preserve earlier statements, restore dates when removing a statement and keep managed account dates read-only in Accounts.

## v0.14.2 — Separate debt, accurate schedules, refunds and deposits

- Keep positive card debt and card credits separate in dashboard totals and account tiles; credits never offset another card or checking cash.
- Give bill cadence changes a first-charge anchor, effective date and prior-schedule history. Preserve recorded invoices/payments and project the correct renewal month.
- Reverse full split refunds against their original categories, require explicit returned-item allocation for partial refunds, enforce category caps and add refund correction controls. Legacy ambiguous partial refunds require review, not guessed allocation.
- Confirm an existing pending payday deposit by editing its record; reject duplicate schedule links, use its recorded amount in forecasts and require review of ambiguous multiple pending deposits.
- Add regression tests; existing historical balance effects are not automatically rewritten.

## v0.14.1 — Consistent temporary-boost controls

- Give the temporary-boost amount and month inputs matching heights, padding, borders, focus indicators and a two-column desktop / one-column phone layout. Reuse shared field styling outside dialogs.
- Clarify that the boost is extra each month, reject fractional/invalid month counts and invalid currency precision, and withhold fictitious time/interest savings when the original plan has no payoff date.
- Extract the scenario into a focused component/helper, add regression coverage and a synthetic multi-page UI review fixture. Record newly identified product risks separately; no live financial records or Firebase recovery behavior are changed.

## v0.14.0 — Bill clarity and safer records

- Share one bill/card obligation projection across forecasts and reserves. Preserve missing intervening bill months, include same-day payday dues conservatively, and avoid double-reserving pending repayments.
- Add Bill/subscription to both Add menus and the expense shortcut. Separate the displayed bill month from its next expected charge, confirm future-month selections, and support month-only skip/waiver and cancellation-effective dates without erasing invoices or history.
- Add pending/cleared entry status, explicit mark-cleared actions, working cash labels, new-account opening-balance dates, linked expense refunds, exact split categories, and an imported-category review queue. Historical entries remain balance-neutral.
- Invalidate balance checkpoints and completed spending months after relevant corrections. Harden existing balance-edit protections and distinguish relevant reserve blockers from unrelated informational notes. Explain unreachable payoff projections.
- Use one mobile action-footer dialog across record editors, protect dirty forms from cloud replacement, and retain account-scoped drafts for major entry editors. Move device journals and acknowledged record caches to IndexedDB with verified legacy-copy migration and explicit offline/protection-failure status.
- Make change history more specific, label Undo as session-limited, collapse supporting assumptions/schedules, and anonymize bill-exception explanations.
- Add calculation, correction, recovery, privacy and real-browser IndexedDB regression checks. Server-side privacy activation, a production Rules-engine audit, independent usability tests and actual-phone keyboard interruption tests remain external release gates; this update does not activate billing or delete user cloud records.

## v0.13.0 — Confidence, reserves, and easier corrections

- Withhold the displayed extra-payment estimate when statements, checking-balance checks or account funding need review. Explain uncertainty beside the estimate.
- Add next-payday, month-end and custom reserve windows, per-checking-account funding/coverage and explicitly reviewed essentials/buffers. Preserve the existing month-end summary and financial history.
- Simplify entry forms with expandable balance handling and category help, keep action footers visible on phones, and warn before discarding unfinished entry forms. Add a preview-first expense CSV import with explicit account/sign mapping, duplicate and non-expense review, and historical balance preservation by default.
- Add Undo for the latest app change and a forward-only change history showing record operations and balance effects. Full backups preserve history; diagnostic exports retain only IDs and amounts in new history.
- Add explicit device-copy removal and manual retention cleanup without touching pending changes. Build gated server-side permanent account deletion and unused-cloud-part cleanup; requires separately publishing rules, deploying functions and enabling the operator gate. No billing change or production deletion is performed by this release.

## v0.12.1 — Reachable mobile entry actions

- Render entry dialogs outside the clipped mobile page scroller. Keep Save and Cancel in a dedicated footer while only the fields scroll, across expense, income, transfer, card payment, account, and bill forms.
- Size dialogs to the visual viewport as browser chrome and on-screen keyboards change the usable area; respect safe-area insets, preserve keyboard focus, and make background page controls inert while an entry dialog is open.

## v0.12.0 — Recovery-first financial workspace

- Protect unsaved changes in an account-scoped device journal before accepting an entry. Recover interrupted saves, guard competing tabs, and show save status across every page.
- Resolve cloud conflicts with side-by-side complete copies, downloads, an explicit replacement acknowledgement, and preserved recovery copies. Keep recovery copies before backup restore or workspace clear.
- Add an opt-in, verified split-record cloud migration. Immutable bounded parts are staged and read back before an atomic index switch; unchanged parts are reused. Requires publishing the updated owner-only Firestore rules; existing storage stays active until then.
- Simplify the dashboard into recorded checking today, payday timing, and a guarded extra-payment estimate. Collapse supporting reporting and payoff panels.
- Preview actual account balance changes in income, expense, transfer, and card-payment forms. Guide reconciliation through the difference and recent account activity before an explained adjustment.
- Use in-app confirmations for activity/payment/score/account removal, bill archiving, and duplicate entry warnings. Fix the first-income setup button and mobile quick-add income/transfer buttons passing click events as financial records. Clarify that clearing a workspace is not permanent erasure of backups or retained storage parts.

## v0.11.22 — Compact, expandable bills

- Show each bill as a compact rounded row with its bill month, due date, account, and paid/due status visible.
- Expand a bill by click, tap, or keyboard to access recording, payment history, invoice amounts, schedule editing, and archive controls. Keep all bills collapsed initially without changing financial calculations or records.

## v0.11.21 — Bills that are easy to record and correct

- Fix the Bills-page record action passing a month ID where the form expected a record; preselect and clearly show the correct bill month.
- Keep payment history, Edit, and Undo with each bill. Hide archived schedules separately and provide direct bill corrections in Activity.
- Edit a recorded charge's date, amount, funding account, balance inclusion, and bill month in one dialog, including missing historical months.
- Convert an existing expense or transfer to a bill charge, or merge it with a mistaken recorded bill charge, in one save that reverses the old effects and applies the corrected entry once.
- Review possible matching expenses, transfers, and bill payments before saving. Preview account balance changes and flag early/late bill-month assignments.

## v0.11.20 — Financial reliability and honest status

- Repair only the known empty duplicate bill occurrence pattern on cloud sign-in or backup restore, preserving confirmed amounts, payments, balances, and an audit copy of the removed shell. Validate cloud writes and distinguish a recovery copy from a restorable backup.
- Distinguish a card's zero balance, paid minimum, and future recurring charges instead of labeling an old paid statement as needing confirmation.
- Exclude zero-balance card minimums from monthly cash commitments and payoff projections by default; offer an explicit option to roll those freed payments forward.
- Fix the six-month category chart when Other is a leading category, so displayed totals remain accurate.
- Label forecast cash as before everyday spending, record whether statement amounts were issuer-confirmed or estimated, and let users mark historical months complete before trusting a comparison.

## v0.11.19 — Clearer, more readable financial workspace

- Use `package.json` as the only release-number source. The app, backups, and cloud record now read it directly; the redundant `VERSION` file and hard-coded UI/README numbers are gone.
- Use darker accent colors in light/system-light mode, increase several tiny labels, and adopt one section-gap token instead of negative spacing offsets.
- Preserve nonzero cents in dashboard and planning figures rather than rounding them away.
- Collapse detailed balance checks, statements, bill occurrences, and card-payment history while keeping every record accessible.
- Sort bill rows from a copy so rendering cannot reorder the saved bill array.

## v0.11.18 — Space account cards from balance review

- Add a consistent gap below the Accounts tile grid before the balance-reconciliation panel, including on narrow phones.
- Leave financial records and calculations unchanged.

## v0.11.17 — Clarify additional card payments by statement

- Rename the unlinked payment choice to “General card payment — no statement selected” so it is not confused with paying above a minimum.
- Show the selected statement’s due date and whether its minimum is met; explain that additional payments linked to September count above September’s minimum, not toward October.
- Use the same language in payment history, Activity, and assignment review. Existing records and balances are unchanged.

## v0.11.16 — Repair cloud saves for optional payment fields

- Omit absent statement dates on extra and unassigned card payments, and remove cleared statement links without leaving invalid fields.
- Clean older undefined optional fields at the cloud-write boundary and compare conflict fingerprints against the same clean representation.
- Preserve payment amounts, account balances, and statement assignments while restoring reliable cloud saves.

## v0.11.15 — Show actual payments above minimum

- Summarize payments assigned to confirmed card statements and calculate what was paid above each cycle's minimum, with a card filter and recent-cycle history.
- Keep unassigned and extra/general payments visible but out of statement-based totals until deliberately assigned; exclude unreviewed, superseded, and mismatched statement months.
- Explain that this is actual recorded effort, separate from the Payoff Plan's assumed future extra payment. No balances or existing records are changed.

## v0.11.14 — Make cash guidance more honest and cloud failures recoverable

- Base the month-end cash breakdown and 30-day forecast on checking, while showing savings separately.
- Let users enter remaining essentials and a protected checking buffer before showing possible room for an extra debt payment; refresh essentials each month.
- Remove the arbitrary 25% discretionary-spending recommendation and clarify forecast limitations.
- Keep failed cloud saves visibly unsaved, allow a retry, and guard reload, restore, clearing, sign-out, and navigation before an unsaved copy is discarded. Downloadable backups remain available in Settings.

## v0.11.13 — Separate this month's cash from next month's forecast

- Show cash after obligations due through the current month, including unpaid overdue items, instead of subtracting every future obligation.
- Advance that cutoff automatically on the first of each month while keeping the 30-day paycheck and obligation forecast visible.
- Clarify that future card statements still require the actual issuer minimum and due date; the app does not silently create an official statement.

## v0.11.12 — Keep statement months separate

- Treat October card minimums as unpaid when September payments were carried forward by editing an existing statement due date.
- Flag these cycles and provide a guided correction that restores the paid September statement and creates a separate October statement without changing balances or payment records.
- Prevent a paid statement from being moved to another month; manage existing card minimums and due dates through Statements rather than account tiles.
- Clarify that historical payments do not change balances but can satisfy a minimum if deliberately assigned to that statement.

## v0.11.11 — Correct mislinked paydays

- Flag deposits linked to a payday more than a week later and offer a direct review action.
- Let users unlink a mistaken payday without changing the logged income or account balance.
- Ask for the deposit date before choosing a schedule and prevent an old deposit from automatically claiming a future payday.

## v0.11.10 — Clear payday and reporting layout

- Give reporting-period controls their own space between the payday forecast and dashboard totals.
- Show the next unconfirmed payday from the income schedule instead of repeating its original start date.

## v0.11.9 — Clear reporting context

- Place the reporting-period controls directly after the forward-looking payday forecast and before the historical reporting totals they control.

## v0.11.8 — Clear first-income setup

- Make the setup step accurately open and track the first real income entry.

## v0.11.7 — Safer cloud workspaces and more useful planning

- Detect a newer save from another device before overwriting it, offer a reload action, and update an idle workspace from the cloud.
- Add clear cloud-workspace controls, more explicit sync status, and a guided setup path for pay schedules and first reconciliation.
- Record a matching reconciliation as a check rather than a fake $0 adjustment.
- Add a temporary payment-boost scenario that leaves the saved payoff plan unchanged.

## v0.11.6 — Focused account ordering

- Keep checking and other cash accounts at the top of Accounts.
- Arrange open credit-card tiles from the smallest balance to the largest, with zero-balance cards last.

## v0.11.5 — Clear monthly bill status

- Keep a completed monthly bill visible as paid through the end of its due month, while the Dashboard continues to plan for the next unpaid obligation.
- Allow a mistaken bill-payment assignment to be moved to a missing prior occurrence without changing the payment date, amount, or account balances.

## v0.11.4 — Clearer recurring bill tracking

- Rebuilt the Bills workflow around one primary action: mark the current bill paid or charged.
- Prevented an older unpaid occurrence from being hidden behind a future charge, and clearly identify the due month a recorded entry belongs to.
- Moved history behind a review-and-corrections disclosure, with a safe option to reassign an entry to its correct bill occurrence.
- Added an in-flow way to record an actual invoice total when it differs from the recurring estimate.

## v0.11.3 — Reliable cloud exports

- Fixed backup and anonymized-review downloads being blocked by strict validation of otherwise usable cloud records.
- The anonymized review export now remains available for diagnosing the very records that need attention.

## v0.11.2 — Restored cloud backup access

- Fixed the Settings entry disappearing after the signed-in cloud workspace loaded.
- Restored access to Download backup, Restore backup, Download anonymized review, themes, and account controls on desktop and phone.

## v0.11.1 — Clear cloud onboarding for everyone

- New people with no browser records can now create a blank private cloud workspace directly after sign-in.
- Browsers with existing Debt Free records now clearly offer both paths: copy those records or start completely fresh.
- Kept backup restoration available from Settings, so a backup can be brought in later without forcing an import during first sign-in.

## v0.11.0 — Private cloud sync

- Added Google sign-in and a private Firebase cloud record for each signed-in person.
- Added a deliberate first-time import screen so existing browser data is never uploaded without the user selecting it.
- Moved normal saves, backup restore, account status, and save feedback to the cloud-aware experience.
- Added restrictive Firestore rules that allow each signed-in person to read and write only their own record.

## v0.10.6 — Clearer backup counts and bill occurrences

- Fixed unreadable count numbers in the light-theme Data & backup section.
- A paid recurring-bill occurrence now says **Paid for** its date rather than **Due**, making an accidental future-occurrence assignment obvious.

## v0.10.5 — Cleaner controls and stronger light mode

- Account tiles now reveal Edit and Remove only after you tap or click the tile.
- Activity filters start collapsed and show an Active indicator when a filter is applied.
- Renamed the passive sidebar label to **Built-in guidance** so it does not imply a chat feature.
- Corrected remaining dark-only control, status, and form colors in light and system-light themes.

## v0.10.4 — Explicit extra card payments

- Added an explicit **Extra / general payment** choice when logging a card payment.
- Extra/general payments reduce cash and card balances, but do not mark a statement minimum as met; **review later** remains the safe default.

## v0.10.3 — Sharper dashboard pulse

- Made the dashboard’s Assistant pulse compact instead of matching the height of the neighboring obligations card.
- Added clear labels and distinct visual treatments for cash position, card usage, and the leading spending category.

## v0.10.2 — Consolidated source and clearer mobile controls

- Consolidated the shipped application source and styles so releases no longer depend on a chain of version-specific build-time rewrites.
- Simplified phone entry with one Add button, compacted current credit-score summaries by comparable source, and collapsed dashboard methodology details while retaining important warnings.

## v0.10.1 — Confirm scheduled paychecks

- Mark the latest due scheduled deposit as Ready to confirm and keep it actionable after payday until it is handled.
- Open the real-income form with the expected source, amount, account, and schedule occurrence already linked.
- Allow the actual amount and deposit date to be corrected before saving; checking changes only after confirmation.
- Prefer an overdue unconfirmed occurrence when a schedule is selected manually, preventing a late entry from being attached to the next payday.
- Fix current main categories such as Subscriptions retaining their selected subcategory, and add Cloud Storage plus News & Digital Media options.

## v0.10.0 — Payday cash-flow forecast

- Add reusable weekly, every-two-weeks, twice-monthly, and monthly expected-income schedules.
- Keep expected deposits separate from real balances while comparing current cash with obligations due before payday.
- Add a transparent 30-day projection limited to scheduled income and tracked obligations, with an explicit warning about unentered day-to-day spending.
- Allow a real income entry to replace its matching forecast occurrence so expected and received income are never counted twice.
- Keep forecast dates on the device's local calendar and make schedule management responsive on phones.

## v0.9.9 — Detailed spending and accurate transfers

- Add main categories with practical subcategories such as Groceries, Restaurants & Takeout, Fast Food, Coffee & Snacks, Fuel, and Streaming.
- Preserve existing category data while translating legacy categories into the new reporting groups; records gain the new fields only when edited or re-saved.
- Learn the most frequently used category for each merchant and apply it as an editable suggestion.
- Support transfers between tracked cash accounts, updating both balances without counting the movement as spending.
- Classify outside destinations such as Acorns as savings, investment, account, or other transfers and report saved/invested contributions separately.
- Add Subcategory as a Spending breakdown and keep category detail visible by merchant and account.

## v0.9.8 — Actionable Data Health

- Allow duplicate activity and score findings to be confirmed as intentional so they no longer remain unresolved warnings.
- Preserve reviewed-finding decisions with the rest of the user's local data, backups, restores, and anonymized diagnostic exports.
- Keep confirmed findings available under Reviewed findings with a Review this again action.
- Add a View Data Health button at the top of Insights that scrolls directly to the section on desktop and mobile.

## v0.9.7 — Clear and synchronized bill estimates

- Automatically synchronize unconfirmed, unpaid future bill occurrences with the recurring bill's current amount and schedule.
- Preserve every completed, paid, confirmed, imported-for-review, and historical occurrence rather than rewriting financial history.
- Label outstanding bill amounts as Due and distinguish a bill's ongoing estimate from a deliberately different confirmed occurrence.

## v0.9.6 — Data-health and correction tools

- Add credit-score editing that preserves record identity and recalculates trends, duplicate-date warnings, and a neutral Aura bureau default.
- Synchronize edited recurring bills into future unconfirmed/unpaid occurrences while preserving confirmed, paid, and historical occurrences.
- Warn before saving an exact duplicate activity entry and surface existing duplicate candidates without changing records automatically.
- Add Data Health checks for duplicate activity/scores, bill schedule mismatches, missing current statements, stale balance reconciliation, unusual score changes, and historical coverage.
- Use cash-after-tracked-obligations wording consistently so the dashboard does not imply that unlogged living expenses are protected.

## v0.9.5 — Safer diagnostic sharing

- Add an anonymized diagnostic export for calculation and data-quality reviews without exposing account, merchant, bill, or income-source names.
- Preserve IDs, repeated-merchant patterns, amounts, dates, categories, statement assignments, and credit-score metadata needed to audit the app accurately.
- Mark diagnostic files as non-restorable and warn that their remaining financial values are still sensitive.

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

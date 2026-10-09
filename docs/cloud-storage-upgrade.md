# Verified cloud storage upgrade

The v0.12.0 website does not automatically move existing records. Existing users keep the original document until they explicitly select **Settings → Upgrade cloud storage**. Publish the website before migrating any user. Old cached clients are blocked from replacing a migrated workspace with the old storage format.

## Firebase console step

1. Open the `debt-free-af527` project in Firebase.
2. Open **Firestore Database → Rules**.
3. Replace the existing rules with the complete repository `firestore.rules` file. Do not use open/test-mode rules.
4. Use the console Rules Playground to check that signed-out access is denied, user A cannot read/write user B's parent or `records` collection, an owner can create a bounded record, and an existing immutable record cannot be changed to different content. Publish only after these checks succeed.
5. Refresh Debt Free, download a backup, then select **Settings → Upgrade cloud storage**.
6. A successful upgrade displays **Split records — verified workspace index**. Compare account balances, statements, bill months, history counts, and a new exported backup with the pre-upgrade copy before making further changes.

No active record is switched if the rules are unavailable, staging fails, read-back verification fails, or another device changes the workspace. Retry only after resolving the reported issue.

## Storage design and limits

Each array (activity, payments, statements, bills, etc.) is divided into bounded JSON parts under `users/{uid}/records/{sha256}`. Settings use bounded parts too. Parts are immutable and content-addressed; unchanged parts are reused. A small parent index selects one complete verified workspace. Publishing the index is a compare-and-set Firestore transaction. A previous index is retained, and old immutable parts are not automatically deleted.

This removes the single-document history ceiling, but is not unlimited storage: a single record or the index can still be too large, total data still loads into browser memory, and retained old parts consume storage. This is not yet a server-side retention or account-erasure service. Clearing the active workspace does not permanently erase retained parts or downloaded/device backups. A permanent-erasure workflow needs explicit backend support before public commercialization.

## Verification scope

Automated tests cover large round trips, unchanged-part reuse, staging failure, corrupt/missing parts, competing writes, account-scoped durable recovery, and competing tabs. They test the storage adapter contract, not the deployed Firebase Rules engine. Deployed rules and real multi-device/mobile interruption tests must be verified separately. Do not label this a completed security audit.

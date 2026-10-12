# Privacy backend activation (project owner)

The website release does **not** deploy these functions or enable billing. Device retention controls work without them. Permanent account deletion and unused-cloud-part cleanup stay unavailable until activation.

1. Download and verify a current backup. Use a disposable Firebase test account for the checks below, not your real financial workspace.
2. Cloud Functions deployment requires Firebase CLI access and may require the Blaze billing plan. Review costs before changing your plan; this release does not authorize a billing change.
3. Install the official Firebase CLI and the dependencies in `functions/package.json` in your own environment. The backend uses Node.js 22.
4. Publish the complete current `firestore.rules`. Test signed-out access, cross-user reads/writes, and owner writes in the Rules Playground/emulator. A `privacyDeletion/{uid}` marker must deny all reads and writes under that user's workspace, including immutable parts. A root `maintenance` field must deny client root writes during cleanup. Clients cannot write deletion markers or configuration.
5. Deploy only this backend and rules to the exact project: `firebase deploy --project debt-free-af527 --only firestore:rules,functions:privacy` (confirm the CLI's codebase syntax for your installed version). Hosting remains on GitHub Pages.
6. **Only after the rules checks succeed**, create `configuration/privacy` using Firebase Console with `rulesVersion` (string) = `privacy-v1`. No client may write this configuration. This is an operator gate, not an automated security certification.
7. Sign in with the disposable account. Settings → Check deletion availability should now enable the tools. Test recent-auth rejection, exact deletion confirmation, interruption/retry, complete recursive removal, and inability of an old token to recreate the workspace. Do not run permanent deletion on your real account as a test.

## Retention

- Device copies are never automatically deleted. Users may remove a selected archived copy or manually prune copies older than 30 days, keeping at least the latest five. Pending changes are excluded. Downloads and copies on other devices are outside this control.
- Cloud cleanup removes **unused storage parts**, not financial ledger/history records. It retains parts referenced by the active and previous manifests, and only deletes unreferenced parts with creation timestamps older than 30 days. Older pre-timestamp parts remain until account deletion.
- Cleanup takes a root maintenance lock and changes its epoch. Concurrent client commits fail instead of publishing a manifest referencing deleted parts. Interrupted cleanup may leave the lock; an operator must inspect current/previous manifests and remove only `maintenance`, retaining a changed `maintenanceEpoch`, before allowing writes again.
- Deletion first records an immutable-to-clients write barrier, recursively removes `users/{authenticated uid}` and all parts, then deletes the Firebase Authentication user. An interrupted operation leaves the barrier in place; an administrator must finish recursive removal and auth removal. Never remove a barrier merely to bypass a failed deletion.
- A minimal deletion marker (UID and timestamps/status; **no balances, names, or financial records**) remains to prevent old authenticated sessions from recreating the deleted workspace. This is not complete removal of every security identifier. Google identity, bank accounts, downloaded backups, legacy local-only records not associated with a Google account, other-device browser copies and provider-managed backups are not deleted by this feature. The signed-in account's pending/archive recovery copies on the current browser are cleared only after cloud deletion is confirmed.

No production data has been deleted to verify this release. Local tests cover identity checks, deletion ordering and retention selection; they are not a substitute for deployed Rules/emulator tests and a security review.

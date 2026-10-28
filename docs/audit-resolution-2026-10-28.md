# Nivo 0.40.0 — audit fixes and repository preparation

## Findings addressed

| Finding | Change | Validation |
|---|---|---|
| Submit/cancel could leave status ahead of ledger writes | A database transaction surrounds document status and hooks; nested automatic payment/stock submissions and payment cancellations share it. Top-level posting lifecycles are queued. Failed operations roll back database state, restore nested in-memory status and discard affected caches. Coupon mutations are awaited. | Forced failure after posting/reversal, retry, nested automatic payment rollback, automatic shipment and concurrent invoice submissions. |
| Salary draft retained previous employee salary after reopening | Changing the employee reloads that employee's default salary, including a loaded draft. A manually entered salary is retained until the employee changes. | Employee switch before/after draft reload. |
| Cashflow excluded legacy direct Cash/Bank group postings | Cashflow includes direct ledger rows for Cash/Bank accounts, including groups, without adding child rollups. Reverted entries are excluded. | Native SQLite query covers direct group, leaf, unrelated account and reverted entries. |
| “Paid” could imply cash received when the value includes adjustments | Invoice summaries/list columns say “Settled / Adjusted”; the inline explanation defines Final Amount minus Due. Internal arithmetic remains compatible with existing documents. | Invoice financial tests and packaged summary check. |
| Status filter depended on mounted cells | Filtering evaluates status metadata across matching records before pagination. Filters applied from the dropdown persist across pages/refreshes. A hidden Status column still filters using the model definition; fresh profiles retain default columns. | Unrendered-row test and packaged posted invoice beyond the first 50 drafts. |
| Lists fetched all matching rows into memory | Regular filters use SQL count plus limit/offset. Derived status/age predicates scan bounded chunks and retain only the requested page. Stale async responses are ignored; page bounds are clamped; stale listeners are removed. | SQL count/offset, multi-chunk filtering, deleted final-page clamp, packaged 65-row filtered paging/selection. |

Derived filters still scan candidates because arbitrary renderer-derived status is not a stored SQL column; this reduces memory use, not the number of records that must be evaluated. Choosing “All” deliberately loads all visible matches. New column/filter changes reset selection; page selection preserves selections on other pages and checks actual row names.

## Import evidence remains unresolved

A read-only audit of locally retained source workbooks and the imported company explained the statement/control-ledger difference using unposted opening/adjustment records, journal entries without a party dimension and transactions after the source cutoff. It verified workbook hashes and SQLite integrity. Private financial amounts, parties and paths are excluded from this repository.

This is not a financial correction or cutover approval. Approved contra accounts/as-of treatment for opening adjustments, receipt-to-invoice application evidence and dated stock/valuation controls are still required. No fabricated allocations, stock entries or balancing journals were posted. The detailed report and one-off audit script remain local/private.

## Transaction scope

Atomic submit/cancel now covers its native document hooks and known nested lifecycles. The legacy architecture shares one Knex handle: arbitrary independent direct database writes made programmatically while a lifecycle is open are not isolated from that transaction. Top-level submit/cancel calls are serialized. Full isolation of unrelated background/direct writes requires an explicit transaction-owner context through IPC; this is not claimed as complete. No generic autosave timer was found during the review.

## GitHub and Windows delivery

- Public-source checker inventories tracked plus non-ignored untracked files and rejects databases, build output, signing material and known credential patterns.
- Source ZIP excludes `.git`, dependencies, builds, private evidence and company-specific one-off scripts. Original local reports are preserved in ignored private storage.
- GitHub workflows build native Windows x64 NSIS setup and portable EXEs with distinct names, and a Linux AppImage. The tag must equal the package version. Successful builds publish to the current repository, with checksums, using its built-in token.
- Linux regressions and packaged tests gate builds; Windows has a packaged startup smoke. No Windows code-signing certificate is configured.
- Windows install/upgrade/uninstall and business workflows require an actual Windows machine. The local Linux validation does not certify Windows installation. No GitHub repository or release was published during source preparation.
- Existing AGPL license, attribution and internal application/profile identity are preserved. Upstream auto-updates remain disabled.

Validation results and artifact checksums are recorded below after the final run.

## Final local validation

- Regression suite: **507/507** assertions; packaged-asset URL rewrite: **1/1**.
- `yarn typecheck`, targeted changed-module ESLint and `git diff --check`: passed.
- Linux AppImage build: passed. SHA-256: `a8ba5404511abe0eec55816e4d12db4d445c9ebc787347434f3834408aeb5b67`.
- Packaged audit regression: passed (hidden Status column, fresh default columns, global status filter beyond the first 50 rows, saved dropdown filters, 65-row pagination/selection, inactive cached-list listener cleanup, invoice summaries, backup/restore round trip, report branches and blocked unapproved file writes).
- Packaged Accounts/HR regression: passed (legacy schema migration preserving existing ledger/invoices, employee/expense/salary UI, salary prefill/net calculation, history, Bank & Cash drilldown and cancel reversal).
- Existing local company databases: all 3 passed SQLite integrity; their existing invoice, payment, ledger, party, item, account and HR rows matched consistent installer snapshots after installation.
- Frozen-lockfile dependency installation into an isolated dependency folder: passed. Electron-builder schema and workflow YAML syntax: passed.
- Windows native build and installation have **not** been run locally. The workflow and startup smoke are prepared for the first Windows GitHub runner run; actual installer behaviour remains to be verified on Windows.

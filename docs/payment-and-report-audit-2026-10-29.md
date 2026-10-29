# Payment and report audit — 2026-10-29

Three Luna agents reviewed accounting/models, printing, and UI/runtime/data safety. The primary agent reviewed integration, General Ledger and build/publishing configuration. Existing local work was preserved. This report records the current follow-up audit, not a guarantee that every possible path is bug-free.

## Confirmed defects and corrections

| Defect | Correction | Evidence |
| --- | --- | --- |
| Partial payment rejection could replace the amount with the full balance; saving while a field was validating could submit stale data | Reject without changing the amount; wait for pending edits before saving in both quick and full forms | Model regression and packaged partial-payment harness |
| The normal payment form exposed Write Off beside the payable amount, making a small adjustment easy to confuse with the actual cash payment | Label Payment Amount explicitly; hide a zero legacy write-off, retain existing nonzero adjustments | Packaged payment/correction tests; original history preserved |
| Submitted mistakes had no guided correction action | Confirm cancellation through the model lifecycle and open a separate correction draft; reset payment amount/allocation/write-off to zero | Decline, cancellation failure, reversal, corrected resubmission harness |
| Both-role party purchase payments selected Receive | Derive direction from invoice side and reverse it for returns | All four direction cases, control account and partial purchase submit/cancel |
| Party statement From/To selection was lost on date-control blur | Normalize emitted local Date values before regenerating statements | Date key tests and actual packaged blur events |
| Ungrouped General Ledger reset the running balance for each reference | Carry the balance across references; retain independent balances for explicit groups | Packaged report assertions |
| Inventory reference filters appeared only when inventory was disabled | Show Shipment/Purchase Receipt filters when inventory is enabled | Packaged enabled/disabled assertions |
| An approved export path could alias a company database through a symlink | Compare canonical paths and file identity before exports and active-database create/delete/restore actions | Symlink and ordinary-path regression cases |
| Daily retention removed old snapshots before verifying the replacement | Create the new backup successfully before pruning older daily snapshots | Failed-backup retention regression |
| Parent Save/Submit could skip a nested row editor's pending validation | Flush the row editor before saving its parent document | Packaged delayed-row validation regression |
| README linked older installers and omitted the Electron-native dependency setup | Link the current published version and document explicit Electron/esbuild installation and rebuild | Release assets verified; source instructions aligned with AGENTS.md |

The Linux build workflow also exercises partial payment and correction harnesses, in addition to existing audit, Accounts/HR and print checks.

## Review scope

Reviewed payment allocation/revalidation, posting/cancellation, invoice stock rollback, Expense and Salary Payment validation, optional feature policy, lists/filters/paging, dashboard and bank balances, database open/backup/restore boundaries, native PDF cleanup, statement ranges, document/report print routes and branding rules. Regressions use disposable synthetic companies. No old business transaction amounts were inferred or repaired.

## Remaining boundaries

Electron/runtime modernization requires a coordinated native-module compatibility change. Physical Windows install/upgrade/uninstall and arbitrary simultaneous programmatic writes on the legacy shared database handle are not certified by this audit. The existing Bengali manual was retained; no wholesale regeneration was requested.

## Executed verification

- Maintained regression runner: 668 assertions passed.
- Typecheck passed; scoped lint passed after explicit Vue-ref return types were added.
- Linux 0.40.5 AppImage built successfully.
- Packaged audit (including General Ledger), Accounts/HR, standard print/PDF/date controls, and correction harnesses passed on synthetic databases.
- The expanded partial-payment/row-validation harness passed, including delayed nested/inline edits, keyboard Save and failure blocking; it is also part of the Linux build workflow.
- Public-source privacy checks passed; databases, private migration tools and build output are excluded.

GitHub Actions provides the tagged Windows/Linux build and release evidence. A successful Linux check does not certify physical Windows installation.

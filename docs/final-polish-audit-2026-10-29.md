# Nivo final audit and polish - 2026-10-29

Scope: current Nivo source, reviewed by one read-only reviewer followed by three focused audit/fix agents (accounting/lifecycle, native/data safety, and UI/printing). Earlier user changes were preserved. The AI onboarding documents were published separately before application fixes.

## Confirmed defects corrected

| Scenario | Correction | Regression evidence |
| --- | --- | --- |
| A saved payment becomes too large after a second payment consumes the invoice balance | Validate accounts, allocations, latest outstanding and active submitted references again before posting | Stale-draft overpayment and cancelled-reference tests |
| A failed lifecycle clears singleton settings, breaking the next valid partial payment | Reload previously loaded settings from persisted values after rollback/cache eviction | Rejection followed by a valid partial payment with settings retained |
| Concurrent PDF/print jobs share a temporary basename, or a failure leaves HTML/windows behind | Use isolated per-job directories and finally cleanup; destroy a hidden window when initialization fails | Native load/assets/PDF/write/print failure, cancellation and concurrent-job tests |
| Native physical printing accepts arguments without the PDF endpoint's boundary checks | Apply trusted-renderer and HTML/dimension checks before printing | Existing IPC boundaries inspected; native print cleanup tests and packaged PDF checks |
| Purchase-return receipts or Receive payment vouchers use outgoing-cash labels | Share one cash-direction condition for invoice balance/totals; use Amount Received on Receive vouchers | All four invoice/return directions, Receive/Pay labels and QR cases |

The report-print explanation was also corrected. Changes stay in the relevant hooks/helpers instead of changing posting math, schemas or rewriting unrelated modules. No live company was used as a test fixture, and no transaction was re-imported or reposted.

## Verification

The maintained runner passed 620 assertions. Typecheck and touched-module lint passed. The Linux AppImage built successfully; packaged audit, Accounts/HR and all document/report PDF checks passed. Installation verification preserves company data and image settings. Refer to the matching GitHub Actions run and release for final build results; do not infer physical Windows installation coverage from an unpacked startup smoke.

The Bengali tutorial is retained because navigation and tutorial steps did not change. Its earlier targeted page-30 printing update remains intact.

## Remaining boundaries

Existing legacy-import reconciliation still depends on business-approved evidence. Arbitrary concurrent programmatic writes on the shared legacy database handle are not proven fully isolated. Electron/runtime modernization and signed/native Windows install-upgrade-uninstall validation remain separate compatibility work. This bounded audit does not establish that every possible runtime/device/data combination is defect-free.

Nivo 0.40.5 fixes payment entry, statement ranges, ledger display and data-safety edge cases.

- Partial payments preserve the entered amount. Save and keyboard shortcuts wait for field and invoice-row validation.
- Submitted documents offer Create → Correct (Correct Payment for payments). Confirmation cancels through the existing lifecycle and opens a separate draft; the original audit entry stays intact. Payment correction drafts start at zero.
- Both-role customer/supplier payments follow the invoice side and reverse direction for returns.
- Party statements retain the selected dates. Ungrouped General Ledger balances carry across references, and inventory reference filters follow the inventory feature.
- PDF/data exports reject symlink/hard-link aliases of company databases. Daily backup retention waits until a replacement snapshot succeeds.

Existing company transaction values are not inferred, repaired, re-imported or reposted by this update. The minimal invoice summary and previous branding/printing design remain. The existing Bengali manual is included; the correction workflow is documented in docs/ai/change-recipes.md.

Windows x64: choose -setup.exe or -portable.exe. Installers are unsigned. CI verifies unpacked startup; physical installation/upgrade/uninstall still requires separate evidence. Linux upgrades use scripts/install-linux.py with Nivo closed. Runtime modernization and arbitrary concurrent database-write isolation remain separate work.

Nivo is based on Frappe Books (AGPL-3.0-only); upstream attribution is preserved.

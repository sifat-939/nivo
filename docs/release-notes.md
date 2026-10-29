Nivo is an offline accounting desktop application based on Frappe Books (AGPL-3.0-only).

## Nivo 0.40.2 - Standard invoice and account statement

One A4 design, **Nivo Standard**, replaces the former built-in and custom templates. It includes a green item table, amount in words, invoice totals, allocated payments, balance due, and company-controlled signature and QR images. Images stay in each company's Print Settings; no personal signature or payment QR is shipped in the public repository.

Open a Customer or Supplier and choose Print to create an **Account Statement**. The From/To filters retain the opening balance; active receivable/payable ledger entries produce running and closing balances. Drafts and cancellation/reversal entries are excluded. Invoices with non-cash adjustments label them separately from payments. Draft invoices show DRAFT and do not display the stored signature.

Company initialization replaces obsolete template records and redirects Defaults/POS template references atomically. A migration backup is created before existing databases are migrated. No invoice, payment or ledger is reposted or deleted. The previous application and database backup should be retained until the upgrade is checked.

Windows 10/11 x64: download **-setup.exe** to install or **-portable.exe** to run without installation. Installers are unsigned. SHA256SUMS.txt contains the release checksums. CI tests packaged startup; a physical Windows installation/upgrade/uninstall test remains separate.

Linux: use the AppImage with scripts/install-linux.py. Automatic upstream updates remain disabled.

The updated Bengali user guide covers 52 application sections, including statements and Print Settings. Back up databases before upgrading. Historical imports still require business-specific ledger/opening/stock reconciliation; printing does not complete that reconciliation.

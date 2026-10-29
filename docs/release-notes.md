Nivo 0.40.3 fixes invoice amount visibility in dark mode and completes the shared print design across documents and reports.

Every print uses the company's Print Settings logo/contact header and signature footer. Invoices and quotations keep item/price tables; payment receipts show allocations/accounts/method; journals show debit/credit; delivery/receipt and stock movement documents show quantities and locations; expense and salary vouchers show their own financial details. General Ledger, Profit and Loss, Balance Sheet, Trial Balance, Stock Ledger and Stock Balance retain their own selected columns, filters, rows, group formatting and totals. Wide reports start in landscape.

QR appears only on submitted sales invoices with an outstanding balance and eligible positive customer account statements. Settled invoices, returns, payment receipts, payroll/expense vouchers and general reports do not request another payment. Drafts continue to show DRAFT and a signature line rather than the stored signature image.

Only page 30 (printing) of the Bengali manual is updated. Its original edition and other 57 pages are preserved. Company signatures, payment QR and private data are never included in the public repository.

Windows x64: choose the -setup.exe installer, or -portable.exe. Installers are unsigned. CI checks packaged startup; physical Windows install/upgrade/uninstall testing remains separate. Linux: use scripts/install-linux.py with the AppImage. Back up company data before upgrading. No business transaction or ledger is reposted by this update; legacy import reconciliation remains a separate accounting task.

Nivo is based on Frappe Books, licensed AGPL-3.0-only. Upstream attribution is retained.

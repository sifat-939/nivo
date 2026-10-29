# Product decisions and known boundaries

Reviewed against the 0.40.3 source on 2026-10-29. Read [package.json](../../package.json) for the current version and [CHANGELOG.md](../../CHANGELOG.md) for subsequent behavior. This note is a product baseline, not a claim that all bugs are fixed.

## Keep these choices

- Nivo is an offline desktop app for local business accounting. Internal Frappe Books identifiers are retained for old profiles/installations; visible branding is Nivo.
- UI labels are concise English, with native controls and light/dark themes. User-facing Bengali learning material is a separate PDF.
- Sales/purchases, parties/items, reports and optional inventory remain supported. Accounts adds Expense and Bank & Cash; HR adds Employees and Salary Payments.
- Optional tools are exposed through Settings > Features and their dependency/history rules. Tax/GST configuration/navigation, Data Tools and Help/documentation navigation were intentionally removed from the UI. Their underlying historic schemas/data may still be necessary; UI removal is not authorization to delete accounting tables.
- There is one managed Nivo Standard print design with different document/report contents. Logo/signature/QR are stored per company. All six financial/inventory report print views use the same branding shell. See [print behavior](../standard-print.md).
- Upstream automatic updates are disabled. Release artifacts are published to the owner's repository by version-matching tags, not to upstream.

## Data and runtime limits

- A source clone/installer does not carry the owner's company data or image settings. Existing company paths are retained separately and may be outside default folders.
- Legacy Karbar imports can require approved opening/contra accounts, invoice-wise allocations, dated stock and valuation evidence. Printing or an upgrade cannot infer missing records or certify reconciliation. Historical import notes are context, not a request to rerun a migration.
- Lifecycle posting coordinates status and ledger changes, but the legacy shared Knex handle does not prove full isolation of unrelated concurrent programmatic/background writes. A wider transaction-ownership redesign needs separate compatibility work.
- Electron 22 and its dependency set require coordinated security/runtime upgrade work. Do not silently bump only Electron or SQLite and assume compatibility.
- CI builds Windows installers and runs unpacked startup checks; installers are unsigned. Real Windows installation, upgrade, uninstall and company reopen need separate evidence. Check current release runs rather than relying on old audit claims.

## Documentation freshness

`docs/final-audit-2026-10-29.md` describes an earlier 0.40.1 snapshot. Later print work is recorded in the changelog and print guide. The Bengali manual's 0.40.3 printing update intentionally changed only page 30 of the existing edition. Do not replace the rest when asked for a targeted tutorial change.

Update this note when a product rule or material limitation actually changes. Avoid embedding user-specific paths, data counts, bank details, signatures or transient process IDs.

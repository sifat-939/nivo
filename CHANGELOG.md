## 0.40.3

- Restore readable invoice amount summaries in dark mode.
- Apply company logo/signature to all six report print views while preserving report filters, columns, grouping and totals.
- Use distinct invoice, quote, payment, journal, delivery/receipt, stock movement, expense and salary voucher layouts in the shared standard design.
- Show payment QR only on issued sales invoices with a balance due and eligible customer statements.
- Update only the printing section (page 30) of the existing Bengali manual.

## 0.40.2

- Replace obsolete print templates with one shared Nivo Standard A4 design.
- Add customer/supplier statements with date range, opening/running/closing balances.
- Add company-scoped signature and payment QR settings; hide signature on drafts.
- Print allocated payments separately from adjustments and preserve multi-page tables.
- Migrate template references atomically without altering business transactions.

# Changelog

## 0.40.1 — 2026-10-29

- Removed Tax from item lists and Tax/HSN from item-group lists.
- Grouped nullable IN filters so they cannot escape other query/delete conditions.
- Deferred sync notifications until posting commits and reset syncing state after failed saves.
- Fixed packaged deep-page reload and malformed saved list links; Settings tab links now switch while Settings is already open.
- Added a 57-page Bengali user guide with 51 screenshots from an isolated synthetic company.


## 0.40.0 — 2026-10-28

- Atomic document submit/cancel and rollback regression coverage.
- Consistent status filtering across pages and database pagination for regular lists.
- Salary draft employee changes refresh the salary default.
- Cashflow includes legacy direct Cash/Bank group postings.
- Invoice settlement summary clearly distinguishes a derived settled/adjusted amount from a cash receipt.
- Clean source export/privacy check and Windows x64 setup/portable GitHub builds/releases.
- Legacy business import reconciliation remains evidence-dependent; no guessed financial corrections are posted.

## 0.39.1

- Removed Data Tools navigation while preserving internal backup safeguards.

## 0.39.0

- Added Expense, Bank & Cash, Employees and Salary Payments.

## 0.38.0 and earlier

- Nivo branding, optional features, simplified tax/documentation UI, invoice summaries and backup safeguards. See the dated audit and verification documents for prior changes.

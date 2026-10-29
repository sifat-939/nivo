# Nivo Standard printing (0.40.2)

There is one A4 print template, **Nivo Standard**, shared by sales/purchase invoices, quotes, payment vouchers, journal entries, stock documents and party statements. Document headings and columns adapt to their type. The sample's green table, company header, amount in words, totals and signature layout are retained.

## Using it

- Saved invoice: choose Print, then Save as PDF or Print.
- Customer/supplier: open the saved Party, choose the Print icon, and select From Date/To Date for the Account Statement.
- Settings > Print: configure company name, contacts, logo, Authorized Signature and Payment QR. The signature is withheld on draft/cancelled documents. The QR appears on issued sales invoices and positive customer statements, not supplier bills.
- Setup > Print Templates (enable its feature if needed): only Nivo Standard appears. Its preview uses a sales invoice. It is a managed template; branding assets are configured in Print Settings.

## Meaning of amounts

Invoice payments come from submitted, uncancelled PaymentFor allocations for that specific invoice, prorated for payment write-offs. A shared payment is not counted in full on every invoice. Other reductions in outstanding are shown separately as Settled / Adjusted; they are not labelled as cash received. Company-currency allocations/outstanding are converted to invoice currency using the invoice's saved exchange rate. Drafts have no final due/payment claim.

Statements use active Receivable/Payable control-account postings for that Party, in chronological order. Entries before From Date form the opening; entries through the entire To Date form the period. Debit minus credit is a signed balance: positive = To Receive, negative = To Pay. A Party with both roles is netted. Historical source records without native postings are not invented or included. Reconciliation of legacy data remains necessary.

## Upgrade safety

Existing database initialization makes a migration snapshot before schema migration. Replacement of template records, Defaults and non-empty POSProfile template references runs in one transaction; failure rolls back the entire replacement. The former built-ins and custom templates are removed, as requested. No business documents or accounting postings are deleted or reposted. Keep the pre-upgrade backup if an old custom design needs recovery.

The public source contains no company signature, payment QR, customer invoice or database. The sample logo/signature/QR supplied by the owner is configured only in the selected local company. A fresh company or another computer requires its own Print Settings or a consistent backup of that company.

## Verification

Regression tests cover control-account balances, period opening/closing, reversal exclusions, atomic replacement/rollback, idempotence and shared-payment allocations. The packaged UI test exports invoice and statement PDFs, checks draft signatures, and exercises a 65-line invoice. Table headings repeat on subsequent PDF pages; totals/signature appear after the table. Preview pages scroll for long documents; PDF output paginates at A4 size.

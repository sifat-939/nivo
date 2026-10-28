# Legacy import status

The importer preserved source records and used native document lifecycles. This is an available-export migration, not a verified full migration.

Unresolved evidence: opening/adjustment account direction, receipt-to-invoice allocations, dated stock movements and original attachment bytes. Source and native report cutoffs also need to agree. A balanced ledger or matching record count alone does not establish completeness.

Do not infer missing entries, allocate old receipts arbitrarily or rerun historical correction scripts against a live company. Preserve original exports and consistent SQLite snapshots. Reconcile a temporary copy against a business-approved source statement before posting any correction.

Business-specific amounts, company identifiers, local paths and incident reports are retained locally under `.local-private/` and excluded from the repository. No business database is distributed with Nivo.

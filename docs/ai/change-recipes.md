# Change recipes

Start with the relevant source and existing test. Prefer changing the layer that owns the behavior over hiding an error elsewhere.

## UI, lists and optional features

Forms are schema/model driven. Check schema `hidden`/field definitions and model visibility before changing generic controls. List data and columns involve [List.vue](../../src/pages/ListView/List.vue), [ListView.vue](../../src/pages/ListView/ListView.vue) and model `getListViewSettings`. Preserve paging, active filters, selected row names and cleanup of kept-alive listeners.

For a feature toggle, trace the setting field, [feature policy](../../src/utils/featurePolicy.ts), [settings definitions](../../src/pages/Settings/featureSettings.ts) and navigation/creation guards together. Some dependencies/history make toggles intentionally non-editable. Do not unlock them through SQL. Follow native Check controls and theme colors; confirm amounts/labels are readable in dark mode.

## Models and accounting

A new model normally needs schema registration in [schemas/schemas.ts](../../schemas/schemas.ts), model registration in [models/index.ts](../../models/index.ts), and the name map in [models/types.ts](../../models/types.ts). Follow the existing Expense or SalaryPayment model as an example for that kind of task, not as a generic substitute for invoice/payment semantics.

Use `sync` for saving and existing submit/cancel lifecycles for posting. Use the parent transaction's nested methods where appropriate; do not independently post the same auto-payment or shipment twice. Test rollbacks and cancellation reversals. PaymentFor allocations refer to a specific invoice; whole payment amounts cannot be duplicated across every referenced bill. Legacy settled/adjusted amounts are not automatically cash received.

For schema/migration work, inspect [database manager](../../backend/database/manager.ts), [patch registry](../../backend/patches/index.ts) and current compatibility tests. Use an expendable old-schema fixture and a consistent backup, not a live company.

## Printing and reports

There is one managed template: [Nivo Standard](../../templates/Nivo%20Standard.All.template.html), name/type constants in [standardPrint.ts](../../utils/standardPrint.ts). It renders distinct data supplied by [standardPrintValues.ts](../../utils/standardPrintValues.ts) and [reportPrint.ts](../../utils/reportPrint.ts). Do not force a report, payment or stock document into invoice columns.

Retain company header/signature across formats. QR is conditional on an eligible amount to collect; do not show it on completed payments, fully settled invoices or general reports. Drafts show a signature line rather than the configured signature image. Company image fields belong to PrintSettings, never the public template.

Report print controls preserve existing report values, column selection and row range. Keep hierarchical labels, subtotals and repeating table headings. Check [PrintContainer.vue](../../src/pages/TemplateBuilder/PrintContainer.vue), [main/saveHtmlAsPdf.ts](../../main/saveHtmlAsPdf.ts) and actual exported PDF pages, not only a preview screenshot.

The Bengali manual sources are under [docs/user-guide](../user-guide/). If only one part changes, update that part and verify unrelated pages stay unchanged. The manual's edition label can remain older than the app when intentionally applying a targeted page update.

## Native files, releases and handoff

Keep renderer IPC narrowly scoped. Extend existing validated handlers and grants instead of allowing arbitrary paths. Use synthetic fixtures under the OS temporary directory and never remove a real database during source cleanup.

Before finishing, report what changed, why, checks actually run and remaining limitations. If interrupted, capture the diff's state and next concrete step; the next agent should inspect it before repeating any posting, migration, release or install action.

# Architecture

This is a local Electron application, not a hosted web backend. Most UI is Vue 3 and TypeScript; Vite/esbuild bundle it. Electron provides native windows, file dialogs and printing. Knex and better-sqlite3 persist each company's accounting data in SQLite. Exact versions live in [package.json](../../package.json) and [yarn.lock](../../yarn.lock).

## Main paths

```text
Vue form/list/report
  -> Fyo document models and validation
  -> database handler / converter
  -> Electron preload IPC bridge
  -> main-process IPC validation
  -> database manager / Knex / SQLite
```

Tests can inject a database manager directly into Fyo instead of crossing IPC. Do not mistake that test path for permission to expose arbitrary database/file access in the renderer.

| Area | Entry points / responsibilities |
| --- | --- |
| App boot and native windows | [main.ts](../../main.ts), [main/](../../main/) |
| Renderer initialization and navigation | [src/renderer.ts](../../src/renderer.ts), [src/initFyo.ts](../../src/initFyo.ts), [src/router.ts](../../src/router.ts) |
| Company initialization | [src/utils/initialization.ts](../../src/utils/initialization.ts), [src/setup/setupInstance.ts](../../src/setup/setupInstance.ts) |
| Schema declarations and assembly | [schemas/app/](../../schemas/app/), [schemas/index.ts](../../schemas/index.ts), [schemas/schemas.ts](../../schemas/schemas.ts) |
| Models, validation and formulas | [models/index.ts](../../models/index.ts), [models/types.ts](../../models/types.ts), [models/baseModels/](../../models/baseModels/) |
| Document persistence and events | [fyo/model/doc.ts](../../fyo/model/doc.ts), [fyo/core/docHandler.ts](../../fyo/core/docHandler.ts), [fyo/core/dbHandler.ts](../../fyo/core/dbHandler.ts) |
| Posting and reversal | [models/Transactional/](../../models/Transactional/), [models/baseModels/Invoice/](../../models/baseModels/Invoice/), [models/baseModels/Payment/](../../models/baseModels/Payment/) |
| Native boundary and file validation | [main/preload.ts](../../main/preload.ts), [main/registerIpcMainActionListeners.ts](../../main/registerIpcMainActionListeners.ts), [main/databaseFiles.ts](../../main/databaseFiles.ts) |
| Database implementation and migration | [backend/database/manager.ts](../../backend/database/manager.ts), [backend/database/core.ts](../../backend/database/core.ts), [backend/patches/](../../backend/patches/) |
| Lists, forms and theme | [src/pages/ListView/](../../src/pages/ListView/), [src/pages/CommonForm/](../../src/pages/CommonForm/), [src/components/](../../src/components/), [src/styles/index.css](../../src/styles/index.css) |
| Features and navigation | [src/utils/featurePolicy.ts](../../src/utils/featurePolicy.ts), [src/pages/Settings/featureSettings.ts](../../src/pages/Settings/featureSettings.ts), [src/components/Sidebar.vue](../../src/components/Sidebar.vue) |
| Reports | [reports/index.ts](../../reports/index.ts), [reports/Report.ts](../../reports/Report.ts), [src/pages/Report.vue](../../src/pages/Report.vue) |
| Printing | [src/utils/printTemplates.ts](../../src/utils/printTemplates.ts), [utils/standardPrintValues.ts](../../utils/standardPrintValues.ts), [utils/reportPrint.ts](../../utils/reportPrint.ts), [templates/](../../templates/) |

## Important distinctions

- Schema JSON defines fields; registered models add formulas, validation and actions. A field hidden in the UI can still be required by historic accounting data.
- Single settings documents are persisted through `SingleValue`; they are not one physical SQL table per settings screen.
- Saved drafts, submitted documents, payments and stock movements have different effects. A saved invoice is not automatically a cash receipt or a stock transfer.
- `DocHandler.runLifecycle` queues lifecycle work; transactional submit/cancel hooks coordinate status and ledger writes. Keep nested auto-payment/stock actions in their parent transaction. The legacy shared database handle is not full isolation for arbitrary concurrent background writes.
- Money calculations/postings use Pesa. Invoice currency and company-currency balances/allocations differ; inspect existing conversion logic before changing totals.
- `app://` resolves both assets and Vue deep routes through [main/appProtocol.ts](../../main/appProtocol.ts). A dev-server success does not establish packaged reload behavior.

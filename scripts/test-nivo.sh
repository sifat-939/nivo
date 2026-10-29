#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node --test build/scripts/tests/assetPaths.test.mjs
export ELECTRON_RUN_AS_NODE=true
export TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}'
export TS_NODE_TRANSPILE_ONLY=true
export IS_TEST=true
export TEST_DB_PATH=:memory:
exec ./node_modules/.bin/electron --require ts-node/register --require tsconfig-paths/register \
  ./node_modules/.bin/tape \
  tests/testSetupInstance.spec.ts \
  tests/testStandardPrint.spec.ts \
  src/utils/tests/testAuditFollowup.spec.ts \
  tests/testHRAccounting.spec.ts \
  models/baseModels/tests/testInvoice.spec.ts \
  models/baseModels/tests/testAtomicAutoStock.spec.ts \
  src/pages/CommonForm/tests/invoiceFinancials.spec.ts \
  src/pages/ListView/tests/helpers.spec.ts \
  models/baseModels/tests/testPayment.spec.ts \
  models/baseModels/tests/testPaymentOutstanding.spec.ts \
  backend/database/tests/testBackup.spec.ts \
  backend/database/tests/testCore.spec.ts \
  backend/database/tests/testCashflow.spec.ts \
  backend/database/tests/testSalaryMonthIndex.spec.ts \
  src/utils/tests/testPOSClosingShift.spec.ts \
  src/utils/tests/testSingleFlight.spec.ts \
  src/utils/tests/testFeaturePolicy.spec.ts \
  src/utils/tests/testFeatureWorkflows.spec.ts \
  src/utils/tests/testBankCash.spec.ts \
  scripts/tests/testKarbarImportSafety.spec.ts \
  main/tests/databaseFiles.spec.ts \
  main/tests/appProtocol.spec.ts \
  main/tests/partyStatement.spec.ts \
  main/tests/importReconciliation.spec.ts

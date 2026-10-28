import test from 'tape';
import { closeTestFyo, getTestFyo, setupTestFyo } from 'tests/helpers';
import { ModelNameEnum } from 'models/types';
import { getGetStartedTaskCounts } from '../getStarted';

const fyo = getTestFyo();
setupTestFyo(fyo, __filename);

test('onboarding counts Both records and purchase bills in the temp database', async (t) => {
  await fyo.doc
    .getNewDoc(ModelNameEnum.Item, {
      name: 'Onboarding Both Item',
      rate: 20,
      unit: 'Unit',
      for: 'Both',
      trackItem: false,
    })
    .sync();
  await fyo.doc
    .getNewDoc(ModelNameEnum.Party, {
      name: 'Onboarding Both Party',
      role: 'Both',
    })
    .sync();
  await fyo.doc
    .getNewDoc(ModelNameEnum.PurchaseInvoice, {
      party: 'Onboarding Both Party',
      account: 'Creditors',
      items: [{ item: 'Onboarding Both Item', quantity: 1, rate: 20 }],
    })
    .sync();

  const checks = await getGetStartedTaskCounts(fyo);
  t.equal(checks.salesItemCreated, true, 'Both item completes sales item task');
  t.equal(
    checks.purchaseItemCreated,
    true,
    'Both item completes purchase item task'
  );
  t.equal(checks.customerCreated, true, 'Both party completes customer task');
  t.equal(checks.supplierCreated, true, 'Both party completes supplier task');
  t.equal(checks.billCreated, true, 'PurchaseInvoice completes bill task');
  t.equal(
    checks.invoiceCreated,
    false,
    'purchase bill does not count as a sales invoice'
  );
});

test('POS without inventory enables POS without optional inventory settings', async (t) => {
  await fyo.singles.AccountingSettings?.setAndSync({
    enablePointOfSaleWithOutInventory: true,
  });

  const inventory = fyo.singles.InventorySettings;
  t.equal(inventory?.enablePointOfSale, true, 'POS is enabled');
  t.equal(!!inventory?.enableBatches, false, 'batches stay disabled');
  t.equal(
    !!inventory?.enableSerialNumber,
    false,
    'serial numbers stay disabled'
  );
  t.equal(!!inventory?.enableBarcodes, false, 'barcodes stay disabled');
  t.equal(
    !!inventory?.enableUomConversions,
    false,
    'unit conversions stay disabled'
  );
});

closeTestFyo(fyo, __filename);

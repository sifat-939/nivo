import { ModelNameEnum } from 'models/types';
import { Invoice } from 'models/baseModels/Invoice/Invoice';
import { InventorySettings } from 'models/inventory/InventorySettings';
import { closeTestFyo, getTestFyo, setupTestFyo } from 'tests/helpers';
import test from 'tape';

const fyo = getTestFyo();
setupTestFyo(fyo, __filename);

test('invoice auto shipment is a nested submit in the invoice transaction', async (t) => {
  const itemName = 'Atomic Stock Item';
  const locationName = 'Atomic Stock Location';
  const partyName = 'Atomic Stock Customer';

  await fyo.doc
    .getNewDoc(ModelNameEnum.Item, {
      name: itemName,
      rate: 100,
      unit: 'Unit',
      for: 'Both',
      trackItem: true,
    })
    .sync();
  await fyo.doc
    .getNewDoc(ModelNameEnum.Location, { name: locationName })
    .sync();
  await fyo.doc
    .getNewDoc(ModelNameEnum.Party, {
      name: partyName,
      role: 'Both',
    })
    .sync();

  const inventorySettings = (await fyo.doc.getDoc(
    ModelNameEnum.InventorySettings
  )) as InventorySettings;
  const stockAccountTypes = [
    ['Stock', 'stockInHand'],
    ['Stock Received But Not Billed', 'stockReceivedButNotBilled'],
    ['Cost of Goods Sold', 'costOfGoodsSold'],
  ] as const;
  for (const [accountType, fieldname] of stockAccountTypes) {
    const accounts = (await fyo.db.getAll(ModelNameEnum.Account, {
      fields: ['name'],
      filters: { accountType, isGroup: false },
    })) as { name: string }[];
    if (accounts[0]) {
      await inventorySettings.set(fieldname, accounts[0].name);
    }
  }
  await inventorySettings.sync();
  await (
    await fyo.doc.getDoc(ModelNameEnum.AccountingSettings)
  ).setAndSync('enableInventory', true);
  await (
    await fyo.doc.getDoc(ModelNameEnum.Defaults)
  ).setAndSync('shipmentLocation', locationName);

  const receipt = fyo.doc.getNewDoc(ModelNameEnum.PurchaseReceipt, {
    party: partyName,
    date: new Date('2025-01-01'),
  });
  await receipt.append('items', {
    item: itemName,
    location: locationName,
    quantity: 2,
    rate: 100,
  });
  await receipt.sync();
  await receipt.submit();

  const invoice = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
    party: partyName,
    date: new Date('2025-01-02'),
    account: 'Debtors',
  }) as Invoice;
  await invoice.append('items', { item: itemName, quantity: 1, rate: 100 });
  await invoice.runFormulas();
  await invoice.sync();
  await invoice.submit();

  t.equal(
    invoice.stockNotTransferred,
    0,
    'nested shipment transfers invoice stock'
  );
  const linked = (await fyo.db.getAll(ModelNameEnum.Shipment, {
    fields: ['name'],
    filters: { backReference: invoice.name! },
  })) as { name: string }[];
  t.equal(linked.length, 1, 'linked shipment committed with invoice');
  const shipment = await fyo.doc.getDoc(ModelNameEnum.Shipment, linked[0].name);
  t.ok(shipment.submitted, 'nested shipment is submitted');

  const stockBeforeFailure = await fyo.db.getStockQuantity(
    itemName,
    locationName
  );
  const failingInvoice = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
    party: partyName,
    date: new Date('2025-01-03'),
    account: 'Debtors',
  }) as Invoice;
  await failingInvoice.append('items', {
    item: itemName,
    location: locationName,
    quantity: 1,
    rate: 100,
  });
  await failingInvoice.runFormulas();
  await failingInvoice.sync();
  const afterSubmit = failingInvoice.afterSubmit.bind(failingInvoice);
  failingInvoice.afterSubmit = async () => {
    await afterSubmit();
    throw new Error('forced failure after nested shipment submit');
  };

  try {
    await failingInvoice.submit();
    t.fail('invoice submit should fail after its nested shipment');
  } catch (error) {
    t.match(String(error), /forced failure/, 'outer hook failure is returned');
  }
  t.notOk(failingInvoice.submitted, 'failed invoice remains a draft');
  t.equal(
    await fyo.db.getStockQuantity(itemName, locationName),
    stockBeforeFailure,
    'rollback restores stock after nested shipment posting'
  );
  const failedLinks = await fyo.db.getAll(ModelNameEnum.Shipment, {
    fields: ['name'],
    filters: { backReference: failingInvoice.name! },
  });
  t.equal(failedLinks.length, 0, 'rollback removes the nested shipment');
});

closeTestFyo(fyo, __filename);

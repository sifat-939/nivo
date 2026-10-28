import test from 'tape';
import {
  canCreateSchema,
  getAvailableSchemaNames,
  isRecentFeatureItemAvailable,
  isSchemaCreationBlocked,
} from '../featurePolicy';

test('feature policy keeps disabled history readable but blocks new records', (t) => {
  const fyo = {
    schemaMap: {
      SalesInvoice: {},
      PriceList: {},
      PrintTemplate: {},
      Shipment: {},
      PurchaseReceipt: {},
      Batch: {},
      UOMConversionItem: {},
      Tax: {},
    },
    singles: {
      AccountingSettings: {
        enableInventory: true,
        enablePriceList: false,
        enableShipment: true,
        enablePurchaseReceipt: true,
        enablePrintTemplates: false,
      },
      InventorySettings: { enableBatches: false, enableUomConversions: false },
    },
  } as never;

  t.deepEqual(
    getAvailableSchemaNames(fyo),
    ['SalesInvoice', 'Shipment', 'PurchaseReceipt'],
    'navigation/search omit disabled schemas and hidden tax screens'
  );
  t.equal(
    canCreateSchema(fyo, 'PriceList'),
    false,
    'disabled creation is blocked'
  );
  t.equal(
    canCreateSchema(fyo, 'Shipment'),
    true,
    'enabled stock workflow is available'
  );
  t.equal(
    canCreateSchema(fyo, 'PurchaseReceipt'),
    true,
    'enabled receipt uses inventory'
  );
  t.equal(
    canCreateSchema(fyo, 'Batch'),
    false,
    'inventory does not enable batches'
  );
  t.equal(
    canCreateSchema(fyo, 'UOMConversionItem'),
    false,
    'inventory does not enable unit conversions'
  );
  t.equal(
    canCreateSchema(fyo, 'PrintTemplate'),
    false,
    'disabled tools stay hidden'
  );
  t.equal(
    canCreateSchema(fyo, 'SalesInvoice'),
    true,
    'core creation remains available'
  );
  t.equal(
    canCreateSchema(fyo, 'Tax'),
    false,
    'removed tax UI cannot be recreated'
  );
  t.equal(
    isSchemaCreationBlocked(fyo, 'PriceList', true),
    true,
    'disabled new records are blocked'
  );
  t.equal(
    isSchemaCreationBlocked(fyo, 'PriceList', false),
    false,
    'historical records stay readable'
  );
  t.equal(
    isRecentFeatureItemAvailable(fyo, {
      group: 'Create',
      schemaName: 'PriceList',
    }),
    false,
    'recent creation links to disabled features are omitted'
  );
  t.equal(
    isRecentFeatureItemAvailable(fyo, {
      group: 'List',
      route: '/edit/PriceList/Existing',
    }),
    true,
    'recent links to historical documents remain available'
  );
  t.end();
});

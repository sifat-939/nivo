import test from 'tape';
import { closeTestFyo, getTestFyo, setupTestFyo } from 'tests/helpers';
import { ModelNameEnum } from 'models/types';
import { SalesInvoice } from '../SalesInvoice/SalesInvoice';
import { Payment } from '../Payment/Payment';
import { PaymentTypeEnum } from '../Payment/types';
import {
  assertDoesNotThrow,
  assertThrows,
} from 'backend/database/tests/helpers';
import { PurchaseInvoice } from '../PurchaseInvoice/PurchaseInvoice';

const fyo = getTestFyo();
setupTestFyo(fyo, __filename);

const itemData = {
  name: 'Pen',
  rate: 100,
  unit: 'Unit',
  for: 'Both',
  trackItem: true,
  hasBatch: true,
  hasSerialNumber: true,
};

const partyData = {
  name: 'John Whoe',
  email: 'john@whoe.com',
};

const batchMap = {
  batchOne: {
    name: 'PN-AB001',
    manufactureDate: '2022-11-03T09:57:04.528',
  },
  batchTwo: {
    name: 'PN-AB002',
    manufactureDate: '2022-10-03T09:57:04.528',
  },
};

test('create test docs', async (t) => {
  await fyo.doc.getNewDoc(ModelNameEnum.Item, itemData).sync();

  t.ok(
    fyo.db.exists(ModelNameEnum.Item, itemData.name),
    `dummy item ${itemData.name}  exists`
  );

  await fyo.doc.getNewDoc(ModelNameEnum.Party, partyData).sync();
  t.ok(
    fyo.db.exists(ModelNameEnum.Party, partyData.name),
    `dummy party ${partyData.name} exists`
  );

  for (const batch of Object.values(batchMap)) {
    await fyo.doc.getNewDoc(ModelNameEnum.Batch, batch).sync(),
      t.ok(
        fyo.db.exists(ModelNameEnum.Batch, batch.name),
        `batch ${batch.name} exists`
      );
  }
});

test('create SINV with batch then create payment against it', async (t) => {
  const sinvDoc = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
    account: 'Debtors',
    party: partyData.name,
    items: [
      {
        item: itemData.name,
        batch: batchMap.batchOne.name,
        rate: itemData.rate,
        quantity: 2,
      },
    ],
  }) as SalesInvoice;

  await sinvDoc.sync();
  await sinvDoc.runFormulas();
  await sinvDoc.submit();

  t.ok(
    fyo.db.exists(ModelNameEnum.SalesInvoice, sinvDoc.name),
    `${sinvDoc.name} exists`
  );

  const paymentDoc = sinvDoc.getPayment();
  await paymentDoc?.sync();
  await paymentDoc?.submit();

  t.equals(paymentDoc?.name, 'PAY-1001');
});

test('create SINV return for one qty', async (t) => {
  const sinvDoc = (await fyo.doc.getDoc(
    ModelNameEnum.SalesInvoice,
    'SINV-1001'
  )) as SalesInvoice;

  let returnDoc = (await sinvDoc?.getReturnDoc()) as SalesInvoice;

  returnDoc.items = [];
  returnDoc.append('items', {
    item: itemData.name,
    batch: batchMap.batchOne.name,
    quantity: 1,
    rate: itemData.rate,
  });

  await returnDoc.runFormulas();
  await returnDoc.sync();
  await returnDoc.submit();

  t.ok(
    await fyo.db.exists(ModelNameEnum.SalesInvoice, returnDoc.name),
    'SINV return for one qty created'
  );

  t.equals(
    returnDoc.outstandingAmount?.float,
    itemData.rate,
    'returnDoc outstanding amount matches'
  );

  const returnSinvAles = await fyo.db.getAllRaw(
    ModelNameEnum.AccountingLedgerEntry,
    {
      fields: ['name', 'account', 'credit', 'debit'],
      filters: { referenceName: returnDoc.name! },
    }
  );

  for (const ale of returnSinvAles) {
    if (ale.account === 'Sales') {
      t.equal(
        fyo.pesa(ale.debit as string).float,
        fyo.pesa(itemData.rate).float,
        `return Invoice debited from ${ale.account}`
      );
    }

    if (ale.account === 'Debtors') {
      t.equal(
        fyo.pesa(ale.credit as string).float,
        fyo.pesa(itemData.rate).float,
        `return Invoice credited to ${ale.account}`
      );
    }
  }

  await assertThrows(
    async () => await sinvDoc.cancel(),
    'can not cancel a SINV when a return invoice is created against it'
  );
});

test('create SINV return for balance qty', async (t) => {
  const sinvDoc = (await fyo.doc.getDoc(
    ModelNameEnum.SalesInvoice,
    'SINV-1001'
  )) as SalesInvoice;

  const returnDoc = (await sinvDoc?.getReturnDoc()) as SalesInvoice;
  t.equals(
    Object.values(returnDoc.items!)[0].quantity,
    -1,
    'return doc has 1 qty left to return'
  );

  await returnDoc.sync();

  await returnDoc.runFormulas();
  await returnDoc.submit();

  t.ok(
    await fyo.db.exists(ModelNameEnum.SalesInvoice, returnDoc.name),
    'SINV return for one qty created'
  );

  t.equals(
    returnDoc.outstandingAmount?.float,
    itemData.rate,
    'return doc outstanding amount matches'
  );
});

test('create payment for return invoice', async (t) => {
  const returnDoc = (await fyo.doc.getDoc(
    ModelNameEnum.SalesInvoice,
    'SINV-1002'
  )) as SalesInvoice;

  t.equals(returnDoc.returnAgainst, 'SINV-1001');

  const paymentDoc = returnDoc.getPayment() as Payment;
  t.equals(paymentDoc.paymentType, PaymentTypeEnum.Pay, 'payment type is pay');

  t.equals(
    paymentDoc.amount?.float,
    itemData.rate,
    'payment amount for return invoice matches'
  );

  await paymentDoc.sync();

  t.ok(
    await fyo.db.exists(ModelNameEnum.Payment, paymentDoc.name),
    'payment entry created for return invoice'
  );

  await assertDoesNotThrow(
    async () => await returnDoc.cancel(),
    'return invoice cancelled'
  );
});

test('creating PINV return when invoice is not paid', async (t) => {
  const pinvDoc = fyo.doc.getNewDoc(
    ModelNameEnum.PurchaseInvoice
  ) as PurchaseInvoice;

  await pinvDoc.set({
    party: partyData.name,
    account: 'Creditors',
    items: [
      {
        item: itemData.name,
        batch: batchMap.batchOne.name,
        quantity: 2,
        rate: itemData.rate,
      },
    ],
  });
  await pinvDoc.sync();
  await pinvDoc.submit();

  t.equals(pinvDoc.name, 'PINV-1001', `${pinvDoc.name} is submitted`);

  const returnDoc = (await pinvDoc.getReturnDoc()) as PurchaseInvoice;
  await returnDoc.sync();
  await returnDoc.submit();

  t.equals(
    returnDoc?.returnAgainst,
    pinvDoc.name,
    `return pinv created against ${pinvDoc.name}`
  );
  t.equals(
    Object.values(returnDoc.items!)[0].quantity,
    -2,
    'pinv returned qty matches'
  );

  const returnSinvAles = await fyo.db.getAllRaw(
    ModelNameEnum.AccountingLedgerEntry,
    {
      fields: ['name', 'account', 'credit', 'debit'],
      filters: { referenceName: returnDoc.name! },
    }
  );

  for (const ale of returnSinvAles) {
    if (ale.account === 'Creditors') {
      t.equal(
        0,
        returnDoc.outstandingAmount!.float,
        `return Invoice debited from ${ale.account}`
      );
    }

    if (ale.account === 'Cost of Goods Sold') {
      t.equal(
        fyo.pesa(ale.credit as string).float,
        returnDoc.outstandingAmount!.float,
        `return Invoice credited to ${ale.account}`
      );
    }
  }
});

const withholdingTaxData = {
  name: 'Withholding-3',
  details: [{ account: 'TDS', rate: -3 }],
};

test('create withholding tax template with negative rate', async (t) => {
  await fyo.doc.getNewDoc(ModelNameEnum.Tax, withholdingTaxData).sync();

  t.ok(
    await fyo.db.exists(ModelNameEnum.Tax, withholdingTaxData.name),
    `tax template ${withholdingTaxData.name} exists`
  );
});

const nonBatchItemData = {
  name: 'Service',
  rate: 1000,
  unit: 'Unit',
  for: 'Both',
  trackItem: false,
};

test('create non-batch item for tax test', async (t) => {
  await fyo.doc.getNewDoc(ModelNameEnum.Item, nonBatchItemData).sync();

  t.ok(
    await fyo.db.exists(ModelNameEnum.Item, nonBatchItemData.name),
    `item ${nonBatchItemData.name} exists`
  );
});

test('negative tax rate reduces grand total', async (t) => {
  const sinvDoc = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
    account: 'Debtors',
    party: partyData.name,
    items: [
      {
        item: nonBatchItemData.name,
        rate: nonBatchItemData.rate,
        quantity: 1,
        tax: withholdingTaxData.name,
      },
    ],
  }) as SalesInvoice;

  await sinvDoc.runFormulas();

  t.equals(sinvDoc.netTotal?.float, 1000, 'net total is 1000');

  const taxes = sinvDoc.taxes ?? [];
  t.equals(taxes.length, 1, 'one tax summary row');
  t.equals(
    (taxes[0] as any).amount?.float,
    -30,
    'tax amount is -30 (negative 3% of 1000)'
  );

  t.equals(
    sinvDoc.grandTotal?.float,
    970,
    'grand total is 970 (1000 - 30), not 1030'
  );
});

test('after-tax discount invoice keeps tax in the submitted posting', async (t) => {
  const sinvDoc = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
    account: 'Debtors',
    party: partyData.name,
    discountAfterTax: true,
    items: [
      {
        item: nonBatchItemData.name,
        rate: nonBatchItemData.rate,
        quantity: 1,
        tax: withholdingTaxData.name,
      },
    ],
  }) as SalesInvoice;

  await sinvDoc.runFormulas();
  t.equal(sinvDoc.taxes?.length, 1, 'tax summary remains present');
  t.equal(sinvDoc.taxes?.[0].amount?.float, -30, 'tax is calculated at -3%');
  await sinvDoc.sync();
  await sinvDoc.submit();

  const entries = await fyo.db.getAllRaw(ModelNameEnum.AccountingLedgerEntry, {
    fields: ['account', 'debit', 'credit'],
    filters: { referenceName: sinvDoc.name! },
  });
  const taxEntry = entries.find((entry) => entry.account === 'TDS');
  t.ok(taxEntry, 'tax ledger entry is posted');
  t.equal(
    fyo.pesa(taxEntry?.debit as string).sub(taxEntry?.credit as string).float,
    30,
    'negative tax is debited by 30'
  );
});

test('submit and cancel roll back status and ledger together on hook failure', async (t) => {
  const invoice = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
    account: 'Debtors',
    party: partyData.name,
    items: [{ item: 'Service', rate: 100, quantity: 1 }],
  }) as SalesInvoice;
  await invoice.runFormulas();
  await invoice.sync();

  let syncNotifications = 0;
  const onSync = () => {
    syncNotifications += 1;
  };
  fyo.doc.observer.on(`sync:${ModelNameEnum.SalesInvoice}`, onSync);
  const afterSubmit = invoice.afterSubmit.bind(invoice);
  invoice.afterSubmit = async () => {
    await afterSubmit();
    t.equal(
      syncNotifications,
      0,
      'posting hooks do not publish uncommitted status'
    );
    throw new Error('forced submit failure after ledger posting');
  };
  await assertThrows(async () => invoice.submit());

  t.equal(syncNotifications, 0, 'rolled-back sync notifications are discarded');
  fyo.doc.observer.off(`sync:${ModelNameEnum.SalesInvoice}`, onSync);
  const savedAfterSubmit = await fyo.db.get(
    ModelNameEnum.SalesInvoice,
    invoice.name!
  );
  t.notOk(
    savedAfterSubmit.submitted,
    'failed submit leaves persisted status draft'
  );
  t.notOk(invoice.submitted, 'failed submit restores in-memory status');
  t.equal(
    (
      await fyo.db.getAllRaw(ModelNameEnum.AccountingLedgerEntry, {
        filters: { referenceName: invoice.name! },
      })
    ).length,
    0,
    'failed submit leaves no ledger rows'
  );

  invoice.afterSubmit = afterSubmit;
  await invoice.submit();
  const afterCancel = invoice.afterCancel.bind(invoice);
  invoice.afterCancel = async () => {
    await afterCancel();
    throw new Error('forced cancel failure after reversal posting');
  };
  await assertThrows(async () => invoice.cancel());

  const savedAfterCancel = await fyo.db.get(
    ModelNameEnum.SalesInvoice,
    invoice.name!
  );
  t.notOk(
    savedAfterCancel.cancelled,
    'failed cancel leaves persisted status submitted'
  );
  t.notOk(invoice.cancelled, 'failed cancel restores in-memory status');
  t.equal(
    (
      await fyo.db.getAllRaw(ModelNameEnum.AccountingLedgerEntry, {
        filters: { referenceName: invoice.name!, reverted: true },
      })
    ).length,
    0,
    'failed cancel leaves no reversal ledger rows'
  );
});

test('invoice auto payment shares the invoice transaction', async (t) => {
  const defaults = await fyo.doc.getDoc(ModelNameEnum.Defaults);
  await defaults.setAndSync('salesPaymentAccount', 'Cash');
  const invoice = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
    account: 'Debtors',
    party: partyData.name,
    makeAutoPayment: true,
    items: [{ item: 'Service', rate: 100, quantity: 1 }],
  }) as SalesInvoice;
  await invoice.runFormulas();
  await invoice.sync();
  await invoice.submit();

  t.ok(invoice.submitted, 'parent invoice is submitted');
  t.ok(
    invoice.makeAutoPayment && invoice.autoPaymentAccount,
    'automatic payment was requested'
  );
  t.equal(
    invoice.outstandingAmount?.float,
    0,
    'nested automatic payment settled the invoice'
  );
  await invoice.cancel();
  t.ok(
    invoice.cancelled,
    'invoice cancellation completes with its nested payment'
  );
});

test('outer submit failure restores nested auto payment document state', async (t) => {
  const invoice = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
    account: 'Debtors',
    party: partyData.name,
    items: [{ item: 'Service', rate: 20, quantity: 1 }],
  }) as SalesInvoice;
  await invoice.runFormulas();
  await invoice.sync();

  const getPayment = invoice.getPayment.bind(invoice);
  let payment: Payment | null = null;
  invoice.getPayment = () => {
    payment = getPayment();
    return payment;
  };
  const afterSubmit = invoice.afterSubmit.bind(invoice);
  invoice.afterSubmit = async () => {
    await afterSubmit();
    throw new Error('forced outer failure after auto payment');
  };
  await assertThrows(async () => invoice.submit());

  t.notOk(invoice.submitted, 'parent invoice status is restored');
  const capturedPayment = payment as Payment | null;
  t.ok(capturedPayment, 'nested payment was created during the hook');
  t.notOk(
    capturedPayment?.submitted,
    'nested payment in-memory status is restored too'
  );
  t.notOk(
    await fyo.db.exists(ModelNameEnum.Payment, capturedPayment?.name),
    'nested payment row was rolled back'
  );
});

test('concurrent invoice submits are serialized', async (t) => {
  const invoices = ['Concurrent A', 'Concurrent B'].map(
    (description) =>
      fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
        account: 'Debtors',
        party: partyData.name,
        items: [{ item: 'Service', rate: 10, quantity: 1, description }],
      }) as SalesInvoice
  );

  for (const invoice of invoices) {
    await invoice.runFormulas();
    await invoice.sync();
  }
  await Promise.all(invoices.map((invoice) => invoice.submit()));

  for (const invoice of invoices) {
    const saved = await fyo.db.get(ModelNameEnum.SalesInvoice, invoice.name!);
    t.ok(saved.submitted, `${invoice.name} committed successfully`);
  }
});

test('failed sync releases formula syncing state before retry', async (t) => {
  const invoice = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
    account: 'Debtors',
    party: partyData.name,
    items: [{ item: 'Service', rate: 30, quantity: 1 }],
  }) as SalesInvoice;
  const beforeSync = invoice.beforeSync.bind(invoice);
  invoice.beforeSync = async () => {
    throw new Error('forced validation failure');
  };
  await assertThrows(() => invoice.sync());
  t.notOk(
    invoice.isSyncing,
    'failed validation does not leave formula dependencies locked'
  );
  invoice.beforeSync = beforeSync;
  await invoice.sync();
  t.notOk(invoice.isSyncing, 'retry leaves normal syncing state');
});

closeTestFyo(fyo, __filename);

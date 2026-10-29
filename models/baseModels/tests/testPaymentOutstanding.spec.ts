import test from 'tape';
import { closeTestFyo, getTestFyo, setupTestFyo } from 'tests/helpers';
import { assertThrows } from 'backend/database/tests/helpers';
import { ModelNameEnum } from 'models/types';
import { Money } from 'pesa';
import { Party } from '../Party/Party';
import { Payment } from '../Payment/Payment';
import { PurchaseInvoice } from '../PurchaseInvoice/PurchaseInvoice';
import { SalesInvoice } from '../SalesInvoice/SalesInvoice';

const fyo = getTestFyo();
setupTestFyo(fyo, __filename);

const itemName = 'Payment Regression Item';

async function createInvoice(
  type: ModelNameEnum.SalesInvoice | ModelNameEnum.PurchaseInvoice,
  party: string,
  rate: number
) {
  const invoice = fyo.doc.getNewDoc(type, {
    party,
    account: type === ModelNameEnum.SalesInvoice ? 'Debtors' : 'Creditors',
    items: [{ item: itemName, rate, quantity: 1 }],
  }) as SalesInvoice | PurchaseInvoice;
  await invoice.runFormulas();
  await invoice.sync();
  await invoice.submit();
  return invoice;
}

async function createPayment(
  party: string,
  type: 'Receive' | 'Pay',
  referenceType: ModelNameEnum.SalesInvoice | ModelNameEnum.PurchaseInvoice,
  referenceName: string,
  amount: number
) {
  const payment = fyo.doc.getNewDoc(ModelNameEnum.Payment, {
    party,
    paymentType: type,
    paymentMethod: 'Cash',
    amount: fyo.pesa(amount),
    for: [{ referenceType, referenceName, amount: fyo.pesa(amount) }],
  }) as Payment;
  await payment.sync();
  return payment;
}

test('setup payment allocation regression fixtures', async (t) => {
  await fyo.singles.AccountingSettings?.setAndSync({
    enablePartialPayment: true,
  });
  await fyo.doc
    .getNewDoc(ModelNameEnum.Item, {
      name: itemName,
      rate: 100,
      unit: 'Unit',
      for: 'Both',
      trackItem: false,
    })
    .sync();
  await fyo.doc
    .getNewDoc(ModelNameEnum.Party, {
      name: 'Allocation Customer',
      role: 'Customer',
    })
    .sync();
  await fyo.doc
    .getNewDoc(ModelNameEnum.Party, {
      name: 'Return Customer',
      role: 'Customer',
    })
    .sync();
  await fyo.doc
    .getNewDoc(ModelNameEnum.Party, {
      name: 'Return Supplier',
      role: 'Supplier',
    })
    .sync();
  t.pass('created item and parties');
});

test('payment rejects allocations above one invoice outstanding', async (t) => {
  const first = await createInvoice(
    ModelNameEnum.SalesInvoice,
    'Allocation Customer',
    100
  );
  const second = await createInvoice(
    ModelNameEnum.SalesInvoice,
    'Allocation Customer',
    250
  );
  const payment = fyo.doc.getNewDoc(ModelNameEnum.Payment, {
    party: 'Allocation Customer',
    paymentType: 'Receive',
    paymentMethod: 'Cash',
    amount: fyo.pesa(350),
    for: [
      {
        referenceType: ModelNameEnum.SalesInvoice,
        referenceName: first.name,
        amount: fyo.pesa(350),
      },
      {
        referenceType: ModelNameEnum.SalesInvoice,
        referenceName: second.name,
        amount: fyo.pesa(0),
      },
    ],
  }) as Payment;

  const ledgerBefore = await fyo.db.getAllRaw(
    ModelNameEnum.AccountingLedgerEntry,
    { fields: ['name'] }
  );
  const partyBefore: Money | undefined = (
    (await fyo.doc.getDoc(ModelNameEnum.Party, 'Allocation Customer')) as Party
  ).outstandingAmount;
  await assertThrows(async () => {
    await payment.sync();
    await payment.submit();
  }, 'over-allocated invoice is rejected');

  const ledgerAfter = await fyo.db.getAllRaw(
    ModelNameEnum.AccountingLedgerEntry,
    { fields: ['name'] }
  );
  const partyAfter: Money | undefined = (
    (await fyo.doc.getDoc(ModelNameEnum.Party, 'Allocation Customer')) as Party
  ).outstandingAmount;
  t.equal(
    first.outstandingAmount?.float,
    100,
    'first invoice outstanding is unchanged'
  );
  t.equal(
    second.outstandingAmount?.float,
    250,
    'second invoice outstanding is unchanged'
  );
  t.equal(
    ledgerAfter.length,
    ledgerBefore.length,
    'rejected payment posts no ledger entries'
  );
  t.equal(
    partyAfter?.float,
    partyBefore?.float,
    'rejected payment leaves party outstanding unchanged'
  );
  t.notOk(payment.submitted, 'rejected payment is not submitted');
});

test('payment aggregates duplicate allocation rows and rejects negative allocations', async (t) => {
  const invoice = await createInvoice(
    ModelNameEnum.SalesInvoice,
    'Allocation Customer',
    100
  );

  const duplicateAllocation = fyo.doc.getNewDoc(ModelNameEnum.Payment, {
    party: 'Allocation Customer',
    paymentType: 'Receive',
    paymentMethod: 'Cash',
    amount: fyo.pesa(110),
    for: [
      {
        referenceType: ModelNameEnum.SalesInvoice,
        referenceName: invoice.name,
        amount: fyo.pesa(60),
      },
      {
        referenceType: ModelNameEnum.SalesInvoice,
        referenceName: invoice.name,
        amount: fyo.pesa(50),
      },
    ],
  }) as Payment;

  await assertThrows(async () => {
    await duplicateAllocation.sync();
    await duplicateAllocation.submit();
  }, 'duplicate rows cannot collectively exceed invoice outstanding');

  const negativeAllocation = fyo.doc.getNewDoc(ModelNameEnum.Payment, {
    party: 'Allocation Customer',
    paymentType: 'Receive',
    paymentMethod: 'Cash',
    amount: fyo.pesa(10),
    for: [
      {
        referenceType: ModelNameEnum.SalesInvoice,
        referenceName: invoice.name,
        amount: fyo.pesa(-10),
      },
    ],
  }) as Payment;
  await assertThrows(async () => {
    await negativeAllocation.sync();
    await negativeAllocation.submit();
  }, 'negative allocation is rejected');

  const ledgerEntries = await fyo.db.getAllRaw(
    ModelNameEnum.AccountingLedgerEntry,
    { fields: ['name'], filters: { referenceType: ModelNameEnum.Payment } }
  );
  t.equal(
    invoice.outstandingAmount?.float,
    100,
    'invalid allocations leave invoice outstanding unchanged'
  );
  t.equal(
    ledgerEntries.length,
    0,
    'invalid allocations post no payment ledger entries'
  );
  t.notOk(
    duplicateAllocation.submitted,
    'duplicate over-allocation remains unsubmitted'
  );
  t.notOk(
    negativeAllocation.submitted,
    'negative allocation remains unsubmitted'
  );
});

test('cancelling a partial sales return refund restores invoice and party outstanding', async (t) => {
  const invoice = await createInvoice(
    ModelNameEnum.SalesInvoice,
    'Return Customer',
    100
  );
  const initialPayment = invoice.getPayment() as Payment;
  await initialPayment.sync();
  await initialPayment.submit();

  const returnInvoice = (await invoice.getReturnDoc()) as SalesInvoice;
  await returnInvoice.runFormulas();
  await returnInvoice.sync();
  await returnInvoice.submit();
  t.equal(
    returnInvoice.outstandingAmount?.float,
    100,
    'sales return has 100 refund outstanding'
  );

  const refund = await createPayment(
    'Return Customer',
    'Pay',
    ModelNameEnum.SalesInvoice,
    returnInvoice.name!,
    40
  );
  await refund.submit();
  t.equal(
    returnInvoice.outstandingAmount?.float,
    60,
    'partial refund reduces return outstanding'
  );
  const partyAfterRefund: Money | undefined = (
    (await fyo.doc.getDoc(ModelNameEnum.Party, 'Return Customer')) as Party
  ).outstandingAmount;
  t.equal(
    partyAfterRefund?.float,
    60,
    'party outstanding reflects partial refund'
  );

  await refund.cancel();
  const paymentLedger = await fyo.db.getAllRaw(
    ModelNameEnum.AccountingLedgerEntry,
    {
      fields: ['name'],
      filters: {
        referenceType: ModelNameEnum.Payment,
        referenceName: refund.name!,
      },
    }
  );
  const partyAfterCancel: Money | undefined = (
    (await fyo.doc.getDoc(ModelNameEnum.Party, 'Return Customer')) as Party
  ).outstandingAmount;
  t.equal(
    returnInvoice.outstandingAmount?.float,
    100,
    'cancel restores sales return outstanding'
  );
  t.equal(partyAfterCancel?.float, 100, 'cancel restores party outstanding');
  t.equal(
    paymentLedger.length,
    4,
    'cancel posts reversing entries for the payment'
  );
});

test('cancelling a partial purchase return refund restores invoice and party outstanding', async (t) => {
  const invoice = await createInvoice(
    ModelNameEnum.PurchaseInvoice,
    'Return Supplier',
    100
  );
  const initialPayment = invoice.getPayment() as Payment;
  await initialPayment.sync();
  await initialPayment.submit();

  const returnInvoice = (await invoice.getReturnDoc()) as PurchaseInvoice;
  await returnInvoice.runFormulas();
  await returnInvoice.sync();
  await returnInvoice.submit();
  t.equal(
    returnInvoice.outstandingAmount?.float,
    100,
    'purchase return has 100 refund outstanding'
  );

  const refund = await createPayment(
    'Return Supplier',
    'Receive',
    ModelNameEnum.PurchaseInvoice,
    returnInvoice.name!,
    40
  );
  await refund.submit();
  t.equal(
    returnInvoice.outstandingAmount?.float,
    60,
    'partial refund reduces return outstanding'
  );
  const partyAfterRefund: Money | undefined = (
    (await fyo.doc.getDoc(ModelNameEnum.Party, 'Return Supplier')) as Party
  ).outstandingAmount;
  t.equal(
    partyAfterRefund?.float,
    60,
    'supplier party outstanding reflects partial refund'
  );

  await refund.cancel();
  const paymentLedger = await fyo.db.getAllRaw(
    ModelNameEnum.AccountingLedgerEntry,
    {
      fields: ['name'],
      filters: {
        referenceType: ModelNameEnum.Payment,
        referenceName: refund.name!,
      },
    }
  );
  const partyAfterCancel: Money | undefined = (
    (await fyo.doc.getDoc(ModelNameEnum.Party, 'Return Supplier')) as Party
  ).outstandingAmount;
  t.equal(
    returnInvoice.outstandingAmount?.float,
    100,
    'cancel restores purchase return outstanding'
  );
  t.equal(
    partyAfterCancel?.float,
    100,
    'cancel restores supplier party outstanding'
  );
  t.equal(
    paymentLedger.length,
    4,
    'cancel posts reversing entries for the payment'
  );
});

test('saved payment rechecks outstanding before posting', async (t) => {
  const invoice = await createInvoice(
    ModelNameEnum.SalesInvoice,
    'Allocation Customer',
    100
  );
  const stale = await createPayment(
    'Allocation Customer',
    'Receive',
    ModelNameEnum.SalesInvoice,
    invoice.name!,
    100
  );
  const current = await createPayment(
    'Allocation Customer',
    'Receive',
    ModelNameEnum.SalesInvoice,
    invoice.name!,
    100
  );
  await current.submit();
  await assertThrows(
    () => stale.submit(),
    'saved payment cannot overpay a settled invoice'
  );
  const reloaded = await fyo.doc.getDoc(
    ModelNameEnum.SalesInvoice,
    invoice.name!
  );
  t.equal(
    (reloaded.outstandingAmount as Money).float,
    0,
    'invoice stays settled'
  );
  t.notOk(stale.submitted, 'rejected stale payment remains a draft');
  t.equal(
    fyo.singles.AccountingSettings?.enablePartialPayment,
    true,
    'rollback reloads accounting settings'
  );
  const entries = await fyo.db.getAllRaw(ModelNameEnum.AccountingLedgerEntry, {
    fields: ['name'],
    filters: {
      referenceType: ModelNameEnum.Payment,
      referenceName: stale.name!,
    },
  });
  t.equal(entries.length, 0, 'stale payment posts no ledger entries');
});

test('saved payment rejects a subsequently cancelled invoice', async (t) => {
  const invoice = await createInvoice(
    ModelNameEnum.SalesInvoice,
    'Allocation Customer',
    100
  );
  const payment = await createPayment(
    'Allocation Customer',
    'Receive',
    ModelNameEnum.SalesInvoice,
    invoice.name!,
    100
  );
  await invoice.cancel();
  await assertThrows(
    () => payment.submit(),
    'cancelled reference cannot be paid'
  );
  t.notOk(payment.submitted, 'payment remains a draft');
  const entries = await fyo.db.getAllRaw(ModelNameEnum.AccountingLedgerEntry, {
    fields: ['name'],
    filters: {
      referenceType: ModelNameEnum.Payment,
      referenceName: payment.name!,
    },
  });
  t.equal(entries.length, 0, 'cancelled reference posts no payment entries');
});

test('cancelling a normal partial payment restores outstanding', async (t) => {
  const invoice = await createInvoice(
    ModelNameEnum.SalesInvoice,
    'Allocation Customer',
    100
  );
  const payment = await createPayment(
    'Allocation Customer',
    'Receive',
    ModelNameEnum.SalesInvoice,
    invoice.name!,
    40
  );
  await payment.submit();
  t.equal(
    invoice.outstandingAmount?.float,
    60,
    'normal payment reduces invoice outstanding'
  );
  await payment.cancel();
  t.equal(
    invoice.outstandingAmount?.float,
    100,
    'normal payment cancellation restores invoice outstanding'
  );
});

closeTestFyo(fyo, __filename);

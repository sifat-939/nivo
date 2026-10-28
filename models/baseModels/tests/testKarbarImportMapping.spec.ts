import test from 'tape';
import { closeTestFyo, getTestFyo, setupTestFyo } from 'tests/helpers';
import { ModelNameEnum } from 'models/types';
import { SalesInvoice } from '../SalesInvoice/SalesInvoice';
import { Payment } from '../Payment/Payment';

const fyo = getTestFyo();
setupTestFyo(fyo, __filename);

test('Karbar amount/discount and receipt evidence map to native totals and PaymentFor', async (t) => {
  await fyo.singles.AccountingSettings?.setAndSync({ enableDiscounting: true });
  await fyo.doc.getNewDoc(ModelNameEnum.Party, { name: 'Karbar Fixture Customer', role: 'Customer' }).sync();
  await fyo.doc.getNewDoc(ModelNameEnum.Item, {
    name: 'Karbar Fixture Item', rate: 0.1, unit: 'Unit', for: 'Both', trackItem: false,
    incomeAccount: 'Sales', expenseAccount: 'Cost of Goods Sold',
  }).sync();

  const discounted = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
    party: 'Karbar Fixture Customer', account: 'Debtors',
    items: [
      { item: 'Karbar Fixture Item', quantity: 680000, rate: fyo.pesa(0.1), account: 'Sales', setItemDiscountAmount: true, itemDiscountAmount: fyo.pesa(0) },
      // Source stores 10,000 as a total line discount; Nivo receives the per-unit 0.1.
      { item: 'Karbar Fixture Item', quantity: 100000, rate: fyo.pesa(0.1), account: 'Sales', setItemDiscountAmount: true, itemDiscountAmount: fyo.pesa(0.1) },
    ],
  }) as SalesInvoice;
  await discounted.runFormulas();
  await discounted.sync();
  await discounted.submit();
  t.equal(discounted.grandTotal?.float, 68000, 'native invoice total includes the absolute source line discount');

  const spotInvoice = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
    party: 'Karbar Fixture Customer', account: 'Debtors',
    items: [{ item: 'Karbar Fixture Item', quantity: 1, rate: fyo.pesa(4000), account: 'Sales' }],
  }) as SalesInvoice;
  await spotInvoice.runFormulas();
  await spotInvoice.sync();
  await spotInvoice.submit();
  const spotPayment = fyo.doc.getNewDoc(ModelNameEnum.Payment, {
    party: 'Karbar Fixture Customer', paymentType: 'Receive', paymentMethod: 'Cash',
    amount: fyo.pesa(4000), account: 'Debtors', paymentAccount: 'Cash',
    for: [{ referenceType: ModelNameEnum.SalesInvoice, referenceName: spotInvoice.name, amount: fyo.pesa(4000) }],
  }) as Payment;
  await spotPayment.sync();
  await spotPayment.submit();
  t.equal(spotInvoice.outstandingAmount?.float, 0, 'same-sale used amount allocation closes a 4,000 invoice');
  t.equal((spotPayment.for ?? []).length, 1, 'source-evidenced spot receipt has one PaymentFor row');
  t.equal((spotPayment.for ?? [])[0].referenceName, spotInvoice.name, 'PaymentFor points to the corresponding invoice');
});

test('widened source party supports receipt; unsupported payment-out posts as native JournalEntry', async (t) => {
  await fyo.doc.getNewDoc(ModelNameEnum.Party, { name: 'Karbar Fixture Supplier', role: 'Both', defaultAccount: 'Debtors' }).sync();
  const supplierReceipt = fyo.doc.getNewDoc(ModelNameEnum.Payment, {
    party: 'Karbar Fixture Supplier', paymentType: 'Receive', paymentMethod: 'Cash',
    amount: fyo.pesa(100), account: 'Debtors', paymentAccount: 'Cash',
  }) as Payment;
  await supplierReceipt.sync();
  await supplierReceipt.submit();
  const receiptRows = (await fyo.db.getAllRaw('AccountingLedgerEntry', {
    fields: ['account', 'debit', 'credit'], filters: { referenceType: 'Payment', referenceName: supplierReceipt.name! },
  })) as { account: string; debit: string; credit: string }[];
  t.equal(supplierReceipt.paymentType, 'Receive', 'Both-role source payment-in is supported by native Payment');
  t.equal(Number(receiptRows.find((r) => r.account === 'Cash')?.debit), 100, 'source receipt debits cash');
  t.equal(Number(receiptRows.find((r) => r.account === 'Debtors')?.credit), 100, 'report-derived unified Receivables is credited');

  const customerPay = fyo.doc.getNewDoc(ModelNameEnum.JournalEntry, {
    entryType: 'Journal Entry',
    accounts: [
      { account: 'Debtors', debit: fyo.pesa(40), credit: fyo.pesa(0) },
      { account: 'Cash', debit: fyo.pesa(0), credit: fyo.pesa(40) },
    ],
  });
  await customerPay.set('userRemark', 'Karbar source payment-out; party retained in source archive because JournalEntry has no party dimension.');
  await customerPay.sync();
  await customerPay.submit();
  const payRows = (await fyo.db.getAllRaw('AccountingLedgerEntry', {
    fields: ['account', 'debit', 'credit'], filters: { referenceType: 'JournalEntry', referenceName: customerPay.name! },
  })) as { account: string; debit: string; credit: string }[];
  t.equal(Number(payRows.find((r) => r.account === 'Debtors')?.debit), 40, 'source payment-out debits report-derived Receivables');
  t.equal(Number(payRows.find((r) => r.account === 'Cash')?.credit), 40, 'source payment-out credits cash through Nivo lifecycle');
});

closeTestFyo(fyo, __filename);

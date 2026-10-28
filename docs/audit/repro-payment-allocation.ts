import test from 'tape';
import { closeTestFyo, getTestFyo, setupTestFyo } from 'tests/helpers';
import { ModelNameEnum } from 'models/types';
import { SalesInvoice } from 'models/baseModels/SalesInvoice/SalesInvoice';
import { Payment } from 'models/baseModels/Payment/Payment';
const fyo = getTestFyo();
setupTestFyo(fyo, __filename);
test('audit repro over-allocation', async (t) => {
  await fyo.doc
    .getNewDoc(ModelNameEnum.Item, {
      name: 'A',
      rate: 100,
      unit: 'Unit',
      for: 'Sales',
    })
    .sync();
  await fyo.doc
    .getNewDoc(ModelNameEnum.Item, {
      name: 'B',
      rate: 250,
      unit: 'Unit',
      for: 'Sales',
    })
    .sync();
  await fyo.doc
    .getNewDoc(ModelNameEnum.Party, {
      name: 'Alice',
      email: 'alice@example.com',
    })
    .sync();
  for (const [item, rate] of [
    ['A', 100],
    ['B', 250],
  ] as [string, number][]) {
    const invoice = fyo.doc.getNewDoc(ModelNameEnum.SalesInvoice, {
      account: 'Debtors',
      party: 'Alice',
      items: [{ item, rate, quantity: 1 }],
    }) as SalesInvoice;
    await invoice.sync();
    await invoice.runFormulas();
    await invoice.submit();
  }
  const payment = fyo.doc.getNewDoc(ModelNameEnum.Payment, {
    party: 'Alice',
    paymentType: 'Receive',
    paymentMethod: 'Cash',
    amount: fyo.pesa(350),
    for: [
      {
        referenceType: ModelNameEnum.SalesInvoice,
        referenceName: 'SINV-1001',
        amount: fyo.pesa(350),
      },
      {
        referenceType: ModelNameEnum.SalesInvoice,
        referenceName: 'SINV-1002',
        amount: fyo.pesa(0),
      },
    ],
  }) as Payment;
  try {
    await payment.validateReferenceOutstanding();
    t.fail('over-allocation must be rejected');
  } catch (error) {
    t.ok(
      (error as Error).message.includes('exceeds'),
      'per-invoice over-allocation is rejected'
    );
  }
  const a = (await fyo.doc.getDoc(
    ModelNameEnum.SalesInvoice,
    'SINV-1001'
  )) as SalesInvoice;
  const b = (await fyo.doc.getDoc(
    ModelNameEnum.SalesInvoice,
    'SINV-1002'
  )) as SalesInvoice;
  t.equal(
    a.outstandingAmount?.float,
    100,
    'invoice with 100 outstanding remains unchanged'
  );
  t.equal(b.outstandingAmount?.float, 250, 'second invoice remains unchanged');
});
closeTestFyo(fyo, __filename);

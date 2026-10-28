// Isolated method reproduction: no real database or ledger is used.
import assert from 'assert/strict';
import { Money } from 'pesa';
import { Payment } from 'models/baseModels/Payment/Payment';
import { getTestFyo } from 'tests/helpers';

async function main() {
  const fyo = getTestFyo();
  const invoice = {
    isReturn: true,
    outstandingAmount: fyo.pesa(100),
    async setAndSync(values: { outstandingAmount: Money }) {
      this.outstandingAmount = values.outstandingAmount;
    },
  };
  const payment = {
    fyo: { doc: { getDoc: async () => invoice } },
    for: [
      {
        referenceType: 'SalesInvoice',
        referenceName: 'RETURN-AUDIT',
        amount: fyo.pesa(40),
      },
    ],
  } as unknown as Payment;
  await Payment.prototype.updateReferenceDocOutstanding.call(payment);
  assert.equal(invoice.outstandingAmount.float, 60);
  await Payment.prototype._revertReferenceOutstanding.call(payment);
  assert.equal(invoice.outstandingAmount.float, 100);
  console.log(
    'Return outstanding: before=100, payment=40, after submit=60, after cancel=100 (restored)'
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

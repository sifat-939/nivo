import test from 'tape';
import { summarizePartyControlLedger } from '../partyStatement';

test('party statement nets only receivable and payable control entries', (t) => {
  const rows = [
    {
      name: 'sale',
      party: 'Both Party',
      date: '2026-01-01',
      account: 'AR',
      accountType: 'Receivable',
      debit: 200,
      credit: 0,
      referenceType: 'SalesInvoice',
      referenceName: 'S-1',
      reverted: false,
    },
    {
      name: 'payment',
      party: 'Both Party',
      date: '2026-01-02',
      account: 'AR',
      accountType: 'Receivable',
      debit: 0,
      credit: 50,
      referenceType: 'Payment',
      referenceName: 'P-1',
      reverted: false,
    },
    {
      name: 'purchase',
      party: 'Both Party',
      date: '2026-01-03',
      account: 'AP',
      accountType: 'Payable',
      debit: 0,
      credit: 200,
      referenceType: 'PurchaseInvoice',
      referenceName: 'B-1',
      reverted: false,
    },
    {
      name: 'sales-income',
      party: 'Both Party',
      date: '2026-01-01',
      account: 'Income',
      accountType: 'Income Account',
      debit: 0,
      credit: 200,
      referenceType: 'SalesInvoice',
      referenceName: 'S-1',
      reverted: false,
    },
  ];
  const [statement] = summarizePartyControlLedger(rows);
  t.equal(statement.debit, 200, 'only control account debits are included');
  t.equal(
    statement.credit,
    250,
    'receivable payment and payable purchase credits are included'
  );
  t.equal(
    statement.closingNet,
    -50,
    'combined customer/supplier control net is signed correctly'
  );
  t.equal(statement.entries.length, 3, 'income leg is excluded');
  t.end();
});

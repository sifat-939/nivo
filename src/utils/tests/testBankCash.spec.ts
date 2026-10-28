import test from 'tape';
import { getTestFyo } from 'tests/helpers';
import { getBankCashBalances } from '../bankCash';

test('bank cash balances retain exact decimals and ignore cancelled postings', (t) => {
  const fyo = getTestFyo();
  const balances = getBankCashBalances(
    [
      { name: 'Cash', accountType: 'Cash' },
      { name: 'Bank', accountType: 'Bank' },
    ],
    [
      { account: 'Cash', debit: '0.1', credit: '0', reverted: false },
      { account: 'Cash', debit: '0.2', credit: '0', reverted: false },
      { account: 'Cash', debit: '0', credit: '0.05', reverted: false },
      { account: 'Cash', debit: '0', credit: '99', reverted: true },
      { account: 'Other', debit: '999', credit: '0', reverted: false },
    ],
    fyo
  );
  t.deepEqual(
    balances.map(({ name }) => name),
    ['Bank', 'Cash'],
    'accounts are sorted'
  );
  t.equal(
    balances[0].balance.float,
    0,
    'account without ledger starts at zero'
  );
  t.ok(balances[1].balance.eq('0.25'), 'exact posted decimal net only');
  t.end();
});

test('existing direct cash group postings stay visible without child rollups', (t) => {
  const rows = getBankCashBalances(
    [
      { name: 'Cash Group', accountType: 'Cash', isGroup: true },
      { name: 'Empty Group', accountType: 'Cash', isGroup: true },
      { name: 'Cash', accountType: 'Cash', isGroup: false },
    ],
    [
      { account: 'Cash Group', debit: '50', credit: '0', reverted: false },
      { account: 'Cash', debit: '20', credit: '0', reverted: false },
    ],
    getTestFyo()
  );
  t.equal(rows.length, 2, 'empty groups are omitted');
  t.equal(
    rows.find((row) => row.name === 'Cash Group')?.balance.float,
    50,
    'group shows only direct legacy postings'
  );
  t.equal(
    rows.reduce((sum, row) => sum + row.balance.float, 0),
    70,
    'child amounts are not counted again in a parent rollup'
  );
  t.end();
});

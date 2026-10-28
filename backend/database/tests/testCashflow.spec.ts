import test from 'tape';
import DatabaseCore from '../core';
import { BespokeQueries } from '../bespoke';

test('cashflow counts direct group and leaf cash/bank entries once', async (t) => {
  const db = new DatabaseCore();
  await db.connect();
  try {
    await db.knex!.schema.createTable('Account', (table) => {
      table.string('name');
      table.string('accountType');
      table.boolean('isGroup');
    });
    await db.knex!.schema.createTable('AccountingLedgerEntry', (table) => {
      table.string('account');
      table.string('date');
      table.decimal('debit');
      table.decimal('credit');
      table.boolean('reverted');
    });
    await db.knex!('Account').insert([
      { name: 'Cash group', accountType: 'Cash', isGroup: true },
      { name: 'Till', accountType: 'Cash', isGroup: false },
      { name: 'Bank', accountType: 'Bank', isGroup: false },
      { name: 'Sales', accountType: 'Income Account', isGroup: false },
    ]);
    const entry = (
      account: string,
      debit: number,
      credit: number,
      reverted = false
    ) => ({ account, debit, credit, reverted, date: '2026-10-01' });
    await db.knex!('AccountingLedgerEntry').insert([
      entry('Cash group', 100, 0),
      entry('Till', 20, 0),
      entry('Bank', 0, 30),
      entry('Sales', 0, 120),
      entry('Cash group', 999, 0, true),
    ]);
    const rows = await BespokeQueries.getCashflow(
      db,
      '2026-10-01',
      '2026-10-31'
    );
    t.equal(rows.length, 1, 'one monthly aggregate');
    t.equal(
      Number(rows[0].inflow),
      120,
      'direct legacy group and leaf debits included once'
    );
    t.equal(
      Number(rows[0].outflow),
      30,
      'only active Cash/Bank credits included'
    );
  } finally {
    await db.close();
  }
});

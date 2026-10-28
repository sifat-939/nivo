import knexFactory, { Knex } from 'knex';
import test from 'tape';
import { getImportReconciliation } from '../importReconciliation';

async function makeDb() {
  const db = knexFactory({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
  await db.schema.createTable('KarbarImportRun', (table) => {
    table.string('sourceSet');
  });
  await db.schema.createTable('KarbarArchiveRecord', (table) => {
    table.string('sourceSet');
    table.string('entity');
    table.string('sourceId');
    table.string('targetName');
    table.string('importStatus');
    table.text('rawJson');
  });
  await db.schema.createTable('AccountingLedgerEntry', (table) => {
    table.string('party');
    table.string('account');
    table.float('debit');
    table.float('credit');
    table.boolean('reverted');
  });
  await db.schema.createTable('Account', (table) => {
    table.string('name');
    table.string('accountType');
  });
  await db.schema.createTable('Party', (table) => {
    table.string('name');
  });
  return db;
}

test('import reconciliation is unavailable without Karbar archive evidence', async (t) => {
  const db = await makeDb();
  try {
    const result = await getImportReconciliation(db as unknown as Knex);
    t.equal(
      result.available,
      false,
      'ordinary company database is handled gracefully'
    );
    t.equal(
      result.partyComparisons.length,
      0,
      'no source comparisons are fabricated'
    );
  } finally {
    await db.destroy();
  }
});

test('import reconciliation compares source party activity with native control ledger', async (t) => {
  const db = await makeDb();
  try {
    await db('KarbarImportRun').insert({ sourceSet: 'archived-20261027' });
    const sourceSet = 'archived-20261027';
    const archive = (
      entity: string,
      sourceId: string,
      targetName: string | null,
      raw: object
    ) =>
      db('KarbarArchiveRecord').insert({
        sourceSet,
        entity,
        sourceId,
        targetName,
        importStatus: 'imported',
        rawJson: JSON.stringify(raw),
      });
    await archive('parties', '1', 'Customer A', { idx: 1, name: 'Customer A' });
    await archive('transactions_detailed', 'sale-1', null, {
      idx: 'sale-1',
      party: 1,
      type: 'sale',
      balance_amount: 100,
    });
    await archive('transactions_detailed', 'receipt-1', null, {
      idx: 'receipt-1',
      party: 1,
      type: 'payment-in',
      total_amount: 30,
    });
    await db('Account').insert([
      { name: 'Debtors', accountType: 'Receivable' },
      { name: 'Sales', accountType: 'Income' },
      { name: 'Cash', accountType: 'Cash' },
    ]);
    await db('Party').insert({ name: 'Customer A' });
    await db('AccountingLedgerEntry').insert([
      {
        party: 'Customer A',
        account: 'Debtors',
        debit: 100,
        credit: 0,
        reverted: false,
      },
      {
        party: 'Customer A',
        account: 'Debtors',
        debit: 0,
        credit: 30,
        reverted: false,
      },
      // A canceled posting and its reversal both remain in the ledger and net to zero.
      {
        party: 'Customer A',
        account: 'Debtors',
        debit: 50,
        credit: 0,
        reverted: true,
      },
      {
        party: 'Customer A',
        account: 'Debtors',
        debit: 0,
        credit: 50,
        reverted: true,
      },
      // A stale/one-sided reverted row must not distort the current control.
      {
        party: 'Customer A',
        account: 'Debtors',
        debit: 40,
        credit: 0,
        reverted: true,
      },
      {
        party: 'Customer A',
        account: 'Sales',
        debit: 0,
        credit: 500,
        reverted: false,
      },
    ]);

    const result = await getImportReconciliation(db as unknown as Knex);
    t.equal(result.available, true, 'archive is detected');
    t.equal(
      result.partyComparisons[0]?.sourceBalance,
      70,
      'source sale due less receipt'
    );
    t.equal(
      result.partyComparisons[0]?.nativeBalance,
      70,
      'only AR/AP control accounts are summed'
    );
    t.equal(
      result.partyComparisons[0]?.difference,
      0,
      'reversal pair leaves no extra balance'
    );
    t.equal(
      result.partyComparisons[0]?.status,
      'unverified',
      'numeric equality is not treated as complete reconciliation when cutoff is unknown'
    );
  } finally {
    await db.destroy();
  }
});

test('ambiguous source opening and adjustment rows remain unverified', async (t) => {
  const db = await makeDb();
  try {
    await db('KarbarImportRun').insert({ sourceSet: 'archived-20261027' });
    await db('KarbarArchiveRecord').insert([
      {
        sourceSet: 'archived-20261027',
        entity: 'parties',
        sourceId: '1',
        targetName: 'Customer A',
        importStatus: 'imported',
        rawJson: JSON.stringify({ idx: 1, name: 'Customer A' }),
      },
      {
        sourceSet: 'archived-20261027',
        entity: 'transactions_detailed',
        sourceId: 'opening-1',
        targetName: null,
        importStatus: 'quarantined',
        rawJson: JSON.stringify({
          idx: 'opening-1',
          party: 1,
          type: 'party-opening-balance',
          total_amount: 12,
        }),
      },
    ]);
    await db('Account').insert({ name: 'Debtors', accountType: 'Receivable' });
    await db('Party').insert({ name: 'Customer A' });

    const result = await getImportReconciliation(db as unknown as Knex);
    t.equal(
      result.partyComparisons[0]?.status,
      'unverified',
      'unknown source direction is not inferred'
    );
    t.equal(
      result.partyComparisons[0]?.sourceBalance,
      undefined,
      'partial source amount is not presented as a balance'
    );
    t.equal(
      result.openingAdjustments?.[0]?.amount,
      12,
      'raw adjustment amount is still exposed'
    );
    t.equal(
      result.openingAdjustments?.[0]?.evidenceStatus,
      'direction-unverified',
      'ambiguous semantics are explicit'
    );
  } finally {
    await db.destroy();
  }
});

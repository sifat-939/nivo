import knexFactory from 'knex';
import test from 'tape';
import addSalaryMonthUniqueIndex from '../../patches/addSalaryMonthUniqueIndex';
import type { DatabaseManager } from '../manager';

test('database enforces one active salary per employee and month', async (t) => {
  const knex = knexFactory({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });
  try {
    await knex.schema.createTable('SalaryPayment', (table) => {
      table.string('name').primary();
      table.string('employee');
      table.string('salaryMonth');
      table.boolean('submitted');
      table.boolean('cancelled');
    });
    await addSalaryMonthUniqueIndex.execute({
      db: { knex },
    } as unknown as DatabaseManager);
    await knex('SalaryPayment').insert([
      {
        name: 'first',
        employee: 'EMP-1',
        salaryMonth: '2026-10-01',
        submitted: false,
        cancelled: false,
      },
      {
        name: 'second',
        employee: 'EMP-1',
        salaryMonth: '2026-10-01',
        submitted: false,
        cancelled: false,
      },
    ]);
    await knex('SalaryPayment')
      .where({ name: 'first' })
      .update({ submitted: true });
    let blocked = false;
    try {
      await knex('SalaryPayment')
        .where({ name: 'second' })
        .update({ submitted: true });
    } catch (error) {
      blocked = (error as Error).message.includes('UNIQUE constraint failed');
    }
    t.ok(
      blocked,
      'duplicate posting is blocked by SQLite even outside the model'
    );
    await knex('SalaryPayment')
      .where({ name: 'first' })
      .update({ cancelled: true });
    await knex('SalaryPayment')
      .where({ name: 'second' })
      .update({ submitted: true });
    t.equal(
      await knex('SalaryPayment')
        .where({ submitted: true, cancelled: false })
        .count('* as count')
        .first()
        .then((row) => Number(row?.count)),
      1,
      'cancellation frees the period for a replacement'
    );
  } finally {
    await knex.destroy();
  }
});

import type { DatabaseManager } from '../database/manager';

async function execute(dm: DatabaseManager) {
  if (!dm.db?.knex) throw new Error('DatabaseNotConnected');
  await dm.db.knex
    .raw(`CREATE UNIQUE INDEX IF NOT EXISTS salary_employee_month_submitted
    ON SalaryPayment (employee, salaryMonth)
    WHERE submitted = 1 AND COALESCE(cancelled, 0) = 0`);
}

export default { execute };

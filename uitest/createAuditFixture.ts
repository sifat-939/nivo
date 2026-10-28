import fs from 'fs';
import os from 'os';
import path from 'path';
import setupInstance from 'src/setup/setupInstance';
import { getTestFyo, getTestSetupWizardOptions } from 'tests/helpers';
import { ModelNameEnum } from 'models/types';
import { Invoice } from 'models/baseModels/Invoice/Invoice';
import { Payment } from 'models/baseModels/Payment/Payment';
import BetterSQLite3 from 'better-sqlite3';

async function main() {
  const target = path.resolve(process.argv[2] || '');
  if (
    !target.startsWith(path.resolve(os.tmpdir()) + path.sep) ||
    fs.existsSync(target)
  ) {
    throw new Error(
      'Audit fixture requires a new file in the temporary directory'
    );
  }
  const fyo = getTestFyo();
  try {
    await setupInstance(target, getTestSetupWizardOptions(), fyo);
    await fyo.singles.SystemSettings!.setAndSync('hideGetStarted', true);
    await fyo.singles.AccountingSettings!.setAndSync(
      'enablePartialPayment',
      true
    );
    await fyo.doc
      .getNewDoc('Party', { name: 'Audit Both Party', role: 'Both' })
      .sync();
    await fyo.doc
      .getNewDoc('Item', {
        name: 'Audit Item',
        rate: 100,
        unit: 'Unit',
        for: 'Both',
        trackItem: false,
      })
      .sync();
    for (const schema of [
      ModelNameEnum.SalesInvoice,
      ModelNameEnum.PurchaseInvoice,
    ]) {
      const invoice = fyo.doc.getNewDoc(schema, {
        party: 'Audit Both Party',
        date: '2026-01-01',
        account:
          schema === ModelNameEnum.SalesInvoice ? 'Debtors' : 'Creditors',
        items: [{ item: 'Audit Item', quantity: 2, rate: 100 }],
      }) as Invoice;
      await invoice.sync();
      await invoice.submit();
      if (schema === ModelNameEnum.SalesInvoice) {
        const payment = fyo.doc.getNewDoc('Payment', {
          party: 'Audit Both Party',
          paymentType: 'Receive',
          paymentMethod: 'Cash',
          amount: fyo.pesa(50),
          for: [
            {
              referenceType: schema,
              referenceName: invoice.name,
              amount: fyo.pesa(50),
            },
          ],
        }) as Payment;
        await payment.sync();
        await payment.submit();
      }
    }
    if (process.argv.includes('--pagination')) {
      for (let index = 0; index < 65; index++) {
        await fyo.doc
          .getNewDoc('Party', {
            name: `Page Party ${String(index).padStart(3, '0')}`,
            role: 'Customer',
          })
          .sync();
        await fyo.doc
          .getNewDoc('SalesInvoice', {
            party: 'Audit Both Party',
            date: '2026-10-28',
            account: 'Debtors',
            items: [{ item: 'Audit Item', quantity: 1, rate: 1 }],
          })
          .sync();
      }
    }
  } finally {
    await fyo.close();
  }
  if (process.argv.includes('--pre-hr')) {
    const db = new BetterSQLite3(target, { fileMustExist: true });
    try {
      const baseline = {
        invoices: db
          .prepare(
            'SELECT name, grandTotal, outstandingAmount FROM SalesInvoice ORDER BY name'
          )
          .all(),
        ledger: db
          .prepare(
            'SELECT name, debit, credit, account FROM AccountingLedgerEntry ORDER BY name'
          )
          .all(),
      };
      for (const table of ['SalaryPayment', 'Expense', 'Employee']) {
        const count = db
          .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
          .get() as { count: number };
        if (count.count)
          throw new Error('Cannot strip HR tables containing data');
        db.exec(`DROP TABLE ${table}`);
      }
      db.prepare(
        "UPDATE SingleValue SET value = '0.38.0' WHERE parent = 'SystemSettings' AND fieldname = 'version'"
      ).run();
      db.prepare(
        "DELETE FROM PatchRun WHERE name = 'addSalaryMonthUniqueIndex'"
      ).run();
      fs.writeFileSync(`${target}.baseline.json`, JSON.stringify(baseline));
    } finally {
      db.close();
    }
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

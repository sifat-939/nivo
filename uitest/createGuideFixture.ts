/** Synthetic, isolated company for the public Bengali user guide. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import setupInstance from 'src/setup/setupInstance';
import { getTestFyo } from 'tests/helpers';

async function main() {
  const target = path.resolve(process.argv[2] || '');
  if (
    !target.startsWith(path.resolve(os.tmpdir()) + path.sep) ||
    fs.existsSync(target)
  )
    throw new Error('Guide fixture requires a new temporary database');
  const fyo = getTestFyo();
  const names: Record<string, string> = {};
  try {
    await setupInstance(
      target,
      {
        logo: null,
        companyName: 'Nivo Demo Store',
        country: 'Bangladesh',
        fullname: 'Demo Owner',
        email: 'demo@example.test',
        bankName: 'Demo Bank',
        currency: 'BDT',
        fiscalYearStart: '2026-01-01',
        fiscalYearEnd: '2026-12-31',
        chartOfAccounts: 'Standard Chart of Accounts',
      },
      fyo
    );
    await fyo.singles.SystemSettings!.setAndSync({
      hideGetStarted: true,
      darkMode: false,
    });
    await fyo.singles.AccountingSettings!.setAndSync({
      enablePartialPayment: true,
      enableDiscounting: true,
      enableSalesQuotes: true,
      enableChartOfAccounts: true,
      enableImportWizard: true,
      enablePrintTemplates: true,
    });
    const accounts = await fyo.db.getAllRaw('Account', {
      fields: ['name', 'rootType', 'accountType', 'isGroup'],
    });
    const find = (type: string) =>
      String(
        accounts.find((a) => a.accountType === type && !a.isGroup)?.name || ''
      );
    const cash = find('Cash');
    const equity = String(
      accounts.find((a) => a.rootType === 'Equity' && !a.isGroup)?.name
    );
    const opening = fyo.doc.getNewDoc('JournalEntry', {
      date: '2026-01-01',
      entryType: 'Journal Entry',
      accounts: [
        { account: cash, debit: 40000, credit: 0 },
        { account: equity, debit: 0, credit: 40000 },
      ],
      userRemark: 'Synthetic starting cash for the tutorial',
    });
    await opening.sync();
    await opening.submit();
    names.journal = opening.name!;
    for (const [name, role] of [
      ['Rafiq Store', 'Customer'],
      ['Metro Supply', 'Supplier'],
    ])
      await fyo.doc
        .getNewDoc('Party', { name, role, email: 'sample@example.test' })
        .sync();
    await fyo.doc
      .getNewDoc('Item', {
        name: 'Gift Bag',
        rate: 120,
        unit: 'Unit',
        for: 'Both',
        trackItem: false,
      })
      .sync();
    await fyo.doc
      .getNewDoc('Item', {
        name: 'Paper Tape',
        rate: 60,
        unit: 'Unit',
        for: 'Both',
        trackItem: false,
      })
      .sync();
    const sale = fyo.doc.getNewDoc('SalesInvoice', {
      party: 'Rafiq Store',
      date: '2026-10-15',
      account: find('Receivable'),
      items: [{ item: 'Gift Bag', quantity: 10, rate: 120 }],
      makeAutoPayment: false,
      makeAutoStockTransfer: false,
    });
    await sale.sync();
    await sale.submit();
    names.sale = sale.name!;
    const purchase = fyo.doc.getNewDoc('PurchaseInvoice', {
      party: 'Metro Supply',
      date: '2026-10-10',
      account: find('Payable'),
      items: [{ item: 'Gift Bag', quantity: 50, rate: 80 }],
      makeAutoPayment: false,
      makeAutoStockTransfer: false,
    });
    await purchase.sync();
    await purchase.submit();
    names.purchase = purchase.name!;
    for (const [type, party, invoice, amount, key] of [
      ['Receive', 'Rafiq Store', sale, 500, 'receipt'],
      ['Pay', 'Metro Supply', purchase, 2000, 'payment'],
    ] as const) {
      const doc = fyo.doc.getNewDoc('Payment', {
        party,
        paymentType: type,
        referenceType: invoice.schemaName,
        paymentMethod: 'Cash',
        amount: fyo.pesa(amount),
        date: '2026-10-16',
        for: [
          {
            referenceType: invoice.schemaName,
            referenceName: invoice.name,
            amount: fyo.pesa(amount),
          },
        ],
      });
      await doc.sync();
      await doc.submit();
      names[key] = doc.name!;
    }
    for (const [amount, description] of [
      [1500, 'Office rent'],
      [300, 'Delivery charge'],
    ] as const) {
      const doc = fyo.doc.getNewDoc('Expense', {
        date: '2026-10-17',
        amount,
        description,
        expenseAccount:
          description === 'Office rent'
            ? 'Office Rent'
            : 'Freight and Forwarding Charges',
        paidFrom: cash,
      });
      await doc.sync();
      await doc.submit();
      names.expense = doc.name!;
    }
    const employee = fyo.doc.getNewDoc('Employee', {
      name: 'DEMO-001',
      employeeName: 'Demo Employee',
      designation: 'Store Assistant',
      joiningDate: '2026-01-01',
      salary: 12000,
      isActive: true,
    });
    await employee.sync();
    names.employee = employee.name!;
    const salary = fyo.doc.getNewDoc('SalaryPayment', {
      date: '2026-10-25',
      employee: employee.name,
      salaryMonth: '2026-10-01',
      salary: 12000,
      bonus: 500,
      deductions: 200,
      expenseAccount: 'Salary',
      paidFrom: cash,
    });
    await salary.sync();
    await salary.submit();
    names.salary = salary.name!;
    const draft = fyo.doc.getNewDoc('SalesInvoice', {
      party: 'Rafiq Store',
      date: '2026-10-20',
      account: find('Receivable'),
      items: [{ item: 'Paper Tape', quantity: 5, rate: 60 }],
      makeAutoPayment: false,
      makeAutoStockTransfer: false,
    });
    await draft.sync();
    names.draft = draft.name!;
    fs.writeFileSync(target + '.names.json', JSON.stringify(names));
  } finally {
    await fyo.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

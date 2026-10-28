import test from 'tape';
import { setupTestFyo, closeTestFyo, getTestFyo } from './helpers';
import { Expense } from 'models/baseModels/Expense/Expense';
import { Employee } from 'models/baseModels/Employee/Employee';
import { SalaryPayment } from 'models/baseModels/SalaryPayment/SalaryPayment';

const fyo = getTestFyo();
setupTestFyo(fyo, __filename);
let expenseAccount = '';
let cashAccount = '';

test('HR and expense fixtures', async (t) => {
  const accounts = (await fyo.db.getAll('Account', {
    fields: ['name', 'rootType', 'accountType', 'isGroup'],
  })) as {
    name: string;
    rootType: string;
    accountType?: string;
    isGroup: boolean;
  }[];
  expenseAccount =
    accounts.find((a) => a.rootType === 'Expense' && !a.isGroup)?.name ?? '';
  cashAccount =
    accounts.find(
      (a) =>
        a.rootType === 'Asset' &&
        !a.isGroup &&
        ['Bank', 'Cash'].includes(a.accountType ?? '')
    )?.name ?? '';
  t.ok(expenseAccount, 'chart includes a leaf expense account');
  t.ok(cashAccount, 'chart includes a leaf cash or bank account');
  const employee = fyo.doc.getNewDoc('Employee', {
    name: 'EMP-TEST',
    employeeName: 'Test Employee',
    joiningDate: new Date('2024-01-01'),
    salary: fyo.pesa(1000),
    isActive: true,
  }) as Employee;
  await employee.sync();
});

test('expense and salary payments post and reverse balanced entries', async (t) => {
  const expense = fyo.doc.getNewDoc('Expense', {
    date: new Date('2024-02-01'),
    amount: fyo.pesa(25),
    expenseAccount,
    paidFrom: cashAccount,
    description: 'Test expense',
  }) as Expense;
  await expense.sync();
  await expense.submit();
  const entries = (await fyo.db.getAll('AccountingLedgerEntry', {
    fields: ['debit', 'credit'],
    filters: { referenceType: 'Expense', referenceName: expense.name! },
  })) as unknown as {
    debit: ReturnType<typeof fyo.pesa>;
    credit: ReturnType<typeof fyo.pesa>;
  }[];
  t.equal(entries.length, 2, 'expense creates two ledger entries');
  t.ok(
    entries[0]
      .debit!.add(entries[1].debit!)
      .eq(entries[0].credit!.add(entries[1].credit!)),
    'expense debits and credits balance'
  );
  await expense.cancel();
  const reversals = await fyo.db.getAll('AccountingLedgerEntry', {
    fields: ['name'],
    filters: {
      referenceType: 'Expense',
      referenceName: expense.name!,
      reverted: true,
    },
  });
  t.equal(
    reversals.length,
    4,
    'expense cancellation writes reverse ledger entries'
  );

  const employee = (await fyo.doc.getDoc('Employee', 'EMP-TEST')) as Employee;
  const payment = fyo.doc.getNewDoc('SalaryPayment', {
    date: new Date('2024-03-01'),
    employee: employee.name,
    salaryMonth: new Date('2024-03-15'),
    salary: fyo.pesa(1000),
    bonus: fyo.pesa(100),
    deductions: fyo.pesa(50),
    expenseAccount,
    paidFrom: cashAccount,
  }) as SalaryPayment;
  await payment.sync();
  await payment.submit();
  t.equal(
    (payment.salaryMonth as Date).getDate(),
    1,
    'salary month is normalized to its first day'
  );
  t.ok(
    payment.netPay!.eq(fyo.pesa(1050)),
    'net pay equals salary plus bonus less deductions'
  );
  const salaryEntries = (await fyo.db.getAll('AccountingLedgerEntry', {
    fields: ['debit', 'credit'],
    filters: { referenceType: 'SalaryPayment', referenceName: payment.name! },
  })) as unknown as {
    debit: ReturnType<typeof fyo.pesa>;
    credit: ReturnType<typeof fyo.pesa>;
  }[];
  t.equal(salaryEntries.length, 2, 'salary payment creates two ledger entries');
  const rawSalary = await fyo.db.getAllRaw('SalaryPayment', {
    fields: ['netPay'],
    filters: { name: payment.name! },
  });
  t.equal(
    Number(rawSalary[0].netPay),
    1050,
    'net pay is persisted for list views'
  );
  fyo.doc.removeFromCache('SalaryPayment', payment.name!);
  const reloaded = (await fyo.doc.getDoc(
    'SalaryPayment',
    payment.name!
  )) as SalaryPayment;
  t.ok(reloaded.netPay?.eq(1050), 'net pay survives reloading');
  t.ok(
    salaryEntries[0]
      .debit!.add(salaryEntries[1].debit!)
      .eq(salaryEntries[0].credit!.add(salaryEntries[1].credit!)),
    'salary debits and credits balance'
  );
  employee.isActive = false;
  await employee.sync();
  await reloaded.cancel();
  const salaryReversals = await fyo.db.getAll('AccountingLedgerEntry', {
    fields: ['name'],
    filters: {
      referenceType: 'SalaryPayment',
      referenceName: payment.name!,
      reverted: true,
    },
  });
  t.equal(
    salaryReversals.length,
    4,
    'salary cancellation writes reversing ledger rows even after employee deactivation'
  );
  employee.isActive = true;
  await employee.sync();
  const replacement = fyo.doc.getNewDoc('SalaryPayment', {
    date: new Date('2024-03-10'),
    employee: employee.name,
    salaryMonth: new Date('2024-03-01'),
    salary: fyo.pesa(1000),
    expenseAccount,
    paidFrom: cashAccount,
  }) as SalaryPayment;
  await replacement.sync();
  await replacement.submit();
  t.ok(
    replacement.isSubmitted,
    'cancellation permits a replacement for that month'
  );
});

test('rejects invalid expense and payroll values, inactive employees, and duplicate months', async (t) => {
  const invalid = fyo.doc.getNewDoc('Expense', {
    date: new Date(),
    amount: fyo.pesa(0),
    expenseAccount,
    paidFrom: cashAccount,
  }) as Expense;
  await rejects(invalid.submit(), t, 'zero expense is rejected');
  const badAccount = fyo.doc.getNewDoc('Expense', {
    date: new Date(),
    amount: fyo.pesa(10),
    expenseAccount,
    paidFrom: expenseAccount,
  }) as Expense;
  await rejects(
    badAccount.submit(),
    t,
    'expense cannot be paid from an Expense account'
  );
  const employee = fyo.doc.getNewDoc('Employee', {
    name: 'EMP-INACTIVE',
    employeeName: 'Inactive',
    joiningDate: new Date('2024-01-01'),
    isActive: false,
  }) as Employee;
  await employee.sync();
  const inactive = fyo.doc.getNewDoc('SalaryPayment', {
    date: new Date(),
    employee: employee.name,
    salaryMonth: new Date('2024-04-01'),
    salary: fyo.pesa(10),
    expenseAccount,
    paidFrom: cashAccount,
  }) as SalaryPayment;
  await rejects(inactive.submit(), t, 'inactive employee cannot be paid');
  const first = fyo.doc.getNewDoc('SalaryPayment', {
    date: new Date(),
    employee: 'EMP-TEST',
    salaryMonth: new Date('2024-03-20'),
    salary: fyo.pesa(1000),
    expenseAccount,
    paidFrom: cashAccount,
  }) as SalaryPayment;
  await first.sync();
  await rejects(
    first.submit(),
    t,
    'duplicate submitted employee/month is rejected'
  );
  const negative = fyo.doc.getNewDoc('SalaryPayment', {
    date: new Date(),
    employee: 'EMP-TEST',
    salaryMonth: new Date('2024-05-01'),
    salary: fyo.pesa(100),
    deductions: fyo.pesa(100),
    expenseAccount,
    paidFrom: cashAccount,
  }) as SalaryPayment;
  await rejects(negative.submit(), t, 'zero net pay is rejected');
  const negativeBonus = fyo.doc.getNewDoc('SalaryPayment', {
    date: new Date(),
    employee: 'EMP-TEST',
    salaryMonth: new Date('2024-06-01'),
    salary: fyo.pesa(100),
    bonus: fyo.pesa(-1),
    expenseAccount,
    paidFrom: cashAccount,
  }) as SalaryPayment;
  await rejects(negativeBonus.submit(), t, 'negative bonus is rejected');
});
test('employee salary prefills, refreshes after a draft reload, and account filters execute', async (t) => {
  const draft = fyo.doc.getNewDoc('SalaryPayment') as SalaryPayment;
  await draft.set('employee', 'EMP-TEST');
  t.ok(draft.salary?.eq(1000), 'selecting employee fills monthly salary');
  await draft.set('salary', fyo.pesa(1200));
  await draft.set('bonus', fyo.pesa(50));
  t.ok(draft.netPay?.eq(1250), 'net amount responds to amount changes');
  const funds = await fyo.db.getAllRaw('Account', {
    fields: ['name'],
    filters: await Expense.filters.paidFrom(draft),
  });
  t.ok(
    funds.some((row) => row.name === cashAccount),
    'cash/bank dropdown filter is a valid query'
  );
  const employee2 = fyo.doc.getNewDoc('Employee', {
    name: 'EMP-SECOND',
    employeeName: 'Second Employee',
    salary: fyo.pesa(800),
  });
  await employee2.sync();
  await draft.set('employee', 'EMP-SECOND');
  t.ok(draft.salary?.eq(800), 'changing employees refreshes the salary default');

  const reloadedDraft = fyo.doc.getNewDoc('SalaryPayment', {
    employee: 'EMP-TEST',
    salary: fyo.pesa(1000),
  }) as SalaryPayment;
  await reloadedDraft.set('employee', 'EMP-SECOND');
  t.ok(
    reloadedDraft.salary?.eq(800),
    'changing employee on a reloaded draft refreshes its stale salary'
  );
});
test('concurrent paid-entry submissions do not post twice', async (t) => {
  const expense = fyo.doc.getNewDoc('Expense', {
    amount: 15,
    expenseAccount,
    paidFrom: cashAccount,
  }) as Expense;
  await expense.sync();
  await Promise.all([expense.submit(), expense.submit()]);
  const posted = await fyo.db.getAllRaw('AccountingLedgerEntry', {
    fields: ['name'],
    filters: {
      referenceType: 'Expense',
      referenceName: expense.name!,
      reverted: false,
    },
  });
  t.equal(posted.length, 2, 'double-submit creates one debit and credit pair');
  const first = fyo.doc.getNewDoc('SalaryPayment', {
    employee: 'EMP-TEST',
    salary: 100,
    salaryMonth: '2026-11-01',
    expenseAccount,
    paidFrom: cashAccount,
  }) as SalaryPayment;
  const second = fyo.doc.getNewDoc('SalaryPayment', {
    employee: 'EMP-TEST',
    salary: 100,
    salaryMonth: '2026-11-01',
    expenseAccount,
    paidFrom: cashAccount,
  }) as SalaryPayment;
  await first.sync();
  await second.sync();
  const results = await Promise.allSettled([first.submit(), second.submit()]);
  t.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
    'concurrent salaries post only one document'
  );
  const rows = await fyo.db.getAllRaw('SalaryPayment', {
    fields: ['name'],
    filters: {
      employee: 'EMP-TEST',
      submitted: true,
      cancelled: false,
      salaryMonth: '2026-11-01',
    },
  });
  t.equal(rows.length, 1, 'one active monthly salary exists');
});
closeTestFyo(fyo, __filename);

async function rejects(
  promise: Promise<unknown>,
  t: test.Test,
  message: string
) {
  try {
    await promise;
    t.fail(message);
  } catch {
    t.pass(message);
  }
}

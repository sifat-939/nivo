const { _electron } = require('playwright');
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

(async () => {
  const root = path.resolve(__dirname, '..');
  const run = fs.mkdtempSync(path.join(os.tmpdir(), 'nivo-accounts-hr-'));
  const database = path.join(run, 'legacy.books.db');
  const profile = path.join(run, 'profile');
  fs.mkdirSync(profile);
  execFileSync(
    require('electron'),
    [
      '--require',
      'ts-node/register',
      '--require',
      'tsconfig-paths/register',
      'uitest/createAuditFixture.ts',
      database,
      '--pre-hr',
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: 'true',
        IS_TEST: 'true',
        TS_NODE_TRANSPILE_ONLY: 'true',
        TS_NODE_COMPILER_OPTIONS: '{"module":"commonjs"}',
      },
      stdio: 'pipe',
    }
  );
  const baseline = JSON.parse(
    fs.readFileSync(`${database}.baseline.json`, 'utf8')
  );
  fs.writeFileSync(
    path.join(profile, 'config.json'),
    JSON.stringify({
      lastSelectedFilePath: database,
      files: [
        {
          id: 'hr-fixture',
          companyName: 'Test Company',
          dbPath: database,
          openCount: 1,
        },
      ],
    })
  );
  const app = await _electron.launch({
    executablePath:
      process.env.NIVO_APP_EXECUTABLE ||
      path.join(root, 'dist_electron/bundled/linux-unpacked/frappe-books'),
    args: [`--user-data-dir=${profile}`],
    env: { ...process.env, IS_TEST: '' },
    timeout: 60000,
  });
  const page = await app.firstWindow();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const go = (route) =>
    page.evaluate(
      async (route) =>
        document
          .querySelector('[data-v-app]')
          .__vue_app__.config.globalProperties.$router.push(route),
      route
    );
  try {
    await page.getByTestId('company-name').waitFor();
    const migrated = await page.evaluate(async () => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      window.hrDocs = {};
      return {
        invoices: await fyo.db.getAllRaw('SalesInvoice', {
          fields: ['name', 'grandTotal', 'outstandingAmount'],
          orderBy: 'name',
        }),
        ledger: await fyo.db.getAllRaw('AccountingLedgerEntry', {
          fields: ['name', 'debit', 'credit', 'account'],
          orderBy: 'name',
        }),
        employees: await fyo.db.count('Employee'),
        expenses: await fyo.db.count('Expense'),
        salaries: await fyo.db.count('SalaryPayment'),
      };
    });
    migrated.invoices.sort((a, b) => a.name.localeCompare(b.name));
    migrated.ledger.sort((a, b) => a.name.localeCompare(b.name));
    assert.deepEqual(
      migrated.invoices,
      baseline.invoices,
      'old invoices survive schema migration'
    );
    assert.deepEqual(
      migrated.ledger,
      baseline.ledger,
      'old ledger survives schema migration'
    );
    assert.equal(
      migrated.employees + migrated.expenses + migrated.salaries,
      0,
      'new empty tables are added'
    );
    assert.ok(
      fs
        .readdirSync(path.join(run, 'backups'))
        .some((name) => !name.includes('_daily_')),
      'migration takes a recovery snapshot'
    );
    for (const label of ['Accounts', 'HR'])
      await page.getByText(label, { exact: true }).waitFor();
    const accounts = await page.evaluate(async () => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      const expenses = await fyo.db.getAllRaw('Account', {
        fields: ['name'],
        filters: { rootType: 'Expense', isGroup: false },
      });
      const funds = await fyo.db.getAllRaw('Account', {
        fields: ['name', 'accountType'],
        filters: {
          rootType: 'Asset',
          accountType: ['in', ['Cash', 'Bank']],
          isGroup: false,
        },
      });
      return {
        expense: expenses[0].name,
        cash: funds.find((row) => row.accountType === 'Cash').name,
      };
    });
    const startingCash = baseline.ledger
      .filter((row) => row.account === accounts.cash)
      .reduce((sum, row) => sum + Number(row.debit) - Number(row.credit), 0);
    async function make(schema, data) {
      await page.evaluate(
        async ({ schema, data }) => {
          const app = document.querySelector('[data-v-app]').__vue_app__;
          const fyo =
            document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
          const employee = data.employee;
          if (schema === 'SalaryPayment') delete data.employee;
          const doc = fyo.doc.getNewDoc(schema, data);
          if (schema === 'SalaryPayment') await doc.set('employee', employee);
          window.hrDocs[schema] = doc;
          await app.config.globalProperties.$router.push(
            `/edit/${schema}/${encodeURIComponent(doc.name)}`
          );
        },
        { schema, data }
      );
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await page.getByRole('button', { name: 'Yes', exact: true }).click();
      await page.waitForFunction(
        (schema) =>
          window.hrDocs[schema].inserted && !window.hrDocs[schema].canSave,
        schema
      );
    }
    async function submit(schema) {
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
      await page.getByRole('button', { name: 'Yes', exact: true }).click();
      await page.waitForFunction(
        (schema) => window.hrDocs[schema].isSubmitted,
        schema
      );
    }
    await make('Employee', {
      name: 'EMP-UI-HR',
      employeeName: 'UI Employee',
      salary: 1000,
      designation: 'Operations',
      joiningDate: '2026-01-01',
    });
    await go('/list/Employee');
    await page.getByText('UI Employee', { exact: true }).waitFor();
    await make('Expense', {
      date: '2026-10-15',
      amount: 125,
      expenseAccount: accounts.expense,
      paidFrom: accounts.cash,
      description: 'UI travel expense',
    });
    await submit('Expense');
    await make('SalaryPayment', {
      date: '2026-10-20',
      employee: 'EMP-UI-HR',
      salaryMonth: '2026-10-01',
      bonus: 200,
      deductions: 100,
      expenseAccount: accounts.expense,
      paidFrom: accounts.cash,
    });
    const net = await page.evaluate(
      () => window.hrDocs.SalaryPayment.netPay.float
    );
    assert.equal(
      net,
      1100,
      'employee salary prefills and adjustments calculate'
    );
    await submit('SalaryPayment');
    await page.screenshot({ path: path.join(run, 'salary-payment.png') });
    await go('/list/SalaryPayment');
    await page.getByText('Net Pay', { exact: true }).waitFor();
    const actual = await page.evaluate(async () => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      const entries = await fyo.db.getAllRaw('AccountingLedgerEntry', {
        fields: ['account', 'debit', 'credit', 'referenceType'],
        filters: {
          referenceType: ['in', ['Expense', 'SalaryPayment']],
          reverted: false,
        },
      });
      const history = await ipc.dataToolsHistory();
      const expenses = await fyo.db.getTopExpenses(
        '2026-01-01',
        '2026-12-31T23:59:59'
      );
      const cashflow = await fyo.db.getCashflow(
        '2026-01-01',
        '2026-12-31T23:59:59'
      );
      return {
        entries,
        historyTypes: history.map((row) => row.type),
        expenseTotal: expenses.reduce((sum, row) => sum + Number(row.total), 0),
        outflow: cashflow.reduce((sum, row) => sum + Number(row.outflow), 0),
      };
    });
    assert.equal(
      actual.entries.length,
      4,
      'both documents post two ledger legs'
    );
    assert.equal(
      actual.expenseTotal,
      200 + 125 + 1100,
      'new entries feed dashboard expense totals'
    );
    assert.equal(actual.outflow, 125 + 1100, 'new payments feed cashflow');
    assert.ok(
      actual.historyTypes.includes('Expense') &&
        actual.historyTypes.includes('SalaryPayment'),
      'both appear in history'
    );
    const salaryName = await page.evaluate(
      () => window.hrDocs.SalaryPayment.name
    );
    await go(
      `/report/GeneralLedger?referenceType=SalaryPayment&referenceName=${encodeURIComponent(
        salaryName
      )}`
    );
    await page.waitForFunction(() => {
      function find(v) {
        if (!v) return;
        const c = v.component;
        if (c?.proxy?.report?.referenceType === 'SalaryPayment')
          return c.proxy.report;
        if (c) {
          const found = find(c.subTree);
          if (found) return found;
        }
        for (const child of Array.isArray(v.children) ? v.children : []) {
          const found = find(child);
          if (found) return found;
        }
      }
      return !!find(document.querySelector('[data-v-app]')._vnode);
    });
    await go('/bank-cash');
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await page
      .getByRole('button', { name: 'Manage Accounts', exact: true })
      .waitFor();
    await page.waitForFunction(() => document.body.innerText.includes('Total'));
    const walletTotal = await page.evaluate(() => {
      function find(v) {
        if (!v) return;
        const c = v.component;
        if (c?.type.name === 'BankCash') return c.proxy;
        if (c) {
          const found = find(c.subTree);
          if (found) return found;
        }
        for (const child of Array.isArray(v.children) ? v.children : []) {
          const found = find(child);
          if (found) return found;
        }
      }
      return find(document.querySelector('[data-v-app]')._vnode)?.total.float;
    });
    assert.equal(
      walletTotal,
      50 - 125 - 1100,
      'wallet total includes existing direct cash group postings'
    );
    await page.screenshot({ path: path.join(run, 'bank-cash.png') });
    assert.equal(
      await page
        .locator('.grid')
        .first()
        .evaluate(
          (element) =>
            getComputedStyle(element).gridTemplateColumns.split(' ').length
        ),
      2,
      'bank and balance stay in two aligned columns'
    );
    const lightHeadingColor = await page
      .locator('h1')
      .filter({ hasText: 'Bank & Cash' })
      .evaluate((element) => getComputedStyle(element).color);
    await page.evaluate(async () => {
      document.documentElement.classList.add('dark');
      const app = document.querySelector('[data-v-app]')._vnode.component.proxy;
      app.darkMode = true;
      await app.$nextTick();
    });
    const darkHeadingColor = await page
      .locator('h1')
      .filter({ hasText: 'Bank & Cash' })
      .evaluate((element) => getComputedStyle(element).color);
    assert.notEqual(
      darkHeadingColor,
      lightHeadingColor,
      'heading text changes to a readable dark-theme color'
    );
    await page.screenshot({ path: path.join(run, 'bank-cash-dark.png') });
    await page.evaluate(async () => {
      document.documentElement.classList.remove('dark');
      const app = document.querySelector('[data-v-app]')._vnode.component.proxy;
      app.darkMode = false;
      await app.$nextTick();
    });
    const cash = await page.evaluate(async (account) => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      const rows = await fyo.db.getAllRaw('AccountingLedgerEntry', {
        fields: ['debit', 'credit'],
        filters: { account, reverted: false },
      });
      return rows.reduce(
        (sum, row) => sum + Number(row.debit) - Number(row.credit),
        0
      );
    }, accounts.cash);
    assert.equal(
      cash,
      startingCash - 125 - 1100,
      'expense and salary reduce cash exactly once'
    );
    await page
      .getByRole('button', { name: accounts.cash, exact: false })
      .click();
    await page.waitForFunction(
      (account) =>
        document.querySelector('[data-v-app]').__vue_app__.config
          .globalProperties.$router.currentRoute.value.query.account ===
        account,
      accounts.cash
    );
    await page.evaluate(async () => {
      await window.hrDocs.SalaryPayment.cancel();
      await window.hrDocs.Expense.cancel();
    });
    const final = await page.evaluate(async (account) => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      const rows = await fyo.db.getAllRaw('AccountingLedgerEntry', {
        fields: ['debit', 'credit'],
        filters: { account, reverted: false },
      });
      return {
        balance: rows.reduce(
          (sum, row) => sum + Number(row.debit) - Number(row.credit),
          0
        ),
        errors: fyo.errorLog.map(({ name, message, stack }) => ({
          name,
          message,
          stack,
        })),
      };
    }, accounts.cash);
    assert.equal(
      final.balance,
      startingCash,
      'cancel reverses both new payments'
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(final.errors, []);
    console.log(
      JSON.stringify({
        result: 'pass',
        temporaryProfile: run,
        checks: [
          'legacy schema upgrade with unchanged invoices/ledger',
          'employee saved through UI',
          'expense and salary saved/submitted through UI',
          'salary prefill and net calculation',
          'persisted salary list',
          'history',
          'bank cash balance and ledger drilldown',
          'cancel reversal',
          'no application errors',
        ],
      })
    );
  } catch (error) {
    console.error(
      await page
        .locator('body')
        .innerText()
        .catch(() => '')
    );
    throw error;
  } finally {
    await app.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

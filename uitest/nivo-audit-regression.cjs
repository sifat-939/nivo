const { _electron } = require('playwright');
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

(async () => {
  const root = path.resolve(__dirname, '..');
  const run = fs.mkdtempSync(path.join(os.tmpdir(), 'nivo-audit-ui-'));
  const database = path.join(run, 'audit.books.db');
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
      '--pagination',
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
  fs.writeFileSync(
    path.join(profile, 'config.json'),
    JSON.stringify({
      lastSelectedFilePath: database,
      files: [
        {
          id: 'audit-fixture',
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
    env: { ...process.env, IS_TEST: 'true' },
    timeout: 60000,
  });
  try {
    const page = await app.firstWindow();
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.getByTestId('company-name').waitFor();
    const go = (route) =>
      page.evaluate(async (route) => {
        await document
          .querySelector('[data-v-app]')
          .__vue_app__.config.globalProperties.$router.push(route);
      }, route);
    const names = await page.evaluate(async () => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      return {
        sales: (
          await fyo.db.getAllRaw('SalesInvoice', {
            fields: ['name'],
            filters: { submitted: true },
          })
        )[0].name,
        purchase: (
          await fyo.db.getAllRaw('PurchaseInvoice', { fields: ['name'] })
        )[0].name,
      };
    });
    for (const [schema, name] of [
      ['SalesInvoice', names.sales],
      ['PurchaseInvoice', names.purchase],
    ]) {
      await go(`/edit/${schema}/${name}`);
      await page.getByText('Final Amount', { exact: true }).waitFor();
      for (const label of ['Totals', 'Grand Total', 'Tax and Totals'])
        assert.equal(await page.getByText(label, { exact: true }).count(), 0);
      await page.getByText('Settled / Adjusted', { exact: true }).waitFor();
      await page.getByText('Due', { exact: true }).waitFor();
    }
    await go('/list/SalesInvoice');
    await page.getByRole('button', { name: 'Columns', exact: true }).click();
    await page.getByText('Invoice list columns', { exact: true }).waitFor();
    // Exercise saved order/visibility through the real component's event methods.
    await page.evaluate(async () => {
      function find(v) {
        if (!v) return;
        const c = v.component;
        if (c?.type.name === 'ListView') return c.proxy;
        if (c) {
          const p = find(c.subTree);
          if (p) return p;
        }
        for (const child of Array.isArray(v.children) ? v.children : []) {
          const p = find(child);
          if (p) return p;
        }
      }
      const view = find(document.querySelector('[data-v-app]')._vnode);
      if (!view.columnIds.includes('date')) {
        throw new Error('Fresh profile did not show default invoice columns');
      }
      view.toggleColumn('totalQuantity', false);
      view.toggleColumn('date', false);
      view.toggleColumn('status', false);
      view.saveColumns();
      view.loadListViewConfig();
      if (
        view.columnIds.includes('date') ||
        view.columnIds.includes('totalQuantity')
      )
        throw new Error('Hidden columns reappeared');
      view.toggleColumn('totalQuantity', true);
      view.saveColumns();
      await view.$nextTick();
    });
    await page.getByLabel('Invoice age filter').selectOption('30');
    await page.getByLabel('Invoice age filter').selectOption('0');
    const statusResult = await page.evaluate(async () => {
      const view = document.querySelector('[data-v-app]');
      function find(v) {
        if (!v) return;
        const c = v.component;
        if (c?.type.name === 'List') return c.proxy;
        if (c) {
          const found = find(c.subTree);
          if (found) return found;
        }
        for (const child of Array.isArray(v.children) ? v.children : []) {
          const found = find(child);
          if (found) return found;
        }
      }
      const list = find(view._vnode);
      await list.updateData({ status: ['like', 'PartlyPaid'] });
      // A refresh uses the remembered dropdown filter, not only route props.
      await list.updateData();
      return {
        count: list.totalCount,
        names: list.data.map((row) => row.name),
      };
    });
    assert.equal(
      statusResult.count,
      1,
      'status filtering finds posted invoice beyond the first page'
    );
    assert.deepEqual(statusResult.names, [names.sales]);
    await go('/list/Item');
    await page.getByText('Audit Item', { exact: true }).waitFor();
    assert.equal(
      await page.getByText('Tax', { exact: true }).count(),
      0,
      'item tax column is absent'
    );
    await go('/list/ItemGroup');
    await page
      .getByText(/^item group$/i)
      .first()
      .waitFor();
    assert.equal(
      await page.getByText('Tax', { exact: true }).count(),
      0,
      'item-group tax column is absent'
    );
    // Core non-invoice lists must still load after computed financial columns were added.
    await go('/list/Party');
    await page.getByText('Page Party 064', { exact: true }).waitFor();
    const paginationResult = await page.evaluate(async () => {
      function find(v) {
        if (!v) return;
        const c = v.component;
        if (c?.type.name === 'List') return c.proxy;
        if (c) {
          const found = find(c.subTree);
          if (found) return found;
        }
        for (const child of Array.isArray(v.children) ? v.children : []) {
          const found = find(child);
          if (found) return found;
        }
      }
      const list = find(document.querySelector('[data-v-app]')._vnode);
      await list.updateData({ name: ['like', 'Page Party%'] });
      await list.updateData();
      const first = list.data.map((row) => row.name);
      list.toggleSelectAll(true);
      list.pageStart = 50;
      list.pageEnd = 100;
      await list.updateData();
      const second = list.data.map((row) => row.name);
      const secondPageSelected = list.isAllSelected;
      list.toggleSelectAll(true);
      const selected = list.selectedItems.length;
      list.toggleSelectAll(false);
      window.__auditList = list;
      return {
        count: list.totalCount,
        first,
        second,
        secondPageSelected,
        selected,
        remainingSelected: list.selectedItems.length,
      };
    });
    assert.equal(
      paginationResult.count,
      65,
      'dropdown filter persists on the next database page'
    );
    assert.equal(paginationResult.first.length, 50);
    assert.equal(paginationResult.second.length, 15);
    assert.equal(
      new Set([...paginationResult.first, ...paginationResult.second]).size,
      65
    );
    assert.equal(
      paginationResult.secondPageSelected,
      false,
      'other-page selections do not tick this page'
    );
    assert.equal(paginationResult.selected, 65);
    assert.equal(
      paginationResult.remainingSelected,
      50,
      'deselecting a page preserves other-page selections'
    );
    await go('/data-tools');
    await page.waitForFunction(
      () =>
        document.querySelector('[data-v-app]').__vue_app__.config
          .globalProperties.$router.currentRoute.value.path === '/'
    );
    assert.equal(
      await page.getByText('Data Tools', { exact: true }).count(),
      0,
      'removed screen is absent'
    );
    assert.equal(
      await page.evaluate(() => window.__auditList.listenerCleanups.length),
      0,
      'cached inactive lists release database listeners'
    );
    await go('/list/Party?filters=%7Bbroken');
    await page.getByText('Page Party 064', { exact: true }).waitFor();
    await page.reload();
    await page.getByTestId('company-name').waitFor();
    await page.getByText('Page Party 064', { exact: true }).waitFor();
    await go('/');
    const backup = await page.evaluate(() => ipc.dataToolsCreateBackup(false));
    assert.ok(backup.name, 'internal backup still works');
    assert.ok(
      fs
        .readdirSync(path.join(run, 'backups'))
        .some((name) => name.includes('_manual_'))
    );
    const health = await page.evaluate(() => ipc.dataToolsImportHealth());
    const handledErrors = await page.evaluate(() =>
      document
        .querySelector('[data-v-app]')
        ._vnode.component.proxy.fyo.errorLog.map(
          ({ name, message, stack }) => ({ name, message, stack })
        )
    );
    assert.deepEqual(
      handledErrors,
      [],
      'No handled application errors before restore'
    );
    await page.screenshot({ path: path.join(run, 'dashboard.png') });
    assert.equal(
      health.statements.find((s) => s.party === 'Audit Both Party').closingNet,
      -50,
      'control ledger has the correct Both-party balance'
    );
    const unauthorizedSave = await page.evaluate(async () => {
      try {
        await ipc.saveData('blocked', '/tmp/nivo-unapproved-write.txt');
        return false;
      } catch (error) {
        return String(error).includes('SavePathNotApproved');
      }
    });
    assert.equal(
      unauthorizedSave,
      true,
      'arbitrary renderer file writes are rejected'
    );
    const backupPath = path.join(
      run,
      'backups',
      fs
        .readdirSync(path.join(run, 'backups'))
        .find((name) => name.includes('_manual_'))
    );
    await page.evaluate(async () => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      await fyo.db.update('Party', {
        name: 'Audit Both Party',
        email: 'after-backup@example.test',
      });
    });
    await app.evaluate(({ dialog }, backupPath) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [backupPath],
      });
    }, backupPath);
    const preview = await page.evaluate(() => ipc.dataToolsSelectBackup());
    assert.equal(
      preview.valid && preview.companyMatches && preview.countryMatches,
      true,
      'restore preview validates integrity and company'
    );
    const restored = await page.evaluate(
      (token) => ipc.dataToolsRestore(token),
      preview.token
    );
    assert.equal(restored.restored, true, 'restore succeeds');
    await page.waitForEvent('load');
    await page.getByTestId('company-name').waitFor();
    const restoredEmail = await page.evaluate(async () => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      return (
        await fyo.db.getAllRaw('Party', {
          fields: ['email'],
          filters: { name: 'Audit Both Party' },
        })
      )[0].email;
    });
    assert.notEqual(
      restoredEmail,
      'after-backup@example.test',
      'snapshot contents are restored'
    );
    // Probe the income-only branch of the packaged report without editing any data.
    await go('/report/ProfitAndLoss');
    await page.waitForFunction(() =>
      document.body.innerText.includes('Profit And Loss')
    );
    const reportResult = await page.evaluate(() => {
      function find(v) {
        if (!v) return;
        const c = v.component;
        if (c?.proxy?.report?.getReportDataFromRows) return c.proxy.report;
        if (c) {
          const p = find(c.subTree);
          if (p) return p;
        }
        for (const child of Array.isArray(v.children) ? v.children : []) {
          const p = find(child);
          if (p) return p;
        }
      }
      const report = find(document.querySelector('[data-v-app]')._vnode);
      if (!report) throw new Error('Packaged ProfitAndLoss not ready');
      const calls = [];
      const context = {
        getIncomeOrExpenseRows: (_, rows, label) => {
          calls.push(label);
          return rows;
        },
      };
      report.getReportDataFromRows.call(context, [], [], [{}], undefined);
      report.getReportDataFromRows.call(context, [], [], undefined, [{}]);
      return calls;
    });
    assert.deepEqual(reportResult, [
      'Total Income (Credit)',
      'Total Expense (Debit)',
    ]);
    assert.deepEqual(errors, [], 'No renderer exceptions');
    assert.deepEqual(
      await page.evaluate(() =>
        document
          .querySelector('[data-v-app]')
          ._vnode.component.proxy.fyo.errorLog.map(
            ({ name, message, stack }) => ({ name, message, stack })
          )
      ),
      [],
      'No handled application errors after restore and report'
    );
    console.log(
      JSON.stringify({
        result: 'pass',
        temporaryProfile: run,
        checks: [
          'invoice summary',
          'saved column visibility',
          'age filter',
          'Party list',
          'verified backup',
          'restore round trip and company validation',
          'unapproved file write blocked',
          'handled application errors',
          'income-only report',
          'renderer errors',
        ],
      })
    );
  } catch (error) {
    const page = await app.firstWindow();
    console.error(
      await page
        .locator('body')
        .innerText()
        .catch(() => 'No page text')
    );
    throw error;
  } finally {
    await app.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// Real controls, synthetic company: never point this test at business data.
const { _electron } = require('playwright');
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

(async () => {
  const root = path.resolve(__dirname, '..');
  const run = fs.mkdtempSync(path.join(os.tmpdir(), 'nivo-partial-payment-'));
  const database = path.join(run, 'test.db');
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
    JSON.stringify({ lastSelectedFilePath: database, files: [] })
  );
  const app = await _electron.launch({
    executablePath:
      process.env.NIVO_APP_EXECUTABLE ||
      path.join(root, 'dist_electron/bundled/linux-unpacked/frappe-books'),
    args: [`--user-data-dir=${profile}`],
    env: { ...process.env, IS_TEST: 'true' },
  });
  try {
    const page = await app.firstWindow();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.getByTestId('company-name').waitFor();
    async function openPayment(schema, name) {
      await page.evaluate(
        async ({ schema, name }) => {
          const root = document.querySelector('[data-v-app]');
          const fyo = root._vnode.component.proxy.fyo;
          const router = root.__vue_app__.config.globalProperties.$router;
          await router.push(`/edit/${schema}/${name}`);
          const doc = await fyo.doc.getDoc(schema, name);
          await doc.constructor
            .getActions(fyo)
            .find((a) => a.label === 'Payment')
            .action(doc, router);
        },
        { schema, name }
      );
      await page.locator('.nivo-quick-edit').waitFor();
    }
    async function enterAmount(value) {
      const input = page.locator(
        '.nivo-quick-edit input[placeholder="Payment Amount"]'
      );
      await input.locator('..').locator('div').last().click();
      await input.fill(value);
    }
    const paymentCount = () =>
      page.evaluate(async () => {
        const fyo =
          document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
        return (await fyo.db.getAllRaw('Payment', { fields: ['name'] })).length;
      });
    await openPayment('SalesInvoice', 'SINV-1001');
    assert.equal(
      await page
        .locator('.nivo-quick-edit input[placeholder="Write Off"]')
        .count(),
      0,
      'ordinary payment has no confusing write-off input'
    );
    const initialCount = await paymentCount();
    // A rejected input must never save the previous full invoice balance.
    for (const invalid of ['0', '999999']) {
      await enterAmount(invalid);
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await page.locator('.nivo-quick-edit .text-red-600').waitFor();
      assert.equal(
        await paymentCount(),
        initialCount,
        `invalid ${invalid} creates no payment`
      );
    }
    // Force asynchronous validation to overlap a direct Save click.
    await page.evaluate(() => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      const getDoc = fyo.doc.getDoc.bind(fyo.doc);
      fyo.doc.getDoc = async (...args) => {
        if (args[0] === 'SalesInvoice')
          await new Promise((r) => setTimeout(r, 100));
        return getDoc(...args);
      };
    });
    await enterAmount('5');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page
      .locator('.nivo-quick-edit')
      .waitFor({ state: 'hidden', timeout: 12000 })
      .catch(async (e) => {
        console.log(await page.locator('body').innerText());
        throw e;
      });
    const sales = await page.evaluate(async () => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      const doc = await fyo.doc.getDoc('SalesInvoice', 'SINV-1001');
      return doc.outstandingAmount.float;
    });
    assert.equal(sales, 145, '5 paid against 150 due leaves 145');
    assert.equal(await paymentCount(), initialCount + 1);
    const persisted = await page.evaluate(async () => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      const payments = await fyo.db.getAllRaw('Payment', {
        fields: ['name', 'amount', 'writeoff'],
        filters: { submitted: true, cancelled: false },
      });
      return payments.map((p) => ({
        amount: Number(p.amount),
        writeoff: Number(p.writeoff),
      }));
    });
    assert.ok(
      persisted.some((p) => p.amount === 5 && p.writeoff === 0),
      'actual cash is 5, never full balance or writeoff'
    );
    await page
      .getByText(/Partly Paid/)
      .first()
      .waitFor();
    const purchaseName = await page.evaluate(async () => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      await fyo.doc
        .getNewDoc('Party', {
          name: 'Partial Payment Supplier',
          role: 'Supplier',
        })
        .sync();
      const invoice = fyo.doc.getNewDoc('PurchaseInvoice', {
        party: 'Partial Payment Supplier',
        account: 'Creditors',
        items: [{ item: 'Audit Item', rate: 100, quantity: 2 }],
      });
      await invoice.sync();
      await invoice.submit();
      return invoice.name;
    });
    await openPayment('PurchaseInvoice', purchaseName);
    await enterAmount('7');
    await page.keyboard.press('Control+s');
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page
      .locator('.nivo-quick-edit')
      .waitFor({ state: 'hidden', timeout: 12000 })
      .catch(async (e) => {
        console.log(await page.locator('body').innerText());
        throw e;
      });
    const purchase = await page.evaluate(async (name) => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      return (await fyo.doc.getDoc('PurchaseInvoice', name)).outstandingAmount
        .float;
    }, purchaseName);
    assert.equal(
      purchase,
      193,
      'shortcut commits focused input: 7 against 200 leaves 193'
    );
    // The full Payment form must also commit focused currency inputs before Save.
    const manual = await page.evaluate(async () => {
      const root = document.querySelector('[data-v-app]');
      const fyo = root._vnode.component.proxy.fyo;
      const invoice = fyo.doc.getNewDoc('SalesInvoice', {
        party: 'Audit Both Party',
        account: 'Debtors',
        items: [{ item: 'Audit Item', rate: 1000, quantity: 1 }],
      });
      await invoice.sync();
      await invoice.submit();
      const payment = invoice.getPayment();
      await payment.runFormulas();
      await root.__vue_app__.config.globalProperties.$router.push(
        `/edit/Payment/${payment.name}`
      );
      return { invoice: invoice.name, payment: payment.name };
    });
    const manualAmount = page.locator('input[placeholder="Payment Amount"]');
    await manualAmount.locator('..').locator('div').last().click();
    await manualAmount.fill('40');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.getByRole('button', { name: 'Submit', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.getByText('Submitted', { exact: true }).first().waitFor();
    const manualDue = await page.evaluate(async ({ invoice }) => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      return (await fyo.db.get('SalesInvoice', invoice)).outstandingAmount
        .float;
    }, manual);
    assert.equal(
      manualDue,
      960,
      'full form commits 40 against 1000 and retains 960 due'
    );
    const rowEditInvoice = await page.evaluate(async () => {
      const root = document.querySelector('[data-v-app]');
      const fyo = root._vnode.component.proxy.fyo;
      const router = root.__vue_app__.config.globalProperties.$router;
      window.__nivoFindComponent = (predicate) => {
        const seen = new Set();
        const visit = (vnode) => {
          if (!vnode || seen.has(vnode)) return null;
          seen.add(vnode);
          const instance = vnode.component;
          if (instance) {
            if (predicate(instance.proxy)) return instance.proxy;
            const found = visit(instance.subTree);
            if (found) return found;
          }
          if (Array.isArray(vnode.children)) {
            for (const child of vnode.children) {
              const found = visit(child);
              if (found) return found;
            }
          }
          return null;
        };
        return visit(root._vnode);
      };
      const invoice = fyo.doc.getNewDoc('SalesInvoice', {
        party: 'Audit Both Party',
        account: 'Debtors',
        items: [
          { item: 'Audit Item', quantity: 1, rate: 10 },
          { item: 'Audit Item', quantity: 1, rate: 20 },
        ],
      });
      await invoice.sync();
      await router.push(`/edit/SalesInvoice/${invoice.name}`);
      let common;
      for (let attempt = 0; attempt < 30 && !common; attempt++) {
        common = window.__nivoFindComponent(
          (proxy) =>
            typeof proxy?.showRowEditForm === 'function' && 'docOrNull' in proxy
        );
        if (!common) await new Promise((resolve) => setTimeout(resolve, 20));
      }
      if (!common) throw new Error('CommonForm component was not mounted');
      await common.showRowEditForm(invoice.items[0]);
      for (let attempt = 0; attempt < 30 && !common.rowEditForm; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      const rowForm = common.rowEditForm;
      const delayRowSet = (row) => {
        const originalSet = row.set.bind(row);
        row.set = async (...args) => {
          await new Promise((resolve) => setTimeout(resolve, 250));
          return originalSet(...args);
        };
      };
      delayRowSet(invoice.items[0]);
      rowForm.form.onChange(fyo.getField('SalesInvoiceItem', 'quantity'), 3);
      await common.navigateRowEdit(1);
      if (common.row?.index !== 1 || invoice.items[0].quantity !== 3) {
        throw new Error('Row navigation did not wait for pending validation');
      }
      delayRowSet(invoice.items[1]);
      rowForm.form.onChange(fyo.getField('SalesInvoiceItem', 'quantity'), 4);
      return invoice.name;
    });
    console.log('Checking nested row save flush', rowEditInvoice);
    await page.keyboard.press('Control+s');
    const nestedSaveConfirm = page.getByRole('button', {
      name: 'Yes',
      exact: true,
    });
    await nestedSaveConfirm.waitFor({ state: 'visible', timeout: 10000 });
    await nestedSaveConfirm.click();
    await page.waitForFunction(
      async (name) => {
        const fyo =
          document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
        const rows = await fyo.db.getAllRaw('SalesInvoiceItem', {
          fields: ['quantity'],
          filters: { parent: name },
        });
        return rows.map((row) => Number(row.quantity)).join(',') === '3,4';
      },
      rowEditInvoice,
      { timeout: 10000 }
    );
    const savedRowQuantities = await page.evaluate(async (name) => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      const rows = await fyo.db.getAllRaw('SalesInvoiceItem', {
        fields: ['quantity'],
        filters: { parent: name },
      });
      return rows.map((row) => Number(row.quantity));
    }, rowEditInvoice);
    assert.deepEqual(
      savedRowQuantities,
      [3, 4],
      'row navigation and keyboard Save wait for nested row validation'
    );
    await page.evaluate(() => {
      const root = document.querySelector('[data-v-app]');
      const fyo = root._vnode.component.proxy.fyo;
      const common = window.__nivoFindComponent(
        (proxy) =>
          typeof proxy?.showRowEditForm === 'function' && 'docOrNull' in proxy
      );
      const row = common.doc.items[0];
      const tableRow = window.__nivoFindComponent(
        (proxy) =>
          proxy?.row === row &&
          typeof proxy.onChange === 'function' &&
          typeof proxy.flushChanges === 'function'
      );
      if (!tableRow) throw new Error('Inline TableRow component was not found');
      window.__nivoOriginalInlineRowSet = row.set.bind(row);
      row.set = async (...args) => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        throw new Error('simulated inline row validation failure');
      };
      tableRow.onChange(fyo.getField('SalesInvoiceItem', 'quantity'), 8);
    });
    console.log('Checking inline row validation failure', rowEditInvoice);
    await page.keyboard.press('Control+s');
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('.text-red-600')).some((element) =>
          element.textContent?.trim()
        ),
      null,
      { timeout: 10000 }
    );
    assert.equal(
      await page.getByRole('button', { name: 'Yes', exact: true }).count(),
      0,
      'keyboard Save stops when inline table row validation fails'
    );
    assert.deepEqual(
      await page.evaluate(async (name) => {
        const fyo =
          document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
        const rows = await fyo.db.getAllRaw('SalesInvoiceItem', {
          fields: ['quantity'],
          filters: { parent: name },
        });
        return rows.map((row) => Number(row.quantity));
      }, rowEditInvoice),
      [3, 4],
      'failed inline validation does not save the row value'
    );
    await page.evaluate(() => {
      const root = document.querySelector('[data-v-app]');
      const fyo = root._vnode.component.proxy.fyo;
      const common = window.__nivoFindComponent(
        (proxy) =>
          typeof proxy?.showRowEditForm === 'function' && 'docOrNull' in proxy
      );
      const row = common.doc.items[0];
      const tableRow = window.__nivoFindComponent(
        (proxy) =>
          proxy?.row === row &&
          typeof proxy.onChange === 'function' &&
          typeof proxy.flushChanges === 'function'
      );
      row.set = window.__nivoOriginalInlineRowSet;
      tableRow.onChange(fyo.getField('SalesInvoiceItem', 'quantity'), 5);
    });
    console.log('Checking inline row save flush', rowEditInvoice);
    await page.keyboard.press('Control+s');
    const inlineSaveConfirm = page.getByRole('button', {
      name: 'Yes',
      exact: true,
    });
    await inlineSaveConfirm.waitFor({ state: 'visible', timeout: 10000 });
    await inlineSaveConfirm.click();
    await page.waitForFunction(
      async (name) => {
        const fyo =
          document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
        const rows = await fyo.db.getAllRaw('SalesInvoiceItem', {
          fields: ['quantity'],
          filters: { parent: name },
        });
        return rows.map((row) => Number(row.quantity)).join(',') === '5,4';
      },
      rowEditInvoice,
      { timeout: 10000 }
    );
    await page.evaluate(() => {
      const root = document.querySelector('[data-v-app]');
      const fyo = root._vnode.component.proxy.fyo;
      const common = window.__nivoFindComponent(
        (proxy) =>
          typeof proxy?.showRowEditForm === 'function' && 'docOrNull' in proxy
      );
      const row = common.doc.items[1];
      row.set = async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        throw new Error('simulated row validation failure');
      };
      common.rowEditForm.form.onChange(
        fyo.getField('SalesInvoiceItem', 'quantity'),
        8
      );
    });
    await page.keyboard.press('Control+s');
    await page.locator('.w-quick-edit .text-red-600').waitFor();
    assert.equal(
      await page.getByRole('button', { name: 'Yes', exact: true }).count(),
      0,
      'keyboard Save stops when nested row validation fails'
    );
    assert.deepEqual(
      await page.evaluate(async (name) => {
        const fyo =
          document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
        const rows = await fyo.db.getAllRaw('SalesInvoiceItem', {
          fields: ['quantity'],
          filters: { parent: name },
        });
        return rows.map((row) => Number(row.quantity));
      }, rowEditInvoice),
      [5, 4],
      'failed nested validation does not save the row value'
    );
    assert.deepEqual(errors, [], 'no renderer errors');
    console.log(
      'PASS: rejected amounts, delayed validation, sales partial payment, purchase shortcut payment',
      run
    );
  } finally {
    await app.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

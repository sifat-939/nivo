// Submitted correction lifecycle using only a disposable synthetic company.
const { _electron } = require('playwright');
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

(async () => {
  const root = path.resolve(__dirname, '..');
  const run = fs.mkdtempSync(path.join(os.tmpdir(), 'nivo-correction-'));
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
    await page.getByTestId('company-name').waitFor();
    const source = await page.evaluate(async () => {
      const root = document.querySelector('[data-v-app]');
      const fyo = root._vnode.component.proxy.fyo;
      // Reproduce the confusing legacy flow: a full allocation with a small
      // value stored in Write Off, instead of the actual cash payment field.
      const expense = (
        await fyo.db.getAll('Account', {
          fields: ['name'],
          filters: { rootType: 'Expense', isGroup: false },
        })
      )[0];
      await fyo.singles.AccountingSettings.setAndSync(
        'writeOffAccount',
        expense.name
      );
      const invoice = fyo.doc.getNewDoc('SalesInvoice', {
        party: 'Audit Both Party',
        account: 'Debtors',
        items: [{ item: 'Audit Item', quantity: 1, rate: 980 }],
      });
      await invoice.sync();
      await invoice.submit();
      const payment = invoice.getPayment();
      await payment.runFormulas();
      await payment.set('writeoff', fyo.pesa(40));
      await payment.sync();
      await payment.submit();
      await root.__vue_app__.config.globalProperties.$router.push(
        `/edit/Payment/${payment.name}`
      );
      return { payment: payment.name, invoice: invoice.name };
    });
    // The form's overflow action menu exposes the lifecycle backed correction.
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByText('Correct Payment', { exact: true }).click();
    await page.getByText(/original will stay in the audit trail/).waitFor();
    await page.getByRole('button', { name: 'No', exact: true }).click();
    const afterDecline = await page.evaluate(async ({ payment }) => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      return (await fyo.db.get('Payment', payment)).cancelled;
    }, source);
    assert.equal(
      afterDecline,
      false,
      'declining confirmation leaves original submitted'
    );
    await page.evaluate(() => {
      const root = document.querySelector('[data-v-app]');
      function find(vnode) {
        if (!vnode) return;
        const component = vnode.component;
        if (
          component?.proxy?.schemaName === 'Payment' &&
          component.proxy.docOrNull
        )
          return component.proxy;
        if (component) {
          const found = find(component.subTree);
          if (found) return found;
        }
        for (const child of Array.isArray(vnode.children)
          ? vnode.children
          : []) {
          const found = find(child);
          if (found) return found;
        }
      }
      const form = find(root._vnode);
      const cancel = form.doc.cancel.bind(form.doc);
      form.doc.cancel = async () => {
        const error = new Error('simulated cancellation failure');
        error.shouldStore = false;
        throw error;
      };
      window.restorePaymentCancel = () => {
        form.doc.cancel = cancel;
      };
    });
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByText('Correct Payment', { exact: true }).click();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.getByText(/simulated cancellation failure/).waitFor();
    const failedCancel = await page.evaluate(async ({ payment }) => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      return {
        cancelled: (await fyo.db.get('Payment', payment)).cancelled,
        path: document.querySelector('[data-v-app]').__vue_app__.config
          .globalProperties.$router.currentRoute.value.fullPath,
      };
    }, source);
    assert.equal(
      failedCancel.cancelled,
      false,
      'failed cancellation leaves source active'
    );
    assert.ok(
      failedCancel.path.includes(`/Payment/${source.payment}`),
      'failure does not navigate to a correction draft'
    );
    await page.getByRole('button', { name: 'Okay', exact: true }).click();
    await page.evaluate(() => window.restorePaymentCancel());
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByText('Correct Payment', { exact: true }).click();
    await page.getByText(/original will stay in the audit trail/).waitFor();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).waitFor();
    const result = await page.evaluate(async ({ payment, invoice }) => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      const original = await fyo.db.get('Payment', payment);
      function find(vnode) {
        if (!vnode) return;
        const component = vnode.component;
        if (
          component?.proxy?.schemaName === 'Payment' &&
          component.proxy.docOrNull
        )
          return component.proxy;
        if (component) {
          const found = find(component.subTree);
          if (found) return found;
        }
        for (const child of Array.isArray(vnode.children)
          ? vnode.children
          : []) {
          const found = find(child);
          if (found) return found;
        }
      }
      const correction = find(
        document.querySelector('[data-v-app]')._vnode
      )?.docOrNull;
      if (!correction) throw new Error('Could not inspect correction draft');
      const updatedInvoice = await fyo.db.get('SalesInvoice', invoice);
      return {
        cancelled: original.cancelled,
        submitted: correction.isSubmitted,
        amount: correction.amount.float,
        writeoff: correction.writeoff.float,
        allocation: correction.for[0]?.amount.float,
        due: updatedInvoice.outstandingAmount.float,
      };
    }, source);
    assert.equal(
      result.cancelled,
      true,
      'the submitted source uses normal cancellation'
    );
    assert.equal(result.submitted, false, 'correction opens as a draft');
    assert.equal(
      result.amount,
      0,
      'correction starts with no cash amount copied'
    );
    assert.equal(
      result.writeoff,
      0,
      'correction starts with no write-off copied'
    );
    assert.equal(
      result.allocation,
      0,
      'correction starts with no settled allocation copied'
    );
    assert.equal(result.due, 980, 'cancellation restores invoice outstanding');
    const amount = page.locator('input[placeholder="Payment Amount"]');
    await amount.locator('..').locator('div').last().click();
    await amount.fill('40');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.getByRole('button', { name: 'Submit', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await page.getByText('Submitted', { exact: true }).first().waitFor();
    const final = await page.evaluate(async ({ payment, invoice }) => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      const original = await fyo.db.get('Payment', payment);
      const payments = await fyo.db.getAllRaw('Payment', {
        fields: ['name', 'amount'],
        filters: { submitted: true, cancelled: false },
      });
      const updatedInvoice = await fyo.db.get('SalesInvoice', invoice);
      return {
        originalCancelled: original.cancelled,
        originalWriteoff: original.writeoff.float,
        corrected: payments.some(
          (p) => p.name !== payment && Number(p.amount) === 40
        ),
        due: updatedInvoice.outstandingAmount.float,
      };
    }, source);
    assert.equal(
      final.originalCancelled,
      true,
      'source stays cancelled in audit history'
    );
    assert.equal(
      final.originalWriteoff,
      40,
      'original adjustment is preserved in cancelled audit history'
    );
    assert.equal(
      final.corrected,
      true,
      'correction submits as a separate payment'
    );
    assert.equal(
      final.due,
      940,
      'the corrected cash amount applies to invoice'
    );
    console.log(
      'PASS: declined and confirmed correction, reversal, zeroed draft and corrected resubmission',
      run
    );
  } finally {
    await app.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

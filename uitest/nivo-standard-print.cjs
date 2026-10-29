/* Packaged print / PDF checks use a disposable synthetic company only. */
const { _electron } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

(async () => {
  const root = path.resolve(__dirname, '..');
  const run = fs.mkdtempSync(path.join(os.tmpdir(), 'nivo-standard-print-'));
  const db = path.join(run, 'sample.books.db');
  const profile = path.join(run, 'profile');
  const output =
    process.env.NIVO_PRINT_OUTPUT ||
    path.join(root, 'tmp', 'pdfs', 'standard-print');
  fs.mkdirSync(profile);
  fs.mkdirSync(output, { recursive: true });
  execFileSync(
    require('electron'),
    [
      '--require',
      'ts-node/register',
      '--require',
      'tsconfig-paths/register',
      'uitest/createGuideFixture.ts',
      db,
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: 'true',
        TS_NODE_COMPILER_OPTIONS: '{"module":"commonjs"}',
        TS_NODE_TRANSPILE_ONLY: 'true',
        IS_TEST: 'true',
      },
      stdio: 'pipe',
    }
  );
  const names = JSON.parse(fs.readFileSync(db + '.names.json', 'utf8'));
  fs.writeFileSync(
    path.join(profile, 'config.json'),
    JSON.stringify({
      lastSelectedFilePath: db,
      files: [
        {
          id: 'sample',
          companyName: 'Nivo Demo Store',
          dbPath: db,
          openCount: 1,
        },
      ],
    })
  );
  const app = await _electron.launch({
    executablePath: path.join(
      root,
      'dist_electron/bundled/linux-unpacked/frappe-books'
    ),
    args: [`--user-data-dir=${profile}`],
    env: { ...process.env, IS_TEST: 'true' },
    timeout: 60000,
  });
  const errors = [];
  try {
    const page = await app.firstWindow();
    page.setDefaultTimeout(30000);
    await page.setViewportSize({ width: 1180, height: 840 });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.getByTestId('company-name').waitFor();
    await page.locator('.nivo-dashboard-card').first().waitFor();
    const fyoEval = (fn) => page.evaluate(fn);
    const info = await fyoEval(async () => {
      const f =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      const svg = (text) =>
        'data:image/svg+xml;base64,' +
        btoa(
          `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><text x="5" y="55" font-size="30">${text}</text></svg>`
        );
      await f.singles.PrintSettings.setAndSync({
        displayLogo: true,
        logo: svg('DEMO'),
        authorizedSignature: svg('Sample'),
        phone: '01234567890',
        email: 'demo@example.test',
        displaytermsandconditions: true,
        termsAndConditions: 'Thank you for doing business with us.',
      });
      const a = f.doc.getNewDoc('Address', {
        name: 'Sample store address',
        addressLine1: '10 Sample Road',
        city: 'Dhaka',
        country: 'Bangladesh',
      });
      await a.sync();
      await f.singles.PrintSettings.setAndSync('address', a.name);
      return await f.db.getAllRaw('PrintTemplate', {
        fields: ['name', 'type'],
      });
    });
    assert.deepEqual(info, [{ name: 'Nivo Standard', type: 'All' }]);
    const go = async (route) => {
      await page.evaluate(async (route) => {
        await document
          .querySelector('[data-v-app]')
          .__vue_app__.config.globalProperties.$router.push(route);
      }, route);
      await page.locator('.nivo-standard-print').waitFor();
      await page.waitForFunction(() =>
        document
          .querySelector('.nivo-standard-print')
          ?.innerText.includes('Authorized Signature')
      );
      await page.evaluate(() => document.fonts.ready);
    };
    const save = async (file) => {
      const savePath = path.join(output, file);
      await app.evaluate(({ dialog }, savePath) => {
        dialog.showSaveDialog = async () => ({
          canceled: false,
          filePath: savePath,
        });
      }, savePath);
      await page
        .getByRole('button', { name: 'Save as PDF', exact: true })
        .click();
      await page.waitForFunction(
        () => !document.body.innerText.includes('Export Failed')
      );
      for (let i = 0; i < 100 && !fs.existsSync(savePath); i++)
        await page.waitForTimeout(100);
      assert.ok(fs.existsSync(savePath), `PDF created: ${file}`);
      await page.waitForTimeout(200);
      console.log('Exported', savePath);
    };
    await go('/print/SalesInvoice/' + names.sale);
    let text = await page.locator('.nivo-standard-print').innerText();
    assert.ok(text.includes('Sales Details'));
    assert.ok(text.includes('500.00'));
    assert.ok(text.includes('700.00'));
    assert.ok(!/\bTax\b/.test(text));
    assert.equal(
      await page.locator('img[alt="Authorized signature"]').count(),
      1
    );
    assert.equal(await page.locator('.nivo-print-table tbody tr').count(), 1);
    assert.ok(
      await page
        .locator('.nivo-print-table tbody')
        .innerText()
        .then((t) => t.includes('10 Unit'))
    );
    await save('Nivo-Standard-Invoice-Sample.pdf');
    if (process.env.NIVO_UPDATE_GUIDE === '1')
      await page.screenshot({
        path: path.join(root, 'docs/user-guide/images/print.jpg'),
        type: 'jpeg',
        quality: 86,
      });
    await go('/print/PurchaseInvoice/' + names.purchase);
    text = await page.locator('.nivo-standard-print').innerText();
    assert.ok(
      text.includes('Purchase Details') &&
        text.includes('Paid Amount') &&
        text.includes('2,000.00')
    );
    await go('/print/Payment/' + names.receipt);
    assert.ok(
      (await page.locator('.nivo-standard-print').innerText()).includes(
        'Payment Receipt'
      )
    );
    await go('/print/JournalEntry/' + names.journal);
    assert.ok(
      (await page.locator('.nivo-standard-print').innerText()).includes(
        'Total Debit'
      )
    );
    await page.evaluate(async () => {
      await document
        .querySelector('[data-v-app]')
        .__vue_app__.config.globalProperties.$router.push(
          '/edit/Party/Rafiq%20Store'
        );
    });
    await page.getByTitle('Open Print View', { exact: true }).click();
    await page.locator('.nivo-standard-print').waitFor();
    text = await page.locator('.nivo-standard-print').innerText();
    assert.ok(
      text.includes('Account Statement') &&
        text.includes('700.00') &&
        text.includes('Closing Balance')
    );
    await save('Nivo-Standard-Statement-Sample.pdf');
    if (process.env.NIVO_UPDATE_GUIDE === '1')
      await page.screenshot({
        path: path.join(root, 'docs/user-guide/images/statement.jpg'),
        type: 'jpeg',
        quality: 86,
      });
    // Route controls update opening balance correctly and never edit the ledger.
    const period = await page.evaluate(async () => {
      function find(node) {
        if (!node || typeof node !== 'object') return;
        if (node.component?.proxy?.refreshStatement) return node.component;
        const result = find(node.component?.subTree);
        if (result) return result;
        for (const child of Array.isArray(node.children) ? node.children : []) {
          const value = find(child);
          if (value) return value;
        }
      }
      const vm = find(document.querySelector('[data-v-app]')._vnode);
      if (!vm) throw new Error('PrintView not found');
      await vm.proxy.setStatementFrom('2026-10-16');
      await vm.proxy.setStatementTo('2026-10-16');
      return vm.proxy.values.doc;
    });
    assert.equal(period.printRows.length, 2);
    assert.ok(period.printRows[0].balance.includes('1,200.00'));
    assert.ok(period.printRows[1].balance.includes('700.00'));
    await go('/print/SalesInvoice/' + names.draft);
    assert.ok(
      (await page.locator('.nivo-standard-print').innerText()).includes('DRAFT')
    );
    assert.equal(
      await page.locator('img[alt="Authorized signature"]').count(),
      0
    );
    // Long descriptions / many rows: real draft document to exercise PDF pagination.
    const longName = await page.evaluate(async () => {
      const f =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      const d = f.doc.getNewDoc('SalesInvoice', {
        party: 'Rafiq Store',
        date: '2026-10-20',
        items: Array.from({ length: 65 }, () => ({
          item: 'Gift Bag',
          quantity: 2,
          rate: 120,
        })),
        makeAutoPayment: false,
        makeAutoStockTransfer: false,
      });
      await d.sync();
      return d.name;
    });
    await go('/print/SalesInvoice/' + longName);
    await save('pagination-stress.pdf');
    await page.evaluate(async () => {
      await document
        .querySelector('[data-v-app]')
        .__vue_app__.config.globalProperties.$router.push(
          '/template-builder/Nivo Standard'
        );
    });
    await page.locator('.nivo-standard-print').waitFor();
    const handled = await fyoEval(
      () =>
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo
          .errorLog
    );
    assert.deepEqual(errors, []);
    assert.equal(Object.keys(handled).length, 0);
    console.log(
      JSON.stringify({
        result: 'pass',
        run,
        checks: [
          'single template',
          'invoice receipt allocation',
          'purchase payment',
          'payment voucher',
          'journal entry',
          'party statement and date range',
          'draft signature hidden',
          'real PDF exports',
          '65-row pagination',
          'standard template preview',
          'no errors',
        ],
      })
    );
  } finally {
    await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

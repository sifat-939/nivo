// Captures the real packaged application using a synthetic temporary company.
const { _electron } = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
(async () => {
  const root = path.resolve(__dirname, '..');
  const run = fs.mkdtempSync(path.join(os.tmpdir(), 'nivo-guide-'));
  const database = path.join(run, 'guide.db');
  const profile = path.join(run, 'profile');
  fs.mkdirSync(profile);
  const images = path.join(root, 'docs/user-guide/images');
  fs.mkdirSync(images, { recursive: true });
  execFileSync(
    require('electron'),
    [
      '--require',
      'ts-node/register',
      '--require',
      'tsconfig-paths/register',
      'uitest/createGuideFixture.ts',
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
  const names = JSON.parse(fs.readFileSync(database + '.names.json', 'utf8'));
  fs.writeFileSync(
    path.join(profile, 'config.json'),
    JSON.stringify({
      lastSelectedFilePath: null,
      files: [
        {
          id: 'guide',
          companyName: 'Nivo Demo Store',
          dbPath: database,
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
  const manifest = [];
  const errors = [];
  try {
    const page = await app.firstWindow();
    await page.setViewportSize({ width: 1180, height: 840 });
    page.setDefaultTimeout(30000);
    page.on('pageerror', (e) => errors.push(e.message));
    const settle = () =>
      page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r))
        );
      });
    const shot = async (id) => {
      await settle();
      await page.screenshot({
        path: path.join(images, id + '.jpg'),
        type: 'jpeg',
        quality: 86,
      });
      manifest.push(id);
      console.log('Captured', id);
    };
    const go = async (route, ready) => {
      await page.evaluate(async (route) => {
        await document
          .querySelector('[data-v-app]')
          .__vue_app__.config.globalProperties.$router.push(route);
      }, route);
      if (ready)
        await page
          .getByText(
            new RegExp(
              '^' + ready.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$',
              'i'
            )
          )
          .first()
          .waitFor();
      await settle();
    };
    const capture = async (id, route, ready) => {
      await go(route, ready);
      await shot(id);
    };
    await page.getByText('Welcome to Nivo', { exact: true }).waitFor();
    await shot('company');
    await page.getByTestId('create-new-file').click();
    await page.getByText('Set up your organization', { exact: true }).waitFor();
    await shot('setup');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByText('Nivo Demo Store', { exact: true }).click();
    await page.getByTestId('company-name').waitFor();
    await page.getByText('Total Spending', { exact: true }).waitFor();
    await shot('dashboard');
    await capture(
      'items',
      '/list/Item/Sales Items?filters=' +
        encodeURIComponent(JSON.stringify({ for: ['in', ['Sales', 'Both']] })),
      'Gift Bag'
    );
    assert.equal(
      await page.getByText('Tax', { exact: true }).count(),
      0,
      'Item list has no Tax column'
    );
    await capture('item', '/edit/Item/Gift Bag', 'Item Name');
    await capture(
      'customers',
      '/list/Party/Customers?filters=' +
        encodeURIComponent(
          JSON.stringify({ role: ['in', ['Customer', 'Both']] })
        ),
      'Rafiq Store'
    );
    await capture('customer', '/edit/Party/Rafiq Store', 'Role');
    await capture(
      'suppliers',
      '/list/Party/Suppliers?filters=' +
        encodeURIComponent(
          JSON.stringify({ role: ['in', ['Supplier', 'Both']] })
        ),
      'Metro Supply'
    );
    await capture('sales', '/list/SalesInvoice', names.sale);
    await capture(
      'invoice',
      '/edit/SalesInvoice/' + names.sale,
      'Settled / Adjusted'
    );
    await capture(
      'draft',
      '/edit/SalesInvoice/' + names.draft,
      'Settled / Adjusted'
    );
    await capture('receipt', '/edit/Payment/' + names.receipt, 'Payment Type');
    await go('/edit/Payment/' + names.receipt, 'Payment Type');
    await page.getByText('Details', { exact: true }).click();
    await page.getByText('Payment Reference', { exact: true }).waitFor();
    await shot('allocation');
    await capture('purchases', '/list/PurchaseInvoice', names.purchase);
    await capture(
      'purchase',
      '/edit/PurchaseInvoice/' + names.purchase,
      'Settled / Adjusted'
    );
    await capture('payment', '/edit/Payment/' + names.payment, 'Payment Type');
    await capture(
      'expense',
      '/edit/Expense/' + names.expense,
      'Expense Account'
    );
    await capture('bank-cash', '/bank-cash', 'Demo Bank');
    await capture('employees', '/list/Employee', 'DEMO-001');
    await capture(
      'employee',
      '/edit/Employee/' + names.employee,
      'Employee Name'
    );
    await capture(
      'salary',
      '/edit/SalaryPayment/' + names.salary,
      'Salary Month'
    );
    await capture(
      'journal',
      '/edit/JournalEntry/' + names.journal,
      'Entry Type'
    );
    await capture('ledger', '/report/GeneralLedger', 'General Ledger');
    await capture('profit-loss', '/report/ProfitAndLoss', 'Profit and Loss');
    await capture('balance-sheet', '/report/BalanceSheet', 'Balance Sheet');
    await capture('trial-balance', '/report/TrialBalance', 'Trial Balance');
    await capture('print', '/print/SalesInvoice/' + names.sale, 'Save as PDF');
    await capture(
      'statement',
      '/print/Party/Rafiq%20Store',
      'Account Statement'
    );
    await capture(
      'settings',
      '/settings?tab=AccountingSettings',
      'Company Name'
    );
    await capture('features', '/settings?tab=Features', 'Search features');
    await page
      .getByRole('button', { name: 'About Enable Sales Quotes', exact: true })
      .click();
    await shot('feature-help');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page
      .getByRole('button', { name: 'Close', exact: true })
      .waitFor({ state: 'hidden' });
    await capture('print-settings', '/settings?tab=PrintSettings', 'Print');
    await capture('defaults', '/settings?tab=Defaults', 'Defaults');
    await capture('accounts', '/chart-of-accounts', 'Chart of Accounts');
    await capture('import', '/import-wizard', 'Import Wizard');
    await capture('templates', '/list/PrintTemplate', 'Print Template');
    await capture('quotes', '/list/SalesQuote', 'Quote');
    // Optional pages are enabled only in this disposable tutorial company.
    await page.evaluate(async () => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      await fyo.singles.AccountingSettings.setAndSync({
        enableInventory: true,
        enableShipment: true,
        enablePurchaseReceipt: true,
        enableStockLedger: true,
        enablePriceList: true,
        enableLead: true,
        enableFormCustomization: true,
      });
    });
    await page.reload();
    await page.getByTestId('company-name').waitFor();
    await capture('inventory', '/list/StockMovement', 'Stock Movement');
    await capture('stock-balance', '/report/StockBalance', 'Stock Balance');
    await capture('stock-ledger', '/report/StockLedger', 'Stock Ledger');
    await capture('shipments', '/list/Shipment', 'Shipment');
    await capture('receipts', '/list/PurchaseReceipt', 'Purchase Receipt');
    await capture('price-list', '/list/PriceList', 'Price List');
    await capture('leads', '/list/Lead', 'Lead');
    await capture('customize', '/list/CustomForm', 'Custom Form');
    await go('/settings?tab=InventorySettings', 'Inventory');
    await shot('inventory-settings');
    await capture('system', '/settings?tab=SystemSettings', 'System');
    await page.evaluate(async () => {
      const fyo =
        document.querySelector('[data-v-app]')._vnode.component.proxy.fyo;
      await fyo.singles.AccountingSettings.setAndSync({
        enablePricingRule: true,
        enableCouponCode: true,
        enableLoyaltyProgram: true,
      });
      await fyo.singles.InventorySettings.setAndSync('enablePointOfSale', true);
    });
    await page.reload();
    await page.getByTestId('company-name').waitFor();
    await capture('pricing', '/list/PricingRule', 'Pricing Rule');
    await capture('coupons', '/list/CouponCode', 'Coupon Code');
    await capture('loyalty', '/list/LoyaltyProgram', 'Loyalty Program');
    await capture('pos-settings', '/settings?tab=POSSettings', 'POS Settings');
    await capture('pos', '/pos', 'Point of Sale');
    const handled = await page.evaluate(() =>
      document
        .querySelector('[data-v-app]')
        ._vnode.component.proxy.fyo.errorLog.map((e) => ({
          name: e.name,
          message: e.message,
        }))
    );
    assert.deepEqual(errors, [], 'no renderer exceptions on audited pages');
    assert.deepEqual(handled, [], 'no handled exceptions on audited pages');
    fs.writeFileSync(
      path.join(root, 'docs/user-guide/screenshots.json'),
      JSON.stringify(
        { version: '0.40.2', synthetic: true, screenshots: manifest },
        null,
        2
      ) + '\n'
    );
    console.log(
      JSON.stringify({
        result: 'pass',
        screenshots: manifest.length,
        temporaryProfile: run,
      })
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

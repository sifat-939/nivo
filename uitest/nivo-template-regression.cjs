const { _electron } = require('playwright');
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

(async () => {
  const root = path.resolve(__dirname, '..');
  const run = fs.mkdtempSync(
    path.join(os.tmpdir(), 'nivo-template-regression-')
  );
  const db = path.join(run, 'test.books.db');
  const profile = path.join(run, 'profile');
  fs.mkdirSync(profile);
  execFileSync(
    require('electron'),
    [
      '--require',
      'ts-node/register',
      '--require',
      'tsconfig-paths/register',
      'uitest/createNivoFixture.ts',
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
  fs.writeFileSync(
    path.join(profile, 'config.json'),
    JSON.stringify({
      lastSelectedFilePath: db,
      files: [
        {
          id: 'template-fixture',
          companyName: 'Test Company',
          dbPath: db,
          openCount: 1,
        },
      ],
    })
  );
  const app = await _electron.launch({
    executablePath: path.resolve(
      process.env.NIVO_APP_EXECUTABLE ||
        path.join(root, 'dist_electron/bundled/linux-unpacked/frappe-books')
    ),
    args: [`--user-data-dir=${profile}`],
    env: { ...process.env, IS_TEST: 'true', APPIMAGE_EXTRACT_AND_RUN: '1' },
    timeout: 60000,
  });
  try {
    const page = await app.firstWindow();
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route(/^https?:\/\//, (route) => route.abort());
    await page.getByTestId('company-name').waitFor();
    await page.locator('.nivo-dashboard-card').first().waitFor();
    await page.evaluate(() =>
      localStorage.setItem('lastRoute', '/template-builder/Business - Shipment')
    );
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].loadURL('app://./index.html')
    );
    const warning = page.getByText('No Display Entries Found', { exact: true });
    async function dismissSingleWarning() {
      await warning.first().waitFor();
      assert.equal(await warning.count(), 1, 'only one empty-entry warning');
      await page.getByRole('button', { name: 'Okay', exact: true }).click();
      await warning.waitFor({ state: 'hidden' });
      await page.waitForTimeout(200);
      assert.equal(await warning.count(), 0, 'no duplicate warning remains');
    }
    await dismissSingleWarning();
    await page.getByText('Dashboard', { exact: true }).first().click();
    await page.locator('.nivo-dashboard-card').first().waitFor();
    await page.goBack();
    await dismissSingleWarning();
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        checks: [
          'first kept-alive template entry: one warning',
          'reactivation: one warning',
          'no renderer errors',
        ],
        result: 'pass',
      })
    );
  } finally {
    await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

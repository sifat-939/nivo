// Windows CI startup check against the unpacked payload used by NSIS/portable.
// An isolated profile ensures this test never reads a real company database.
const { _electron } = require('playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nivo-windows-smoke-'));
  const errors = [];
  let app;
  try {
    app = await _electron.launch({
      executablePath: path.resolve(
        'dist_electron/bundled/win-unpacked/Nivo.exe'
      ),
      args: [`--user-data-dir=${profile}`],
      env: { ...process.env, IS_TEST: 'true' },
      timeout: 60000,
    });
    const page = await app.firstWindow();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.waitForSelector('[data-v-app]', { timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes('Nivo'));
    const text = await page.locator('body').innerText();
    if (!/New Company|Create Company|Existing Company/i.test(text)) {
      throw new Error('Company selector did not load in isolated profile');
    }
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Windows packaged company-selector smoke passed');
  } finally {
    if (app) await app.close();
    fs.rmSync(profile, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

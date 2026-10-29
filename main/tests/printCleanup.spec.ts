import test from 'tape';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import type { App } from 'electron';

// Only module initialization sees this mock; other native tests retain Electron.
const electronPath = require.resolve('electron');
const previousElectron = require.cache[electronPath];
const windows: PrintWindow[] = [];
let failure = '';
class PrintWindow {
  destroyed = false;
  webContents = {
    executeJavaScript: async () => {
      if (failure === 'assets') throw new Error('assets');
    },
    printToPDF: async () => {
      if (failure === 'pdf') throw new Error('pdf');
      return Buffer.from('PDF');
    },
    print: (_options: unknown, callback: (success: boolean) => void) => {
      if (failure === 'print') throw new Error('print');
      callback(false);
    },
  };
  constructor() {
    windows.push(this);
  }
  async loadFile(_file: string) {
    if (failure === 'load') throw new Error('load');
  }
  isDestroyed() {
    return this.destroyed;
  }
  destroy() {
    this.destroyed = true;
  }
}
require.cache[electronPath] = {
  exports: { BrowserWindow: PrintWindow },
} as NodeModule;
const { saveHtmlAsPdf } =
  require('../saveHtmlAsPdf') as typeof import('../saveHtmlAsPdf');
const { printHtmlDocument } =
  require('../printHtmlDocument') as typeof import('../printHtmlDocument');
if (previousElectron) require.cache[electronPath] = previousElectron;
else delete require.cache[electronPath];

test('native print jobs clean temporary HTML and windows on success and failure', async (t) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'nivo-print-test-'));
  const app = { getPath: () => temp } as unknown as App;
  try {
    for (const stage of ['load', 'assets', 'pdf', 'write', 'print']) {
      failure = stage;
      const destination =
        stage === 'write'
          ? path.join(temp, 'missing', 'out.pdf')
          : path.join(temp, 'out.pdf');
      try {
        if (stage === 'print')
          await printHtmlDocument('<p>Test</p>', app, 21, 29.7);
        else await saveHtmlAsPdf('<p>Test</p>', destination, app, 21, 29.7);
        t.fail(`${stage} should reject`);
      } catch {
        t.ok(
          windows.every((window) => window.destroyed),
          `${stage} closes hidden windows`
        );
        t.deepEqual(
          await fs.readdir(temp),
          [],
          `${stage} removes temporary HTML`
        );
      }
    }
    failure = '';
    t.equal(
      await printHtmlDocument('<p>Test</p>', app, 21, 29.7),
      false,
      'print cancellation returns false'
    );
    await Promise.all([
      saveHtmlAsPdf('first', path.join(temp, 'one.pdf'), app, 21, 29.7),
      saveHtmlAsPdf('second', path.join(temp, 'two.pdf'), app, 21, 29.7),
    ]);
    t.deepEqual(
      (await fs.readdir(temp)).sort(),
      ['one.pdf', 'two.pdf'],
      'concurrent jobs leave only their PDFs'
    );
    t.ok(
      windows.every((window) => window.destroyed),
      'successful and cancelled windows close'
    );
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
    t.end();
  }
});

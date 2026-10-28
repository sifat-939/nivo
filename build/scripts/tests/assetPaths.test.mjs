import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { removeBaseLeadingSlash } from '../assetPaths.mjs';

test('Rewrite app URLs without corrupting packaged PNG and font bytes', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nivo-assets-'));
  try {
    const nested = path.join(dir, 'assets');
    await fs.mkdir(nested);
    const binary = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0x80, 0, 0xfe,
    ]);
    for (const extension of ['png', 'woff2', 'ico']) {
      await fs.writeFile(path.join(nested, `asset.${extension}`), binary);
    }
    await fs.writeFile(
      path.join(dir, 'index.html'),
      '<script src="/app://assets/main.js"></script>'
    );
    await fs.writeFile(
      path.join(nested, 'main.js'),
      'const image = "/app://assets/logo.png";'
    );
    removeBaseLeadingSlash(dir, 'app://');
    for (const extension of ['png', 'woff2', 'ico']) {
      assert.deepEqual(
        await fs.readFile(path.join(nested, `asset.${extension}`)),
        binary
      );
    }
    assert.equal(
      await fs.readFile(path.join(dir, 'index.html'), 'utf8'),
      '<script src="app://assets/main.js"></script>'
    );
    assert.equal(
      await fs.readFile(path.join(nested, 'main.js'), 'utf8'),
      'const image = "app://assets/logo.png";'
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

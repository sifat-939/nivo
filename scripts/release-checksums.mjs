import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const folder = path.resolve(process.argv[2] || 'dist_electron/bundled');
const files = (await readdir(folder))
  .filter((name) => /\.(exe|AppImage)$/.test(name))
  .sort();
if (!files.length) throw new Error('No installers found');
const lines = await Promise.all(
  files.map(async (name) => {
    const hash = createHash('sha256')
      .update(await readFile(path.join(folder, name)))
      .digest('hex');
    return `${hash}  ${name}`;
  })
);
await writeFile(path.join(folder, 'SHA256SUMS.txt'), lines.join('\n') + '\n');
console.log(`Checksums written for ${files.length} installers`);

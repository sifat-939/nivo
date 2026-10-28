import test from 'tape';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { assertExistingDatabase, getDatabaseDirectory } from '../databaseFiles';

test('Existing company cannot silently become an empty database', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nivo-path-test-'));
  const db = path.join(dir, 'company.db');
  try {
    try {
      await assertExistingDatabase(db);
      t.fail('Missing file must fail');
    } catch (error) {
      t.equal((error as Error).message, 'DatabaseFileMissing');
    }
    t.equal(
      await fs.stat(db).then(
        () => true,
        () => false
      ),
      false,
      'No file created'
    );
    await fs.writeFile(db, '');
    try {
      await assertExistingDatabase(db);
      t.fail('Empty database must fail');
    } catch (error) {
      t.equal((error as Error).message, 'InvalidDatabaseFile');
    }
    await fs.writeFile(db, 'SQLite format 3\0');
    await assertExistingDatabase(db);
    t.equal(
      (await fs.readFile(db)).toString(),
      'SQLite format 3\0',
      'Existing bytes unchanged'
    );
    t.equal(
      getDatabaseDirectory('linux', '/home/test', '/config'),
      '/home/test/.local/share/nivo/data'
    );
    t.equal(
      getDatabaseDirectory('linux', '/home/test', '/config', '/data'),
      '/data/nivo/data'
    );
    t.equal(
      getDatabaseDirectory('darwin', '/home/test', '/config'),
      '/config/data'
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
    t.end();
  }
});

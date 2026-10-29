import test from 'tape';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import {
  assertExistingDatabase,
  getDatabaseDirectory,
  pathsReferToSameLocation,
} from '../databaseFiles';

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

test('company database path protection resolves symlink aliases', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nivo-symlink-test-'));
  const actualDir = path.join(dir, 'actual');
  const aliasDir = path.join(dir, 'alias');
  const database = path.join(actualDir, 'company.db');
  try {
    await fs.mkdir(actualDir);
    await fs.writeFile(database, 'company data');
    await fs.symlink(actualDir, aliasDir, 'dir');
    const hardLink = path.join(dir, 'export.pdf');
    await fs.link(database, hardLink);
    t.ok(
      await pathsReferToSameLocation(database, hardLink),
      'hard-link export alias matches the protected database'
    );
    const otherFile = path.join(actualDir, 'other.pdf');
    await fs.writeFile(otherFile, 'unrelated');
    t.notOk(
      await pathsReferToSameLocation(database, otherFile),
      'unrelated existing file is not treated as the database'
    );

    t.equal(
      await pathsReferToSameLocation(
        database,
        path.join(aliasDir, 'company.db')
      ),
      true,
      'existing symlink target matches the registered database'
    );
    t.equal(
      await pathsReferToSameLocation(
        path.join(actualDir, 'new-export.pdf'),
        path.join(aliasDir, 'new-export.pdf')
      ),
      true,
      'not-yet-created child matches through a symlinked parent'
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
    t.end();
  }
});

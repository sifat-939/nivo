import BetterSQLite3 from 'better-sqlite3';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import test from 'tape';
import DatabaseManager from '../manager';
import {
  createMigrationBackup,
  createUserBackup,
  createVerifiedSnapshot,
  createDailyBackupWithRetention,
  inspectDatabase,
  reserveMigrationBackupPath,
} from '../backup';

function getSnapshotValue(dbPath: string) {
  const db = BetterSQLite3(dbPath, { readonly: true });
  try {
    return (db.prepare('SELECT value FROM Snapshot').get() as { value: string })
      .value;
  } finally {
    db.close();
  }
}

test('database manager imports with the migration backup integration', (t) => {
  t.equal(
    typeof DatabaseManager.getDriver,
    'function',
    'driver accessor remains available'
  );
  t.equal(typeof DatabaseManager.call, 'function', 'manager methods load');
  t.end();
});

test('backup reservation is unique at an identical timestamp', (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nivo-backup-test-'));
  const dbPath = path.join(tempDir, 'company.books.db');
  const fixedTime = new Date('2026-10-28T12:34:56.789Z');

  try {
    const firstPath = reserveMigrationBackupPath(
      dbPath,
      '1.2.3',
      tempDir,
      fixedTime
    );
    const secondPath = reserveMigrationBackupPath(
      dbPath,
      '1.2.3',
      tempDir,
      fixedTime
    );

    t.notEqual(
      firstPath,
      secondPath,
      'exclusive reservation chooses a new suffix'
    );
    t.ok(fs.existsSync(firstPath), 'first reservation is retained');
    t.ok(fs.existsSync(secondPath), 'second reservation is created');
  } finally {
    fs.removeSync(tempDir);
  }
  t.end();
});

test('failed daily backup keeps snapshots that would otherwise be pruned', async (t) => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'nivo-daily-backup-test-')
  );
  const backupDir = path.join(tempDir, 'backups');
  const dbPath = path.join(tempDir, 'company.books.db');
  await fs.ensureDir(backupDir);
  try {
    for (let index = 0; index < 31; index++) {
      await fs.writeFile(
        path.join(backupDir, `company_daily_old-${index}.books.db`),
        'existing snapshot'
      );
    }
    let rejected = false;
    try {
      await createDailyBackupWithRetention(dbPath, backupDir);
    } catch {
      rejected = true;
    }
    const retained = (await fs.readdir(backupDir)).filter((name) =>
      name.startsWith('company_daily_')
    );
    t.equal(rejected, true, 'invalid source prevents the new backup');
    t.equal(retained.length, 31, 'existing snapshots remain intact');
  } finally {
    await fs.remove(tempDir);
    t.end();
  }
});

test('migration backups preserve prior same-day snapshots', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nivo-backup-test-'));
  const dbPath = path.join(tempDir, 'company.books.db');
  const source = BetterSQLite3(dbPath);

  try {
    source.exec('CREATE TABLE Snapshot (value TEXT NOT NULL)');
    source.prepare('INSERT INTO Snapshot (value) VALUES (?)').run('first');

    const firstBackup = await createMigrationBackup(dbPath, '1.2.3');
    source.prepare('UPDATE Snapshot SET value = ?').run('second');
    const secondBackup = await createMigrationBackup(dbPath, '1.2.3');

    t.notEqual(firstBackup, secondBackup, 'each backup uses a unique path');
    t.equal(
      getSnapshotValue(firstBackup),
      'first',
      'earlier snapshot is unchanged'
    );
    t.equal(
      getSnapshotValue(secondBackup),
      'second',
      'retry has current database state'
    );
  } finally {
    source.close();
    fs.removeSync(tempDir);
  }
});

test('concurrent migration backups reserve distinct paths', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nivo-backup-test-'));
  const dbPath = path.join(tempDir, 'company.books.db');
  const source = BetterSQLite3(dbPath);

  try {
    source.exec('CREATE TABLE Snapshot (value TEXT NOT NULL)');
    source.prepare('INSERT INTO Snapshot (value) VALUES (?)').run('state');

    const backupPaths = await Promise.all([
      createMigrationBackup(dbPath, '1.2.3'),
      createMigrationBackup(dbPath, '1.2.3'),
      createMigrationBackup(dbPath, '1.2.3'),
    ]);

    t.equal(new Set(backupPaths).size, 3, 'reservations are collision-safe');
    const completeBackups = backupPaths.filter(
      (backupPath) => fs.statSync(backupPath).size > 0
    );
    t.equal(
      completeBackups.length,
      3,
      'all concurrent backups contain database data'
    );
  } finally {
    source.close();
    fs.removeSync(tempDir);
  }
});

test('user backup is a verified SQLite snapshot and rejects invalid databases', async (t) => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'nivo-user-backup-test-')
  );
  const dbPath = path.join(tempDir, 'company.books.db');
  const backupDir = path.join(tempDir, 'external');
  const source = BetterSQLite3(dbPath);
  try {
    source.exec(
      'CREATE TABLE SingleValue (parent TEXT, fieldname TEXT, value TEXT); CREATE TABLE Snapshot (value TEXT NOT NULL);'
    );
    source.prepare('INSERT INTO Snapshot (value) VALUES (?)').run('verified');
    const backup = await createUserBackup(dbPath, backupDir);
    t.equal(
      getSnapshotValue(backup),
      'verified',
      'snapshot contains the current data'
    );
    t.deepEqual(
      await inspectDatabase(backup),
      { valid: true, integrity: ['ok'] },
      'integrity check passes'
    );
    const invalid = path.join(tempDir, 'invalid.db');
    fs.writeFileSync(invalid, 'not a database');
    let invalidRejected = false;
    try {
      await createUserBackup(invalid, backupDir);
    } catch (error) {
      invalidRejected = (error as Error).message === 'InvalidDatabaseFile';
    }
    t.ok(invalidRejected, 'rejects a non-SQLite file');
  } finally {
    source.close();
    fs.removeSync(tempDir);
  }
});

test('verified restore staging preserves a valid database snapshot', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nivo-restore-test-'));
  const sourcePath = path.join(tempDir, 'source.books.db');
  const targetPath = path.join(tempDir, 'target.restore.db');
  const source = BetterSQLite3(sourcePath);
  try {
    source.exec('CREATE TABLE Snapshot (value TEXT NOT NULL)');
    source.prepare('INSERT INTO Snapshot (value) VALUES (?)').run('restored');
    source.close();
    await createVerifiedSnapshot(sourcePath, targetPath);
    t.equal(
      getSnapshotValue(targetPath),
      'restored',
      'restore staging contains source rows'
    );
    t.ok(
      (await inspectDatabase(targetPath)).valid,
      'staged restore passes integrity check'
    );
    let duplicateRejected = false;
    try {
      await createVerifiedSnapshot(sourcePath, targetPath);
    } catch (error) {
      duplicateRejected =
        (error as Error).message === 'SnapshotDestinationExists';
    }
    t.ok(duplicateRejected, 'does not overwrite an existing staged path');
  } finally {
    fs.removeSync(tempDir);
  }
});

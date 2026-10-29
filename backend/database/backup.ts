import BetterSQLite3 from 'better-sqlite3';
import fs from 'fs-extra';
import path from 'path';
import { assertExistingDatabase } from '../../main/databaseFiles';

function getBackupFileName(dbPath: string, version: string, now: Date) {
  let fileName = path.parse(dbPath).name;
  if (fileName.endsWith('.books')) {
    fileName = fileName.slice(0, -6);
  }

  const date = now.toISOString().split('T')[0];
  const time = now.toISOString().split('T')[1].replace(/[:.]/g, '-');
  return `${fileName}_${version}_${date}_${time}`;
}

/**
 * Reserve a new path with exclusive creation so concurrent/retried backups can
 * never silently reuse an existing recovery snapshot.
 */
export function reserveMigrationBackupPath(
  dbPath: string,
  version: string,
  backupFolder: string,
  now: Date = new Date()
) {
  const baseName = getBackupFileName(dbPath, version, now);
  fs.ensureDirSync(backupFolder);

  for (let suffix = 0; ; suffix++) {
    const backupPath = path.join(
      backupFolder,
      `${baseName}_${suffix}.books.db`
    );
    let fd: number;
    try {
      fd = fs.openSync(backupPath, 'wx');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        continue;
      }
      throw error;
    }

    fs.closeSync(fd);
    return backupPath;
  }
}

export async function createMigrationBackup(dbPath: string, version: string) {
  const backupFolder = path.join(path.dirname(dbPath), 'backups');
  const backupPath = reserveMigrationBackupPath(dbPath, version, backupFolder);
  let db: BetterSQLite3.Database | undefined;
  let completed = false;

  try {
    db = BetterSQLite3(dbPath, { readonly: true });
    await db.backup(backupPath);
    completed = true;
    return backupPath;
  } finally {
    db?.close();
    if (!completed) {
      fs.removeSync(backupPath);
    }
  }
}

export async function createUserBackup(
  dbPath: string,
  destinationFolder: string,
  kind: 'manual' | 'daily' = 'manual'
) {
  await assertExistingDatabase(dbPath);
  await fs.ensureDir(destinationFolder);
  const backupPath = reserveMigrationBackupPath(
    dbPath,
    kind,
    destinationFolder
  );
  let db: BetterSQLite3.Database | undefined;
  let completed = false;
  try {
    db = BetterSQLite3(dbPath, { readonly: true, fileMustExist: true });
    await db.backup(backupPath);
    const verify = BetterSQLite3(backupPath, {
      readonly: true,
      fileMustExist: true,
    });
    try {
      const result = verify.pragma('integrity_check') as {
        integrity_check: string;
      }[];
      if (result.length !== 1 || result[0]?.integrity_check !== 'ok')
        throw new Error('BackupIntegrityFailed');
    } finally {
      verify.close();
    }
    completed = true;
    return backupPath;
  } finally {
    db?.close();
    if (!completed) fs.removeSync(backupPath);
  }
}

/** Create a verified daily snapshot before pruning older snapshots. */
export async function createDailyBackupWithRetention(
  dbPath: string,
  destinationFolder: string,
  maxBackups = 30
) {
  const backupPath = await createUserBackup(dbPath, destinationFolder, 'daily');
  const prefix = `${path.parse(dbPath).name.replace(/\.books$/, '')}_daily_`;
  const backups = await Promise.all(
    (
      await fs.readdir(destinationFolder)
    )
      .filter((name) => name.startsWith(prefix) && name.endsWith('.books.db'))
      .map(async (name) => ({
        name,
        mtime: (await fs.stat(path.join(destinationFolder, name))).mtimeMs,
      }))
  );
  backups.sort((a, b) => b.mtime - a.mtime);
  for (const stale of backups.slice(Math.max(0, maxBackups))) {
    await fs.remove(path.join(destinationFolder, stale.name));
  }
  return backupPath;
}

/** Create an exact-path, WAL-aware snapshot for a staged restore replacement. */
export async function createVerifiedSnapshot(
  sourcePath: string,
  destinationPath: string
) {
  await assertExistingDatabase(sourcePath);
  if (await fs.pathExists(destinationPath))
    throw new Error('SnapshotDestinationExists');
  let source: BetterSQLite3.Database | undefined;
  let complete = false;
  try {
    source = BetterSQLite3(sourcePath, { readonly: true, fileMustExist: true });
    await source.backup(destinationPath);
    const result = await inspectDatabase(destinationPath);
    if (!result.valid) throw new Error('BackupIntegrityFailed');
    complete = true;
  } finally {
    source?.close();
    if (!complete) await fs.remove(destinationPath);
  }
}

export async function inspectDatabase(dbPath: string) {
  await assertExistingDatabase(dbPath);
  const db = BetterSQLite3(dbPath, { readonly: true, fileMustExist: true });
  try {
    const rows = db.pragma('integrity_check') as { integrity_check: string }[];
    const integrity = rows.map((row) => row.integrity_check);
    return {
      valid: integrity.length === 1 && integrity[0] === 'ok',
      integrity,
    };
  } finally {
    db.close();
  }
}

export async function getDatabaseCompanyName(dbPath: string) {
  return (await getDatabaseIdentity(dbPath)).companyName;
}

export async function getDatabaseIdentity(dbPath: string) {
  await assertExistingDatabase(dbPath);
  const db = BetterSQLite3(dbPath, { readonly: true, fileMustExist: true });
  try {
    const row = db
      .prepare(
        "SELECT value FROM SingleValue WHERE parent = 'AccountingSettings' AND fieldname = 'companyName' LIMIT 1"
      )
      .get() as { value?: string } | undefined;
    const country = db
      .prepare(
        "SELECT value FROM SingleValue WHERE parent = 'SystemSettings' AND fieldname = 'countryCode' LIMIT 1"
      )
      .get() as { value?: string } | undefined;
    return {
      companyName: row?.value?.trim() || null,
      countryCode: country?.value?.trim() || null,
    };
  } finally {
    db.close();
  }
}

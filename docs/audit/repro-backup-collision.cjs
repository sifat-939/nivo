// Checks the fixed app backup helper; uses only disposable SQLite databases.
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'commonjs' },
});
require('tsconfig-paths/register');
const { createMigrationBackup } = require('../../backend/database/backup');
const Database = require('better-sqlite3');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert/strict');
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nivo-backup-fixed-'));
  const dbPath = path.join(dir, 'company.db');
  const db = new Database(dbPath);
  try {
    db.exec(
      "create table sentinel(value text); insert into sentinel values ('original')"
    );
    const first = await createMigrationBackup(dbPath, '0.37.0');
    db.prepare('update sentinel set value=?').run('later');
    const second = await createMigrationBackup(dbPath, '0.37.0');
    assert.notEqual(first, second);
    const old = new Database(first, { readonly: true });
    try {
      assert.equal(
        old.prepare('select value from sentinel').get().value,
        'original'
      );
    } finally {
      old.close();
    }
    console.log(
      'Backup retry uses a distinct path; original recovery snapshot is preserved'
    );
  } finally {
    db.close();
    fs.rmSync(dir, { recursive: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

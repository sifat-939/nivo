import test from 'tape';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { assertSafeNewDatabaseTarget, publishDatabaseNoClobber, sha256RawJson } from '../karbarImportSafety';

test('Karbar importer refuses pre-existing targets before DB_CREATE can unlink them', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'karbar-safety-'));
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  const target = path.join(root, 'existing.db');
  fs.writeFileSync(target, 'keep');
  t.throws(() => assertSafeNewDatabaseTarget(target, repo), /Refusing to overwrite/);
  t.equal(fs.readFileSync(target, 'utf8'), 'keep', 'existing bytes are preserved');

  const brokenLink = path.join(root, 'broken.db');
  fs.symlinkSync(path.join(root, 'not-created.db'), brokenLink);
  t.throws(() => assertSafeNewDatabaseTarget(brokenLink, repo), /Refusing to overwrite/,
    'broken symlinks are filesystem entries and are refused');
  t.end();
  fs.rmSync(root, { recursive: true, force: true });
});

test('Karbar importer rejects repository targets through real paths and symlinked parents', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'karbar-safety-'));
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  t.throws(() => assertSafeNewDatabaseTarget(path.join(repo, 'company.db'), repo), /inside the source repository/);

  const repoAlias = path.join(root, 'repo-alias');
  fs.symlinkSync(repo, repoAlias, 'dir');
  t.throws(() => assertSafeNewDatabaseTarget(path.join(repoAlias, 'company.db'), repo), /inside the source repository/,
    'a symlinked parent cannot bypass the repository boundary');

  const safe = path.join(root, 'outside', 'company.db');
  t.equal(assertSafeNewDatabaseTarget(safe, repo), safe, 'a new path outside the repository is accepted');
  t.end();
  fs.rmSync(root, { recursive: true, force: true });
});

test('Karbar archive-record hash is SHA-256 of its own rawJson UTF-8 bytes', (t) => {
  const rawJson = '{"file":"report.xlsx","bytes":3,"sha256":"file-hash"}';
  t.equal(sha256RawJson(rawJson), 'e9c838b23df0bb2a14480755625d693d261155f36a27e9c157a9bf90ff613eb0',
    'raw record hash is deterministic and independent from the archived file BLOB hash');
  t.notEqual(sha256RawJson(rawJson), 'file-hash', 'record hash cannot be confused with the BLOB hash');
  t.end();
});

test('Karbar staging publication cannot overwrite a destination created during import', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'karbar-publish-race-'));
  const stagingDirectory = fs.mkdtempSync(path.join(root, '.nivo-karbar-import-'));
  const staged = path.join(stagingDirectory, 'import.db');
  const target = path.join(root, 'company.db');
  fs.writeFileSync(staged, 'completed imported database');

  // Simulate another process winning the target while the import is running.
  fs.writeFileSync(target, 'concurrent user data');
  t.throws(() => publishDatabaseNoClobber(staged, target), /EEXIST|already exists/);
  t.equal(fs.readFileSync(target, 'utf8'), 'concurrent user data', 'concurrent destination bytes remain unchanged');
  t.equal(fs.readFileSync(staged, 'utf8'), 'completed imported database', 'staged result remains available for diagnosis');
  t.end();
  fs.rmSync(root, { recursive: true, force: true });
});

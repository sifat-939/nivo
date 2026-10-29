import { promises as fs } from 'fs';
import path from 'path';

export function getDatabaseDirectory(
  platform: string,
  home: string,
  userData: string,
  dataHome?: string
) {
  return platform === 'linux'
    ? path.join(dataHome || path.join(home, '.local', 'share'), 'nivo', 'data')
    : path.join(userData, 'data');
}

// SQLite normally creates a missing file. Opening an existing company must not.
export async function assertExistingDatabase(dbPath: string) {
  let file;
  try {
    file = await fs.open(dbPath, 'r');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('DatabaseFileMissing');
    }
    throw error;
  }

  try {
    const header = Buffer.alloc(16);
    const { bytesRead } = await file.read(header, 0, header.length, 0);
    if (bytesRead !== 16 || header.toString() !== 'SQLite format 3\0') {
      throw new Error('InvalidDatabaseFile');
    }
  } finally {
    await file.close();
  }
}

/** Resolve symlink aliases, including paths not created yet under symlinked parents. */
export async function pathsReferToSameLocation(
  firstPath: string,
  secondPath: string
): Promise<boolean> {
  const [first, second] = await Promise.all([
    canonicalizePath(firstPath),
    canonicalizePath(secondPath),
  ]);
  const samePath =
    process.platform === 'win32'
      ? first.toLowerCase() === second.toLowerCase()
      : first === second;
  if (samePath) return true;

  // Existing hard links also share the database contents even without a
  // shared canonical pathname. Never approve an export onto that same file.
  const [firstStat, secondStat] = await Promise.all([
    fs.stat(first).catch(() => undefined),
    fs.stat(second).catch(() => undefined),
  ]);
  return !!(
    firstStat &&
    secondStat &&
    firstStat.ino !== 0 &&
    firstStat.dev === secondStat.dev &&
    firstStat.ino === secondStat.ino
  );
}

async function canonicalizePath(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath);
  try {
    return await fs.realpath(resolved);
  } catch {
    const parent = await fs
      .realpath(path.dirname(resolved))
      .catch(() => path.dirname(resolved));
    return path.join(parent, path.basename(resolved));
  }
}

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

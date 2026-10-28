import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/** Resolve a path through its nearest existing ancestor, including symlinks. */
export function resolveWithRealParent(candidate: string): string {
  let parent = path.resolve(candidate);
  const remainder: string[] = [];
  while (true) {
    try {
      fs.lstatSync(parent);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const next = path.dirname(parent);
      if (next === parent) throw new Error(`Cannot resolve target parent path: ${candidate}`);
      remainder.unshift(path.basename(parent));
      parent = next;
    }
  }
  return path.resolve(fs.realpathSync(parent), ...remainder);
}

/** Fail closed before setupInstance, whose DB_CREATE path unlinks its argument. */
export function assertSafeNewDatabaseTarget(candidate: string, repositoryRoot: string, protectedPaths: string[] = []): string {
  if (!candidate) throw new Error('A new company database target is required.');
  const target = path.resolve(candidate);
  try {
    fs.lstatSync(target);
    throw new Error(`Refusing to overwrite existing company database or filesystem entry: ${target}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  const canonicalTarget = resolveWithRealParent(target);
  const canonicalRepository = fs.realpathSync(repositoryRoot);
  if (canonicalTarget === canonicalRepository || canonicalTarget.startsWith(canonicalRepository + path.sep)) {
    throw new Error(`Refusing to create company database inside the source repository: ${target}`);
  }
  const canonicalProtected = protectedPaths.map(resolveWithRealParent);
  if (canonicalProtected.includes(canonicalTarget)) {
    throw new Error(`Refusing to target a protected Nivo company database: ${target}`);
  }
  return target;
}

export function sha256RawJson(rawJson: string): string {
  return crypto.createHash('sha256').update(Buffer.from(rawJson, 'utf8')).digest('hex');
}

/** Atomically publish a completed staging database without replacing any entry. */
export function publishDatabaseNoClobber(stagedDatabasePath: string, targetPath: string): void {
  const staged = fs.lstatSync(stagedDatabasePath);
  if (!staged.isFile()) throw new Error(`Staged database is not a regular file: ${stagedDatabasePath}`);
  // Hard-link creation is atomic and fails with EEXIST if another process has
  // created the destination since validation. Staging is under the final parent,
  // so both paths are on the same filesystem.
  fs.linkSync(stagedDatabasePath, targetPath);
}

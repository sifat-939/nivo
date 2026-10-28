import path from 'path';

/** Resolve renderer assets or known Vue routes without escaping the app root. */
export function resolveAppProtocolPath(
  root: string,
  value: string
): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== 'app:' || url.username || url.password) return;
    const host = decodeURIComponent(url.host);
    const pathname = decodeURIComponent(url.pathname);
    const parts = `${host === '.' ? '' : host}/${pathname}`
      .replace(/\\/g, '/')
      .split('/')
      .filter(Boolean);
    if (parts.includes('..') || parts.some((part) => part.includes('\0')))
      return;
    const route = '/' + parts.join('/');
    if (
      /^\/(?:edit|list|report|report-print|print|template-builder)\//.test(
        route
      ) ||
      /^\/(?:settings|bank-cash|chart-of-accounts|import-wizard|customize-form|pos|get-started|data-tools)?\/?$/.test(
        route
      )
    )
      return path.join(root, 'index.html');
    const candidate = path.resolve(root, ...parts);
    const relative = path.relative(path.resolve(root), candidate);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return;
    return candidate;
  } catch {
    return;
  }
}

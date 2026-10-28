import { isPesa } from 'fyo/utils';
import { RenderData } from 'fyo/model/types';

type StatusRender = (row: RenderData) => {
  metadata?: { status?: unknown };
};

export type FilteredPage<T> = {
  count: number;
  start: number;
  rows: T[];
};

export async function scanFilteredPage<T>(
  fetchChunk: (offset: number, limit: number) => Promise<T[]>,
  matches: (row: T) => boolean,
  start: number,
  end: number,
  chunkSize = 250
): Promise<FilteredPage<T>> {
  const pageSize = Math.max(1, end - start);

  async function scan(pageStart: number): Promise<FilteredPage<T>> {
    const pageEnd = pageStart + pageSize;
    const rows: T[] = [];
    let count = 0;
    let offset = 0;

    while (true) {
      const chunk = await fetchChunk(offset, chunkSize);
      if (!chunk.length) {
        break;
      }

      for (const row of chunk) {
        if (!matches(row)) {
          continue;
        }

        if (count >= pageStart && count < pageEnd) {
          rows.push(row);
        }
        count += 1;
      }

      offset += chunk.length;
      if (chunk.length < chunkSize) {
        break;
      }
    }

    return { count, start: pageStart, rows };
  }

  const result = await scan(start);
  const lastPageStart =
    result.count === 0
      ? 0
      : Math.floor((result.count - 1) / pageSize) * pageSize;
  if (start <= lastPageStart) {
    return result;
  }

  return await scan(lastPageStart);
}

export function mergeListViewFilters<T extends Record<string, unknown>>(
  baseFilters: T,
  appliedFilters: Record<string, unknown>
): T & Record<string, unknown> {
  return { ...baseFilters, ...appliedFilters };
}

export function filterRowsByRenderedStatus(
  rows: RenderData[],
  renderStatus: StatusRender | undefined,
  requestedStatus: unknown
): RenderData[] {
  if (!renderStatus || requestedStatus == null || requestedStatus === '') {
    return rows;
  }

  return rows.filter((row) =>
    matchesRenderedStatus(row, renderStatus, requestedStatus)
  );
}

export function matchesRenderedStatus(
  row: RenderData,
  renderStatus: StatusRender | undefined,
  requestedStatus: unknown
): boolean {
  if (!renderStatus || requestedStatus == null || requestedStatus === '') {
    return true;
  }

  const status = renderStatus(row)?.metadata?.status;
  return (
    status != null &&
    String(status).toLowerCase() === String(requestedStatus).toLowerCase()
  );
}

export function hasPositiveOutstandingAmount(value: unknown): boolean {
  if (isPesa(value)) {
    return value.isPositive();
  }

  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount > 0;
}

export function sanitizeVisibleColumns(
  defaultIds: string[],
  savedIds: unknown
): string[] {
  const available = new Set(defaultIds);
  const visible: string[] = [];
  if (Array.isArray(savedIds)) {
    for (const id of savedIds) {
      if (
        typeof id === 'string' &&
        id !== 'name' &&
        available.has(id) &&
        !visible.includes(id)
      ) {
        visible.push(id);
      }
    }
  }
  return defaultIds.includes('name') ? ['name', ...visible] : visible;
}

export function formatGroupedQuantities(
  quantities: Record<string, number>
): string {
  return Object.entries(quantities)
    .map(([unit, quantity]) => `${quantity} ${unit}`)
    .join(', ');
}

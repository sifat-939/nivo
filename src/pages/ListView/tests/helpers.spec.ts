import test from 'tape';
import { getTestFyo } from 'tests/helpers';
import {
  filterRowsByRenderedStatus,
  hasPositiveOutstandingAmount,
  mergeListViewFilters,
  scanFilteredPage,
} from '../helpers';

const fyo = getTestFyo();

test('positive outstanding check accepts hydrated Money and stored values', (t) => {
  t.equal(
    hasPositiveOutstandingAmount(fyo.pesa(125)),
    true,
    'accepts an already hydrated Money value without wrapping it again'
  );
  t.equal(hasPositiveOutstandingAmount('125'), true, 'accepts stored amounts');
  t.equal(hasPositiveOutstandingAmount(fyo.pesa(0)), false, 'rejects zero');
  t.equal(hasPositiveOutstandingAmount(-1), false, 'rejects negative amounts');
  t.equal(
    hasPositiveOutstandingAmount('invalid'),
    false,
    'rejects invalid amounts'
  );
  t.end();
});

test('rendered status filtering evaluates every row without mounted cells', (t) => {
  const rows = [
    { name: 'draft-1', state: 'Draft' },
    { name: 'draft-2', state: 'Draft' },
    { name: 'posted', state: 'Submitted' },
  ] as any;
  const filtered = filterRowsByRenderedStatus(
    rows,
    (row) => ({
      template: '',
      metadata: { status: row.state as string },
    }),
    'draft'
  );

  t.deepEqual(
    filtered.map((row) => row.name),
    ['draft-1', 'draft-2'],
    'matches rows on all pages and ignores requested-status casing'
  );
  t.end();
});

test('applied ListView filters persist alongside route filters', (t) => {
  const filters = mergeListViewFilters(
    { company: 'Company A', name: ['like', 'SI-%'] },
    { status: ['like', 'Submitted'] }
  );
  t.deepEqual(
    filters,
    {
      company: 'Company A',
      name: ['like', 'SI-%'],
      status: ['like', 'Submitted'],
    },
    'page loads can rebuild the query from route and applied filters'
  );
  t.end();
});

test('derived-filter paging scans bounded chunks and clamps deleted last pages', async (t) => {
  const candidates = Array.from({ length: 620 }, (_, index) => ({
    name: `row-${index}`,
    matches: index % 4 === 0,
  }));
  let largestChunk = 0;
  let calls = 0;
  const fetchChunk = async (offset: number, limit: number) => {
    largestChunk = Math.max(largestChunk, limit);
    calls += 1;
    return candidates.slice(offset, offset + limit);
  };

  const page = await scanFilteredPage(
    fetchChunk,
    (row) => row.matches,
    100,
    125,
    100
  );
  t.equal(page.count, 155, 'counts matches across every candidate chunk');
  t.equal(page.start, 100, 'keeps a valid requested page');
  t.deepEqual(
    page.rows.map((row) => row.name),
    Array.from({ length: 25 }, (_, index) => `row-${(index + 100) * 4}`),
    'returns only the requested page of derived-filter matches'
  );
  t.equal(largestChunk, 100, 'never requests more than the configured chunk');
  const clamped = await scanFilteredPage(
    fetchChunk,
    (row) => row.matches,
    200,
    225,
    100
  );
  t.equal(clamped.start, 150, 'moves a stale page to the last valid page');
  t.deepEqual(
    clamped.rows.map((row) => row.name),
    ['row-600', 'row-604', 'row-608', 'row-612', 'row-616']
  );
  t.ok(calls > 14, 'rescans in chunks when clamping is needed');
  const empty = await scanFilteredPage(fetchChunk, () => false, 50, 100, 100);
  t.deepEqual(
    empty,
    { count: 0, start: 0, rows: [] },
    'empty filter resets to first page'
  );
  t.end();
});

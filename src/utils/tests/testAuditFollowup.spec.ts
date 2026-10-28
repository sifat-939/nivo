import test from 'tape';
import { Item } from 'models/baseModels/Item/Item';
import { ItemGroup } from 'models/baseModels/ItemGroup/ItemGroup';
import { parseListRouteFilters } from '../filters';

test('item and item group lists omit tax-only columns', (t) => {
  t.deepEqual(Item.getListViewSettings().columns, ['name', 'unit', 'rate']);
  t.deepEqual(ItemGroup.getListViewSettings().columns, ['name']);
  t.end();
});

test('malformed saved list links fail closed without crashing navigation', (t) => {
  for (const value of ['{broken', 'null', '[]', '"text"'])
    t.deepEqual(parseListRouteFilters(value), {});
  t.deepEqual(parseListRouteFilters('{"role":"Customer"}'), {
    role: 'Customer',
  });
  t.deepEqual(parseListRouteFilters('{"__proto__":{"polluted":true}}'), {});
  t.end();
});

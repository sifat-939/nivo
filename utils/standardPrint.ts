/** One company-independent design; signatures and payment images belong in PrintSettings. */
export const STANDARD_PRINT_NAME = 'Nivo Standard';
export const STANDARD_PRINT_TYPE = 'All';
export const printableTypes = [
  'SalesInvoice',
  'PurchaseInvoice',
  'SalesQuote',
  'Payment',
  'JournalEntry',
  'Shipment',
  'PurchaseReceipt',
  'StockMovement',
  'Party',
];
export function printTemplateFilter(schemaName: string) {
  return { type: ['in', [schemaName, STANDARD_PRINT_TYPE]] };
}
export function printPreviewType(type?: string) {
  return type === STANDARD_PRINT_TYPE ? 'SalesInvoice' : type || 'SalesInvoice';
}

export type StatementEntry = {
  name: string;
  date: Date | string;
  account: string;
  debit: unknown;
  credit: unknown;
  referenceType: string;
  referenceName: string;
  reverted?: boolean | number;
  reverts?: string | null;
};
function amount(value: unknown): number {
  if (value && typeof value === 'object' && 'float' in value)
    return Number((value as { float: number }).float);
  return Number(value || 0);
}
export function dateKey(value: Date | string) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(value.getDate()).padStart(2, '0')}`;
  }
  return value.slice(0, 10);
}
/** Control accounts only: never double-count the income/cash leg of a posting. */
export function buildStatement(
  entries: StatementEntry[],
  controlAccounts: Set<string>,
  from = '',
  to = ''
) {
  if (from && to && from > to)
    throw new Error('From Date must be on or before To Date.');
  const ordered = entries
    .filter((e) => controlAccounts.has(e.account) && !e.reverted && !e.reverts)
    .sort(
      (a, b) =>
        new Date(a.date).valueOf() - new Date(b.date).valueOf() ||
        String(a.name).localeCompare(String(b.name), undefined, {
          numeric: true,
        })
    );
  let opening = 0;
  let balance = 0;
  let debit = 0;
  let credit = 0;
  const rows = [];
  for (const entry of ordered) {
    const day = dateKey(entry.date);
    if (to && day > to) continue;
    const d = amount(entry.debit),
      c = amount(entry.credit);
    balance += d - c;
    if (from && day < from) {
      opening = balance;
      continue;
    }
    debit += d;
    credit += c;
    rows.push({ ...entry, day, debit: d, credit: c, balance });
  }
  return { opening, closing: balance, debit, credit, rows };
}

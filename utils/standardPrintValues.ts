import type { Doc } from 'fyo/model/doc';
import type { Money } from 'pesa';
import { buildStatement, dateKey, StatementEntry } from './standardPrint';

type PrintRow = Record<string, string | number | undefined>;
type PrintTotal = {
  label: string;
  value: string | undefined;
  emphasis?: boolean;
};
interface Values extends Record<string, unknown> {
  links?: { party?: { links?: { address?: { addressDisplay?: string } } } };
  items?: PrintRow[];
  for?: PrintRow[];
  accounts?: PrintRow[];
  printRows?: PrintRow[];
  printTotals?: PrintTotal[];
  party?: string;
  paymentMethod?: string;
  netTotal?: string;
  totalDiscount?: string;
  grandTotal?: string;
  amount?: string;
  amountPaid?: string;
  writeoff?: string;
  debit?: string;
  credit?: string;
}
const column = (key: string, label: string, align = 'left', width = '') => ({
  key,
  label,
  align,
  width,
});
function quantityLabel(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 8 }).format(
        number
      )
    : String(value || '');
}
const printMoney = (value: string) => value.replace(/৳\s*/g, 'Tk. ');
const num = (v: unknown) =>
  v && typeof v === 'object' && 'float' in v
    ? (v as Money).float
    : Number(v || 0);
export function printDate(value: Date | string) {
  const key = dateKey(value);
  const date = new Date(key + 'T00:00:00');
  return Number.isNaN(date.valueOf())
    ? key
    : date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}
export async function addStandardDocumentValues(doc: Doc, values: Values) {
  const money = (value: number) =>
    printMoney(
      doc.fyo.format(
        doc.fyo.pesa(value),
        doc.schema.fields.find((f) => f.fieldname === 'grandTotal') ||
          'Currency',
        doc
      )
    );
  const schema = doc.schemaName;
  const invoice = ['SalesInvoice', 'PurchaseInvoice'].includes(schema);
  values.printTitle =
    (
      {
        SalesInvoice: 'Sales Details',
        PurchaseInvoice: 'Purchase Details',
        SalesQuote: 'Quotation',
        Payment: 'Payment Receipt',
      } as Record<string, string>
    )[schema] || doc.schema.label;
  if (schema === 'Payment' && doc.paymentType === 'Pay')
    values.printTitle = 'Payment Voucher';
  values.printStatus = doc.isCancelled
    ? 'CANCELLED'
    : doc.schema.isSubmittable && !doc.submitted
    ? 'DRAFT'
    : '';
  values.numberLabel = invoice ? 'Invoice No' : 'Reference';
  values.dateLabel = invoice ? 'Invoice Date' : 'Date';
  for (const key of [
    'netTotal',
    'totalDiscount',
    'grandTotal',
    'amount',
    'amountPaid',
    'writeoff',
    'debit',
    'credit',
  ]) {
    if (typeof values[key] === 'string')
      values[key] = printMoney(values[key] as string);
  }
  values.date = doc.date ? printDate(doc.date as Date | string) : '';
  values.partyAddress =
    values.links?.party?.links?.address?.addressDisplay || '';
  values.showPaymentQR =
    schema === 'SalesInvoice' &&
    !doc.returnAgainst &&
    !!doc.submitted &&
    !doc.isCancelled;
  values.printColumns = [
    column('index', 'S.N.', 'center', '7%'),
    column('item', 'Name', 'left', '33%'),
    column('quantity', 'Qty', 'right', '18%'),
    column('rate', 'Rate', 'right', '19%'),
    column('amount', 'Amount', 'right', '23%'),
  ];
  const sourceRows = Array.isArray(doc.items) ? (doc.items as Doc[]) : [];
  values.printRows = (values.items || []).map((row: PrintRow, i: number) => ({
    ...row,
    rate: row.rate ? printMoney(String(row.rate)) : '',
    amount: row.amount ? printMoney(String(row.amount)) : '',
    index: i + 1,
    quantity: `${quantityLabel(
      sourceRows[i]?.quantity ?? row.quantity ?? row.qty ?? ''
    )}${
      row.unit
        ? ' ' + String(row.unit)
        : row.transferUnit
        ? ' ' + String(row.transferUnit)
        : ''
    }`,
  }));
  values.printTotals = [];
  if (values.netTotal)
    values.printTotals.push({ label: 'Sub Total', value: values.netTotal });
  if (values.totalDiscount)
    values.printTotals.push({ label: 'Discount', value: values.totalDiscount });
  if (values.grandTotal)
    values.printTotals.push({
      label: 'Total Amount',
      value: values.grandTotal,
    });
  if (invoice && doc.submitted && !doc.isCancelled) {
    const total = num(doc.baseGrandTotal ?? doc.grandTotal);
    const due = num(doc.outstandingAmount);
    const rate = num(doc.exchangeRate) || 1;
    const allocations = await doc.fyo.db.getAllRaw('PaymentFor', {
      fields: ['parent', 'amount'],
      filters: { referenceType: schema, referenceName: doc.name! },
    });
    let received = 0;
    for (const row of allocations) {
      const payment = await doc.fyo.doc.getDoc('Payment', String(row.parent));
      if (!payment.submitted || payment.cancelled) continue;
      const paidRatio = num(payment.amount)
        ? num(payment.amountPaid ?? payment.amount) / num(payment.amount)
        : 0;
      received += num(row.amount) * paidRatio;
    }
    const settled = Math.abs(total) - Math.abs(due);
    const adjustment = settled - received;
    values.balanceLabel = `${money(Math.abs(due) / rate)} (${
      (schema === 'SalesInvoice') !== !!doc.returnAgainst
        ? 'To Receive'
        : 'To Pay'
    })`;
    values.paymentMode =
      Math.abs(due) < 0.005
        ? Math.abs(adjustment) >= 0.005
          ? 'Settled'
          : 'Paid'
        : Math.abs(adjustment) >= 0.005
        ? received > 0
          ? 'Part Paid / Adjusted'
          : 'Adjusted'
        : received > 0
        ? 'Part Paid'
        : 'Credit';
    values.printTotals.push({
      label:
        schema === 'SalesInvoice' && !doc.returnAgainst
          ? 'Received Amount'
          : 'Paid Amount',
      value: money(received / rate),
    });
    if (Math.abs(adjustment) >= 0.005)
      values.printTotals.push({
        label: 'Settled / Adjusted',
        value: money(adjustment / rate),
      });
    values.printTotals.push({
      label: doc.returnAgainst ? 'Refund Due' : 'Amount Due',
      value: money(Math.abs(due) / rate),
      emphasis: true,
    });
  }
  if (schema === 'Payment') {
    values.paymentMode = values.paymentMethod;
    values.printColumns = [
      column('index', 'S.N.', 'center', '8%'),
      column('referenceType', 'Type', 'left', '27%'),
      column('referenceName', 'Reference', 'left', '35%'),
      column('amount', 'Allocated', 'right', '30%'),
    ];
    values.printRows = (values.for || []).map((r: PrintRow, i: number) => ({
      ...r,
      index: i + 1,
    }));
    if (!values.printRows.length)
      values.printRows = [
        {
          index: 1,
          referenceType: 'Unallocated',
          referenceName: values.party,
          amount: values.amount,
        },
      ];
    values.printTotals = [
      { label: 'Payment Amount', value: values.amount },
      {
        label: 'Amount Paid',
        value: values.amountPaid || values.amount,
        emphasis: true,
      },
    ];
    if (values.writeoff && num(doc.writeoff))
      values.printTotals.splice(1, 0, {
        label: 'Write-off',
        value: values.writeoff,
      });
  } else if (
    ['Shipment', 'PurchaseReceipt', 'StockMovement'].includes(schema)
  ) {
    values.printColumns = [
      column('index', 'S.N.', 'center', '8%'),
      column('item', 'Name', 'left', '62%'),
      column('quantity', 'Qty', 'right', '30%'),
    ];
    values.printTotals = [];
  } else if (schema === 'JournalEntry') {
    values.printColumns = [
      column('index', 'S.N.', 'center', '7%'),
      column('account', 'Account', 'left', '33%'),
      column('party', 'Party', 'left', '24%'),
      column('debit', 'Debit', 'right', '18%'),
      column('credit', 'Credit', 'right', '18%'),
    ];
    values.printRows = (values.accounts || []).map(
      (r: PrintRow, i: number) => ({
        ...r,
        index: i + 1,
      })
    );
    values.printTotals = [
      { label: 'Total Debit', value: values.debit },
      { label: 'Total Credit', value: values.credit },
    ];
  }
  return values;
}

export async function getStatementValues(
  party: Doc,
  from = '',
  to = dateKey(new Date())
) {
  const fyo = party.fyo;
  const accounts = await fyo.db.getAllRaw('Account', {
    fields: ['name'],
    filters: { accountType: ['in', ['Receivable', 'Payable']] },
  });
  const entries = await fyo.db.getAll('AccountingLedgerEntry', {
    fields: [
      'name',
      'date',
      'account',
      'debit',
      'credit',
      'referenceType',
      'referenceName',
      'reverted',
      'reverts',
    ],
    filters: { party: party.name! },
    orderBy: 'date',
    order: 'asc',
  });
  const result = buildStatement(
    entries as unknown as StatementEntry[],
    new Set(accounts.map((a) => String(a.name))),
    from,
    to
  );
  const money = (v: number) => printMoney(fyo.format(fyo.pesa(v), 'Currency'));
  const balance = (v: number) =>
    `${money(Math.abs(v))}${
      v > 0.004 ? ' (To Receive)' : v < -0.004 ? ' (To Pay)' : ' (Settled)'
    }`;
  let address = '';
  if (party.address) {
    const doc = await fyo.doc.getDoc('Address', String(party.address));
    address = String(doc.addressDisplay || '');
  }
  return {
    name: party.name,
    party: party.name,
    partyAddress: address,
    printTitle: 'Account Statement',
    isStatement: true,
    fromDate: from ? printDate(from) : '',
    toDate: printDate(to),
    currency: fyo.singles.SystemSettings?.currency,
    balanceLabel: balance(result.closing),
    showPaymentQR: party.role !== 'Supplier' && result.closing > 0,
    printColumns: [
      column('index', 'S.N.', 'center', '6%'),
      column('date', 'Date', 'left', '15%'),
      column('reference', 'Reference', 'left', '27%'),
      column('debit', 'Debit', 'right', '16%'),
      column('credit', 'Credit', 'right', '16%'),
      column('balance', 'Balance', 'right', '20%'),
    ],
    printRows: [
      {
        index: '',
        date: from ? printDate(from) : '',
        reference: 'Opening Balance',
        debit: '',
        credit: '',
        balance: balance(result.opening),
      },
      ...result.rows.map((r, i) => ({
        index: i + 1,
        date: printDate(r.day),
        reference: `${
          fyo.schemaMap[r.referenceType]?.label || r.referenceType
        } ${r.referenceName}`,
        debit: r.debit ? money(r.debit) : '',
        credit: r.credit ? money(r.credit) : '',
        balance: balance(r.balance),
      })),
    ],
    printTotals: [
      { label: 'Opening Balance', value: balance(result.opening) },
      { label: 'Total Debit', value: money(result.debit) },
      { label: 'Total Credit', value: money(result.credit) },
      {
        label: 'Closing Balance',
        value: balance(result.closing),
        emphasis: true,
      },
    ],
    closingAmount: Math.abs(result.closing),
  };
}

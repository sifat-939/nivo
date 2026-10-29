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
  printNote?: string;
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
  if (doc.returnAgainst)
    values.printTitle =
      schema === 'SalesInvoice' ? 'Sales Return' : 'Purchase Return';
  if (schema === 'Shipment') values.printTitle = 'Delivery Note';
  if (schema === 'PurchaseReceipt') values.printTitle = 'Goods Receipt';
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
  values.showTerms = ['SalesInvoice', 'PurchaseInvoice', 'SalesQuote'].includes(
    schema
  );
  values.showPaymentQR =
    schema === 'SalesInvoice' &&
    !doc.returnAgainst &&
    !!doc.submitted &&
    !doc.isCancelled &&
    num(doc.outstandingAmount) > 0.004;
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
      amount: r.amount ? printMoney(String(r.amount)) : '',
      referenceType:
        doc.fyo.schemaMap[String(r.referenceType)]?.label || r.referenceType,
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
      column('item', 'Name', 'left', '40%'),
      column(
        'location',
        schema === 'Shipment' ? 'From Location' : 'To Location',
        'left',
        '25%'
      ),
      column('quantity', 'Qty', 'right', '27%'),
    ];
    if (schema === 'StockMovement')
      values.printColumns = [
        column('index', 'S.N.', 'center', '6%'),
        column('item', 'Item', 'left', '28%'),
        column('fromLocation', 'From', 'left', '22%'),
        column('toLocation', 'To', 'left', '22%'),
        column('quantity', 'Qty', 'right', '22%'),
      ];
    values.printNote = String(doc.terms || '');
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
        debit: r.debit ? printMoney(String(r.debit)) : '',
        credit: r.credit ? printMoney(String(r.credit)) : '',
        index: i + 1,
      })
    );
    const accounts = Array.isArray(doc.accounts) ? (doc.accounts as Doc[]) : [];
    values.printTotals = [
      {
        label: 'Total Debit',
        value: money(accounts.reduce((sum, row) => sum + num(row.debit), 0)),
      },
      {
        label: 'Total Credit',
        value: money(accounts.reduce((sum, row) => sum + num(row.credit), 0)),
      },
    ];
    values.printNote = String(doc.userRemark || '');
  }
  const meta = (label: string, value: unknown) => ({
    label,
    value: String(value ?? ''),
  });
  values.printMetaLeft = [
    meta('Party', values.party),
    meta('Address', values.partyAddress),
    meta('Balance', values.balanceLabel),
  ].filter((field) => field.value);
  values.printMetaRight = [
    meta(String(values.numberLabel), doc.name),
    meta(String(values.dateLabel), values.date),
    meta('Payment Mode', values.paymentMode),
    meta('Return Against', doc.returnAgainst),
  ].filter((field) => field.value);
  if (schema === 'Payment') {
    values.printMetaLeft = [
      meta('Party', values.party),
      meta('Address', values.partyAddress),
      meta('From Account', doc.account),
      meta('To Account', doc.paymentAccount),
    ].filter((field) => field.value);
    if (doc.referenceId)
      (values.printMetaRight as { label: string; value: string }[]).push(
        meta('Payment Ref', doc.referenceId)
      );
  }
  if (schema === 'JournalEntry')
    values.printMetaLeft = [
      meta('Entry Type', doc.entryType),
      meta('External Ref', doc.referenceNumber),
    ].filter((field) => field.value);
  if (['Shipment', 'PurchaseReceipt'].includes(schema) && doc.backReference)
    (values.printMetaRight as { label: string; value: string }[]).push(
      meta('Invoice Ref', doc.backReference)
    );
  if (schema === 'StockMovement')
    values.printMetaLeft = [
      meta('Movement', doc.movementType || doc.type),
    ].filter((field) => field.value);
  if (['Expense', 'SalaryPayment'].includes(schema)) {
    values.printTitle =
      schema === 'Expense' ? 'Expense Voucher' : 'Salary Payment Voucher';
    values.showTerms = false;
    values.printColumns = [
      column('description', 'Description', 'left', '70%'),
      column('amount', 'Amount', 'right', '30%'),
    ];
    values.printMetaLeft = [
      meta('Expense Account', doc.expenseAccount),
      meta('Paid From', doc.paidFrom),
    ].filter((field) => field.value);
    if (schema === 'Expense') {
      values.printRows = [
        {
          description: String(doc.description || 'Expense'),
          amount: money(num(doc.amount)),
        },
      ];
      values.printTotals = [
        {
          label: 'Total Expense',
          value: money(num(doc.amount)),
          emphasis: true,
        },
      ];
    } else {
      const employee = doc.employee
        ? await doc.fyo.doc.getDoc('Employee', String(doc.employee))
        : undefined;
      values.printMetaLeft = [
        meta('Employee', employee?.employeeName || doc.employee),
        meta('Employee ID', doc.employee),
        meta('Paid From', doc.paidFrom),
      ];
      (values.printMetaRight as { label: string; value: string }[]).push(
        meta(
          'Salary Month',
          doc.salaryMonth
            ? dateKey(doc.salaryMonth as Date | string).slice(0, 7)
            : ''
        )
      );
      values.printRows = [
        { description: 'Salary', amount: money(num(doc.salary)) },
        { description: 'Bonus', amount: money(num(doc.bonus)) },
        { description: 'Less: Deductions', amount: money(num(doc.deductions)) },
      ];
      values.printTotals = [
        { label: 'Net Pay', value: money(num(doc.netPay)), emphasis: true },
      ];
      values.printNote = String(doc.remarks || '');
    }
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
    showTerms: false,
    printMetaLeft: [
      { label: 'Party', value: party.name },
      { label: 'Address', value: address },
      { label: 'Balance', value: balance(result.closing) },
    ].filter((field) => field.value),
    printMetaRight: [
      { label: 'From', value: from ? printDate(from) : 'Beginning' },
      { label: 'To', value: printDate(to) },
      {
        label: 'Currency',
        value: String(fyo.singles.SystemSettings?.currency || ''),
      },
    ],
  };
}

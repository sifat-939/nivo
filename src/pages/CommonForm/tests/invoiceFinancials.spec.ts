import test from 'tape';
import { getTestFyo } from 'tests/helpers';
import { getInvoiceFinancialAmounts } from '../invoiceFinancials';
import {
  formatGroupedQuantities,
  sanitizeVisibleColumns,
} from '../../ListView/helpers';

const fyo = getTestFyo();

test('invoice amounts use company currency and handle drafts, payments, returns and cancellation', (t) => {
  const draft = getInvoiceFinancialAmounts(
    { baseGrandTotal: fyo.pesa(2400), isSubmitted: false },
    fyo
  );
  t.equal(draft.finalAmount.float, 2400, 'final amount uses base currency');
  t.equal(draft.paidAmount.float, 0, 'draft has no paid amount');
  t.equal(draft.dueAmount.float, 2400, 'draft is fully due');

  const partlyPaid = getInvoiceFinancialAmounts(
    {
      baseGrandTotal: fyo.pesa(2400),
      outstandingAmount: fyo.pesa(800),
      isSubmitted: true,
    },
    fyo
  );
  t.equal(
    partlyPaid.paidAmount.float,
    1600,
    'settled/adjusted amount is final minus outstanding, not a payment ledger total'
  );
  t.equal(partlyPaid.dueAmount.float, 800, 'submitted due uses outstanding');

  const returned = getInvoiceFinancialAmounts(
    {
      baseGrandTotal: fyo.pesa(-500),
      outstandingAmount: fyo.pesa(-200),
      isSubmitted: true,
    },
    fyo
  );
  t.equal(
    returned.finalAmount.float,
    500,
    'return amount is displayed positive'
  );
  t.equal(
    returned.paidAmount.float,
    300,
    'return paid amount uses absolute values'
  );
  t.equal(
    returned.dueAmount.float,
    200,
    'return due amount uses absolute values'
  );

  const cancelled = getInvoiceFinancialAmounts(
    {
      baseGrandTotal: fyo.pesa(2400),
      outstandingAmount: fyo.pesa(2400),
      isSubmitted: true,
      isCancelled: true,
    },
    fyo
  );
  t.equal(cancelled.dueAmount.float, 0, 'cancelled invoice has no due');
  t.end();
});

test('saved invoice columns retain hidden and reordered choices safely', (t) => {
  t.deepEqual(
    sanitizeVisibleColumns(
      ['name', 'party', 'date', 'paidAmount', 'dueAmount'],
      ['dueAmount', 'dueAmount', 'invalid', 'name']
    ),
    ['name', 'dueAmount'],
    'forces the document name and drops unknown/duplicate ids without restoring hidden choices'
  );
  t.deepEqual(
    sanitizeVisibleColumns(['name', 'party', 'date'], null),
    ['name'],
    'invalid saved state leaves only the required name column'
  );
  t.end();
});

test('quantity display keeps each unit separate', (t) => {
  t.equal(
    formatGroupedQuantities({ kg: 3.5, piece: 2 }),
    '3.5 kg, 2 piece',
    'keeps unlike units separate in the quantity column'
  );
  t.end();
});

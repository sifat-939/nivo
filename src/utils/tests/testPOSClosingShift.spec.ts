/* eslint-disable @typescript-eslint/no-misused-promises */
import { assertThrows } from 'backend/database/tests/helpers';
import { ValidationError } from 'fyo/utils/errors';
import { Fyo } from 'fyo';
import { Account } from 'models/baseModels/Account/Account';
import {
  AccountRootTypeEnum,
  AccountTypeEnum,
} from 'models/baseModels/Account/types';
import { ClosingAmounts } from 'models/inventory/Point of Sale/ClosingAmounts';
import { POSClosingShift } from 'models/inventory/Point of Sale/POSClosingShift';
import { POSOpeningShift } from 'models/inventory/Point of Sale/POSOpeningShift';
import test from 'tape';
import { closeTestFyo, getTestFyo, setupTestFyo } from 'tests/helpers';
import { closePOSShift, validateClosingAmounts } from '../posClosing';

const fyo = getTestFyo();
setupTestFyo(fyo, __filename);

test('POS closing rejects negative values before changing the shift', async (t) => {
  const closingAmount = fyo.pesa(-10);
  const shift = {
    closingAmounts: [{ paymentMethod: 'Cash', closingAmount }],
    set: () => {
      t.fail('invalid shift must not be mutated');
      return Promise.resolve();
    },
    sync: () => {
      t.fail('invalid shift must not be saved');
      return Promise.resolve();
    },
  } as unknown as POSClosingShift;

  t.throws(
    () => validateClosingAmounts(shift),
    (error: unknown) => error instanceof ValidationError,
    'closing amount validation propagates its ValidationError'
  );

  await assertThrows(
    () => closePOSShift(fyo, shift, 'OPEN-1'),
    'closing workflow rejects negative amounts'
  );
  t.pass('workflow stops before setting fields or saving the shift');
});

test('POS shift close completes with navigator offline', async (t) => {
  const calls: string[] = [];
  const shift = {
    closingAmounts: [
      {
        paymentMethod: 'Cash',
        closingAmount: fyo.pesa(0),
        expectedAmount: fyo.pesa(0),
      },
    ],
    async set(field: string, value: unknown) {
      calls.push(`set:${field}`);
      (this as Record<string, unknown>)[field] = value;
      await Promise.resolve();
    },
    async sync() {
      calls.push('sync');
      await Promise.resolve();
    },
  } as unknown as POSClosingShift;
  const fakeFyo = {
    singles: {
      POSSettings: {
        async setAndSync(field: string, value: unknown) {
          calls.push(`setting:${field}:${String(value)}`);
          await Promise.resolve();
        },
      },
    },
  } as unknown as Fyo;

  const previousNavigator = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { onLine: false },
  });
  try {
    await closePOSShift(fakeFyo, shift, 'OPEN-1');
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: previousNavigator,
    });
  }

  t.deepEqual(
    calls,
    [
      'set:closingDate',
      'set:openingShift',
      'sync',
      'setting:isShiftOpen:false',
    ],
    'local closing and settings save finish without network access'
  );
});

test('offline close saves the shift and posts its cash journal', async (t) => {
  const settings = fyo.singles.POSSettings!;
  const accountingSettings = fyo.singles.AccountingSettings!;
  await accountingSettings.setAndSync('setupComplete', false);
  const cashGroup = fyo.doc.getNewDoc('Account', {
    name: 'POS Test Cash Group',
    rootType: AccountRootTypeEnum.Asset,
    isGroup: true,
  }) as Account;
  const expenseGroup = fyo.doc.getNewDoc('Account', {
    name: 'POS Test Expense Group',
    rootType: AccountRootTypeEnum.Expense,
    isGroup: true,
  }) as Account;
  await cashGroup.sync();
  await expenseGroup.sync();
  await accountingSettings.setAndSync('setupComplete', true);
  const cash = fyo.doc.getNewDoc('Account', {
    name: 'POS Test Cash',
    rootType: AccountRootTypeEnum.Asset,
    accountType: AccountTypeEnum.Cash,
    isGroup: false,
    parentAccount: cashGroup.name,
  }) as Account;
  const writeOff = fyo.doc.getNewDoc('Account', {
    name: 'POS Test Write Off',
    rootType: AccountRootTypeEnum.Expense,
    accountType: AccountTypeEnum['Expense Account'],
    isGroup: false,
    parentAccount: expenseGroup.name,
  }) as Account;
  await cash.sync();
  await writeOff.sync();
  await settings.setMultiple({
    defaultAccount: cash.name,
    cashAccount: cash.name,
    writeOffAccount: writeOff.name,
    isShiftOpen: true,
  });
  await settings.sync();

  const openingShift = fyo.doc.getNewDoc('POSOpeningShift') as POSOpeningShift;
  await openingShift.sync();

  const shift = fyo.doc.getNewDoc('POSClosingShift') as POSClosingShift;
  await shift.append('closingAmounts', {
    paymentMethod: 'Cash',
    openingAmount: fyo.pesa(0),
    closingAmount: fyo.pesa(25),
    expectedAmount: fyo.pesa(25),
  });

  const journalsBefore = await fyo.db.getAllRaw('JournalEntry');
  const previousNavigator = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { onLine: false },
  });
  try {
    await closePOSShift(fyo, shift, openingShift.name!);
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: previousNavigator,
    });
  }

  const journalsAfter = await fyo.db.getAllRaw('JournalEntry');
  t.equal(
    journalsAfter.length,
    journalsBefore.length + 1,
    'cash journal posted'
  );
  t.ok(shift.inserted, 'closing shift saved locally');
  t.equal(settings.isShiftOpen, false, 'local shift setting is closed');
});

test('ClosingAmounts model rejects negative closing currency', async (t) => {
  const amount = fyo.doc.getNewDoc('ClosingAmounts', {
    paymentMethod: 'Cash',
    closingAmount: fyo.pesa(-1),
  }) as ClosingAmounts;

  await assertThrows(
    () => amount._validateFields(),
    'ClosingAmounts model validation rejects negative currency'
  );
  t.pass('model validation prevents invalid child rows from syncing');
});

closeTestFyo(fyo, __filename);

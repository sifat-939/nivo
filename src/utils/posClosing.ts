import { Fyo, t } from 'fyo';
import { ValidationError } from 'fyo/utils/errors';
import { AccountTypeEnum } from 'models/baseModels/Account/types';
import { POSClosingShift } from 'models/inventory/Point of Sale/POSClosingShift';
import { ModelNameEnum } from 'models/types';
import { Money } from 'pesa';

export function validateClosingAmounts(posShiftDoc: POSClosingShift) {
  if (!posShiftDoc) {
    throw new ValidationError(`POS Shift Document not loaded. Please reload.`);
  }

  for (const row of posShiftDoc.closingAmounts ?? []) {
    if (row.closingAmount?.isNegative()) {
      throw new ValidationError(
        t`Closing ${row.paymentMethod as string} Amount can not be negative.`
      );
    }
  }
}

export async function closePOSShift(
  fyo: Fyo,
  posShiftDoc: POSClosingShift,
  openingShiftName: string
) {
  validateClosingAmounts(posShiftDoc);
  await posShiftDoc.set('closingDate', new Date());
  await posShiftDoc.set('openingShift', openingShiftName);
  await posShiftDoc.sync();
  await transferPOSCashAndWriteOff(fyo, posShiftDoc);
  await fyo.singles.POSSettings?.setAndSync('isShiftOpen', false);
}

export async function transferPOSCashAndWriteOff(
  fyo: Fyo,
  posShiftDoc: POSClosingShift
) {
  const expectedCashAmount = posShiftDoc.closingAmounts?.find(
    (row) => row.paymentMethod === 'Cash'
  )?.expectedAmount as Money;

  if (expectedCashAmount.isZero()) {
    return;
  }

  const closingCashAmount = posShiftDoc.closingAmounts?.find(
    (row) => row.paymentMethod === 'Cash'
  )?.closingAmount as Money;

  const jvDoc = fyo.doc.getNewDoc(ModelNameEnum.JournalEntry, {
    entryType: 'Journal Entry',
  });

  await jvDoc.append('accounts', {
    account: AccountTypeEnum.Cash,
    debit: closingCashAmount,
  });

  await jvDoc.append('accounts', {
    account: fyo.singles.POSSettings?.cashAccount,
    credit: closingCashAmount,
  });

  const differenceAmount = posShiftDoc?.closingAmounts?.find(
    (row) => row.paymentMethod === 'Cash'
  )?.differenceAmount as Money;

  if (differenceAmount.isNegative()) {
    await jvDoc.append('accounts', {
      account: AccountTypeEnum.Cash,
      debit: differenceAmount.abs(),
      credit: fyo.pesa(0),
    });
    await jvDoc.append('accounts', {
      account: fyo.singles.POSSettings?.writeOffAccount,
      debit: fyo.pesa(0),
      credit: differenceAmount.abs(),
    });
  }

  if (!differenceAmount.isZero() && differenceAmount.isPositive()) {
    await jvDoc.append('accounts', {
      account: fyo.singles.POSSettings?.writeOffAccount,
      debit: differenceAmount,
      credit: fyo.pesa(0),
    });
    await jvDoc.append('accounts', {
      account: AccountTypeEnum.Cash,
      debit: fyo.pesa(0),
      credit: differenceAmount,
    });
  }

  await (await jvDoc.sync()).submit();
}

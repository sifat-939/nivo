import { Fyo } from 'fyo';
import {
  Action,
  DefaultMap,
  FiltersMap,
  ListViewSettings,
} from 'fyo/model/types';
import { ValidationError } from 'fyo/utils/errors';
import { getDocStatusListColumn, getLedgerLinkAction } from 'models/helpers';
import { LedgerPosting } from 'models/Transactional/LedgerPosting';
import { Transactional } from 'models/Transactional/Transactional';
import { Money } from 'pesa';
import { runPaidEntryAction } from 'models/Transactional/paidEntryGuard';

export class Expense extends Transactional {
  async submit() {
    await runPaidEntryAction(this.fyo, () => super.submit());
  }
  async cancel() {
    await runPaidEntryAction(this.fyo, () => super.cancel());
  }
  amount?: Money;
  expenseAccount?: string;
  paidFrom?: string;
  description?: string;
  attachment?: string;

  static defaults: DefaultMap = { date: () => new Date() };

  static filters: FiltersMap = {
    expenseAccount: () => ({ rootType: 'Expense', isGroup: false }),
    paidFrom: () => ({
      rootType: 'Asset',
      accountType: ['in', ['Cash', 'Bank']],
      isGroup: false,
    }),
  };

  static getActions(fyo: Fyo): Action[] {
    return [getLedgerLinkAction(fyo)];
  }

  async beforeSubmit() {
    await this.validate();
  }

  async validate() {
    await super.validate();
    if (
      !this.amount ||
      !Number.isFinite(Number(this.amount.toString())) ||
      !this.amount.gt(0)
    ) {
      throw new ValidationError('Expense amount must be greater than zero.');
    }
    await validateExpenseAccounts(this.fyo, this.expenseAccount, this.paidFrom);
  }

  async getPosting(): Promise<LedgerPosting> {
    const posting = new LedgerPosting(this, this.fyo);
    if (this.amount && this.expenseAccount && this.paidFrom) {
      await posting.debit(this.expenseAccount, this.amount);
      await posting.credit(this.paidFrom, this.amount);
    }
    return posting;
  }

  static override getListViewSettings(): ListViewSettings {
    return {
      columns: [
        'name',
        getDocStatusListColumn(),
        'date',
        'description',
        'amount',
        'expenseAccount',
        'paidFrom',
      ],
    };
  }
}

export async function validateExpenseAccounts(
  fyo: Fyo,
  expenseAccount?: string,
  paidFrom?: string
) {
  if (!expenseAccount || !paidFrom) {
    throw new ValidationError('Expense and paid-from accounts are required.');
  }
  const expense = await fyo.doc.getDoc('Account', expenseAccount);
  const cash = await fyo.doc.getDoc('Account', paidFrom);
  if (expense.isGroup || expense.rootType !== 'Expense') {
    throw new ValidationError('Select a leaf Expense account.');
  }
  if (
    cash.isGroup ||
    cash.rootType !== 'Asset' ||
    !['Cash', 'Bank'].includes(cash.accountType as string)
  ) {
    throw new ValidationError('Select a leaf Cash or Bank account.');
  }
}

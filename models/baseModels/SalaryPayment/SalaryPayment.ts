import { Fyo, t } from 'fyo';
import {
  Action,
  ChangeArg,
  DefaultMap,
  FiltersMap,
  FormulaMap,
  ReadOnlyMap,
  ListViewSettings,
} from 'fyo/model/types';
import { ValidationError } from 'fyo/utils/errors';
import { getDocStatusListColumn, getLedgerLinkAction } from 'models/helpers';
import { LedgerPosting } from 'models/Transactional/LedgerPosting';
import { Transactional } from 'models/Transactional/Transactional';
import { Money } from 'pesa';
import { validateExpenseAccounts } from '../Expense/Expense';
import { runPaidEntryAction } from 'models/Transactional/paidEntryGuard';

export class SalaryPayment extends Transactional {
  async submit() {
    await runPaidEntryAction(this.fyo, () => super.submit());
  }
  async cancel() {
    await runPaidEntryAction(this.fyo, () => super.cancel());
  }
  employee?: string;
  salaryMonth?: Date;
  salary?: Money;
  bonus?: Money;
  deductions?: Money;
  netPay?: Money;
  expenseAccount?: string;
  paidFrom?: string;
  remarks?: string;
  async change({ changed }: ChangeArg) {
    if (changed !== 'employee' || !this.employee) return;
    const employee = await this.fyo.doc.getDoc('Employee', this.employee);
    // Employee changes always refresh the default. This also works when the
    // draft was reloaded, when in-memory autofill provenance is unavailable.
    await this.set(
      'salary',
      (employee.salary as Money | undefined) ?? this.fyo.pesa(0)
    );
  }

  formulas: FormulaMap = {
    netPay: {
      formula: () =>
        (this.salary ?? this.fyo.pesa(0))
          .add(this.bonus ?? 0)
          .sub(this.deductions ?? 0),
      dependsOn: ['salary', 'bonus', 'deductions'],
    },
  };

  async beforeSubmit() {
    await this.validate();
    await this.validateUniqueSubmittedMonth();
  }

  readOnly: ReadOnlyMap = { netPay: () => true };

  static filters: FiltersMap = {
    employee: () => ({ isActive: true }),
    expenseAccount: () => ({ rootType: 'Expense', isGroup: false }),
    paidFrom: () => ({
      rootType: 'Asset',
      accountType: ['in', ['Cash', 'Bank']],
      isGroup: false,
    }),
  };

  async validate() {
    await super.validate();
    if (this.isCancelled) return;
    if (!this.employee) throw new ValidationError('Employee is required.');
    const employee = await this.fyo.doc.getDoc('Employee', this.employee);
    if (!employee.isActive)
      throw new ValidationError(
        'Salary cannot be paid to an inactive employee.'
      );

    if (!this.salaryMonth)
      throw new ValidationError('Salary month is required.');
    const month = new Date(this.salaryMonth);
    if (!Number.isFinite(month.getTime()))
      throw new ValidationError('Salary month must be a valid date.');
    month.setDate(1);
    month.setHours(0, 0, 0, 0);
    this.salaryMonth = month;

    const salary = this.salary ?? this.fyo.pesa(0);
    const bonus = this.bonus ?? this.fyo.pesa(0);
    const deductions = this.deductions ?? this.fyo.pesa(0);
    if (
      ![salary, bonus, deductions].every((amount) =>
        Number.isFinite(Number(amount.toString()))
      ) ||
      !salary.gt(0) ||
      bonus.lt(0) ||
      deductions.lt(0)
    ) {
      throw new ValidationError(
        'Salary must be positive; bonus and deductions cannot be negative.'
      );
    }
    if (!salary.add(bonus).sub(deductions).gt(0)) {
      throw new ValidationError('Net pay must be greater than zero.');
    }
    await validateExpenseAccounts(this.fyo, this.expenseAccount, this.paidFrom);
  }

  async validateUniqueSubmittedMonth() {
    if (!this.employee || !this.salaryMonth) return;
    const month = new Date(this.salaryMonth);
    const existing = (await this.fyo.db.getAll('SalaryPayment', {
      fields: ['name'],
      filters: { employee: this.employee },
    })) as { name: string }[];
    for (const { name } of existing) {
      if (name === this.name) continue;
      const doc = await this.fyo.doc.getDoc('SalaryPayment', name);
      if (doc.isSubmitted && sameMonth(doc.salaryMonth as Date, month)) {
        throw new ValidationError(
          t`This employee already has a submitted salary payment for that month.`
        );
      }
    }
  }

  async getPosting(): Promise<LedgerPosting> {
    const posting = new LedgerPosting(this, this.fyo);
    const net =
      this.netPay ??
      (this.salary ?? this.fyo.pesa(0))
        .add(this.bonus ?? 0)
        .sub(this.deductions ?? 0);
    if (this.expenseAccount && this.paidFrom) {
      await posting.debit(this.expenseAccount, net);
      await posting.credit(this.paidFrom, net);
    }
    return posting;
  }

  static defaults: DefaultMap = {
    date: () => new Date(),
    salaryMonth: () => {
      const month = new Date();
      month.setDate(1);
      month.setHours(0, 0, 0, 0);
      return month;
    },
    bonus: (doc) => doc.fyo.pesa(0),
    deductions: (doc) => doc.fyo.pesa(0),
  };

  static getActions(fyo: Fyo): Action[] {
    return [getLedgerLinkAction(fyo)];
  }

  static override getListViewSettings(): ListViewSettings {
    return {
      columns: [
        'name',
        getDocStatusListColumn(),
        'date',
        'employee',
        'salaryMonth',
        'netPay',
        'paidFrom',
      ],
    };
  }
}

function sameMonth(a: Date, b: Date) {
  const date = new Date(a);
  return (
    date.getFullYear() === b.getFullYear() && date.getMonth() === b.getMonth()
  );
}

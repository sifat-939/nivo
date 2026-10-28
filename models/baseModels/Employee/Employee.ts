import { Doc } from 'fyo/model/doc';
import { DefaultMap, ListViewSettings } from 'fyo/model/types';
import { Money } from 'pesa';
import { ValidationError } from 'fyo/utils/errors';

export class Employee extends Doc {
  employeeName?: string;
  designation?: string;
  joiningDate?: Date;
  salary?: Money;
  phone?: string;
  email?: string;
  isActive?: boolean;

  static defaults: DefaultMap = {
    joiningDate: () => new Date(),
    isActive: () => true,
  };

  async validate() {
    await super.validate();
    if (this.salary && this.salary.lt(0)) {
      throw new ValidationError('Monthly salary cannot be negative.');
    }
  }

  static override getListViewSettings(): ListViewSettings {
    return {
      columns: [
        'name',
        'employeeName',
        'designation',
        'joiningDate',
        'isActive',
      ],
    };
  }
}

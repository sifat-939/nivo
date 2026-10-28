import { Doc } from 'fyo/model/doc';
import { DocValue } from 'fyo/core/types';
import { FormulaMap, ValidationMap } from 'fyo/model/types';
import { ValidationError } from 'fyo/utils/errors';
import { Money } from 'pesa';

export class ClosingAmounts extends Doc {
  closingAmount?: Money;
  differenceAmount?: Money;
  expectedAmount?: Money;
  openingAmount?: Money;
  paymentMethod?: string;

  validations: ValidationMap = {
    closingAmount: (value: DocValue) => {
      if (value && (value as Money).isNegative()) {
        throw new ValidationError(
          this.fyo.t`Closing ${
            this.paymentMethod as string
          } Amount can not be negative.`
        );
      }
    },
  };

  formulas: FormulaMap = {
    differenceAmount: {
      formula: () => {
        if (!this.closingAmount) {
          return this.fyo.pesa(0);
        }

        if (!this.expectedAmount) {
          return this.fyo.pesa(0);
        }

        return this.closingAmount.sub(this.expectedAmount);
      },
    },
  };
}

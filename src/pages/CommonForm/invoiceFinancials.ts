import { Fyo } from 'fyo';
import { Money } from 'pesa';

export interface InvoiceFinancialSource {
  baseGrandTotal?: Money;
  outstandingAmount?: Money;
  isSubmitted?: boolean;
  isCancelled?: boolean;
}

export function getInvoiceFinancialAmounts(
  invoice: InvoiceFinancialSource,
  fyo: Fyo
): { finalAmount: Money; paidAmount: Money; dueAmount: Money } {
  const finalAmount = (invoice.baseGrandTotal ?? fyo.pesa(0)).abs();
  if (invoice.isCancelled) {
    return {
      finalAmount,
      paidAmount: fyo.pesa(0),
      dueAmount: fyo.pesa(0),
    };
  }

  const dueAmount = invoice.isSubmitted
    ? (invoice.outstandingAmount ?? fyo.pesa(0)).abs()
    : finalAmount;
  const difference = finalAmount.sub(dueAmount);
  const paidAmount = difference.isNegative() ? fyo.pesa(0) : difference;
  return { finalAmount, paidAmount, dueAmount };
}

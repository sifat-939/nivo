import { BalanceSheet } from './BalanceSheet/BalanceSheet';
import { GeneralLedger } from './GeneralLedger/GeneralLedger';
import { ProfitAndLoss } from './ProfitAndLoss/ProfitAndLoss';
import { TrialBalance } from './TrialBalance/TrialBalance';
import { StockBalance } from './inventory/StockBalance';
import { StockLedger } from './inventory/StockLedger';

export const reports = {
  GeneralLedger,
  ProfitAndLoss,
  BalanceSheet,
  TrialBalance,
  StockLedger,
  StockBalance,
} as const;

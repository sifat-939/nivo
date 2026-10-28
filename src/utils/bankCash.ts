import type { Fyo } from 'fyo';
import type { Money } from 'pesa';
import type { RawValueMap } from 'fyo/core/types';

export type BankCashBalance = {
  name: string;
  accountType: string;
  isGroup: boolean;
  balance: Money;
};

/** Include existing direct group postings without rolling up children twice. */
export function getBankCashBalances(
  accounts: RawValueMap[],
  entries: RawValueMap[],
  fyo: Fyo
): BankCashBalance[] {
  const balances = new Map<string, Money>(
    accounts.map(({ name }) => [String(name), fyo.pesa(0)])
  );
  const posted = new Set<string>();
  for (const entry of entries) {
    if (entry.reverted === true || entry.reverted === 1) continue;
    const account = String(entry.account ?? '');
    const amount = balances.get(account);
    if (!amount) continue;
    posted.add(account);
    balances.set(
      account,
      amount
        .add((entry.debit ?? 0) as string | number)
        .sub((entry.credit ?? 0) as string | number)
    );
  }
  return accounts
    .filter(({ name, isGroup }) => !isGroup || posted.has(String(name)))
    .map(({ name, accountType, isGroup }) => ({
      name: String(name),
      accountType: String(accountType),
      isGroup: !!isGroup,
      balance: balances.get(String(name))!,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

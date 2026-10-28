export type PartyControlEntry = {
  name: string;
  party: string;
  date: string;
  account: string;
  accountType: string;
  debit: number | string | null;
  credit: number | string | null;
  referenceType: string;
  referenceName: string;
  reverted: boolean;
};

export function summarizePartyControlLedger(entries: PartyControlEntry[]) {
  const grouped = new Map<string, PartyControlEntry[]>();
  for (const entry of entries) {
    if (entry.accountType !== 'Receivable' && entry.accountType !== 'Payable')
      continue;
    const rows = grouped.get(entry.party) ?? [];
    rows.push(entry);
    grouped.set(entry.party, rows);
  }
  return [...grouped.entries()].map(([party, rows]) => {
    const debit = rows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
    const credit = rows.reduce((sum, row) => sum + Number(row.credit || 0), 0);
    return { party, entries: rows, debit, credit, closingNet: debit - credit };
  });
}

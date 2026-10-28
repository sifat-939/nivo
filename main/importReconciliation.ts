import type { Knex } from 'knex';

export type ImportBalanceStatus =
  | 'matched'
  | 'mismatch'
  | 'source-missing'
  | 'unverified';

export interface ImportPartyComparison {
  party: string;
  sourceBalance?: number;
  nativeBalance?: number;
  difference?: number;
  status: ImportBalanceStatus;
  evidenceStatus: string;
}

export interface ImportOpeningAdjustment {
  party: string;
  sourceId: string;
  type: string;
  amount?: number;
  evidenceStatus: 'direction-unverified' | 'amount-unverified';
}

export interface ImportReconciliation {
  available: boolean;
  sourceSet?: string;
  partyComparisons: ImportPartyComparison[];
  openingAdjustments?: ImportOpeningAdjustment[];
  notes: string[];
}

type ArchiveParty = {
  sourceId: string;
  targetName: string | null;
  importStatus: string;
  rawJson: string;
};

type ArchiveTransaction = {
  sourceId: string;
  rawJson: string;
};

/**
 * Read-only comparison of archived source activity with native AR/AP control
 * ledger by party. Opening and balance adjustment rows stay unverified because
 * their source-side account/sign semantics were not established by the import.
 */
export async function getImportReconciliation(
  knex: Knex
): Promise<ImportReconciliation> {
  const requiredTables = [
    'KarbarArchiveRecord',
    'KarbarImportRun',
    'AccountingLedgerEntry',
    'Account',
    'Party',
  ];
  for (const table of requiredTables) {
    if (!(await knex.schema.hasTable(table))) {
      return unavailable(
        `Required archive or ledger table ${table} is missing.`
      );
    }
  }

  const run = (await knex('KarbarImportRun')
    .select('sourceSet')
    .where('sourceSet', 'archived-20261027')
    .first()) as { sourceSet?: string } | undefined;
  if (!run?.sourceSet) {
    return unavailable(
      'No archived Karbar import run is present in this company.'
    );
  }

  const [partyRows, transactionRows, nativeRows] = (await Promise.all([
    knex('KarbarArchiveRecord')
      .select('sourceId', 'targetName', 'importStatus', 'rawJson')
      .where({ sourceSet: run.sourceSet, entity: 'parties' }),
    knex('KarbarArchiveRecord')
      .select('sourceId', 'rawJson')
      .where({ sourceSet: run.sourceSet, entity: 'transactions_detailed' }),
    knex('AccountingLedgerEntry as ale')
      .join('Account as account', 'account.name', 'ale.account')
      .select('ale.party')
      .sum({
        balance: knex.raw('COALESCE(ale.debit, 0) - COALESCE(ale.credit, 0)'),
      })
      .whereNotNull('ale.party')
      .where('ale.reverted', false)
      .whereIn('account.accountType', ['Receivable', 'Payable'])
      .groupBy('ale.party'),
  ])) as [
    ArchiveParty[],
    ArchiveTransaction[],
    { party: string; balance: number | string }[]
  ];

  const sourceParties = new Map<
    string,
    {
      name: string;
      targetName: string | null;
      importStatus: string;
    }
  >();
  for (const row of partyRows) {
    const source = parseObject(row.rawJson);
    const sourceId = String(source.idx ?? row.sourceId);
    const sourceName = typeof source.name === 'string' ? source.name : '';
    if (!sourceName) continue;
    sourceParties.set(sourceId, {
      name: sourceName,
      targetName: row.targetName,
      importStatus: row.importStatus,
    });
  }

  const transactionMap = new Map<string, JsonObject[]>();
  const openingAdjustments: ImportOpeningAdjustment[] = [];
  const orphanSourcePartyIds = new Set<string>();
  for (const row of transactionRows) {
    const source = parseObject(row.rawJson);
    const partyId = source.party == null ? '' : String(source.party);
    if (!partyId) {
      orphanSourcePartyIds.add('missing-party-id');
      continue;
    }
    if (!sourceParties.has(partyId)) orphanSourcePartyIds.add(partyId);
    const group = transactionMap.get(partyId) ?? [];
    group.push(source);
    transactionMap.set(partyId, group);
    if (
      ['party-opening-balance', 'add-balance', 'reduce-balance'].includes(
        String(source.type)
      )
    ) {
      const amount = readFiniteNumber(source.total_amount);
      openingAdjustments.push({
        party: sourceParties.get(partyId)?.name ?? `Source party ${partyId}`,
        sourceId: String(source.idx ?? row.sourceId),
        type: String(source.type),
        amount: amount ?? undefined,
        evidenceStatus:
          amount === undefined ? 'amount-unverified' : 'direction-unverified',
      });
    }
  }

  const nativeBalances = new Map<string, number>();
  for (const row of nativeRows) {
    if (typeof row.party === 'string') {
      nativeBalances.set(row.party, Number(row.balance ?? 0));
    }
  }

  const partyComparisons: ImportPartyComparison[] = [
    ...sourceParties.entries(),
  ].map(([sourceId, sourceParty]) => {
    const activity = transactionMap.get(sourceId) ?? [];
    const adjustmentRows = activity.filter((row) =>
      ['party-opening-balance', 'add-balance', 'reduce-balance'].includes(
        String(row.type)
      )
    );
    const knownRows = activity.filter((row) =>
      ['sale', 'purchase', 'payment-in', 'payment-out'].includes(
        String(row.type)
      )
    );
    const unknownRows = activity.filter(
      (row) =>
        ![
          'sale',
          'purchase',
          'payment-in',
          'payment-out',
          'party-opening-balance',
          'add-balance',
          'reduce-balance',
        ].includes(String(row.type)) ||
        !!row.deleted_on ||
        !!row.is_obsolete
    );
    let partialSourceBalance = 0;
    let malformedRows = false;
    for (const row of knownRows) {
      const type = String(row.type);
      const amount = readFiniteNumber(
        type === 'sale' || type === 'purchase'
          ? row.balance_amount
          : row.total_amount
      );
      if (amount === undefined) {
        malformedRows = true;
        continue;
      }
      partialSourceBalance +=
        type === 'sale' || type === 'payment-out' ? amount : -amount;
    }

    const nativeRowsExist =
      !!sourceParty.targetName && nativeBalances.has(sourceParty.targetName);
    const nativeBalance = sourceParty.targetName
      ? nativeBalances.get(sourceParty.targetName) ?? 0
      : undefined;
    if (!sourceParty.targetName || sourceParty.importStatus !== 'imported') {
      return {
        party: sourceParty.name,
        nativeBalance,
        status: 'unverified' as const,
        evidenceStatus:
          'Source party has no successfully imported native crosswalk.',
      };
    }
    if (
      adjustmentRows.length ||
      unknownRows.length ||
      malformedRows ||
      !nativeRowsExist
    ) {
      const reasons = [
        adjustmentRows.length
          ? `${adjustmentRows.length} opening/adjustment row(s)`
          : '',
        unknownRows.length
          ? `${unknownRows.length} unsupported or deleted source row(s)`
          : '',
        malformedRows ? 'malformed source amounts' : '',
        !nativeRowsExist ? 'no native control ledger rows' : '',
        'unknown comparison cutoff',
      ].filter(Boolean);
      return {
        party: sourceParty.name,
        nativeBalance,
        status: 'unverified' as const,
        evidenceStatus: `Cannot verify complete balance: ${reasons.join(
          ', '
        )}.`,
      };
    }

    const difference = (nativeBalance ?? 0) - partialSourceBalance;
    return {
      party: sourceParty.name,
      sourceBalance: partialSourceBalance,
      nativeBalance,
      difference,
      status:
        Math.abs(difference) <= 0.01
          ? ('unverified' as const)
          : ('mismatch' as const),
      evidenceStatus:
        'Activity comparison only: sale/purchase due and payment rows versus native AR/AP control ledger net (debit minus credit). This is not a complete reconciliation; source/native cutoffs may differ.',
    };
  });

  const sourceNativeNames = new Set(
    [...sourceParties.values()].flatMap((party) =>
      party.targetName ? [party.targetName] : []
    )
  );
  for (const [party, nativeBalance] of nativeBalances) {
    if (sourceNativeNames.has(party)) continue;
    partyComparisons.push({
      party,
      nativeBalance,
      status: 'source-missing',
      evidenceStatus:
        'Native party control ledger has no archived source-party crosswalk.',
    });
  }
  for (const sourcePartyId of orphanSourcePartyIds) {
    partyComparisons.push({
      party:
        sourcePartyId === 'missing-party-id'
          ? 'Source transactions without a party ID'
          : `Source party ${sourcePartyId} is missing from the party archive`,
      status: 'source-missing',
      evidenceStatus:
        'Source transaction rows cannot be crosswalked to an archived source party.',
    });
  }

  return {
    available: true,
    sourceSet: run.sourceSet,
    partyComparisons,
    openingAdjustments,
    notes: [
      'Source and native measures use archived transaction activity and current native ledger state; they may have different cutoffs.',
      'Archived opening/add/reduce balances are shown as unverified because their sign and contra-account semantics were not established.',
      'The source amount is derived only from sale/purchase due and standalone payment transaction rows; party master balances and current-live workbook balances are not treated as equivalent without verified field semantics.',
      'Native control balances sum all party-tagged ledger rows on Receivable/Payable accounts. Reversal pairs are both included and net to zero.',
      'Numeric equality is unverified when source/native cutoff or opening-balance completeness is unknown; differences are activity comparisons, not cutover approval.',
      'Journal entries without a native party dimension cannot be assigned to a party from native ledger rows.',
    ],
  };
}

type JsonObject = Record<string, unknown>;

function parseObject(value: unknown): JsonObject {
  if (typeof value !== 'string') return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as JsonObject)
      : {};
  } catch {
    return {};
  }
}

function readFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function unavailable(note: string): ImportReconciliation {
  return {
    available: false,
    partyComparisons: [],
    notes: [note, 'No company or archive data was modified.'],
  };
}

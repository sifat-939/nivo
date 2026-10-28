<template>
  <div class="h-full overflow-y-auto p-6 text-gray-900 dark:text-gray-100">
    <div class="mx-auto max-w-5xl">
      <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold">{{ t`Bank & Cash` }}</h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {{ t`Balances from posted ledger entries` }}
          </p>
        </div>
        <div class="flex gap-2">
          <Button :disabled="loading" @click="loadAccounts">{{
            t`Refresh`
          }}</Button>
          <Button @click="routeTo('/chart-of-accounts')">{{
            t`Manage Accounts`
          }}</Button>
        </div>
      </header>

      <p v-if="error" class="mb-4 text-sm text-red-600" role="alert">
        {{ error }}
      </p>
      <p v-if="loading && !accounts.length" class="text-sm text-gray-600">
        {{ t`Loading accounts…` }}
      </p>
      <div
        v-else-if="accounts.length"
        class="
          overflow-hidden
          rounded-lg
          border border-gray-200
          dark:border-gray-700
        "
      >
        <div
          style="grid-template-columns: minmax(0, 1fr) auto"
          class="
            grid
            gap-4
            border-b border-gray-200
            px-4
            py-3
            text-xs
            font-medium
            uppercase
            text-gray-500
            dark:border-gray-700
          "
        >
          <span>{{ t`Account` }}</span
          ><span class="text-right">{{ t`Balance` }}</span>
        </div>
        <div
          v-for="account in accounts"
          :key="account.name"
          style="grid-template-columns: minmax(0, 1fr) auto"
          class="
            grid
            items-center
            gap-4
            border-b border-gray-100
            px-4
            py-3
            last:border-0
            dark:border-gray-800
          "
        >
          <button class="min-w-0 text-left" @click="openLedger(account.name)">
            <span
              class="
                block
                truncate
                font-medium
                text-gray-900
                dark:text-gray-100
              "
              >{{ account.name }}</span
            >
            <span class="text-xs text-gray-500"
              >{{ account.accountType
              }}{{ account.isGroup ? ' · Existing group entries' : '' }}</span
            >
          </button>
          <span class="text-right font-medium tabular-nums">{{
            formatCurrency(account.balance)
          }}</span>
        </div>
        <div
          class="
            flex
            justify-end
            border-t border-gray-200
            px-4
            py-3
            font-semibold
            dark:border-gray-700
          "
        >
          <span>{{ t`Total` }}: {{ formatCurrency(total) }}</span>
        </div>
      </div>
      <div
        v-else
        class="
          rounded-lg
          border border-gray-200
          p-8
          text-center text-sm text-gray-500
          dark:border-gray-700
        "
      >
        {{ t`No Bank or Cash accounts found.` }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, shallowRef } from 'vue';
import Button from 'src/components/Button.vue';
import { fyo } from 'src/initFyo';
import { routeTo } from 'src/utils/ui';
import { getBankCashBalances } from 'src/utils/bankCash';
import type { BankCashBalance } from 'src/utils/bankCash';
import type { Money } from 'pesa';

export default defineComponent({
  name: 'BankCash',
  components: { Button },
  data() {
    return {
      accounts: shallowRef<BankCashBalance[]>([]),
      loading: false,
      error: '',
    };
  },
  computed: {
    total(): Money {
      return this.accounts.reduce(
        (sum, account) => sum.add(account.balance),
        fyo.pesa(0)
      );
    },
  },
  async activated() {
    await this.loadAccounts();
  },
  methods: {
    async loadAccounts() {
      this.loading = true;
      this.error = '';
      try {
        const raw = await fyo.db.getAllRaw('Account', {
          filters: {
            rootType: 'Asset',
            accountType: ['in', ['Bank', 'Cash']],
          },
          fields: ['name', 'accountType', 'isGroup'],
        });
        const names = raw.map((row) => String(row.name));
        const entries = names.length
          ? await fyo.db.getAllRaw('AccountingLedgerEntry', {
              filters: { account: ['in', names], reverted: false },
              fields: ['account', 'debit', 'credit', 'reverted'],
            })
          : [];
        this.accounts = getBankCashBalances(raw, entries, fyo);
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
      } finally {
        this.loading = false;
      }
    },
    formatCurrency(value: Money) {
      return fyo.format(value, 'Currency');
    },
    async openLedger(account: string) {
      await routeTo({ path: '/report/GeneralLedger', query: { account } });
    },
    routeTo,
  },
});
</script>

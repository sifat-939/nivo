<template>
  <div class="h-screen" style="width: var(--w-desk)">
    <PageHeader :title="t`Dashboard`">
      <div
        class="
          border
          dark:border-gray-900
          rounded
          bg-gray-50
          dark:bg-gray-890
          focus-within:bg-gray-100
          dark:focus-within:bg-gray-900
          flex
          items-center
        "
      >
        <PeriodSelector
          class="px-3"
          :value="period"
          :options="['This Year', 'This Quarter', 'This Month', 'YTD']"
          @change="(value) => (period = value)"
        />
      </div>
    </PageHeader>

    <div
      class="no-scrollbar overflow-auto dark:bg-gray-875"
      style="height: calc(100vh - var(--h-row-largest) - 1px)"
    >
      <div
        style="min-width: var(--w-desk-fixed)"
        class="nivo-dashboard overflow-auto"
      >
        <Cashflow
          class="p-4 nivo-dashboard-card"
          :common-period="period"
          :dark-mode="darkMode"
          @period-change="handlePeriodChange"
        />

        <div class="flex w-full gap-3 my-3">
          <UnpaidInvoices
            :schema-name="'SalesInvoice'"
            :common-period="period"
            :dark-mode="darkMode"
            class="nivo-dashboard-card"
            @period-change="handlePeriodChange"
          />
          <UnpaidInvoices
            :schema-name="'PurchaseInvoice'"
            class="nivo-dashboard-card"
            :common-period="period"
            :dark-mode="darkMode"
            @period-change="handlePeriodChange"
          />
        </div>

        <div class="flex gap-3">
          <ProfitAndLoss
            class="w-full p-4 nivo-dashboard-card"
            :common-period="period"
            :dark-mode="darkMode"
            @period-change="handlePeriodChange"
          />
          <Expenses
            class="w-full p-4 nivo-dashboard-card"
            :common-period="period"
            :dark-mode="darkMode"
            @period-change="handlePeriodChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PageHeader from 'src/components/PageHeader.vue';
import UnpaidInvoices from './UnpaidInvoices.vue';
import Cashflow from './Cashflow.vue';
import Expenses from './Expenses.vue';
import PeriodSelector from './PeriodSelector.vue';
import ProfitAndLoss from './ProfitAndLoss.vue';
import { docsPathRef } from 'src/utils/refs';

export default {
  name: 'Dashboard',
  components: {
    PageHeader,
    Cashflow,
    ProfitAndLoss,
    Expenses,
    PeriodSelector,
    UnpaidInvoices,
  },
  props: {
    darkMode: { type: Boolean, default: false },
  },
  data() {
    return { period: 'This Year' };
  },
  activated() {
    docsPathRef.value = 'books/dashboard';
  },
  deactivated() {
    docsPathRef.value = '';
  },
  methods: {
    handlePeriodChange(period) {
      if (period === this.period) {
        return;
      }

      this.period = '';
    },
  },
};
</script>

<style scoped>
.nivo-dashboard {
  padding: 16px;
  background: theme('colors.gray.50');
}

.nivo-dashboard-card {
  min-width: 0;
  border: 1px solid theme('colors.gray.200');
  border-radius: 14px;
  background: white;
}

.dark .nivo-dashboard {
  background: theme('colors.gray.900');
}

.dark .nivo-dashboard-card {
  border-color: theme('colors.gray.800');
  background: theme('colors.gray.875');
}
</style>

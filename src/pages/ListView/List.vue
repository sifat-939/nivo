<template>
  <div class="text-base flex flex-col overflow-hidden">
    <!-- Title Row -->
    <div
      class="flex items-center"
      :style="{
        paddingRight: dataSlice.length > 13 ? 'var(--w-scrollbar)' : '',
      }"
    >
      <div
        v-if="!isSelectionMode"
        class="w-8 text-end me-2 text-gray-700 dark:text-gray-400"
      >
        #
      </div>
      <div v-else class="w-8 flex justify-end me-2">
        <Check
          :df="{
            fieldtype: 'Check',
            fieldname: 'selectAll',
            label: '',
          }"
          :show-label="false"
          :value="isAllSelected"
          @change="toggleSelectAll"
        />
      </div>
      <Row
        class="flex-1 text-gray-700 dark:text-gray-400 h-row-mid"
        :column-count="columns.length"
        gap="1rem"
      >
        <div
          v-for="(column, i) in columns"
          :key="column.label"
          class="
            overflow-x-auto
            no-scrollbar
            whitespace-nowrap
            h-row
            items-center
            flex
          "
          :class="{
            'ms-auto': isNumeric(column.fieldtype),
            'pe-4': i === columns.length - 1,
          }"
        >
          {{ column.label }}
        </div>
      </Row>
    </div>
    <hr class="dark:border-gray-800" />

    <!-- Data Rows -->
    <div
      v-if="dataSlice.length !== 0"
      class="
        overflow-y-auto
        dark:dark-scroll
        custom-scroll custom-scroll-thumb1
      "
    >
      <div v-for="(row, i) in dataSlice" :key="(row.name as string)">
        <!-- Row Content -->
        <div class="flex hover:bg-gray-50 dark:hover:bg-gray-850 items-center">
          <div
            v-if="!isSelectionMode"
            class="w-8 text-end me-2 text-gray-700 dark:text-gray-400"
          >
            {{ i + pageStart + 1 }}
          </div>
          <div v-else class="w-8 flex justify-end me-2">
            <Check
              :df="{
                fieldtype: 'Check',
                fieldname: 'selectItem',
                label: '',
              }"
              :show-label="false"
              :value="selectedItems.includes(row.name as string)"
              @change="toggleItemSelection(row.name as string)"
            />
          </div>

          <Row
            gap="1rem"
            class="
              cursor-pointer
              text-gray-900
              dark:text-gray-300
              flex-1
              h-row-mid
            "
            :column-count="columns.length"
            @click="isSelectionMode ? null : $emit('openDoc', row.name)"
          >
            <ListCell
              v-for="(column, c) in columns"
              :key="column.label"
              :class="{
                'text-end': isNumeric(column.fieldtype),
                'pe-4': c === columns.length - 1,
              }"
              :row="(row as RenderData)"
              :column="column"
            />
          </Row>
        </div>
        <hr
          v-if="!(i === dataSlice.length - 1 && i > 13)"
          class="dark:border-gray-800"
        />
      </div>
    </div>

    <!-- Pagination Footer -->
    <div v-if="totalCount" class="mt-auto">
      <hr class="dark:border-gray-800" />
      <Paginator
        :key="paginationKey"
        :item-count="totalCount"
        class="px-4"
        @index-change="setPageIndices"
      />
    </div>

    <!-- Empty State -->
    <div
      v-if="!data?.length"
      class="flex flex-col items-center justify-center my-auto"
    >
      <img src="../../assets/img/list-empty-state.svg" alt="" class="w-24" />
      <p class="my-3 text-gray-800 dark:text-gray-200">
        {{ t`No entries found` }}
      </p>
      <Button v-if="canCreate" type="primary" @click="$emit('makeNewDoc')">
        {{ t`Make Entry` }}
      </Button>
    </div>
  </div>
</template>
<script lang="ts">
import { ListViewSettings, RenderData } from 'fyo/model/types';
import { cloneDeep } from 'lodash';
import Button from 'src/components/Button.vue';
import Check from 'src/components/Controls/Check.vue';
import Paginator from 'src/components/Paginator.vue';
import Row from 'src/components/Row.vue';
import { fyo } from 'src/initFyo';
import { isNumeric } from 'src/utils';
import { QueryFilter } from 'utils/db/types';
import { Money } from 'pesa';
import { PropType, defineComponent, toRaw } from 'vue';
import ListCell from './ListCell.vue';
import { getInvoiceFinancialAmounts } from '../CommonForm/invoiceFinancials';
import {
  formatGroupedQuantities,
  hasPositiveOutstandingAmount,
  matchesRenderedStatus,
  mergeListViewFilters,
  scanFilteredPage,
} from './helpers';

export default defineComponent({
  name: 'List',
  components: {
    Row,
    ListCell,
    Button,
    Check,
    Paginator,
  },
  props: {
    listConfig: {
      type: Object as PropType<ListViewSettings | undefined>,
      default: () => ({ columns: [] }),
    },
    filters: {
      type: Object as PropType<QueryFilter>,
      default: () => ({}),
    },
    schemaName: { type: String, required: true },
    canCreate: Boolean,
    isSelectionMode: Boolean,
    ageFilterDays: { type: Number, default: 0 },
  },
  emits: ['openDoc', 'makeNewDoc', 'updatedData', 'selected-items-changed'],
  data() {
    return {
      data: [] as RenderData[],
      pageStart: 0,
      pageEnd: 50,
      totalCount: 0,
      paginationKey: 0,
      loadGeneration: 0,
      appliedFilters: {} as Record<string, unknown>,
      listenerCleanups: [] as (() => void)[],
      isListActive: true,
      selectedItems: [] as string[],
    };
  },
  computed: {
    dataSlice() {
      return this.data.slice(0, Math.max(0, this.pageEnd - this.pageStart));
    },
    count() {
      return this.pageEnd - this.pageStart + 1;
    },
    isAllSelected(): boolean {
      return (
        this.data.length > 0 &&
        this.data.every((row) =>
          this.selectedItems.includes(row.name as string)
        )
      );
    },
    columns() {
      let columns = this.listConfig?.columns ?? [];

      if (columns.length === 0) {
        columns = fyo.schemaMap[this.schemaName]?.quickEditFields ?? [];
        columns = [...new Set(['name', ...columns])];
      }

      return columns
        .map((fieldname) => {
          if (typeof fieldname === 'object') {
            return fieldname;
          }

          return fyo.getField(this.schemaName, fieldname);
        })
        .filter(Boolean);
    },
  },
  watch: {
    async filters() {
      this.appliedFilters = {};
      this.resetPagination();
      await this.updateData();
    },
    async listConfig() {
      this.resetPagination();
      await this.updateData();
    },
    async schemaName(oldValue, newValue) {
      if (oldValue === newValue) {
        return;
      }

      this.appliedFilters = {};
      this.resetPagination();
      await this.updateData();
      this.setUpdateListeners();
    },
    async ageFilterDays() {
      this.resetPagination();
      await this.updateData();
    },
  },
  async mounted() {
    await this.updateData();
    if (this.isListActive) this.setUpdateListeners();
  },
  async activated() {
    this.isListActive = true;
    await this.updateData();
    if (this.isListActive) this.setUpdateListeners();
  },
  deactivated() {
    this.isListActive = false;
    this.loadGeneration += 1;
    this.clearUpdateListeners();
  },
  beforeUnmount() {
    this.isListActive = false;
    this.loadGeneration += 1;
    this.clearUpdateListeners();
  },
  methods: {
    isNumeric,
    resetPagination() {
      this.selectedItems = [];
      this.$emit('selected-items-changed', this.selectedItems);
      this.pageStart = 0;
      this.pageEnd = 50;
      this.paginationKey += 1;
    },
    setPageIndices({ start, end }: { start: number; end: number }) {
      this.pageStart = start;
      this.pageEnd = end;
      void this.updateData();
    },
    setUpdateListeners() {
      this.clearUpdateListeners();
      if (!this.schemaName || !this.isListActive) {
        return;
      }

      const listener = async () => {
        await this.updateData();
      };

      const addListener = (
        observer: {
          on: (event: string, listener: () => void) => void;
          off: (event: string, listener: () => void) => void;
        },
        event: string
      ) => {
        observer.on(event, listener);
        this.listenerCleanups.push(() => observer.off(event, listener));
      };

      if (fyo.schemaMap[this.schemaName]?.isSubmittable) {
        addListener(fyo.doc.observer, `submit:${this.schemaName}`);
        addListener(fyo.doc.observer, `revert:${this.schemaName}`);
        addListener(fyo.doc.observer, `cancel:${this.schemaName}`);
      }

      addListener(fyo.doc.observer, `sync:${this.schemaName}`);
      addListener(fyo.db.observer, `delete:${this.schemaName}`);
      addListener(fyo.doc.observer, `rename:${this.schemaName}`);
    },
    clearUpdateListeners() {
      for (const cleanup of this.listenerCleanups) {
        cleanup();
      }
      this.listenerCleanups = [];
    },
    async updateData(filters?: Record<string, unknown>) {
      if (!this.isListActive) return;
      const loadGeneration = ++this.loadGeneration;
      if (filters) {
        this.appliedFilters = cloneDeep(filters);
        this.resetPagination();
      }
      const baseFilters = cloneDeep(toRaw(this.filters));
      filters = cloneDeep(
        mergeListViewFilters(baseFilters, this.appliedFilters)
      );

      let statusFilter: [string, string] | undefined;

      if ('status' in filters) {
        statusFilter = filters['status'] as [string, string];
      }

      const isStatusFilter =
        Array.isArray(statusFilter) && statusFilter[0] === 'like';
      const statusColumn = (
        fyo.models[this.schemaName]?.getListViewSettings?.(fyo)?.columns ??
        this.listConfig?.columns
      )?.find(
        (column) =>
          typeof column !== 'string' &&
          column.fieldname === 'status' &&
          typeof column.render === 'function'
      );
      const renderStatus =
        typeof statusColumn === 'object' && statusColumn
          ? (statusColumn.render as (row: RenderData) => {
              template: string;
              metadata?: { status?: string };
            })
          : undefined;
      const usesRenderedStatus =
        isStatusFilter &&
        Boolean(renderStatus) &&
        !fyo.db.fieldMap[this.schemaName].status;
      if (usesRenderedStatus) {
        delete filters['status'];
      }

      const orderBy = ['created'];
      if (fyo.db.fieldMap[this.schemaName]['date']) {
        orderBy.unshift('date');
      }
      orderBy.push('name');

      const invoiceSchema =
        this.schemaName === 'SalesInvoice' ||
        this.schemaName === 'PurchaseInvoice';
      const usesAgeFilter = this.ageFilterDays > 0 && invoiceSchema;
      const usesDerivedFilters = usesRenderedStatus || usesAgeFilter;
      let totalCount = 0;
      let filteredData: RenderData[];
      const pageSize = Math.max(1, this.pageEnd - this.pageStart);
      const now = new Date();

      const matchesDerivedFilters = (row: RenderData) => {
        const renderData = {
          ...row,
          schema: fyo.schemaMap[this.schemaName],
        } as RenderData;

        if (
          usesRenderedStatus &&
          statusFilter?.[1] &&
          !matchesRenderedStatus(renderData, renderStatus, statusFilter[1])
        ) {
          return false;
        }

        if (usesAgeFilter) {
          if (
            !hasPositiveOutstandingAmount(row.outstandingAmount) ||
            Boolean(row.cancelled ?? row.isCancelled) ||
            !Boolean(row.submitted ?? row.isSubmitted)
          ) {
            return false;
          }
          const invoiceDate = new Date(row.date as string);
          if (Number.isNaN(invoiceDate.getTime())) {
            return false;
          }
          const age = Math.floor(
            (now.getTime() - invoiceDate.getTime()) / (24 * 60 * 60 * 1000)
          );
          if (age < this.ageFilterDays) {
            return false;
          }
        }

        return true;
      };

      const fetchRows = (offset: number, limit: number) =>
        fyo.db.getAll(this.schemaName, {
          fields: ['*'],
          filters: filters as QueryFilter,
          orderBy,
          offset,
          limit,
        });

      if (usesDerivedFilters) {
        const page = await scanFilteredPage(
          async (offset, limit) => {
            if (loadGeneration !== this.loadGeneration) {
              return Promise.resolve([]);
            }
            return (await fetchRows(offset, limit)) as unknown as RenderData[];
          },
          matchesDerivedFilters,
          this.pageStart,
          this.pageEnd
        );
        if (loadGeneration !== this.loadGeneration) {
          return;
        }

        totalCount = page.count;
        if (page.start !== this.pageStart) {
          this.pageStart = page.start;
          this.pageEnd = page.start + pageSize;
          this.paginationKey += 1;
        }
        filteredData = page.rows;
      } else {
        totalCount = await fyo.db.count(this.schemaName, {
          filters: filters as QueryFilter,
        });
        if (loadGeneration !== this.loadGeneration) {
          return;
        }

        const lastPageStart =
          totalCount === 0
            ? 0
            : Math.floor((totalCount - 1) / pageSize) * pageSize;
        if (this.pageStart > lastPageStart) {
          this.pageStart = lastPageStart;
          this.pageEnd = lastPageStart + pageSize;
          this.paginationKey += 1;
        }

        const tableData = await fyo.db.getAll(this.schemaName, {
          fields: ['*'],
          filters: filters as QueryFilter,
          orderBy,
          offset: this.pageStart,
          limit: pageSize,
        });
        if (loadGeneration !== this.loadGeneration) {
          return;
        }
        filteredData = tableData as RenderData[];
      }

      const itemSchema =
        this.schemaName === 'SalesInvoice'
          ? 'SalesInvoiceItem'
          : 'PurchaseInvoiceItem';
      const quantities: Record<string, Record<string, number>> = {};
      const showTotalQuantity = (this.listConfig?.columns ?? []).some(
        (column) =>
          (typeof column === 'string' ? column : column.fieldname) ===
          'totalQuantity'
      );
      if (invoiceSchema && showTotalQuantity && filteredData.length) {
        const parentNames = filteredData.map((row) => row.name as string);
        const itemRows = await fyo.db.getAllRaw(itemSchema, {
          fields: ['parent', 'quantity', 'unit'],
          filters: { parent: ['in', parentNames] },
        });
        if (loadGeneration !== this.loadGeneration) {
          return;
        }
        for (const item of itemRows) {
          const parent = String(item.parent ?? '');
          const unit = String(item.unit ?? 'Unit');
          quantities[parent] ??= {};
          quantities[parent][unit] ??= 0;
          quantities[parent][unit] += Number(item.quantity ?? 0);
        }
      }

      this.data = filteredData.map((d) => {
        const groupedQuantities = quantities[String(d.name)] ?? {};
        const invoiceAmounts = invoiceSchema
          ? getInvoiceFinancialAmounts(
              {
                baseGrandTotal: d.baseGrandTotal as Money | undefined,
                outstandingAmount: d.outstandingAmount as Money | undefined,
                isSubmitted: Boolean(d.submitted ?? d.isSubmitted),
                isCancelled: Boolean(d.cancelled ?? d.isCancelled),
              },
              fyo
            )
          : undefined;
        return {
          ...d,
          ...(invoiceAmounts
            ? {
                paidAmount: invoiceAmounts.paidAmount,
                dueAmount: invoiceAmounts.dueAmount,
                totalQuantity: formatGroupedQuantities(groupedQuantities),
              }
            : {}),
          schema: fyo.schemaMap[this.schemaName],
        };
      }) as RenderData[];
      this.totalCount = totalCount;
      this.$emit('updatedData', filters);
    },
    toggleItemSelection(itemName: string) {
      const index = this.selectedItems.indexOf(itemName);
      if (index > -1) {
        this.selectedItems.splice(index, 1);
      } else {
        this.selectedItems.push(itemName);
      }
      this.$emit('selected-items-changed', this.selectedItems);
    },
    toggleSelectAll(checked: boolean) {
      const pageNames = this.data.map((row) => row.name as string);
      this.selectedItems = checked
        ? [...new Set([...this.selectedItems, ...pageNames])]
        : this.selectedItems.filter((name) => !pageNames.includes(name));
      this.$emit('selected-items-changed', this.selectedItems);
    },
  },
});
</script>

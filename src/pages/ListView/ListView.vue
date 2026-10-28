<template>
  <div class="flex flex-col">
    <PageHeader :title="title">
      <Button
        v-if="
          schemaName === 'Item' &&
          (!isSelectionMode || (isSelectionMode && selectedItems.length === 0))
        "
        @click="toggleSelectionMode"
      >
        {{ t`Select` }}
      </Button>
      <div
        v-if="
          isSelectionMode && schemaName === 'Item' && selectedItems.length > 0
        "
        class="relative"
      >
        <Button class="w-40" @click="toggleDropdown"> Create </Button>
        <div
          v-if="showDropdown"
          class="
            absolute
            top-full
            mt-1
            bg-white
            border border-gray-300
            rounded
            shadow-lg
            z-10
            w-40
          "
        >
          <div
            v-for="option in actionOptions"
            :key="option.value"
            class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
            @click="createInvoice(option.value)"
          >
            {{ option.label }}
          </div>
        </div>
      </div>
      <Button ref="exportButton" :icon="false" @click="openExportModal = true">
        {{ t`Export` }}
      </Button>
      <FilterDropdown
        ref="filterDropdown"
        :schema-name="schemaName"
        @change="applyFilter"
      />
      <select
        v-if="isInvoiceList"
        class="
          h-8
          px-2
          border
          rounded
          bg-white
          dark:bg-gray-850 dark:border-gray-700
          text-sm
        "
        :value="ageFilterDays"
        aria-label="Invoice age filter"
        @change="setAgeFilter"
      >
        <option :value="0">All invoice ages</option>
        <option :value="30">30+ days since invoice date</option>
        <option :value="60">60+ days since invoice date</option>
        <option :value="90">90+ days since invoice date</option>
      </select>
      <Button v-if="isInvoiceList" @click="showColumnSettings = true">
        {{ t`Columns` }}
      </Button>
      <Button
        v-if="canCreate"
        ref="makeNewDocButton"
        :icon="true"
        type="primary"
        :padding="false"
        class="px-3"
        @click="handleMakeNewDoc"
      >
        <feather-icon name="plus" class="w-4 h-4" />
      </Button>
    </PageHeader>
    <List
      ref="list"
      :schema-name="schemaName"
      :list-config="listConfig"
      :age-filter-days="ageFilterDays"
      :filters="filters"
      :can-create="canCreate"
      :is-selection-mode="isSelectionMode"
      class="flex-1 flex h-full"
      @open-doc="openDoc"
      @updated-data="updatedData"
      @make-new-doc="makeNewDoc"
      @selected-items-changed="updateSelectedItems"
    />
    <Modal :open-modal="openExportModal" @closemodal="openExportModal = false">
      <ExportWizard
        class="w-form"
        :schema-name="schemaName"
        :title="pageTitle"
        :list-filters="listFilters"
      />
    </Modal>
    <Modal
      :open-modal="showColumnSettings"
      @closemodal="showColumnSettings = false"
    >
      <div class="w-form p-4">
        <h2 class="text-lg font-semibold mb-1">Invoice list columns</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose visible columns and use the arrows to change their order. Saved
          for this company.
        </p>
        <p class="text-xs uppercase text-gray-500 mt-2">Visible order</p>
        <div
          v-for="(id, index) in columnIds"
          :key="id"
          class="flex items-center gap-2 py-1"
        >
          <span class="flex-1">{{ columnLabel(id) }}</span>
          <Button :disabled="index === 0" @click="moveColumn(index, -1)"
            >↑</Button
          >
          <Button
            :disabled="index === columnIds.length - 1"
            @click="moveColumn(index, 1)"
            >↓</Button
          >
        </div>
        <p class="text-xs uppercase text-gray-500 mt-4">Show columns</p>
        <div v-for="option in columnOptions" :key="option.id" class="py-1">
          <Check
            :df="{
              fieldtype: 'Check',
              fieldname: option.id,
              label: option.label,
              readOnly: option.id === 'name',
            }"
            :show-label="true"
            :value="columnIds.includes(option.id)"
            @change="(visible: boolean) => toggleColumn(option.id, visible)"
          />
        </div>
        <div class="mt-4 flex justify-end">
          <Button type="primary" @click="saveColumns">{{ t`Done` }}</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>
<script lang="ts">
import { Field } from 'schemas/types';
import { ListViewColumn } from 'fyo/model/types';
import Button from 'src/components/Button.vue';
import Check from 'src/components/Controls/Check.vue';
import ExportWizard from 'src/components/ExportWizard.vue';
import FilterDropdown from 'src/components/FilterDropdown.vue';
import Modal from 'src/components/Modal.vue';
import PageHeader from 'src/components/PageHeader.vue';

import { fyo } from 'src/initFyo';
import { shortcutsKey } from 'src/utils/injectionKeys';
import {
  docsPathMap,
  getCreateFiltersFromListViewFilters,
} from 'src/utils/misc';
import { docsPathRef } from 'src/utils/refs';
import { getFormRoute, routeTo } from 'src/utils/ui';
import { canCreateSchema } from 'src/utils/featurePolicy';
import { sanitizeVisibleColumns } from './helpers';
import { QueryFilter } from 'utils/db/types';
import { defineComponent, inject, ref } from 'vue';
import List from './List.vue';
import { Money } from 'pesa';
import { ModelNameEnum } from 'models/types';

export default defineComponent({
  name: 'ListView',
  components: {
    PageHeader,
    List,
    Button,
    Check,
    FilterDropdown,
    Modal,
    ExportWizard,
  },
  props: {
    schemaName: { type: String, required: true },
    filters: { type: Object, default: undefined },
    pageTitle: { type: String, default: '' },
  },
  setup() {
    return {
      shortcuts: inject(shortcutsKey),
      list: ref<InstanceType<typeof List> | null>(null),
      makeNewDocButton: ref<InstanceType<typeof Button> | null>(null),
      exportButton: ref<InstanceType<typeof Button> | null>(null),
      filterDropdown: ref<InstanceType<typeof FilterDropdown> | null>(null),
    };
  },
  data() {
    return {
      listConfig: undefined,
      openExportModal: false,
      listFilters: {},
      isSelectionMode: false,
      showDropdown: false,
      selectedItems: [] as string[],
      showColumnSettings: false,
      ageFilterDays: 0,
      columnIds: [] as string[],
    } as {
      listConfig: undefined | ReturnType<typeof getListConfig>;
      openExportModal: boolean;
      listFilters: QueryFilter;
      isSelectionMode: boolean;
      showDropdown: boolean;
      selectedItems: string[];
      showColumnSettings: boolean;
      ageFilterDays: number;
      columnIds: string[];
    };
  },
  computed: {
    context(): string {
      return 'ListView-' + this.schemaName;
    },
    title(): string {
      if (this.pageTitle) {
        return this.pageTitle;
      }

      return fyo.schemaMap[this.schemaName]?.label ?? this.schemaName;
    },
    fields(): Field[] {
      return fyo.schemaMap[this.schemaName]?.fields ?? [];
    },
    canCreate(): boolean {
      return (
        fyo.schemaMap[this.schemaName]?.create !== false &&
        canCreateSchema(fyo, this.schemaName)
      );
    },
    actionOptions(): { value: string; label: string }[] {
      return [
        { value: 'SalesQuote', label: 'Sales Quote' },
        { value: 'SalesInvoice', label: 'Sales Invoice' },
        { value: 'PurchaseInvoice', label: 'Purchase Invoice' },
      ].filter(({ value }) => canCreateSchema(fyo, value));
    },
    isInvoiceList(): boolean {
      return ['SalesInvoice', 'PurchaseInvoice'].includes(this.schemaName);
    },
    columnOptions(): { id: string; label: string }[] {
      const columns = getListConfig(this.schemaName).columns ?? [];
      return columns.map((column) => {
        if (typeof column === 'string') {
          const field = fyo.getField(this.schemaName, column);
          return { id: column, label: field?.label ?? column };
        }
        return {
          id: column.fieldname,
          label: column.label || column.fieldname,
        };
      });
    },
  },
  watch: {
    schemaName() {
      this.ageFilterDays = 0;
      this.loadListViewConfig();
    },
  },
  activated() {
    this.loadListViewConfig();
    docsPathRef.value =
      docsPathMap[this.schemaName] ?? docsPathMap.Entries ?? '';

    if (this.fyo.store.isDevelopment) {
      // @ts-ignore
      window.lv = this;
    }

    this.setShortcuts();
  },
  deactivated() {
    docsPathRef.value = '';
    this.shortcuts?.delete(this.context);
  },
  methods: {
    loadListViewConfig() {
      const defaults = getListConfig(this.schemaName);
      const defaultIds = (defaults.columns ?? []).map(getColumnId);
      this.columnIds = sanitizeVisibleColumns(defaultIds, defaultIds);
      if (this.isInvoiceList && typeof localStorage !== 'undefined') {
        try {
          const stored = localStorage.getItem(
            getColumnStorageKey(this.schemaName)
          );
          const saved =
            stored === null ? null : (JSON.parse(stored) as unknown);
          if (Array.isArray(saved)) {
            this.columnIds = sanitizeVisibleColumns(defaultIds, saved);
          }
        } catch {
          this.columnIds = sanitizeVisibleColumns(defaultIds, defaultIds);
        }
      }
      this.applyColumnIds();
    },
    applyColumnIds() {
      const defaults = getListConfig(this.schemaName);
      const columns = defaults.columns ?? [];
      const selectedColumns: ListViewColumn[] = [];
      for (const id of this.columnIds) {
        const column = columns.find(
          (candidate) => getColumnId(candidate) === id
        );
        if (column) {
          selectedColumns.push(column);
        }
      }
      this.listConfig = {
        ...defaults,
        columns: selectedColumns,
      };
    },
    toggleColumn(id: string, visible: boolean) {
      if (id === 'name') {
        return;
      }
      if (visible && !this.columnIds.includes(id)) {
        this.columnIds.push(id);
      } else if (!visible) {
        this.columnIds = this.columnIds.filter((column) => column !== id);
      }
    },
    moveColumn(index: number, offset: number) {
      const nextIndex = index + offset;
      if (index === 0 || nextIndex < 1 || nextIndex >= this.columnIds.length) {
        return;
      }
      const next = [...this.columnIds];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      this.columnIds = next;
    },
    columnLabel(id: string): string {
      return this.columnOptions.find((option) => option.id === id)?.label ?? id;
    },
    saveColumns() {
      this.applyColumnIds();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          getColumnStorageKey(this.schemaName),
          JSON.stringify(this.columnIds)
        );
      }
      this.showColumnSettings = false;
    },
    setAgeFilter(event: Event) {
      this.ageFilterDays = Number((event.target as HTMLSelectElement).value);
    },
    setShortcuts() {
      if (!this.shortcuts) {
        return;
      }

      this.shortcuts.pmod.set(this.context, ['KeyN'], () =>
        this.makeNewDocButton?.$el.click()
      );
      this.shortcuts.pmod.set(this.context, ['KeyE'], () =>
        this.exportButton?.$el.click()
      );
    },
    updatedData(listFilters: QueryFilter) {
      this.listFilters = listFilters;
    },
    async openDoc(name: string) {
      const route = getFormRoute(this.schemaName, name);
      await routeTo(route);
    },
    async makeNewDoc() {
      if (!this.canCreate) {
        return;
      }

      const filters = getCreateFiltersFromListViewFilters(this.filters ?? {});
      const doc = fyo.doc.getNewDoc(this.schemaName, filters);
      const route = getFormRoute(this.schemaName, doc.name!);
      await routeTo(route);
    },
    async handleMakeNewDoc() {
      await this.makeNewDoc();
    },
    applyFilter(filters: QueryFilter) {
      this.list?.updateData(filters);
    },
    toggleSelectionMode() {
      this.isSelectionMode = !this.isSelectionMode;
      if (!this.isSelectionMode) {
        this.showDropdown = false;
        this.selectedItems = [];
      }
    },
    toggleDropdown() {
      this.showDropdown = !this.showDropdown;
    },
    async createInvoice(value: string) {
      if (
        value === ModelNameEnum.SalesQuote ||
        value === ModelNameEnum.SalesInvoice ||
        value === ModelNameEnum.PurchaseInvoice
      ) {
        const doc = fyo.doc.getNewDoc(value);

        for (const itemName of this.selectedItems) {
          const itemDoc = await fyo.doc.getDoc('Item', itemName);

          const itemRow = {
            item: itemName,
            rate: (itemDoc.rate as Money) || fyo.pesa(0),
            quantity: 1,
          };

          await doc.append('items', itemRow);
        }

        const route = getFormRoute(value, doc.name!);
        await routeTo(route);
        this.selectedItems = [];
        this.isSelectionMode = false;
        this.showDropdown = false;
      }
    },

    updateSelectedItems(selected: string[]) {
      this.selectedItems = selected;
    },
  },
});

function getListConfig(schemaName: string) {
  const listConfig = fyo.models[schemaName]?.getListViewSettings?.(fyo);
  if (listConfig?.columns === undefined) {
    return {
      columns: ['name'],
    };
  }
  return listConfig;
}

function getColumnId(column: string | { fieldname: string }): string {
  return typeof column === 'string' ? column : column.fieldname;
}

function getColumnStorageKey(schemaName: string): string {
  const companyDatabase = fyo.db.dbPath ?? 'current-company';
  return `nivo-list-columns:${companyDatabase}:${schemaName}`;
}
</script>

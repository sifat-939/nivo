<template>
  <FormContainer :use-full-width="useFullWidth">
    <template v-if="hasDoc" #header-left>
      <Barcode
        v-if="canShowBarcode"
        class="h-8"
        @item-selected="(name:string) => {
          // @ts-ignore
          doc?.addItem(name);
        }"
      />
      <ExchangeRate
        v-if="canShowExchangeRate"
        :disabled="doc?.isSubmitted || doc?.isCancelled"
        :from-currency="fromCurrency"
        :to-currency="toCurrency"
        :exchange-rate="exchangeRate"
        @change="
          async (exchangeRate: number) =>
            await doc.set('exchangeRate', exchangeRate)
        "
      />
      <p
        v-if="schema.label && !(canShowBarcode || canShowExchangeRate)"
        class="text-xl font-semibold items-center text-gray-600"
      >
        {{ schema.label }}
      </p>
    </template>
    <template v-if="hasDoc" #header>
      <Button
        v-if="canShowLinks"
        :icon="true"
        :title="t`View linked entries`"
        @click="showLinks = true"
      >
        <feather-icon name="link" class="w-4 h-4"></feather-icon>
      </Button>
      <Button
        v-if="canPrint"
        ref="printButton"
        :icon="true"
        :title="t`Open Print View`"
        @click="routeTo(`/print/${doc.schemaName}/${doc.name}`)"
      >
        <feather-icon name="printer" class="w-4 h-4"></feather-icon>
      </Button>
      <Button
        :icon="true"
        :title="t`Toggle between form and full width`"
        @click="toggleWidth"
      >
        <feather-icon
          :name="useFullWidth ? 'minimize' : 'maximize'"
          class="w-4 h-4"
        ></feather-icon>
      </Button>
      <DropdownWithActions
        v-for="group of groupedActions"
        :key="group.label"
        :type="group.type"
        :actions="group.actions"
      >
        <p v-if="group.group">
          {{ group.group }}
        </p>
        <feather-icon v-else name="more-horizontal" class="w-4 h-4" />
      </DropdownWithActions>
      <Button v-if="doc?.canSave" type="primary" @click="sync">
        {{ t`Save` }}
      </Button>
      <Button v-else-if="doc?.canSubmit" type="primary" @click="submit">{{
        t`Submit`
      }}</Button>
    </template>
    <template #body>
      <FormHeader
        :form-title="title"
        class="
          sticky
          top-0
          bg-white
          dark:bg-gray-890
          border-b
          dark:border-gray-800
        "
      >
        <StatusPill v-if="hasDoc" :doc="doc" />
      </FormHeader>

      <!-- Section Container -->
      <div
        v-if="hasDoc"
        class="overflow-auto custom-scroll custom-scroll-thumb1"
      >
        <template
          v-for="([n, fields], idx) in activeGroup.entries()"
          :key="n + idx"
        >
          <CommonFormSection
            ref="sections"
            class="p-4"
            :class="
              idx !== 0 && activeGroup.size > 1
                ? 'border-t dark:border-gray-800'
                : ''
            "
            :show-title="activeGroup.size > 1 && n !== t`Default`"
            :title="n"
            :fields="fields"
            :doc="doc"
            :errors="errors"
            @editrow="(doc: Doc) => showRowEditForm(doc)"
            @value-change="onValueChange"
            @row-change="updateGroupedFields"
          />
          <div
            v-if="showInvoiceFinancialSummary && n === t`Items`"
            class="
              nivo-invoice-summary
              mx-4
              my-3
              text-gray-900
              dark:text-gray-100
            "
          >
            <div class="grid grid-cols-3 gap-2 text-sm">
              <div
                class="min-w-0 rounded border dark:border-gray-800 px-3 py-2"
              >
                <div class="text-gray-600 dark:text-gray-400">
                  {{ t`Final Amount` }}
                </div>
                <div class="font-semibold">
                  {{ formatInvoiceAmount(finalAmount) }}
                </div>
              </div>
              <div
                class="min-w-0 rounded border dark:border-gray-800 px-3 py-2"
              >
                <div class="text-gray-600 dark:text-gray-400">
                  {{ t`Settled / Adjusted` }}
                </div>
                <div class="font-semibold">
                  {{ formatInvoiceAmount(paidAmount) }}
                </div>
              </div>
              <div
                class="min-w-0 rounded border dark:border-gray-800 px-3 py-2"
              >
                <div class="text-gray-600 dark:text-gray-400">{{ t`Due` }}</div>
                <div class="font-semibold">
                  {{ formatInvoiceAmount(dueAmount) }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Tab Bar -->
      <div
        v-if="groupedFields && groupedFields.size > 1"
        class="
          mt-auto
          px-4
          pb-4
          flex
          gap-8
          border-t
          dark:border-gray-800
          flex-shrink-0
          sticky
          bottom-0
          bg-white
          dark:bg-gray-875
        "
      >
        <div
          v-for="key of groupedFields.keys()"
          :key="key"
          class="text-sm cursor-pointer"
          :class="
            key === activeTab
              ? 'text-gray-900 dark:text-gray-25 font-semibold border-t-2 border-gray-800 dark:border-gray-100'
              : 'text-gray-700 dark:text-gray-200 '
          "
          :style="{
            paddingTop: key === activeTab ? 'calc(1rem - 2px)' : '1rem',
          }"
          @click="activeTab = key"
        >
          {{ key }}
        </div>
      </div>
    </template>
    <template #quickedit>
      <Transition name="quickedit">
        <LinkedEntries
          v-if="showLinks && canShowLinks"
          :doc="doc"
          @close="showLinks = false"
        />
      </Transition>
      <Transition name="quickedit">
        <RowEditForm
          v-if="row && !showLinks"
          ref="rowEditForm"
          :doc="doc"
          :fieldname="row.fieldname"
          :index="row.index"
          @previous="navigateRowEdit"
          @next="navigateRowEdit"
          @close="() => (row = null)"
        />
      </Transition>
    </template>
  </FormContainer>
</template>
<script lang="ts">
import { DocValue } from 'fyo/core/types';
import { Doc } from 'fyo/model/doc';
import { DEFAULT_CURRENCY } from 'fyo/utils/consts';
import { ValidationError } from 'fyo/utils/errors';
import { getDocStatus } from 'models/helpers';
import { ModelNameEnum } from 'models/types';
import { Money } from 'pesa';
import { Field, Schema } from 'schemas/types';
import Button from 'src/components/Button.vue';
import Barcode from 'src/components/Controls/Barcode.vue';
import ExchangeRate from 'src/components/Controls/ExchangeRate.vue';
import DropdownWithActions from 'src/components/DropdownWithActions.vue';
import FormContainer from 'src/components/FormContainer.vue';
import FormHeader from 'src/components/FormHeader.vue';
import StatusPill from 'src/components/StatusPill.vue';
import { getErrorMessage } from 'src/utils';
import { shortcutsKey } from 'src/utils/injectionKeys';
import { docsPathMap } from 'src/utils/misc';
import { docsPathRef } from 'src/utils/refs';
import { isSchemaCreationBlocked } from 'src/utils/featurePolicy';
import { ActionGroup, DocRef, UIGroupedFields } from 'src/utils/types';
import {
  commonDocSubmit,
  commonDocSync,
  getDocFromNameIfExistsElseNew,
  getFieldsGroupedByTabAndSection,
  getFormRoute,
  getGroupedActionsForDoc,
  isPrintable,
  routeTo,
} from 'src/utils/ui';
import { useDocShortcuts } from 'src/utils/vueUtils';
import { computed, defineComponent, inject, nextTick, ref } from 'vue';
import CommonFormSection from './CommonFormSection.vue';
import { getInvoiceFinancialAmounts } from './invoiceFinancials';
import LinkedEntries from './LinkedEntries.vue';
import RowEditForm from './RowEditForm.vue';

export default defineComponent({
  components: {
    FormContainer,
    FormHeader,
    CommonFormSection,
    Button,
    DropdownWithActions,
    Barcode,
    ExchangeRate,
    LinkedEntries,
    RowEditForm,
    StatusPill,
  },
  provide() {
    return {
      doc: computed(() => this.docOrNull),
    };
  },
  props: {
    name: { type: String, default: '' },
    schemaName: { type: String, default: ModelNameEnum.SalesInvoice },
  },
  setup() {
    const shortcuts = inject(shortcutsKey);
    const docOrNull = ref(null) as DocRef;
    const rowEditForm = ref<InstanceType<typeof RowEditForm> | null>(null);
    const sections = ref<{ flushChanges: () => Promise<boolean> }[]>([]);
    const errors = ref({} as Record<string, string>);
    const pendingChanges = ref(Promise.resolve());
    const flushChanges = async () => {
      const rowIsValid = await rowEditForm.value?.flushChanges();
      if (rowIsValid === false) {
        return false;
      }
      const sectionResults = await Promise.all(
        sections.value.map((section) => section.flushChanges())
      );
      if (sectionResults.some((valid) => !valid)) {
        return false;
      }
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        !active.closest('.nivo-quick-edit')
      ) {
        active.blur();
      }
      let pending: Promise<void>;
      do {
        pending = pendingChanges.value;
        await pending;
      } while (pending !== pendingChanges.value);
      return Object.keys(errors.value).length === 0;
    };
    let context = 'CommonForm';
    if (shortcuts) {
      context = useDocShortcuts(
        shortcuts,
        docOrNull,
        'CommonForm',
        true,
        flushChanges
      );
    }

    return {
      docOrNull,
      rowEditForm,
      sections,
      errors,
      pendingChanges,
      flushChanges,
      shortcuts,
      context,
      printButton: ref<InstanceType<typeof Button> | null>(null),
    };
  },
  data() {
    return {
      activeTab: this.t`Default`,
      groupedFields: null,
      isPrintable: false,
      showLinks: false,
      useFullWidth: false,
      row: null,
    } as {
      activeTab: string;
      groupedFields: null | UIGroupedFields;
      isPrintable: boolean;
      showLinks: boolean;
      useFullWidth: boolean;
      row: null | { index: number; fieldname: string };
    };
  },
  computed: {
    showInvoiceFinancialSummary(): boolean {
      return (
        this.hasDoc &&
        ['SalesInvoice', 'PurchaseInvoice'].includes(this.doc.schemaName)
      );
    },
    invoiceFinancialAmounts() {
      return getInvoiceFinancialAmounts(
        {
          baseGrandTotal: this.doc?.baseGrandTotal as Money | undefined,
          outstandingAmount: this.doc?.outstandingAmount as Money | undefined,
          isSubmitted: !!this.doc?.isSubmitted,
          isCancelled: !!this.doc?.isCancelled,
        },
        this.fyo
      );
    },
    finalAmount(): DocValue {
      return this.invoiceFinancialAmounts.finalAmount;
    },
    dueAmount(): DocValue {
      return this.invoiceFinancialAmounts.dueAmount;
    },
    paidAmount(): DocValue {
      return this.invoiceFinancialAmounts.paidAmount;
    },
    canShowBarcode(): boolean {
      if (!this.fyo.singles.InventorySettings?.enableBarcodes) {
        return false;
      }

      if (!this.hasDoc) {
        return false;
      }

      if (this.doc.isSubmitted || this.doc.isCancelled) {
        return false;
      }

      // @ts-ignore
      return typeof this.doc?.addItem === 'function';
    },
    canShowExchangeRate(): boolean {
      return this.hasDoc && !!this.doc.isMultiCurrency;
    },
    exchangeRate(): number {
      if (!this.hasDoc || typeof this.doc.exchangeRate !== 'number') {
        return 1;
      }

      return this.doc.exchangeRate;
    },
    fromCurrency(): string {
      const currency = this.doc?.currency;
      if (typeof currency !== 'string') {
        return this.toCurrency;
      }

      return currency;
    },
    toCurrency(): string {
      const currency = this.fyo.singles.SystemSettings?.currency;
      if (typeof currency !== 'string') {
        return DEFAULT_CURRENCY;
      }

      return currency;
    },
    canPrint(): boolean {
      if (!this.hasDoc) {
        return false;
      }

      return !this.doc.isCancelled && !this.doc.dirty && this.isPrintable;
    },
    canShowLinks(): boolean {
      if (!this.hasDoc) {
        return false;
      }

      if (this.doc.schema.isSubmittable && !this.doc.isSubmitted) {
        return false;
      }

      return this.doc.inserted;
    },
    hasDoc(): boolean {
      return this.docOrNull instanceof Doc;
    },
    status(): string {
      if (!this.hasDoc) {
        return '';
      }

      return getDocStatus(this.doc);
    },
    doc(): Doc {
      const doc = this.docOrNull;
      if (!doc) {
        throw new ValidationError(
          this.t`Doc ${this.schema.label} ${this.name} not set`
        );
      }
      return doc;
    },
    title(): string {
      if (this.schema.isSubmittable && this.docOrNull?.notInserted) {
        return this.t`New Entry`;
      }

      return this.docOrNull?.name || this.t`New Entry`;
    },
    schema(): Schema {
      const schema = this.fyo.schemaMap[this.schemaName];
      if (!schema) {
        throw new ValidationError(`no schema found with ${this.schemaName}`);
      }

      return schema;
    },
    activeGroup(): Map<string, Field[]> {
      if (!this.groupedFields) {
        return new Map();
      }

      const group = this.groupedFields.get(this.activeTab);
      if (!group) {
        const tab = [...this.groupedFields.keys()][0];
        return this.groupedFields.get(tab) ?? new Map<string, Field[]>();
      }

      return group;
    },
    groupedActions(): ActionGroup[] {
      if (!this.hasDoc) {
        return [];
      }

      return getGroupedActionsForDoc(this.doc);
    },
  },
  beforeMount() {
    this.useFullWidth = !!this.fyo.singles.Misc?.useFullWidth;
  },
  async mounted() {
    if (this.fyo.store.isDevelopment) {
      // @ts-ignore
      window.cf = this;
    }

    await this.setDoc();
    this.replacePathAfterSync();
    this.updateGroupedFields();
    if (this.groupedFields) {
      this.activeTab = [...this.groupedFields.keys()][0];
    }
    this.isPrintable = await isPrintable(this.schemaName);
  },
  activated(): void {
    this.useFullWidth = !!this.fyo.singles.Misc?.useFullWidth;
    docsPathRef.value = docsPathMap[this.schemaName] ?? '';
    this.shortcuts?.pmod.set(this.context, ['KeyP'], () => {
      if (!this.canPrint) {
        return;
      }

      this.printButton?.$el.click();
    });
    this.shortcuts?.pmod.set(this.context, ['KeyL'], () => {
      if (!this.canShowLinks && !this.showLinks) {
        return;
      }

      this.showLinks = !this.showLinks;
    });
  },
  deactivated(): void {
    docsPathRef.value = '';
    this.showLinks = false;
    this.row = null;
  },
  methods: {
    routeTo,
    formatInvoiceAmount(value: DocValue): string {
      return this.fyo.format(value, 'Currency');
    },
    async toggleWidth() {
      const value = !this.useFullWidth;
      await this.fyo.singles.Misc?.setAndSync('useFullWidth', value);
      this.useFullWidth = value;
    },
    updateGroupedFields(): void {
      if (!this.hasDoc) {
        return;
      }

      this.groupedFields = getFieldsGroupedByTabAndSection(
        this.schema,
        this.doc
      );
      if (this.showInvoiceFinancialSummary) {
        for (const groups of this.groupedFields.values()) {
          for (const [section, fields] of groups.entries()) {
            const visible = fields.filter(
              ({ fieldname }) =>
                fieldname !== 'netTotal' &&
                fieldname !== 'outstandingAmount' &&
                fieldname !== 'stockNotTransferred'
            );
            if (visible.length) {
              groups.set(section, visible);
            } else {
              groups.delete(section);
            }
          }
        }
      }
    },
    async sync(useDialog?: boolean) {
      if (!(await this.flushChanges())) {
        return;
      }
      if (await commonDocSync(this.doc, useDialog)) {
        this.updateGroupedFields();
      }
    },
    async submit() {
      if (!(await this.flushChanges())) {
        return;
      }
      if (await commonDocSubmit(this.doc)) {
        this.updateGroupedFields();
      }
    },
    async setDoc() {
      if (this.hasDoc) {
        return;
      }

      this.docOrNull = await getDocFromNameIfExistsElseNew(
        this.schemaName,
        this.name
      );
      this.errors = {};
      // Keep historical records readable while blocking disabled new records.
      if (
        isSchemaCreationBlocked(
          this.fyo,
          this.schemaName,
          !!this.docOrNull?.notInserted
        )
      ) {
        await this.$router.replace('/');
      }
    },
    replacePathAfterSync() {
      if (!this.hasDoc || this.doc.inserted) {
        return;
      }

      this.doc.once('afterSync', async () => {
        const route = getFormRoute(this.schemaName, this.doc.name!);
        await this.$router.replace(route);
      });
    },
    async showRowEditForm(doc: Doc) {
      if (this.showLinks) {
        this.showLinks = false;
        await nextTick();
      }

      const index = doc.idx;
      const fieldname = doc.parentFieldname;

      if (typeof index === 'number' && typeof fieldname === 'string') {
        this.row = { index, fieldname };
      }
    },
    async navigateRowEdit(index: number) {
      if (!(await this.rowEditForm?.flushChanges())) {
        return;
      }
      if (this.row) {
        this.row.index = index;
      }
    },
    onValueChange(field: Field, value: DocValue) {
      const { fieldname } = field;
      this.pendingChanges = this.pendingChanges.then(async () => {
        delete this.errors[fieldname];
        try {
          await this.doc.set(fieldname, value);
        } catch (err) {
          if (err instanceof Error) {
            this.errors[fieldname] = getErrorMessage(err, this.doc);
          }
        }
        this.updateGroupedFields();
      });
      return this.pendingChanges;
    },
  },
});
</script>

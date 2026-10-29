<template>
  <div class="flex flex-col flex-1 bg-gray-25 dark:bg-gray-875">
    <PageHeader :border="true" :title="t`Print View`">
      <AutoComplete
        v-if="templateList.length > 1"
        :df="{
          fieldtype: 'AutoComplete',
          fieldname: 'templateName',
          label: t`Template Name`,
          options: templateList.map((n) => ({ label: n, value: n })),
        }"
        input-class="text-base py-0 h-8"
        class="w-40"
        :border="true"
        :value="templateName ?? ''"
        @change="onTemplateNameChange"
      />
      <DropdownWithActions :actions="actions" :title="t`More`" />
      <Button class="text-xs" type="primary" @click="savePDF()">
        {{ t`Save as PDF` }}
      </Button>
      <Button class="text-xs" type="primary" @click="savePDF(true)">
        {{ t`Print` }}
      </Button>
    </PageHeader>

    <div
      v-if="schemaName === 'Party'"
      class="flex gap-4 p-4 border-b dark:border-gray-800"
    >
      <FormControl
        :df="{ fieldtype: 'Date', fieldname: 'from', label: 'From Date' }"
        :show-label="true"
        :value="fromDate"
        @change="setStatementFrom"
      />
      <FormControl
        :df="{ fieldtype: 'Date', fieldname: 'to', label: 'To Date' }"
        :show-label="true"
        :value="toDate"
        @change="setStatementTo"
      />
    </div>
    <!-- Template Display Area -->
    <div class="overflow-auto custom-scroll custom-scroll-thumb1 p-4">
      <!-- Display Hints -->
      <div
        v-if="helperMessage"
        class="text-sm text-gray-700 dark:text-gray-300"
      >
        {{ helperMessage }}
      </div>

      <!-- Template Container -->
      <PrintContainer
        v-if="printProps"
        ref="printContainer"
        :print-schema-name="schemaName"
        :template="printProps.template"
        :values="printProps.values"
        :scale="scale"
        :width="templateDoc?.width"
        :height="templateDoc?.height"
      />
    </div>
  </div>
</template>
<script lang="ts">
import { printTemplateFilter, dateKey } from 'utils/standardPrint';
import { Doc } from 'fyo/model/doc';
import { Action } from 'fyo/model/types';
import { PrintTemplate } from 'models/baseModels/PrintTemplate';
import { ModelNameEnum } from 'models/types';
import Button from 'src/components/Button.vue';
import AutoComplete from 'src/components/Controls/AutoComplete.vue';
import DropdownWithActions from 'src/components/DropdownWithActions.vue';
import PageHeader from 'src/components/PageHeader.vue';
import FormControl from 'src/components/Controls/FormControl.vue';
import { handleErrorWithDialog } from 'src/errorHandling';
import { fyo } from 'src/initFyo';
import { getPrintTemplatePropValues } from 'src/utils/printTemplates';
import { showSidebar } from 'src/utils/refs';
import { PrintValues } from 'src/utils/types';
import { getFormRoute, openSettings, routeTo } from 'src/utils/ui';
import { defineComponent } from 'vue';
import PrintContainer from '../TemplateBuilder/PrintContainer.vue';

export default defineComponent({
  name: 'PrintView',
  components: {
    PageHeader,
    FormControl,
    Button,
    AutoComplete,
    PrintContainer,
    DropdownWithActions,
  },
  props: {
    schemaName: { type: String, required: true },
    name: { type: String, required: true },
  },
  data() {
    return {
      fromDate: '',
      toDate: dateKey(new Date()),
      doc: null,
      scale: 1,
      values: null,
      templateDoc: null,
      templateName: null,
      templateList: [],
    } as {
      fromDate: string;
      toDate: string;
      doc: null | Doc;
      scale: number;
      values: null | PrintValues;
      templateDoc: null | PrintTemplate;
      templateName: null | string;
      templateList: string[];
    };
  },
  computed: {
    helperMessage() {
      if (!this.templateList.length) {
        const label =
          this.fyo.schemaMap[this.schemaName]?.label ?? this.schemaName;

        return this.t`No Print Templates not found for entry type ${label}`;
      }

      if (!this.templateDoc) {
        return this.t`Please select a Print Template`;
      }

      return '';
    },
    printProps(): null | { template: string; values: PrintValues } {
      const values = this.values;
      if (!values) {
        return null;
      }

      const template = this.templateDoc?.template;
      if (!template) {
        return null;
      }

      return { values, template };
    },
    actions(): Action[] {
      const actions = [
        {
          label: this.t`Print Settings`,
          group: this.t`View`,
          async action() {
            await openSettings(ModelNameEnum.PrintSettings);
          },
        },
      ];

      const templateDocName = this.templateDoc?.name;
      if (templateDocName) {
        actions.push({
          label: templateDocName,
          group: this.t`View`,
          action: async () => {
            const route = getFormRoute(
              ModelNameEnum.PrintTemplate,
              templateDocName
            );
            await routeTo(route);
          },
        });
      }

      return actions;
    },
  },
  async mounted() {
    await this.initialize();
    if (fyo.store.isDevelopment) {
      // @ts-ignore
      window.pv = this;
    }
  },
  async activated() {
    await this.initialize();
  },
  unmounted() {
    this.reset();
  },
  deactivated() {
    this.reset();
  },
  methods: {
    async setStatementFrom(value: unknown) {
      this.fromDate =
        value instanceof Date && !Number.isNaN(value.valueOf())
          ? dateKey(value)
          : typeof value === 'string'
          ? value
          : '';
      await this.refreshStatement();
    },
    async setStatementTo(value: unknown) {
      this.toDate =
        value instanceof Date && !Number.isNaN(value.valueOf())
          ? dateKey(value)
          : typeof value === 'string' && value
          ? value
          : dateKey(new Date());
      await this.refreshStatement();
    },
    async refreshStatement() {
      if (!this.doc) return;
      try {
        this.values = await getPrintTemplatePropValues(this.doc as Doc, {
          from: this.fromDate,
          to: this.toDate,
        });
      } catch (error) {
        this.values = null;
        await handleErrorWithDialog(error);
      }
    },
    async initialize() {
      this.doc = await fyo.doc.getDoc(this.schemaName, this.name);
      await this.setTemplateList();
      await this.setTemplateFromDefault();
      if (!this.templateDoc && this.templateList.length) {
        await this.onTemplateNameChange(this.templateList[0]);
      }

      if (this.doc) {
        this.values = await getPrintTemplatePropValues(this.doc as Doc, {
          from: this.fromDate,
          to: this.toDate,
        });
      }
    },
    setScale() {
      this.scale = 1;
      const width = (this.templateDoc?.width ?? 21) * 37.8;
      let containerWidth = window.innerWidth - 32;
      if (showSidebar.value) {
        containerWidth -= 12 * 16;
      }

      this.scale = Math.min(containerWidth / width, 1);
    },
    reset() {
      this.doc = null;
      this.values = null;
      this.templateList = [];
      this.templateDoc = null;
      this.scale = 1;
    },
    async onTemplateNameChange(value: string | null): Promise<void> {
      if (!value) {
        this.templateDoc = null;
        return;
      }

      this.templateName = value;
      try {
        this.templateDoc = (await this.fyo.doc.getDoc(
          ModelNameEnum.PrintTemplate,
          this.templateName
        )) as PrintTemplate;
      } catch (error) {
        await handleErrorWithDialog(error);
      }
      this.setScale();
    },
    async setTemplateList(): Promise<void> {
      const list = (await this.fyo.db.getAllRaw(ModelNameEnum.PrintTemplate, {
        filters: printTemplateFilter(this.schemaName),
      })) as { name: string }[];

      this.templateList = list.map(({ name }) => name);
    },
    async savePDF(shouldPrint?: boolean) {
      const printContainer = this.$refs.printContainer as {
        savePDF: (name?: string, shouldPrint?: boolean) => Promise<void>;
      };

      if (!printContainer?.savePDF) {
        return;
      }

      await printContainer.savePDF(this.doc?.name, shouldPrint);
    },
    async setTemplateFromDefault() {
      const defaultName =
        this.schemaName[0].toLowerCase() +
        this.schemaName.slice(1) +
        ModelNameEnum.PrintTemplate;

      let templateName;

      if (
        this.schemaName == ModelNameEnum.SalesInvoice &&
        (this.doc as Doc).isPOS
      ) {
        templateName = this.fyo.singles.Defaults?.posPrintTemplate;

        const posProfileName = this.fyo.singles.POSSettings
          ?.posProfile as string;

        if (posProfileName) {
          const posProfile = await this.fyo.doc.getDoc(
            ModelNameEnum.POSProfile,
            posProfileName
          );

          if (posProfile.posPrintTemplate) {
            templateName = posProfile.posPrintTemplate;
          }
        }
      } else {
        templateName = this.fyo.singles.Defaults?.get(defaultName);
      }

      if (typeof templateName !== 'string') {
        return;
      }

      if (this.templateList.includes(templateName))
        await this.onTemplateNameChange(templateName);
    },
  },
});
</script>

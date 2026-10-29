<template>
  <div class="flex flex-col w-full h-full">
    <PageHeader :title="t`Print ${title}`">
      <Button class="text-xs" type="primary" @click="savePDF()">
        {{ t`Save as PDF` }}
      </Button>
      <Button class="text-xs" type="primary" @click="savePDF(true)">
        {{ t`Print` }}
      </Button>
    </PageHeader>

    <div
      class="outer-container overflow-y-auto custom-scroll custom-scroll-thumb1"
    >
      <!-- Report Print Display Area -->
      <div
        ref="previewContainer"
        class="
          p-4
          bg-gray-25
          dark:bg-gray-890
          overflow-auto
          custom-scroll custom-scroll-thumb1
        "
      >
        <!-- Report Print Display Container -->
        <PrintContainer
          v-if="printValues && template"
          ref="printContainer"
          :print-schema-name="reportName"
          :template="template"
          :values="printValues"
          :scale="scale"
          :width="size.width"
          :height="size.height"
        />
      </div>

      <!-- Report Print Settings -->
      <div v-if="report" class="border-l dark:border-gray-800 flex flex-col">
        <p class="p-4 text-sm text-gray-600 dark:text-gray-400">
          {{
            [
              t`Hidden report values are included in print.`,
              t`Report will use more than one page if required.`,
            ].join(' ')
          }}
        </p>
        <!-- Row Selection -->
        <div class="p-4 border-t dark:border-gray-800">
          <Int
            :show-label="true"
            :border="true"
            :df="{
              label: t`Start From Row Index`,
              fieldtype: 'Int',
              fieldname: 'numRows',
              minvalue: 1,
              maxvalue: report?.reportData.length ?? 1000,
            }"
            :value="start"
            @change="(v) => (start = v)"
          />
          <Int
            class="mt-4"
            :show-label="true"
            :border="true"
            :df="{
              label: t`Number of Rows`,
              fieldtype: 'Int',
              fieldname: 'numRows',
              minvalue: 0,
              maxvalue: report?.reportData.length ?? 1000,
            }"
            :value="limit"
            @change="(v) => (limit = v)"
          />
        </div>

        <!-- Size Selection -->
        <div class="border-t dark:border-gray-800 p-4">
          <Select
            :show-label="true"
            :border="true"
            :df="printSizeDf"
            :value="printSize"
            @change="(v) => (printSize = v)"
          />
          <Check
            class="mt-4"
            :show-label="true"
            :border="true"
            :df="{
              label: t`Is Landscape`,
              fieldname: 'isLandscape',
              fieldtype: 'Check',
            }"
            :value="isLandscape"
            @change="(v) => (isLandscape = v)"
          />
        </div>

        <!-- Pick Columns -->
        <div class="border-t dark:border-gray-800 p-4">
          <h2 class="text-sm text-gray-600 dark:text-gray-400">
            {{ t`Pick Columns` }}
          </h2>
          <div
            class="border dark:border-gray-800 rounded grid grid-cols-2 mt-1"
          >
            <Check
              v-for="(col, i) of report?.columns"
              :key="col.fieldname"
              :show-label="true"
              :df="{
                label: col.label,
                fieldname: col.fieldname,
                fieldtype: 'Check',
              }"
              :value="columnSelection[i]"
              @change="(v) => (columnSelection[i] = v)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { Report } from 'reports/Report';
import { reports } from 'reports/index';
import { OptionField } from 'schemas/types';
import Button from 'src/components/Button.vue';
import Check from 'src/components/Controls/Check.vue';
import Int from 'src/components/Controls/Int.vue';
import Select from 'src/components/Controls/Select.vue';
import PageHeader from 'src/components/PageHeader.vue';
import { getReport } from 'src/utils/misc';
import { getPrintSettingsValues } from 'src/utils/printTemplates';
import { getReportPrintValues } from 'utils/reportPrint';
import { STANDARD_PRINT_NAME } from 'utils/standardPrint';
import { PrintValues } from 'src/utils/types';
import { showSidebar } from 'src/utils/refs';
import { paperSizeMap, printSizes } from 'src/utils/ui';
import { PropType, defineComponent } from 'vue';
import PrintContainer from '../TemplateBuilder/PrintContainer.vue';

export default defineComponent({
  components: { PageHeader, Button, Check, Int, PrintContainer, Select },
  props: {
    reportName: {
      type: String as PropType<keyof typeof reports>,
      required: true,
    },
  },
  data() {
    return {
      template: '',
      printSettings: {} as Record<string, unknown>,
      start: 1,
      limit: 0,
      printSize: 'A4' as typeof printSizes[number],
      isLandscape: false,
      scale: 0.65,
      report: null as null | Report,
      columnSelection: [] as boolean[],
    };
  },
  computed: {
    title(): string {
      return reports[this.reportName]?.title ?? this.t`Report`;
    },
    printSizeDf(): OptionField {
      return {
        label: 'Print Size',
        fieldname: 'printSize',
        fieldtype: 'Select',
        options: printSizes
          .filter((p) => p !== 'Custom')
          .map((name) => ({ value: name, label: name })),
      };
    },
    printValues(): PrintValues | null {
      if (!this.report || !this.columnSelection.some(Boolean)) return null;
      return {
        doc: getReportPrintValues(
          this.report as Report,
          this.start,
          this.limit,
          this.columnSelection
        ),
        print: this.printSettings,
      } as PrintValues;
    },
    size(): { width: number; height: number } {
      const size = paperSizeMap[this.printSize];
      const long = size.width > size.height ? size.width : size.height;
      const short = size.width <= size.height ? size.width : size.height;

      if (this.isLandscape) {
        return { width: long, height: short };
      }

      return { width: short, height: long };
    },
  },
  watch: {
    size() {
      this.setScale();
    },
  },
  async mounted() {
    this.report = await getReport(this.reportName);
    this.printSettings = await getPrintSettingsValues(this.fyo);
    this.template = String(
      (await this.fyo.doc.getDoc('PrintTemplate', STANDARD_PRINT_NAME))
        .template || ''
    );
    this.isLandscape = this.report.columns.length > 8;
    this.limit = this.report.reportData.length;
    this.columnSelection = this.report.columns.map(() => true);

    await this.$nextTick();
    this.setScale();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    window.addEventListener('resize', this.setScale);

    // @ts-ignore
    window.rpv = this;
  },
  unmounted() {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    window.removeEventListener('resize', this.setScale);
  },
  methods: {
    setScale() {
      const el = this.$refs.previewContainer as HTMLElement | undefined;
      const pageWidthPx = this.size.width * 37.2;
      if (!pageWidthPx) {
        return;
      }
      let containerWidth: number;
      if (el && el.clientWidth > 0) {
        const style = window.getComputedStyle(el);
        const pl = parseFloat(style.paddingLeft) || 0;
        const pr = parseFloat(style.paddingRight) || 0;
        containerWidth = Math.max(el.clientWidth - pl - pr, 0);
      } else {
        // fallback: subtract settings panel, optional sidebar, and p-4 padding (32px)
        containerWidth = window.innerWidth - 26 * 16 - 32;
        if (showSidebar.value) {
          containerWidth -= 12 * 16;
        }
      }
      this.scale = Math.min(containerWidth / pageWidthPx, 1);
    },
    async savePDF(shouldPrint?: boolean): Promise<void> {
      const container = this.$refs.printContainer as
        | { savePDF: (name: string, shouldPrint?: boolean) => Promise<void> }
        | undefined;
      if (!container || !this.columnSelection.some(Boolean)) return;
      const name = this.title + ' - ' + this.fyo.format(new Date(), 'Date');
      await container.savePDF(name, shouldPrint);
    },
  },
});
</script>
<style scoped>
.outer-container {
  display: grid;
  grid-template-columns: auto var(--w-quick-edit);
  @apply h-full overflow-auto;
}
</style>

<template>
  <section class="space-y-4">
    <p class="text-sm text-gray-600 dark:text-gray-300">
      {{
        t`Choose the features your team needs. Save changes, then confirm Reload to apply them.`
      }}
    </p>
    <p class="text-sm font-medium text-gray-700 dark:text-gray-200">
      {{ features.filter((feature) => feature.enabled).length }} /
      {{ features.length }} {{ t`enabled` }}
    </p>
    <div class="relative">
      <label class="sr-only" for="feature-search">{{
        t`Search features`
      }}</label>
      <input
        id="feature-search"
        v-model="query"
        data-testid="feature-search"
        type="search"
        class="
          w-full
          rounded
          border border-gray-300
          bg-white
          px-3
          py-2
          text-sm
          dark:border-gray-700 dark:bg-gray-900
        "
        :placeholder="t`Search features`"
      />
    </div>

    <div
      v-if="!visibleFeatures.length"
      class="py-8 text-center text-sm text-gray-600 dark:text-gray-300"
    >
      {{ t`No features match your search.` }}
    </div>

    <section v-for="group in visibleGroups" :key="group.name" class="space-y-3">
      <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">
        {{ group.name }}
      </h2>
      <div class="grid grid-cols-1 gap-4 gap-x-8 md:grid-cols-2">
        <article
          v-for="feature in group.features"
          :key="feature.field"
          :data-testid="`feature-${feature.field}`"
          class="min-w-0"
        >
          <div class="flex items-center justify-between gap-3">
            <Check
              :df="feature.definition"
              :value="feature.enabled"
              :show-label="true"
              :border="true"
              :read-only="feature.locked || !!feature.blockedBy"
              @change="(value: boolean) => changeFeature(feature.field, value)"
            />
            <button
              type="button"
              class="
                flex
                h-5
                w-5
                shrink-0
                items-center
                justify-center
                rounded-full
                border border-gray-400
                text-xs
                font-medium
                leading-none
                text-gray-600
                hover:bg-gray-100
                focus:outline-none focus:ring-2 focus:ring-blue-500
                dark:border-gray-500 dark:text-gray-300 dark:hover:bg-gray-700
              "
              :aria-label="`${t`About`} ${feature.label}`"
              aria-haspopup="dialog"
              @click="showFeatureHelp(feature, $event)"
            >
              !
            </button>
          </div>
          <span :id="`description-${feature.field}`" class="sr-only">
            {{
              feature.locked
                ? t`This setting is locked.`
                : feature.blockedBy
                ? `${t`Enable the required feature first.`} ${
                    feature.blockedBy
                  }`
                : feature.enabled
                ? t`Enabled`
                : t`Disabled`
            }}
          </span>
          <p
            v-if="errors[feature.field]"
            class="mt-2 text-xs text-red-600 dark:text-red-400"
          >
            {{ errors[feature.field] }}
          </p>
        </article>
      </div>
    </section>
  </section>
</template>

<script lang="ts">
import { t } from 'fyo';
import { Doc } from 'fyo/model/doc';
import { Field } from 'schemas/types';
import { defineComponent, PropType } from 'vue';
import { evaluateReadOnly } from 'src/utils/doc';
import { showDialog } from 'src/utils/interactive';
import Check from 'src/components/Controls/Check.vue';
import { featureMetadata } from './featureSettings';

export default defineComponent({
  name: 'FeatureSettings',
  components: { Check },
  props: {
    doc: { type: Object as PropType<Doc>, required: true },
    fields: { type: Array as PropType<Field[]>, required: true },
    errors: {
      type: Object as PropType<Record<string, string>>,
      required: true,
    },
  },
  emits: ['value-change'],
  data() {
    return { query: '' };
  },
  computed: {
    features() {
      return this.fields
        .filter(
          (field) =>
            field.fieldtype === 'Check' &&
            field.fieldname !== 'enableTaxTemplates'
        )
        .map((field) => {
          const metadata = featureMetadata.find(
            (item) => item.field === field.fieldname
          );
          const dependency = metadata?.dependency;
          const blockedBy =
            dependency && !this.doc[dependency]
              ? this.fields.find((item) => item.fieldname === dependency)
                  ?.label ?? dependency
              : '';
          const readOnly = evaluateReadOnly(field, this.doc);
          return {
            field: field.fieldname,
            definition: field,
            label: field.label,
            category: metadata?.category ?? 'Other features',
            description:
              metadata?.description ??
              'Enable this feature in the application.',
            location: metadata?.location ?? 'Settings',
            enabled: !!this.doc[field.fieldname],
            locked: !!readOnly,
            blockedBy,
            behavior: metadata?.behavior ?? 'tool',
            dependency: metadata?.dependency,
            dependencyLabel: metadata?.dependency
              ? this.fields.find(
                  (item) => item.fieldname === metadata.dependency
                )?.label ?? metadata.dependency
              : '',
          };
        });
    },
    visibleFeatures() {
      const query = this.query.trim().toLocaleLowerCase();
      if (!query) return this.features;
      return this.features.filter((feature) =>
        [feature.label, feature.description, feature.location, feature.category]
          .join(' ')
          .toLocaleLowerCase()
          .includes(query)
      );
    },
    visibleGroups() {
      const categories = [
        'Accounting',
        'Sales',
        'Pricing',
        'Inventory',
        'POS',
        'Advanced tools',
        'Other features',
      ];
      return categories
        .map((name) => ({
          name,
          features: this.visibleFeatures.filter(
            (feature) => feature.category === name
          ),
        }))
        .filter((group) => group.features.length);
    },
  },
  methods: {
    async showFeatureHelp(
      feature: {
        field: string;
        label: string;
        description: string;
        location: string;
        behavior: string;
        dependencyLabel: string;
        locked: boolean;
      },
      event: Event
    ) {
      const trigger = event.currentTarget as HTMLButtonElement;
      const detail = [
        feature.description,
        `${t`Where to find it`}: ${feature.location}`,
      ];
      if (feature.behavior === 'menu') {
        detail.push(
          t`This adds a menu entry only; it does not change accounting behavior.`
        );
      } else if (feature.behavior === 'accounting') {
        detail.push(
          t`This changes accounting behavior and cannot be turned off after it is enabled.`
        );
      } else if (feature.behavior === 'workflow') {
        detail.push(
          t`This adds a transaction workflow that may affect stock or invoice records.`
        );
      } else {
        detail.push(t`This enables a tool or point-of-sale option.`);
      }
      if (feature.locked && feature.behavior !== 'accounting') {
        detail.push(t`The app locks this feature on once it has been enabled.`);
      }
      if (feature.dependencyLabel) {
        detail.push(`${t`Requires`}: ${feature.dependencyLabel}`);
      }
      await showDialog({
        title: feature.label,
        detail,
        buttons: [
          {
            label: t`Close`,
            isPrimary: true,
            isEscape: true,
            action: () => null,
          },
        ],
      });
      trigger.focus();
    },
    changeFeature(field: string, value: boolean) {
      const definition = this.fields.find((item) => item.fieldname === field);
      const metadata = featureMetadata.find((item) => item.field === field);
      if (!definition || evaluateReadOnly(definition, this.doc)) return;
      if (metadata?.dependency && !this.doc[metadata.dependency]) return;
      this.$emit('value-change', definition, value);
    },
  },
});
</script>

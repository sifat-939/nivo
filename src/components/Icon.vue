<template>
  <svg
    v-if="iconPath"
    v-bind="$attrs"
    :class="iconClasses"
    :style="iconColor ? { color: iconColor } : undefined"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    v-html="iconPath"
  />
  <component
    v-else
    v-bind="$attrs"
    :is="iconComponent"
    :class="iconClasses"
    :active="active"
    :darkMode="darkMode"
  />
</template>

<script lang="ts">
import { nivoIconPaths } from './Icons/nivo';
import icons12 from './Icons/12';
import icons16 from './Icons/16';
import icons18 from './Icons/18';
import icons24 from './Icons/24';
import icons8 from './Icons/8';

const components = {
  8: icons8,
  12: icons12,
  16: icons16,
  18: icons18,
  24: icons24,
} as const;

type IconSize = '8' | '12' | '16' | '18' | '24';
export default {
  name: 'Icon',
  props: {
    name: { type: String, required: true },
    active: { type: Boolean, default: false },
    darkMode: { type: Boolean, default: false },
    size: {
      type: String,
      required: true,
    },
    height: Number,
  },
  computed: {
    iconPath(): string | undefined {
      return nivoIconPaths[`${this.size}:${this.name}`];
    },
    iconColor(): string | undefined {
      if (this.name === 'green-check') {
        return this.darkMode ? '#59BA8B' : '#278F5E';
      }
      if (this.active) {
        return this.darkMode ? '#B8E4D9' : '#147D78';
      }
      return undefined;
    },
    iconComponent() {
      const map = components[this.size as IconSize];
      return map[this.name as keyof typeof map] ?? null;
    },
    iconClasses() {
      let sizeClass = {
        8: 'w-2 h-2',
        12: 'w-3 h-3',
        16: 'w-4 h-4',
        18: 'w-5 h-5',
        24: 'w-6 h-6',
      }[this.size];

      if (this.height) {
        sizeClass = `w-${this.height} h-${this.height}`;
      }

      return [sizeClass, this.iconPath ? 'fill-none' : 'fill-current'];
    },
  },
};
</script>

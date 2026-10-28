<template>
  <div class="rounded-md overflow-hidden" :class="sizeClasses">
    <img
      v-if="imageURL"
      :src="imageURL"
      class="object-cover"
      :class="sizeClasses"
    />
    <div
      v-else
      class="
        bg-blue-100
        dark:bg-blue-900
        flex
        h-full
        items-center
        justify-center
        text-blue-800
        dark:text-blue-200
        w-full
        text-base
        uppercase
      "
    >
      {{ label && label[0] }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'Avatar',
  props: {
    imageURL: String,
    label: String,
    size: {
      default: 'md',
    },
  },
  computed: {
    sizeClasses() {
      return {
        sm: 'w-5 h-5',
        md: 'w-7 h-7',
        lg: 'w-9 h-9',
      }[this.size];
    },
  },
};
</script>

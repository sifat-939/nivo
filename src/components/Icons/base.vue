<script lang="ts">
export default {
  name: 'IconBase',
  props: {
    active: Boolean,
    darkMode: { type: Boolean, default: false },
  },
  computed: {
    lightColor(): string {
      return this.active ? '#147D78' : this.darkMode ? '#B8E4D9' : '#91A6A4';
    },
    darkColor(): string {
      return this.active ? '#147D78' : this.darkMode ? '#F5F8F7' : '#162C35';
    },
    bgColor(): string {
      return this.darkMode ? '#162C35' : '#F5F8F7';
    },
  },
};
</script>

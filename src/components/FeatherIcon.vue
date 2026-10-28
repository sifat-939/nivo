<script>
import feather from 'feather-icons';
import { h } from 'vue';

const validIcons = Object.keys(feather.icons);

// A compact, softer stroke style for the controls seen throughout the app.
// Less common Feather names continue to use their original artwork below.
const nivoIcons = {
  'chevron-left': '<path d="m14.5 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9.5 18 6-6-6-6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-up': '<path d="m6 15 6-6 6 6"/>',
  'chevrons-left': '<path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/>',
  'chevrons-right': '<path d="m13 17 5-5-5-5M6 17l5-5-5-5"/>',
  x: '<path d="m18 6-12 12M6 6l12 12"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4 4"/>',
  'help-circle':
    '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.3 1.8c-1.2 1.1-1.9 1.5-1.9 3.2M12 17.5h.01"/>',
  'more-horizontal':
    '<circle cx="5" cy="12" r=".8"/><circle cx="12" cy="12" r=".8"/><circle cx="19" cy="12" r=".8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M5 15v4h14v-4"/>',
  download: '<path d="M12 4v12m-5-5 5 5 5-5M5 16v3h14v-3"/>',
  calendar:
    '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 4v4m8-4v4M4 10h16"/>',
  edit: '<path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z"/>',
  'refresh-cw':
    '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2"/>',
  trash: '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  'trash-2': '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  filter: '<path d="M4 5h16l-6.2 7.2v5.1l-3.6 1.8v-6.9L4 5Z"/>',
  image:
    '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><circle cx="9" cy="9" r="1.5"/><path d="m4 17 5-5 3.5 3.5 2.5-2.5 5 5"/>',
  user: '<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
  'user-check':
    '<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0m1-7 2 2 4-4"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="m19.3 15 .1.1 1.1 1.9-2 3.4-2.2-.5-.2.1-1.3.8-.6 2.2h-4l-.6-2.2-1.3-.8-.2-.1-2.2.5-2-3.4 1.1-1.9.1-.2v-1.6l-.1-.2L4 11.2l2-3.4 2.2.5.2-.1 1.3-.8.6-2.2h4l.6 2.2 1.3.8.2.1 2.2-.5 2 3.4-1.1 1.9-.1.2v1.6Z"/>',
  database:
    '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  command:
    '<path d="M9 8V5.5a2.5 2.5 0 1 0-2.5 2.5H9Zm0 0h6m0 0h2.5A2.5 2.5 0 1 0 15 5.5V8Zm0 0v8m0 0v2.5a2.5 2.5 0 1 0 2.5-2.5H15Zm0 0H9m0 0H6.5A2.5 2.5 0 1 0 9 18.5V16Zm0 0V8"/>',
  flag: '<path d="M5 21V4m0 1c5-3 9 3 14 0v10c-5 3-9-3-14 0"/>',
  monitor:
    '<rect x="3" y="4" width="18" height="13" rx="2.5"/><path d="M8 21h8m-4-4v4"/>',
  folder:
    '<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z"/>',
  file: '<path d="M7 3.5h7l4 4V20H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z"/><path d="M14 4v4h4"/>',
  'file-text':
    '<path d="M7 3.5h7l4 4V20H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z"/><path d="M14 4v4h4M9 12h6m-6 4h6"/>',
};

export default {
  props: {
    name: {
      type: String,
      required: true,
      validator: (value) => validIcons.includes(value),
    },
  },
  render() {
    const icon = feather.icons[this.name];
    const svg = h('svg', {
      ...Object.assign({}, icon.attrs, {
        fill: 'none',
        stroke: 'currentColor',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': 1.7,
        width: null,
        height: null,
      }),
      class: [icon.attrs.class],
      innerHTML: nivoIcons[this.name] ?? icon.contents,
    });

    return svg;
  },
};
</script>

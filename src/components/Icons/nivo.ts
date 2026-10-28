// Small, shared outline glyphs for the registered custom icon names.
// Paths stay in a common 24px grid so the set feels consistent at every size.
const glyphs = {
  arrowRight: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  chevronLeft: '<path d="m14.5 18-6-6 6-6"/>',
  chevronRight: '<path d="m9.5 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  circle: '<circle cx="12" cy="12" r="8.5"/>',
  dotsH:
    '<circle cx="5" cy="12" r=".7"/><circle cx="12" cy="12" r=".7"/><circle cx="19" cy="12" r=".7"/>',
  dotsV:
    '<circle cx="12" cy="5" r=".7"/><circle cx="12" cy="12" r=".7"/><circle cx="12" cy="19" r=".7"/>',
  pencil:
    '<path d="m14.5 5.5 4 4M4 20l4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  transfer: '<path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4"/>',
  drag: '<path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01"/>',
  filter: '<path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  select:
    '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/>',
  sidebar:
    '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M9 4v16"/>',
  user: '<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
  dashboard:
    '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="6" height="4" rx="1.2"/><rect x="14" y="11" width="6" height="9" rx="1.5"/><rect x="4" y="14" width="7" height="6" rx="1.5"/>',
  document:
    '<path d="M7 3.5h7l4 4V20H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z"/><path d="M14 4v4h4M9 12h6M9 16h6"/>',
  receipt:
    '<path d="M6 3.5 8 5l2-1.5L12 5l2-1.5L16 5l2-1.5V20l-2-1.5L14 20l-2-1.5L10 20l-2-1.5L6 20V3.5Z"/><path d="M9 9h6m-6 4h6"/>',
  boxes:
    '<path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z"/><path d="M4 7.5v9l8 4.5 8-4.5v-9M12 12v9m-8-9 8 4.5 8-4.5"/>',
  envelope:
    '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="m5 7 7 5 7-5"/>',
  terminal:
    '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M7 9h.01M10 9h.01M13 9h.01M8 14h8"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M4 17a2.5 2.5 0 0 1 2.5-2.5H20"/>',
  percent:
    '<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="m18 5-12 14"/>',
  home: '<path d="m3.5 11 8.5-7 8.5 7M5.5 9.5V20h13V9.5M9.5 20v-6h5v6"/>',
  cart: '<path d="M4 5h2l2 11h10l2-8H7"/><circle cx="10" cy="19" r="1"/><circle cx="17" cy="19" r="1"/>',
  chart: '<path d="M4 20V11h4v9M10 20V5h4v15M16 20v-8h4v8M3 20h18"/>',
  wallet:
    '<rect x="3.5" y="6" width="17" height="14" rx="2.5"/><path d="M4 7V5a2 2 0 0 1 2-2h11M16 12h4m-4 0a2 2 0 1 0 0 4h4v-4h-4Z"/>',
  sliders:
    '<path d="M4 6h6m4 0h6M4 12h2m4 0h10M4 18h8m4 0h4"/><circle cx="12" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="18" r="2"/>',
  rocket:
    '<path d="M14 5c2-2 5-2 5-2s0 3-2 5l-6 6-4-4 7-5Z"/><path d="m7 10-3 1 4 4m3 3-1 3-4-4m7-7 2 2"/><circle cx="15.5" cy="7.5" r="1"/>',
  storefront:
    '<path d="M4 10v10h16V10M3 6l2-3h14l2 3v2a3 3 0 0 1-5 2 3 3 0 0 1-4 0 3 3 0 0 1-4 0 3 3 0 0 1-5-2V6Z"/><path d="M9 20v-5h6v5"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4z"/>',
  shield:
    '<path d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/>',
  calendar:
    '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M8 3v4m8-4v4M4 9h16M8 13h2m4 0h2m-8 4h2"/>',
  address:
    '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  income: '<circle cx="12" cy="12" r="8.5"/><path d="M12 17V7m-4 4 4-4 4 4"/>',
  expense: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10m4-4-4 4-4-4"/>',
  phone:
    '<path d="M7 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z"/><path d="M10 17.5h4"/>',
  folder:
    '<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7Z"/>',
  folderOpen:
    '<path d="M3.5 8a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v1M2.5 12h18l-2 7H4.5l-2-7Z"/>',
  signIn:
    '<path d="M12 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6M8 8l-4 4 4 4m-4-4h12"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/>',
  building:
    '<path d="M4 20V5l8-2 8 2v15M2.5 20h19M8 8h1m6 0h1M8 12h1m6 0h1M10 20v-4h4v4"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="m8 12 2.5 2.5L16 9"/>',
  tag: '<path d="M4 5h8l8 8-7 7-9-9V5Z"/><circle cx="8" cy="9" r="1"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3.5 12h17M12 3c2.5 2.5 3.5 5.5 3.5 9S14.5 18.5 12 21c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3Z"/>',
  receiptCheck:
    '<path d="M6 3.5 8 5l2-1.5L12 5l2-1.5L16 5l2-1.5V20l-2-1.5L14 20l-2-1.5L10 20l-2-1.5L6 20V3.5Z"/><path d="m9 12 2 2 4-4"/>',
  nMark:
    '<path fill="currentColor" stroke="none" d="M4 20V4h3l10 12V4h3v16h-3L7 8v12H4Z"/>',
};

export const nivoIconPaths: Record<string, string> = {
  '8:arrow-right': glyphs.arrowRight,
  '8:chevron-left': glyphs.chevronLeft,
  '8:chevron-right': glyphs.chevronRight,
  '8:circle': glyphs.circle,
  '8:dot-horizontal': glyphs.dotsH,
  '8:dot-vertical': glyphs.dotsV,
  '8:pencil': glyphs.pencil,
  '8:plus': glyphs.plus,
  '8:up': glyphs.up,
  '8:x': glyphs.close,

  '12:arrow-left-right': glyphs.transfer,
  '12:drag-handle': glyphs.drag,
  '12:filter': glyphs.filter,
  '12:list': glyphs.list,
  '12:select': glyphs.select,
  '12:sidebar': glyphs.sidebar,

  '16:account-in': glyphs.signIn,
  '16:address': glyphs.address,
  '16:assets': glyphs.building,
  '16:calendar': glyphs.calendar,
  '16:circle': glyphs.circle,
  '16:down-small': glyphs.chevronDown,
  '16:down': glyphs.chevronDown,
  '16:expenses': glyphs.expense,
  '16:income': glyphs.income,
  '16:items': glyphs.boxes,
  '16:liabilities': glyphs.wallet,
  '16:mail': glyphs.envelope,
  '16:normal': glyphs.folder,
  '16:opened': glyphs.folderOpen,
  '16:phone': glyphs.phone,
  '16:plus': glyphs.plus,
  '16:search': glyphs.search,

  '18:check': glyphs.check,
  '18:common-entries': glyphs.book,
  '18:accounts': glyphs.wallet,
  '18:hr':
    '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2"/>',
  '18:customer': glyphs.user,
  '18:dashboard': glyphs.dashboard,
  '18:general': glyphs.sliders,
  '18:gst': glyphs.receipt,
  '18:inventory': glyphs.boxes,
  '18:invoice': glyphs.document,
  '18:item': glyphs.tag,
  '18:mail': glyphs.envelope,
  '18:pos': glyphs.terminal,
  '18:opening-ac': glyphs.book,
  '18:percentage': glyphs.percent,
  '18:property': glyphs.home,
  '18:purchase-invoice': glyphs.receipt,
  '18:purchase': glyphs.cart,
  '18:reports': glyphs.chart,
  '18:review-ac': glyphs.wallet,
  '18:sales-invoice': glyphs.receiptCheck,
  '18:sales': glyphs.chart,
  '18:settings': glyphs.sliders,
  '18:start': glyphs.rocket,
  '18:supplier': glyphs.storefront,
  '18:system': glyphs.cpu,

  '24:general': glyphs.sliders,
  '24:green-check': glyphs.check,
  '24:invoice': glyphs.document,
  '24:mail': glyphs.envelope,
  '24:privacy': glyphs.shield,
  '24:system': glyphs.cpu,
};

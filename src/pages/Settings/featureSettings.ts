export type FeatureCategory =
  | 'Accounting'
  | 'Sales'
  | 'Pricing'
  | 'Inventory'
  | 'Advanced tools'
  | 'POS'
  | 'Other features';

export interface FeatureMetadata {
  field: string;
  category: FeatureCategory;
  description: string;
  location: string;
  behavior: 'menu' | 'accounting' | 'tool' | 'workflow';
  dependency?: string;
}

export const featureMetadata: FeatureMetadata[] = [
  {
    field: 'enableDiscounting',
    category: 'Accounting',
    description:
      'Adds discount fields and calculations to invoices and other transactions.',
    location: 'Invoices and accounting',
    behavior: 'accounting',
  },
  {
    field: 'enableInventory',
    category: 'Accounting',
    description:
      'Tracks item quantities and stock value in inventory transactions.',
    location: 'Items and stock transactions',
    behavior: 'accounting',
  },
  {
    field: 'enableSalesQuotes',
    category: 'Sales',
    description:
      'Creates and manages sales quotes for customers before an invoice is issued.',
    location: 'Sales → Sales Quotes',
    behavior: 'menu',
  },
  {
    field: 'enableLead',
    category: 'Sales',
    description: 'Keeps track of prospective customers and sales leads.',
    location: 'Sales → Lead',
    behavior: 'menu',
  },
  {
    field: 'enableInvoiceReturns',
    category: 'Sales',
    description:
      'Records returns against sales invoices and creates the related credit note.',
    location: 'Sales → Sales Invoices',
    behavior: 'workflow',
  },
  {
    field: 'enableLoyaltyProgram',
    category: 'Sales',
    description:
      'Adds customer loyalty points and lets you redeem them during sales.',
    location: 'Sales → Loyalty Program',
    behavior: 'menu',
  },
  {
    field: 'enablePartialPayment',
    category: 'Sales',
    description: 'Allows an invoice to be settled through multiple payments.',
    location: 'Payments and invoices',
    behavior: 'workflow',
  },
  {
    field: 'enablePriceList',
    category: 'Pricing',
    description:
      'Creates multiple item price lists for different customers or situations.',
    location: 'Common → Price List',
    behavior: 'menu',
  },
  {
    field: 'enablePricingRule',
    category: 'Pricing',
    description:
      'Sets automatic sales prices and discounts using pricing rules.',
    location: 'Sales → Pricing Rule',
    behavior: 'menu',
    dependency: 'enableDiscounting',
  },
  {
    field: 'enableCouponCode',
    category: 'Pricing',
    description: 'Applies coupon codes to matching pricing rules during sales.',
    location: 'Sales → Coupon Code',
    behavior: 'menu',
    dependency: 'enablePricingRule',
  },
  {
    field: 'enableShipment',
    category: 'Inventory',
    description: 'Records goods shipped to customers and updates stock.',
    location: 'Inventory → Shipment',
    behavior: 'workflow',
    dependency: 'enableInventory',
  },
  {
    field: 'enablePurchaseReceipt',
    category: 'Inventory',
    description: 'Records items received from suppliers and updates stock.',
    location: 'Inventory → Purchase Receipt',
    behavior: 'workflow',
    dependency: 'enableInventory',
  },
  {
    field: 'enableStockLedger',
    category: 'Inventory',
    description: 'Shows item stock movements and the resulting balance.',
    location: 'Inventory → Stock Ledger',
    behavior: 'menu',
    dependency: 'enableInventory',
  },
  {
    field: 'enableitemGroup',
    category: 'POS',
    description:
      'Shows items grouped by item group in the point-of-sale screen.',
    location: 'POS → Item Groups',
    behavior: 'tool',
  },
  {
    field: 'enableItemEnquiry',
    category: 'POS',
    description: 'Quickly looks up an item’s available stock and price.',
    location: 'POS → Quick Actions → Item Enquiry',
    behavior: 'tool',
  },
  {
    field: 'enablePrintTemplates',
    category: 'Advanced tools',
    description: 'Creates and manages layouts used when printing documents.',
    location: 'Setup → Print Templates',
    behavior: 'menu',
  },
  {
    field: 'enableImportWizard',
    category: 'Advanced tools',
    description: 'Imports supported records from files using a guided process.',
    location: 'Setup → Import Wizard',
    behavior: 'menu',
  },
  {
    field: 'enableChartOfAccounts',
    category: 'Advanced tools',
    description:
      'Opens the list of accounts used to organize financial transactions.',
    location: 'Setup → Chart of Accounts',
    behavior: 'menu',
  },
  {
    field: 'enableFormCustomization',
    category: 'Advanced tools',
    description: 'Customizes fields and layout on supported forms.',
    location: 'Setup → Customize Form',
    behavior: 'menu',
  },
  {
    field: 'enableERPNextSync',
    category: 'Advanced tools',
    description:
      'Connects to ERPNext and synchronizes supported data. ERPNext connection details are required.',
    location: 'Settings → ERPNext Sync',
    behavior: 'tool',
  },
  {
    field: 'enablePointOfSaleWithOutInventory',
    category: 'POS',
    description:
      'Allows POS sales without stock tracking. Enables POS only; other inventory options stay off.',
    location: 'Settings → POS Settings',
    behavior: 'tool',
  },
];

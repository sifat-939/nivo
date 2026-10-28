import type { Fyo } from 'fyo';

/** Optional schemas share one source of truth across navigation and creation. */
type FeatureRequirement = { source: 'accounting' | 'inventory'; field: string };

const accounting = (field: string): FeatureRequirement => ({
  source: 'accounting',
  field,
});
const inventory = (field: string): FeatureRequirement => ({
  source: 'inventory',
  field,
});

const schemaRequirements: Record<string, FeatureRequirement[]> = {
  SalesQuote: [accounting('enableSalesQuotes')],
  SalesQuoteItem: [accounting('enableSalesQuotes')],
  Lead: [accounting('enableLead')],
  LoyaltyProgram: [accounting('enableLoyaltyProgram')],
  LoyaltyPointEntry: [accounting('enableLoyaltyProgram')],
  PricingRule: [
    accounting('enablePricingRule'),
    accounting('enableDiscounting'),
  ],
  PricingRuleItem: [
    accounting('enablePricingRule'),
    accounting('enableDiscounting'),
  ],
  PricingRuleDetail: [
    accounting('enablePricingRule'),
    accounting('enableDiscounting'),
  ],
  CouponCode: [accounting('enableCouponCode'), accounting('enablePricingRule')],
  AppliedCouponCodes: [
    accounting('enableCouponCode'),
    accounting('enablePricingRule'),
  ],
  CollectionRulesItems: [accounting('enableLoyaltyProgram')],
  PriceList: [accounting('enablePriceList')],
  PriceListItem: [accounting('enablePriceList')],
  Shipment: [accounting('enableInventory'), accounting('enableShipment')],
  ShipmentItem: [accounting('enableInventory'), accounting('enableShipment')],
  PurchaseReceipt: [
    accounting('enableInventory'),
    accounting('enablePurchaseReceipt'),
  ],
  PurchaseReceiptItem: [
    accounting('enableInventory'),
    accounting('enablePurchaseReceipt'),
  ],
  StockMovement: [accounting('enableInventory')],
  StockMovementItem: [accounting('enableInventory')],
  StockLedgerEntry: [
    accounting('enableInventory'),
    accounting('enableStockLedger'),
  ],
  Location: [accounting('enableInventory')],
  Batch: [accounting('enableInventory'), inventory('enableBatches')],
  BatchSeries: [accounting('enableInventory'), inventory('enableBatches')],
  SerialNumber: [
    accounting('enableInventory'),
    inventory('enableSerialNumber'),
  ],
  SerialNumberSeries: [
    accounting('enableInventory'),
    inventory('enableSerialNumber'),
  ],
  UOMConversionItem: [
    accounting('enableInventory'),
    inventory('enableUomConversions'),
  ],
  PrintTemplate: [accounting('enablePrintTemplates')],
  CustomForm: [accounting('enableFormCustomization')],
  CustomField: [accounting('enableFormCustomization')],
  POSProfile: [inventory('enablePointOfSale')],
  POSOpeningShift: [inventory('enablePointOfSale')],
  POSClosingShift: [inventory('enablePointOfSale')],
  ItemGroup: [accounting('enableitemGroup')],
  ItemEnquiry: [accounting('enableItemEnquiry')],
};

export function isSchemaFeatureEnabled(fyo: Fyo, schemaName: string): boolean {
  if (['Tax', 'TaxDetail', 'TaxSummary'].includes(schemaName)) return false;
  return (schemaRequirements[schemaName] ?? []).every(({ source, field }) => {
    const settings =
      source === 'inventory'
        ? fyo.singles.InventorySettings
        : fyo.singles.AccountingSettings;
    return !!settings?.[field];
  });
}

export function getAvailableSchemaNames(fyo: Fyo): string[] {
  return Object.keys(fyo.schemaMap).filter((name) =>
    isSchemaFeatureEnabled(fyo, name)
  );
}

export function canCreateSchema(fyo: Fyo, schemaName: string): boolean {
  return isSchemaFeatureEnabled(fyo, schemaName);
}

export function isSchemaCreationBlocked(
  fyo: Fyo,
  schemaName: string,
  isNewRecord: boolean
): boolean {
  return isNewRecord && !canCreateSchema(fyo, schemaName);
}

export function isRecentFeatureItemAvailable(
  fyo: Fyo,
  item: { group: string; schemaName?: string; route?: string }
): boolean {
  if (/^\/data-tools(?:[/?#]|$)/i.test(item.route ?? '')) return false;
  const hiddenTax = ['Tax', 'TaxDetail', 'TaxSummary'];
  if (
    (item.schemaName && hiddenTax.includes(item.schemaName)) ||
    /\/(?:list|edit)\/(?:Tax|TaxDetail|TaxSummary)(?:\/|$|[?#])/i.test(
      item.route ?? ''
    ) ||
    /[?&]schemaName=(?:Tax|TaxDetail|TaxSummary)(?:&|$)/i.test(item.route ?? '')
  ) {
    return false;
  }

  return (
    item.group !== 'Create' ||
    !item.schemaName ||
    canCreateSchema(fyo, item.schemaName)
  );
}

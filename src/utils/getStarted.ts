import type { Fyo } from 'fyo';

export async function getGetStartedTaskCounts(fyo: Fyo) {
  const [
    salesItems,
    purchaseItems,
    salesInvoices,
    customers,
    purchaseInvoices,
    suppliers,
  ] = await Promise.all([
    fyo.db.count('Item', { filters: { for: ['in', ['Sales', 'Both']] } }),
    fyo.db.count('Item', { filters: { for: ['in', ['Purchases', 'Both']] } }),
    fyo.db.count('SalesInvoice'),
    fyo.db.count('Party', { filters: { role: ['in', ['Customer', 'Both']] } }),
    fyo.db.count('PurchaseInvoice'),
    fyo.db.count('Party', { filters: { role: ['in', ['Supplier', 'Both']] } }),
  ]);

  return {
    salesItemCreated: salesItems > 0,
    purchaseItemCreated: purchaseItems > 0,
    invoiceCreated: salesInvoices > 0,
    customerCreated: customers > 0,
    billCreated: purchaseInvoices > 0,
    supplierCreated: suppliers > 0,
  };
}

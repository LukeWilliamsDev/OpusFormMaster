// Shared line-item/totals logic for invoices and final bills.
export interface BillItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number | string;
  sourceInvoiceId?: string; // set when an item was pulled in from an invoice during final-bill merge
}

export interface BillClientInfo {
  entity: string;
  email: string;
  site: string;
  postcode: string;
}

export interface BillTotals {
  netTotal: number;
  grossTotal: number;
}

export const isIncludedRate = (rate: number | string) =>
  typeof rate === "string" && ["INCLUDED", "INCL"].includes(rate.toUpperCase());

export const getLineTotal = (item: BillItem) => {
  if (isIncludedRate(item.rate)) return 0;
  let rateValue = 0;
  if (typeof item.rate === "string") {
    const parsed = parseFloat(item.rate.replace(/[£$,\s]/g, ""));
    rateValue = isNaN(parsed) ? 0 : parsed;
  } else {
    rateValue = Number(item.rate || 0);
  }
  return item.quantity * rateValue;
};

export const computeTotals = (items: BillItem[], vatRate: number): BillTotals => {
  const netTotal = items.reduce((sum, item) => sum + getLineTotal(item), 0);
  const grossTotal = netTotal * (1 + vatRate / 100);
  return { netTotal, grossTotal };
};

export const newBillItem = (sourceInvoiceId?: string): BillItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  unit: "item",
  rate: 0,
  sourceInvoiceId,
});

export const generateBillReference = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}`;

export const emptyClientInfo = (): BillClientInfo => ({
  entity: "",
  email: "",
  site: "",
  postcode: "",
});

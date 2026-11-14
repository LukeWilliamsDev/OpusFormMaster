export interface ReconciledFinancials {
  netTotal: number;
  vatRate: number;
  vatTotal: number;
  grossTotal: number;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function finiteMoney(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? roundMoney(parsed) : null;
}

function rateValue(value: unknown): number {
  if (typeof value === "string" && ["included", "incl"].includes(value.trim().toLowerCase())) {
    return 0;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/[£$€,\t\s]/g, "");
    const parsed = Number(normalized);
    if (!normalized || !Number.isFinite(parsed) || parsed < 0) {
      throw new Error("Persisted billing line item rate is invalid.");
    }
    return parsed;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Persisted billing line item rate is invalid.");
  }
  return parsed;
}

export function lineTotal(item: unknown): number {
  if (!item || typeof item !== "object") {
    throw new Error("Persisted billing line item is invalid.");
  }
  const row = item as Record<string, unknown>;
  if (
    !Object.prototype.hasOwnProperty.call(row, "quantity") ||
    row.quantity === null ||
    (typeof row.quantity === "string" && row.quantity.trim() === "")
  ) {
    throw new Error("Persisted billing line item quantity is invalid.");
  }
  const quantity = Number(row.quantity);
  const rate = rateValue(row.rate);
  if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(rate) || rate < 0) {
    throw new Error("Persisted billing line item is invalid.");
  }
  return roundMoney(quantity * rate);
}

export function reconcileFinancials(
  items: unknown[],
  totals: unknown,
  vatRateValue: unknown,
): ReconciledFinancials {
  const storedTotals =
    totals && typeof totals === "object" ? (totals as Record<string, unknown>) : {};
  const netTotal = finiteMoney(storedTotals.netTotal);
  const storedVatTotal = finiteMoney(storedTotals.vatTotal);
  const grossTotal = finiteMoney(storedTotals.grossTotal);
  const vatRate = finiteMoney(vatRateValue);
  if (netTotal === null || grossTotal === null || vatRate === null || vatRate > 100) {
    throw new Error("Persisted billing totals are invalid.");
  }

  const computedNet = roundMoney(items.reduce((sum, item) => sum + lineTotal(item), 0));
  const vatTotal = roundMoney(netTotal * (vatRate / 100));
  if (
    Math.abs(computedNet - netTotal) > 0.01 ||
    (storedVatTotal !== null && Math.abs(storedVatTotal - vatTotal) > 0.01) ||
    Math.abs(netTotal + vatTotal - grossTotal) > 0.01
  ) {
    throw new Error("Persisted billing totals do not reconcile with line items.");
  }
  return { netTotal, vatRate, vatTotal, grossTotal };
}

export function formatUKDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  // Preserve legacy billing rows written before ISO persistence was enforced.
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Persisted document date is invalid.");
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

import { describe, expect, it } from "vitest";
import { formatUKDate, lineTotal, reconcileFinancials } from "../billing-pdf-financials";

describe("billing PDF financial reconciliation", () => {
  it("normalizes included and formatted rates when calculating line totals", () => {
    expect(lineTotal({ quantity: 2, rate: "£1,250.50" })).toBe(2501);
    expect(lineTotal({ quantity: 1, rate: "INCLUDED" })).toBe(0);
  });

  it("accepts persisted totals only when line items and VAT reconcile", () => {
    expect(
      reconcileFinancials(
        [
          { quantity: 2, rate: 125 },
          { quantity: 1, rate: 50 },
        ],
        { netTotal: 300, vatTotal: 60, grossTotal: 360 },
        20,
      ),
    ).toEqual({ netTotal: 300, vatRate: 20, vatTotal: 60, grossTotal: 360 });
  });

  it("rejects a saved total that does not match its line items", () => {
    expect(() =>
      reconcileFinancials(
        [{ quantity: 1, rate: 100 }],
        { netTotal: 110, vatTotal: 22, grossTotal: 132 },
        20,
      ),
    ).toThrow("do not reconcile");
  });

  it("rejects malformed or negative persisted line items", () => {
    expect(() => lineTotal({ quantity: -1, rate: 100 })).toThrow("line item is invalid");
    expect(() => lineTotal({ quantity: 1, rate: "not-a-rate" })).toThrow("rate is invalid");
    expect(() => lineTotal({ rate: 100 })).toThrow("quantity is invalid");
    expect(() => lineTotal({ quantity: "", rate: 100 })).toThrow("quantity is invalid");
  });

  it("formats timestamps in the UK business timezone", () => {
    expect(formatUKDate("2026-06-30T23:30:00.000Z")).toBe("01/07/2026");
    expect(formatUKDate("30/06/2026")).toBe("30/06/2026");
  });
});

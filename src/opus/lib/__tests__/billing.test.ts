import { describe, expect, it } from "vitest";
import { computeTotals } from "../billing";

describe("bill totals", () => {
  it("calculates VAT separately from the net and gross totals", () => {
    expect(
      computeTotals(
        [{ id: "item-1", description: "Concrete", quantity: 2, unit: "m³", rate: 100 }],
        20,
      ),
    ).toEqual({ netTotal: 200, vatTotal: 40, grossTotal: 240 });
  });

  it("rounds each currency total to pennies", () => {
    expect(
      computeTotals(
        [{ id: "item-1", description: "Small item", quantity: 1, unit: "item", rate: 0.1 }],
        20,
      ),
    ).toEqual({ netTotal: 0.1, vatTotal: 0.02, grossTotal: 0.12 });
  });

  it("leaves final-bill totals unchanged when VAT is zero", () => {
    expect(
      computeTotals(
        [{ id: "item-1", description: "Concrete", quantity: 1, unit: "item", rate: 125 }],
        0,
      ),
    ).toEqual({ netTotal: 125, vatTotal: 0, grossTotal: 125 });
  });
});

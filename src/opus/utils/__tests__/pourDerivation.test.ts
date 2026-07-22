import { describe, test, expect } from "vitest";
import { derivePoursFromQuote } from "../pourDerivation";

describe("derivePoursFromQuote", () => {
  test("matches pour-shaped BoQ lines by keyword", () => {
    const result = derivePoursFromQuote([
      { description: "Slab Pour C32/40", quantity: 34 },
      { description: "Labour - banksman", quantity: 5 },
      { description: "Concrete base to garage", quantity: 12 },
      { description: "Plant hire - excavator", quantity: 1 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      pourNumber: 1,
      mixType: "C32/40",
      volumeM3: 34,
      notes: "Slab Pour C32/40",
    });
    expect(result[1]).toEqual({
      pourNumber: 2,
      mixType: "TBC",
      volumeM3: 12,
      notes: "Concrete base to garage",
    });
  });

  test("matches screed lines and is case-insensitive", () => {
    const result = derivePoursFromQuote([{ description: "SCREED Floor Finish", quantity: 20 }]);
    expect(result).toHaveLength(1);
    expect(result[0].mixType).toBe("TBC");
  });

  test("extracts mix grade regardless of position in description", () => {
    const result = derivePoursFromQuote([
      { description: "Pour of C25/30 to footing", quantity: 8 },
    ]);
    expect(result[0].mixType).toBe("C25/30");
  });

  test("returns empty array when no lines match", () => {
    const result = derivePoursFromQuote([
      { description: "Labour - general", quantity: 1 },
      { description: "Skip hire", quantity: 1 },
    ]);
    expect(result).toEqual([]);
  });

  test("numbers pours sequentially starting at 1", () => {
    const result = derivePoursFromQuote([
      { description: "Concrete pour A", quantity: 1 },
      { description: "Concrete pour B", quantity: 2 },
      { description: "Concrete pour C", quantity: 3 },
    ]);
    expect(result.map((p) => p.pourNumber)).toEqual([1, 2, 3]);
  });
});

import { describe, expect, it } from "vitest";
import { normalizeQuoteForPdf } from "../quotePdf";

describe("quote PDF payload normalization", () => {
  it("removes malformed rows and converts rendered fields to safe primitives", () => {
    const normalized = normalizeQuoteForPdf({
      reference: "OP-100",
      clientInfo: { entity: { legacy: true } as unknown as string },
      items: [
        null as never,
        {
          id: { legacy: true } as unknown as string,
          description: { legacy: true } as unknown as string,
          quantity: "2" as unknown as number,
          unit: "m3",
          rate: "£1,234.50",
        },
      ],
      totals: { netTotal: "1234.5" as unknown as number, grossTotal: Number.NaN },
    });

    expect(normalized.clientInfo?.entity).toBe("");
    expect(normalized.items).toEqual([
      {
        id: "item-1",
        description: "",
        quantity: 2,
        unit: "m3",
        rate: 1234.5,
      },
    ]);
    expect(normalized.totals).toEqual({ netTotal: 1234.5, vatTotal: 0, grossTotal: 0 });
  });

  it("preserves INCLUDED rates as the PDF label", () => {
    expect(
      normalizeQuoteForPdf({
        reference: "OP-101",
        items: [{ id: "1", description: "Pump", quantity: 1, unit: "item", rate: "incl" }],
      }).items,
    ).toEqual([{ id: "1", description: "Pump", quantity: 1, unit: "item", rate: "INCLUDED" }]);
  });
});

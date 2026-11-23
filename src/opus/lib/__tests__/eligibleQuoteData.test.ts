import { describe, expect, it } from "vitest";
import { buildEligibleSuggestions, classifyLineItemDescription } from "../eligibleQuoteData";

describe("eligible quote suggestions", () => {
  it("deduplicates recipients and prefers the newest line-item rate", () => {
    const result = buildEligibleSuggestions([
      {
        created_at: "2026-09-01T00:00:00Z",
        client_info: { entity: "Acme", email: "ACCOUNTS@ACME.TEST" },
        items: [{ description: "Concrete", unit: "m³", rate: 100 }, { description: "VAT" }],
      },
      {
        created_at: "2026-10-01T00:00:00Z",
        client_info: { entity: "Acme Trading", email: "accounts@acme.test" },
        items: [{ description: "Concrete", unit: "m³", rate: 125 }],
      },
    ]);

    expect(result.recipients).toEqual([
      {
        entity: "Acme Trading",
        email: "accounts@acme.test",
        recordCount: 2,
        lastUsed: "2026-10-01T00:00:00Z",
      },
    ]);
    expect(result.lineItems).toEqual([
      {
        description: "Concrete",
        unit: "m³",
        rate: 125,
        category: "concrete",
        useCount: 2,
        lastUsed: "2026-10-01T00:00:00Z",
      },
    ]);
  });

  it("ignores malformed records and VAT-only rows", () => {
    expect(
      buildEligibleSuggestions([
        { client_info: { entity: "", email: "" }, items: [{ description: "VAT", rate: 20 }] },
        { client_info: null, items: "not-an-array" },
      ]),
    ).toEqual({ recipients: [], lineItems: [] });
  });

  it("excludes the Manchester test job", () => {
    expect(
      buildEligibleSuggestions([
        {
          job_id: "g8na57afp",
          client_info: {
            entity: "Test Client",
            email: "test@example.com",
            site: "Manchester test site",
          },
          items: [{ description: "Test item", unit: "item", rate: 1 }],
        },
      ]),
    ).toEqual({ recipients: [], lineItems: [] });
  });

  it("keeps a real Manchester job when it is not the test job", () => {
    expect(
      buildEligibleSuggestions([
        {
          job_id: "real-manchester-job",
          client_info: { entity: "Real Client", email: "real@example.com", site: "Manchester" },
          items: [{ description: "Concrete", unit: "m³", rate: 100 }],
        },
      ]).recipients,
    ).toHaveLength(1);
  });

  it("keeps pump work out of the concrete category", () => {
    expect(classifyLineItemDescription("Concrete Pump Hire")).toBe("pumpPlant");
  });

  it("excludes common VAT-only descriptions and ignores null items", () => {
    expect(
      buildEligibleSuggestions([
        { items: [null, { description: "VAT 20%" }, { description: "VAT (£)" }] },
      ]).lineItems,
    ).toEqual([]);
  });
});

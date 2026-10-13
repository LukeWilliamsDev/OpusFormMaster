import { describe, expect, it } from "vitest";
import {
  formatInvoiceReference,
  formatJobReference,
  formatReferenceForJob,
  formatQuoteReference,
} from "../documentNaming";

describe("stable document references", () => {
  it("formats related job, quote, and invoice references consistently", () => {
    expect(formatJobReference(42, 2026)).toBe("JOB-26-0042");
    expect(formatQuoteReference(42, 2026)).toBe("Q-26-0042");
    expect(formatInvoiceReference(42, 2026)).toBe("INV-26-0042");
    expect(formatReferenceForJob("quote", "JOB-26-0042")).toBe("Q-26-0042");
    expect(formatReferenceForJob("invoice", "JOB-26-0042")).toBe("INV-26-0042");
  });
});

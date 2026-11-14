import { describe, expect, it } from "vitest";
import { buildFinalBillSendPayload } from "../QuoteInvoiceBuilder";

describe("buildFinalBillSendPayload", () => {
  const baseInput = {
    finalBillId: "bill-1",
    clientInfo: {
      entity: "Client Ltd",
      email: "  billing@example.com ",
      site: "Example Site",
      postcode: "M1 1AE",
    },
    ccEmails: ["accounts@example.com"],
    billRef: "INV-26-0001",
    label: "Invoice-01_INV-26-0001",
    pdfBase64: "encoded-pdf",
    netTotal: 100,
    vatRate: 0,
    vatTotal: 0,
    grossTotal: 100,
  };

  it("validates the saved recipient but sends only the persisted document id", () => {
    expect(buildFinalBillSendPayload(baseInput)).toEqual({ finalBillId: "bill-1" });
  });

  it("rejects a missing or malformed recipient before invoking the server", () => {
    expect(() =>
      buildFinalBillSendPayload({
        ...baseInput,
        clientInfo: { ...baseInput.clientInfo, email: "not-an-email" },
      }),
    ).toThrow("valid client email");
  });
});

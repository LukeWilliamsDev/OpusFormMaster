import { describe, expect, it } from "vitest";
import { getManualComplianceFilename } from "../complianceFilename";

describe("getManualComplianceFilename", () => {
  it("uses the first name, surname, certificate, and original extension", () => {
    expect(getManualComplianceFilename("Toby Green", "CSCS", "pdf")).toBe("toby_green_cscs.pdf");
  });

  it("normalizes full certificate names and punctuation", () => {
    expect(
      getManualComplianceFilename("Anaïs O'Connor", "Blue CSCS Skilled Worker Card", ".JPG"),
    ).toBe("anais_oconnor_blue_cscs_skilled_worker_card.jpg");
  });
});

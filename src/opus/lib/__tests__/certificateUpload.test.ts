import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_UPLOAD_MAX_BYTES,
  certificateUploadContentType,
  getCertificateFileExtension,
  normalizeCertificateMimeType,
  sanitizeUploadPathSegment,
  validateCertificateFile,
} from "../certificateUpload";

const file = (overrides: Partial<{ name: string; type: string; size: number }> = {}) => ({
  name: "card.pdf",
  type: "application/pdf",
  size: 100,
  ...overrides,
});

describe("certificate upload validation", () => {
  it("accepts supported files up to the 10 MB boundary", () => {
    expect(validateCertificateFile(file({ size: CERTIFICATE_UPLOAD_MAX_BYTES }))).toBeNull();
  });

  it("rejects unsupported MIME types and files over the limit", () => {
    expect(validateCertificateFile(file({ type: "text/plain" }))).toContain("Only PDF");
    expect(validateCertificateFile(file({ size: CERTIFICATE_UPLOAD_MAX_BYTES + 1 }))).toContain(
      "10 MB",
    );
  });

  it("rejects empty files", () => {
    expect(validateCertificateFile(file({ size: 0 }))).toContain("empty");
  });

  it("normalizes the non-standard JPG MIME type", () => {
    expect(normalizeCertificateMimeType("IMAGE/JPG")).toBe("image/jpeg");
    expect(certificateUploadContentType(file({ type: "image/jpg", name: "card.jpg" }))).toBe(
      "image/jpeg",
    );
  });

  it("derives safe extensions from MIME types and sanitizes fallback names", () => {
    expect(getCertificateFileExtension(file({ type: "image/png", name: "card.weird" }))).toBe(
      "png",
    );
    expect(
      getCertificateFileExtension(file({ type: "application/octet-stream", name: "card.PdF" })),
    ).toBe("pdf");
  });

  it("keeps generated storage path segments ASCII-safe", () => {
    expect(sanitizeUploadPathSegment("UT—DM")).toBe("UT-DM");
    expect(sanitizeUploadPathSegment("—", "XX")).toBe("XX");
  });
});

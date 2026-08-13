import { describe, expect, it } from "vitest";
import {
  buildUploadPath,
  DENY_TEXT,
  isDeclaredUploadTypeAllowed,
  isValidBridgeSecret,
  parseCommand,
  renderWeek,
  sniffFileType,
} from "../lib";

describe("parseCommand", () => {
  it("extracts a start token", () => {
    expect(parseCommand("/start abc123")).toEqual({
      command: "start",
      argument: "abc123",
    });
  });

  it("handles a bare command", () => {
    expect(parseCommand("/myweek")).toEqual({ command: "myweek", argument: "" });
  });

  it("strips a bot suffix", () => {
    expect(parseCommand("/myweek@OpusFormBot")).toEqual({
      command: "myweek",
      argument: "",
    });
  });

  it("returns null for plain text", () => {
    expect(parseCommand("when am i working")).toBeNull();
  });
});

describe("isValidBridgeSecret", () => {
  it("accepts a matching secret", () => {
    expect(isValidBridgeSecret("s3cret", "s3cret")).toBe(true);
  });

  it("rejects a mismatch", () => {
    expect(isValidBridgeSecret("wrong!", "s3cret")).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(isValidBridgeSecret(null, "s3cret")).toBe(false);
  });

  it("rejects when the server has no secret configured", () => {
    expect(isValidBridgeSecret("anything", undefined)).toBe(false);
  });
});

describe("renderWeek", () => {
  it("lists each shift with its site", () => {
    const out = renderWeek([
      { date: "2026-08-14", site_name: "Croydon Depot", postcode: "CR0 1AA" },
    ]);
    expect(out).toContain("Croydon Depot");
    expect(out).toContain("CR0 1AA");
  });

  it("says so when there are no shifts", () => {
    expect(renderWeek([])).toBe("No shifts booked in the next 7 days.");
  });

  it("omits the postcode when absent", () => {
    const out = renderWeek([{ date: "2026-08-14", site_name: "Croydon Depot", postcode: null }]);
    expect(out).toContain("Croydon Depot");
    expect(out).not.toContain("null");
  });
});

describe("DENY_TEXT", () => {
  it("gives no hint about why access failed", () => {
    expect(DENY_TEXT.toLowerCase()).not.toContain("token");
    expect(DENY_TEXT.toLowerCase()).not.toContain("expired");
  });
});

describe("isDeclaredUploadTypeAllowed", () => {
  it("accepts an allowed mime type", () => {
    expect(isDeclaredUploadTypeAllowed("image/jpeg", "cert.jpeg")).toBe(true);
  });

  it("accepts an allowed extension when mime type is missing", () => {
    expect(isDeclaredUploadTypeAllowed(undefined, "cert.pdf")).toBe(true);
  });

  it("rejects an unsupported type", () => {
    expect(isDeclaredUploadTypeAllowed("application/zip", "archive.zip")).toBe(false);
  });

  it("rejects when both mime type and extension are missing", () => {
    expect(isDeclaredUploadTypeAllowed(undefined, undefined)).toBe(false);
  });
});

describe("sniffFileType", () => {
  it("identifies a JPEG by magic bytes", () => {
    expect(sniffFileType(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toEqual({
      mime: "image/jpeg",
      ext: "jpg",
    });
  });

  it("identifies a PNG by magic bytes", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sniffFileType(png)).toEqual({ mime: "image/png", ext: "png" });
  });

  it("identifies a PDF by magic bytes", () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    expect(sniffFileType(pdf)).toEqual({ mime: "application/pdf", ext: "pdf" });
  });

  it("rejects bytes that match no signature, regardless of a claimed mime type", () => {
    expect(sniffFileType(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBeNull();
  });

  it("rejects a truncated file too short to carry a full signature", () => {
    expect(sniffFileType(new Uint8Array([0x89, 0x50]))).toBeNull();
  });
});

describe("buildUploadPath", () => {
  it("ignores the client filename and uses the server-generated uuid", () => {
    expect(buildUploadPath("requests/req-1", "abc-123", "pdf")).toBe("requests/req-1/abc-123.pdf");
  });
});

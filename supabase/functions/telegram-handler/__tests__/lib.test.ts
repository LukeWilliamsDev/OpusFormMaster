import { describe, expect, it } from "vitest";
import { DENY_TEXT, isValidBridgeSecret, parseCommand, renderWeek } from "../lib";

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

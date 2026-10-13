import { describe, expect, it } from "vitest";
import { appendCcEmail, getValidCcEmails, normalizeEmailList } from "../quoteEmail";

describe("quote CC recipients", () => {
  it("normalizes comma, semicolon, and whitespace-separated addresses", () => {
    expect(normalizeEmailList(" One@example.com, two@example.com; ONE@example.com ")).toEqual([
      "one@example.com",
      "two@example.com",
    ]);
  });

  it("rejects malformed addresses and removes the primary recipient", () => {
    expect(
      getValidCcEmails("client@example.com, copy@example.com, not-an-email", "CLIENT@example.com"),
    ).toEqual({
      emails: ["client@example.com", "copy@example.com", "not-an-email"],
      invalid: ["not-an-email"],
      deduped: ["copy@example.com", "not-an-email"],
    });
  });

  it("appends a selected address without replacing or duplicating manual CC input", () => {
    expect(appendCcEmail("manual@example.com", "Prior@example.com")).toBe(
      "manual@example.com, prior@example.com",
    );
    expect(appendCcEmail("manual@example.com, prior@example.com", "PRIOR@example.com")).toBe(
      "manual@example.com, prior@example.com",
    );
  });
});

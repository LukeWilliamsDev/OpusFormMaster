import { describe, expect, it } from "vitest";
import {
  computeDiff,
  getAuditActorIdentifier,
  getAuditCategory,
  getAuditChangeSummary,
  getAuditEventSentence,
  getAuditFieldLabel,
  getAuditOutcomeSummary,
  getAuditSearchText,
  getActorName,
  formatSafeAuditFieldValue,
  formatSafeAuditDetail,
  getRevertibleDiff,
} from "../auditDiff";

describe("audit diff helpers", () => {
  it("reports field-level before and after changes while ignoring metadata", () => {
    expect(
      computeDiff(
        { name: "Old name", status: "pending", id: "1", updated_at: "before" },
        { name: "New name", status: "pending", id: "1", updated_at: "after" },
      ),
    ).toEqual([{ field: "name", before: "Old name", after: "New name" }]);
  });

  it("only marks explicitly supported fields as revertible", () => {
    const diff = computeDiff(
      { name: "Old", tickets: [], current_pours: 1 },
      { name: "New", tickets: [{ id: "ticket" }], current_pours: 2 },
    );

    expect(getRevertibleDiff("staff", diff).map((entry) => entry.field)).toEqual(["name"]);
  });

  it("summarizes what changed and which record it affected", () => {
    expect(
      getAuditChangeSummary(
        {
          action: "UPDATE",
          target_type: "jobs",
          target_id: "job-1",
          details: {
            old: { site_name: "Old site", status: "pending" },
            new: { site_name: "New site", status: "active" },
          },
        },
        "New site · OP-1",
      ),
    ).toBe(
      "Updated site “New site · OP-1”: Site name changed from “Old site” to “New site”; Status changed from “pending” to “active”.",
    );
  });

  it("uses complete sentences for manual and unknown events", () => {
    expect(
      getAuditChangeSummary(
        {
          action: "ADD_NOTE",
          target_type: "jobs",
          target_id: "job-1",
          details: null,
        },
        "Riverside Phase 2",
      ),
    ).toBe("Added a note to site “Riverside Phase 2”.");
    expect(
      getAuditChangeSummary(
        {
          action: "NEW_EVENT_CODE",
          target_type: "staff",
          target_id: "staff-1",
          details: null,
        },
        "Luke Williams",
      ),
    ).toBe("Recorded system event “New Event Code” on staff “Luke Williams”.");
  });

  it("keeps default evidence focused on meaningful categories", () => {
    expect(getAuditCategory("UPDATE")).toBe("changes");
    expect(getAuditCategory("APPROVE_DOCUMENT")).toBe("compliance");
    expect(getAuditCategory("VIEW_DOCUMENT")).toBe("access");
    expect(getAuditCategory("LOGIN_SUCCESS")).toBe("system");
  });

  it("provides a compact outcome without searching raw snapshot JSON", () => {
    const record = {
      action: "UPDATE",
      target_type: "jobs",
      target_id: "job-1",
      user_email: "luke.williams@example.com",
      details: {
        old: { site_name: "Old site", status: "pending" },
        new: { site_name: "New site", status: "active" },
      },
    };

    expect(getAuditOutcomeSummary(record)).toBe("2 fields changed");
    expect(getAuditSearchText(record, "New site")).toContain("new site");
    expect(getAuditSearchText(record, "New site")).not.toContain("old site");
  });

  it("redacts technical and nested event metadata by default", () => {
    expect(formatSafeAuditDetail("request_id", "request-123")).toBe("Restricted");
    expect(formatSafeAuditDetail("uploadUrl", "https://example.test/upload?token=secret")).toBe(
      "Restricted",
    );
    expect(formatSafeAuditDetail("requested_certs", ["CPCS", "CSCS"])).toBe("CPCS, CSCS");
    expect(formatSafeAuditDetail("requested_certs", ["https://example.test/secret"])).toBe(
      "Restricted",
    );
    expect(formatSafeAuditDetail("reference", "request-123")).toBe("Restricted");
    expect(formatSafeAuditDetail("source", "550e8400-e29b-41d4-a716-446655440000")).toBe(
      "Restricted",
    );
    expect(formatSafeAuditDetail("source", "//evil.example")).toBe("Restricted");
    expect(formatSafeAuditDetail("source", "//evil.example?token=secret")).toBe("Restricted");
    expect(formatSafeAuditDetail("source", "FTP://evil.example/file")).toBe("Restricted");
    expect(formatSafeAuditDetail("status", { internal: "value" })).toBe("Restricted");
  });

  it("redacts restricted snapshot fields in diff values", () => {
    const secretUrl = "https://example.test/upload?token=secret";

    expect(formatSafeAuditFieldValue("name", "New name")).toBe("New name");
    expect(formatSafeAuditFieldValue("uploaded_certificates", { secretUrl })).toBe("Restricted");
    expect(formatSafeAuditFieldValue("request_id", "request-123")).toBe("Restricted");
    expect(
      getAuditChangeSummary({
        action: "UPDATE",
        target_type: "staff",
        target_id: "staff-1",
        details: {
          old: { uploaded_certificates: [] },
          new: { uploaded_certificates: [{ uploadUrl: secretUrl }] },
        },
      }),
    ).not.toContain(secretUrl);
  });

  it("keeps restricted field names and actor identifiers out of audit copy", () => {
    expect(getAuditFieldLabel("request_id")).toBe("Other restricted field");
    expect(getAuditActorIdentifier("https://example.test/?token=secret")).toBe(
      "Unverified identifier",
    );
    expect(getAuditActorIdentifier("a@b")).toBe("Unverified identifier");
    expect(getAuditActorIdentifier("admin@localhost")).toBe("Unverified identifier");
    expect(getAuditActorIdentifier("<script>@example.com")).toBe("Unverified identifier");
    expect(getAuditActorIdentifier('a"b@example.com')).toBe("Unverified identifier");
    expect(getActorName("admin@localhost")).toBe("Unverified identifier");
    expect(
      getAuditEventSentence({
        action: "LOGIN_FAIL",
        target_type: "auth",
        target_id: "account-1",
        user_email: "https://example.test/?token=secret",
        details: null,
      }),
    ).toBe("A sign-in attempt failed.");
  });
});

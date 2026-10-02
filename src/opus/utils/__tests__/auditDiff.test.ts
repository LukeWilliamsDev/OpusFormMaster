import { describe, expect, it } from "vitest";
import { computeDiff, getAuditChangeSummary, getRevertibleDiff } from "../auditDiff";

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
});

import { describe, expect, it } from "vitest";
import { getSiteState, isCompletedSite, siteNeedsAttention } from "../siteStatus";

describe("site status normalization", () => {
  it.each(["completed", "complete", "closed", " CLOSED "])("treats %s as completed", (status) => {
    expect(isCompletedSite({ status })).toBe(true);
    expect(getSiteState({ status })).toBe("completed");
  });

  it.each(["pending", "on-hold", "on hold", " ON-HOLD "])(
    "treats %s as needing attention",
    (status) => {
      expect(siteNeedsAttention({ status })).toBe(true);
      expect(getSiteState({ status })).toBe("attention");
    },
  );
});

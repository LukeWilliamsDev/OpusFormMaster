import { describe, it, expect } from "vitest";
import { getNextScheduledPour } from "../PersistentJobHeader";

describe("getNextScheduledPour", () => {
  it("returns the soonest scheduled pour by date", () => {
    const pours = [
      {
        id: "1",
        pourNumber: 2,
        date: "2026-08-05",
        mixType: "C35",
        volumeM3: 10,
        status: "scheduled" as const,
      },
      {
        id: "2",
        pourNumber: 1,
        date: "2026-07-30",
        mixType: "C35",
        volumeM3: 8,
        status: "scheduled" as const,
      },
      {
        id: "3",
        pourNumber: 3,
        date: "2026-07-20",
        mixType: "C35",
        volumeM3: 12,
        status: "completed" as const,
      },
    ];
    expect(getNextScheduledPour(pours)?.id).toBe("2");
  });

  it("returns null when there are no scheduled pours", () => {
    const pours = [
      {
        id: "1",
        pourNumber: 1,
        date: "2026-07-20",
        mixType: "C35",
        volumeM3: 8,
        status: "completed" as const,
      },
    ];
    expect(getNextScheduledPour(pours)).toBeNull();
  });
});

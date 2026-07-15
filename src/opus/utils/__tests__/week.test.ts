import { describe, it, expect } from "vitest";
import {
  toLocalISODate,
  parseLocalISODate,
  getMonday,
  addWeeks,
  getWeekDays,
  formatWeekRange,
  formatDayHeading,
  defaultSelectedDay,
  isValidISODate,
} from "../week";

describe("toLocalISODate / parseLocalISODate", () => {
  it("round-trips a date in local time", () => {
    expect(toLocalISODate(parseLocalISODate("2026-07-06"))).toBe("2026-07-06");
  });

  it("formats a late-evening local date without UTC drift", () => {
    const d = new Date(2026, 6, 6, 23, 30); // 6 Jul 2026 23:30 local
    expect(toLocalISODate(d)).toBe("2026-07-06");
  });

  it("pads single-digit months and days", () => {
    expect(toLocalISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("getMonday", () => {
  it("returns the same day for a Monday", () => {
    expect(toLocalISODate(getMonday(new Date(2026, 6, 6)))).toBe("2026-07-06");
  });

  it("maps mid-week days back to Monday", () => {
    expect(toLocalISODate(getMonday(new Date(2026, 6, 9)))).toBe("2026-07-06"); // Thursday
  });

  it("maps Saturday back to the preceding Monday", () => {
    expect(toLocalISODate(getMonday(new Date(2026, 6, 11)))).toBe("2026-07-06");
  });

  it("maps Sunday back to the preceding Monday", () => {
    expect(toLocalISODate(getMonday(new Date(2026, 6, 12)))).toBe("2026-07-06");
  });

  it("handles month boundaries", () => {
    expect(toLocalISODate(getMonday(new Date(2026, 7, 1)))).toBe("2026-07-27"); // Sat 1 Aug
  });
});

describe("addWeeks", () => {
  it("adds and subtracts weeks", () => {
    expect(addWeeks("2026-07-06", 1)).toBe("2026-07-13");
    expect(addWeeks("2026-07-06", -1)).toBe("2026-06-29");
  });

  it("crosses year boundaries", () => {
    expect(addWeeks("2026-12-28", 1)).toBe("2027-01-04");
  });
});

describe("getWeekDays", () => {
  it("returns Mon-Fri for the anchor week", () => {
    const days = getWeekDays("2026-07-06");
    expect(days).toHaveLength(5);
    expect(days[0]).toEqual({ date: "2026-07-06", dayName: "Monday", shortName: "MON" });
    expect(days[4]).toEqual({ date: "2026-07-10", dayName: "Friday", shortName: "FRI" });
  });

  it("normalizes a non-Monday anchor to its week Monday", () => {
    const days = getWeekDays("2026-07-08"); // Wednesday
    expect(days[0].date).toBe("2026-07-06");
  });
});

describe("formatWeekRange / formatDayHeading", () => {
  it("formats the week range", () => {
    expect(formatWeekRange(getWeekDays("2026-07-06"))).toBe("06 Jul — 10 Jul 2026");
  });

  it("formats the day heading", () => {
    expect(formatDayHeading("2026-07-06")).toBe("Monday, 06 July");
  });
});

describe("defaultSelectedDay", () => {
  it("returns today on a weekday", () => {
    expect(defaultSelectedDay(new Date(2026, 6, 8, 10, 0))).toBe("2026-07-08");
  });

  it("returns next Monday on Saturday", () => {
    expect(defaultSelectedDay(new Date(2026, 6, 11, 10, 0))).toBe("2026-07-13");
  });

  it("returns next Monday on Sunday", () => {
    expect(defaultSelectedDay(new Date(2026, 6, 12, 10, 0))).toBe("2026-07-13");
  });
});

describe("isValidISODate", () => {
  it("accepts real dates", () => {
    expect(isValidISODate("2026-07-06")).toBe(true);
  });

  it("rejects malformed and impossible dates", () => {
    expect(isValidISODate(null)).toBe(false);
    expect(isValidISODate("06-07-2026")).toBe(false);
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("nonsense")).toBe(false);
  });
});

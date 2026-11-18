import { describe, expect, it } from "vitest";
import { Job } from "../../../types/erp";
import {
  formatJobPeriod,
  getJobsForDate,
  hasValidJobPeriod,
  isJobScheduledOnDate,
} from "../jobPeriods";

const job = (overrides: Partial<Job> = {}): Job => ({
  id: "job-1",
  jobRef: "OP-1",
  siteName: "Test site",
  mainContractor: "Test contractor",
  postcode: "SW1A 1AA",
  currentPours: 0,
  contractMaxPours: 1,
  status: "pending",
  scheduleValue: 0,
  ...overrides,
});

describe("job periods", () => {
  it("includes both boundaries and dates between them", () => {
    const datedJob = job({ startDate: "2026-11-10", endDate: "2026-11-12" });

    expect(hasValidJobPeriod(datedJob)).toBe(true);
    expect(isJobScheduledOnDate(datedJob, "2026-11-10")).toBe(true);
    expect(isJobScheduledOnDate(datedJob, "2026-11-11")).toBe(true);
    expect(isJobScheduledOnDate(datedJob, "2026-11-12")).toBe(true);
    expect(isJobScheduledOnDate(datedJob, "2026-11-13")).toBe(false);
  });

  it("rejects missing, incomplete, invalid, and reversed periods", () => {
    expect(hasValidJobPeriod(job())).toBe(false);
    expect(hasValidJobPeriod(job({ startDate: "2026-11-10" }))).toBe(false);
    expect(hasValidJobPeriod(job({ startDate: "2026-11-10", endDate: "2026-11-09" }))).toBe(false);
    expect(hasValidJobPeriod(job({ startDate: "2026-02-30", endDate: "2026-03-02" }))).toBe(false);
  });

  it("formats a valid period using the UK display format", () => {
    expect(formatJobPeriod(job({ startDate: "2026-11-10", endDate: "2026-11-12" }))).toBe(
      "10/11/2026 – 12/11/2026",
    );
    expect(formatJobPeriod(job())).toBe("");
  });

  it("excludes jobs without a period even when they have a shift", () => {
    const periodJob = job({ id: "period-job", startDate: "2026-11-10", endDate: "2026-11-12" });
    const shiftOnlyJob = job({ id: "shift-job", siteName: "Shift-only site" });

    expect(getJobsForDate([periodJob, shiftOnlyJob], "2026-11-11")).toEqual([periodJob]);
  });
});

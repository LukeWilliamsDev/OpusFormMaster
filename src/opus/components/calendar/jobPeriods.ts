import { Job, ScheduledShift } from "../../types/erp";
import { formatUKDate, isValidISODate } from "../../utils/week";

/** A job period is inclusive of both its start and end date. */
export const hasValidJobPeriod = (job: Job): boolean =>
  !!(
    job.startDate &&
    job.endDate &&
    isValidISODate(job.startDate) &&
    isValidISODate(job.endDate) &&
    job.endDate >= job.startDate
  );

export const isJobScheduledOnDate = (job: Job, date: string): boolean =>
  hasValidJobPeriod(job) && job.startDate! <= date && date <= job.endDate!;

/** Merge period-based jobs with shift-based jobs without duplicating a job. */
export const getJobsForDate = (
  jobs: Job[],
  shifts: ScheduledShift[],
  date: string,
  jobsById: ReadonlyMap<string, Job> = new Map(jobs.map((job) => [job.id, job])),
): Job[] => {
  const seen = new Set<string>();
  const result: Job[] = [];

  for (const job of jobs) {
    if (!isJobScheduledOnDate(job, date)) continue;
    seen.add(job.id);
    result.push(job);
  }

  for (const shift of shifts) {
    if (seen.has(shift.jobId)) continue;
    const job = jobsById.get(shift.jobId);
    if (!job) continue;
    seen.add(job.id);
    result.push(job);
  }

  return result;
};

export const formatJobPeriod = (job: Job): string =>
  hasValidJobPeriod(job) ? `${formatUKDate(job.startDate)} – ${formatUKDate(job.endDate)}` : "";

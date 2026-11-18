import { Job } from "../../types/erp";
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

/** Return only jobs whose explicit period contains the calendar date. */
export const getJobsForDate = (jobs: Job[], date: string): Job[] =>
  jobs.filter((job) => isJobScheduledOnDate(job, date));

export const formatJobPeriod = (job: Job): string =>
  hasValidJobPeriod(job) ? `${formatUKDate(job.startDate)} – ${formatUKDate(job.endDate)}` : "";

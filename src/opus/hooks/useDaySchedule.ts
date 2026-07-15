import { useMemo } from "react";
import { Job, Worker, ScheduledShift } from "../types/erp";

export interface DayAssignment {
  worker: Worker;
  shift: ScheduledShift;
  job: Job | undefined;
}

export interface DaySchedule {
  assigned: DayAssignment[];
  unassigned: Worker[];
  byJob: Map<string, DayAssignment[]>;
  deployedCount: number;
}

/**
 * Derives the schedule for one day from the shifts table: who is deployed
 * where, who is free, and the per-project crew breakdown. Archived staff are
 * excluded; searchQuery matches staff name/role and assigned project
 * name/ref.
 */
export const computeDaySchedule = (
  workers: Worker[],
  jobs: Job[],
  shifts: ScheduledShift[],
  date: string,
  searchQuery: string,
): DaySchedule => {
  const query = searchQuery.trim().toLowerCase();
  const dayShifts = shifts.filter((s) => s.date === date);
  const shiftByWorker = new Map(dayShifts.map((s) => [s.workerId, s]));
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  const assigned: DayAssignment[] = [];
  const unassigned: Worker[] = [];

  for (const worker of workers) {
    if (worker.isArchived) continue;
    const shift = shiftByWorker.get(worker.id);
    const job = shift ? jobById.get(shift.jobId) : undefined;
    const matches =
      !query ||
      worker.name.toLowerCase().includes(query) ||
      worker.role.toLowerCase().includes(query) ||
      (job &&
        (job.siteName.toLowerCase().includes(query) || job.jobRef.toLowerCase().includes(query)));
    if (!matches) continue;
    if (shift) {
      assigned.push({ worker, shift, job });
    } else {
      unassigned.push(worker);
    }
  }

  const byJob = new Map<string, DayAssignment[]>();
  for (const entry of assigned) {
    const list = byJob.get(entry.shift.jobId);
    if (list) list.push(entry);
    else byJob.set(entry.shift.jobId, [entry]);
  }

  return { assigned, unassigned, byJob, deployedCount: assigned.length };
};

export const useDaySchedule = (
  workers: Worker[],
  jobs: Job[],
  shifts: ScheduledShift[],
  date: string,
  searchQuery: string,
): DaySchedule =>
  useMemo(
    () => computeDaySchedule(workers, jobs, shifts, date, searchQuery),
    [workers, jobs, shifts, date, searchQuery],
  );

import { useCallback } from "react";
import { Job, Worker, ScheduledShift } from "../types/erp";
import { validateWorkerForDeployment } from "../utils/workerValidation";

export type AssignResult =
  | { status: "ok" }
  | { status: "blocked"; reason: string }
  | { status: "needsReallocation"; currentJobName: string; existingShiftId: string };

const createShift = (workerId: string, jobId: string, date: string): ScheduledShift => ({
  id: `shift-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  workerId,
  jobId,
  date,
});

/**
 * Assignment mutations against the shifts table. Writes go through setShifts,
 * so persistence flows through PortalContext's existing sync effects.
 */
export const useShiftActions = (
  workers: Worker[],
  jobs: Job[],
  shifts: ScheduledShift[],
  setShifts: React.Dispatch<React.SetStateAction<ScheduledShift[]>>,
) => {
  const assignWorker = useCallback(
    (workerId: string, jobId: string, date: string): AssignResult => {
      const worker = workers.find((w) => w.id === workerId);
      if (!worker) return { status: "blocked", reason: "Staff member not found" };

      if (shifts.some((s) => s.workerId === workerId && s.jobId === jobId && s.date === date)) {
        return { status: "ok" }; // already deployed here — nothing to do
      }

      const validation = validateWorkerForDeployment(worker, worker.role);
      if (!validation.isValid) {
        return { status: "blocked", reason: validation.reason ?? "Compliance check failed" };
      }

      const busyElsewhere = shifts.find((s) => s.workerId === workerId && s.date === date);
      if (busyElsewhere) {
        const otherJob = jobs.find((j) => j.id === busyElsewhere.jobId);
        return {
          status: "needsReallocation",
          currentJobName: otherJob?.siteName ?? "another project",
          existingShiftId: busyElsewhere.id,
        };
      }

      setShifts((prev) => [...prev, createShift(workerId, jobId, date)]);
      return { status: "ok" };
    },
    [workers, jobs, shifts, setShifts],
  );

  const confirmReallocate = useCallback(
    (workerId: string, jobId: string, date: string, existingShiftId: string) => {
      setShifts((prev) => [
        ...prev.filter((s) => s.id !== existingShiftId),
        createShift(workerId, jobId, date),
      ]);
    },
    [setShifts],
  );

  const removeShift = useCallback(
    (shiftId: string) => {
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    },
    [setShifts],
  );

  return { assignWorker, confirmReallocate, removeShift };
};

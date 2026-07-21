import { useCallback } from "react";
import { Job, Worker, ScheduledShift } from "../types/erp";
import { validateWorkerForDeployment } from "../utils/workerValidation";
import { supabase } from "../../integrations/supabase/client";

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

// Single choke point for assignment audit logging — every caller (staff
// calendar, project calendar, job details staff panel) routes through
// assignWorker/confirmReallocate/removeShift below, so logging once here
// covers all of them instead of duplicating it per caller.
const logAssignmentAudit = (
  action: "ASSIGN_STAFF" | "REALLOCATE_STAFF" | "REMOVE_STAFF",
  worker: Worker | undefined,
  job: Job | undefined,
  date: string,
) => {
  supabase.auth.getUser().then(({ data: { user } }) => {
    const p_user_email = user?.email || "admin@opusform.co.uk";
    const details = { worker_name: worker?.name, job_name: job?.siteName, date };
    supabase.rpc("log_anonymous_audit", {
      p_user_email,
      p_action: action,
      p_target_type: "jobs",
      p_target_id: job?.id,
      p_details: details,
    });
    supabase.rpc("log_anonymous_audit", {
      p_user_email,
      p_action: action,
      p_target_type: "staff",
      p_target_id: worker?.id,
      p_details: details,
    });
  });
};

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
      logAssignmentAudit("ASSIGN_STAFF", worker, jobs.find((j) => j.id === jobId), date);
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
      logAssignmentAudit(
        "REALLOCATE_STAFF",
        workers.find((w) => w.id === workerId),
        jobs.find((j) => j.id === jobId),
        date,
      );
    },
    [workers, jobs, setShifts],
  );

  const removeShift = useCallback(
    (shiftId: string) => {
      const removed = shifts.find((s) => s.id === shiftId);
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
      if (removed) {
        logAssignmentAudit(
          "REMOVE_STAFF",
          workers.find((w) => w.id === removed.workerId),
          jobs.find((j) => j.id === removed.jobId),
          removed.date,
        );
      }
    },
    [workers, jobs, shifts, setShifts],
  );

  return { assignWorker, confirmReallocate, removeShift };
};

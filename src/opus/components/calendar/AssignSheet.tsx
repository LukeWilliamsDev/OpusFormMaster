import React, { useEffect, useState, useMemo } from "react";
import { AlertCircle, MapPin, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Job, Worker } from "../../types/erp";
import { formatDayHeading } from "../../utils/week";
import { DaySchedule } from "../../hooks/useDaySchedule";
import { AssignResult } from "../../hooks/useShiftActions";
import { getJobColorClasses } from "./jobColors";
import { TicketWarningBadge } from "./TicketWarningBadge";
import { getPostcodeCoordinates, calculateDistance } from "../../utils/geo";
import { Button } from "@/components/ui/button";

export type AssignTarget =
  | { mode: "pickProject"; worker: Worker; date: string }
  | { mode: "pickWorker"; job: Job; date: string };

interface PendingReallocation {
  workerId: string;
  workerName: string;
  jobId: string;
  currentJobName: string;
  existingShiftId: string;
}

interface AssignSheetProps {
  target: AssignTarget | null;
  jobs: Job[];
  schedule: DaySchedule;
  onAssign: (workerId: string, jobId: string) => AssignResult;
  onConfirmReallocate: (workerId: string, jobId: string, existingShiftId: string) => void;
  onClose: () => void;
}

/**
 * Bottom sheet on mobile, centered dialog on md+. Validation failures and the
 * reallocate confirmation render inline instead of window.alert/confirm.
 * The date shown/used is sourced from target.date, since in the week-grid
 * view an assign action can originate from any of the visible weekdays.
 */
export const AssignSheet: React.FC<AssignSheetProps> = ({
  target,
  jobs,
  schedule,
  onAssign,
  onConfirmReallocate,
  onClose,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingReallocation | null>(null);

  useEffect(() => {
    setError(null);
    setPending(null);
  }, [target]);

  const handlePick = (workerId: string, workerName: string, jobId: string) => {
    setError(null);
    setPending(null);
    const result = onAssign(workerId, jobId);
    if (result.status === "ok") {
      onClose();
    } else if (result.status === "blocked") {
      setError(`${workerName} cannot be deployed: ${result.reason}`);
    } else {
      setPending({
        workerId,
        workerName,
        jobId,
        currentJobName: result.currentJobName,
        existingShiftId: result.existingShiftId,
      });
    }
  };

  const activeJobs = jobs.filter((j) => j.status !== "completed");

  // Sort and calculate distances of unassigned workers if target mode is pickWorker
  const unassignedWorkersWithDistance = useMemo(() => {
    if (!target || target.mode !== "pickWorker" || !target.job || !target.job.postcode) {
      return schedule.unassigned.map((worker) => ({ worker, distance: null }));
    }

    const jobCoords = getPostcodeCoordinates(target.job.postcode);
    const withDist = schedule.unassigned.map((worker) => {
      let distance: number | null = null;
      if (worker.postcode) {
        const workerCoords = getPostcodeCoordinates(worker.postcode);
        distance = calculateDistance(jobCoords, workerCoords);
      }
      return { worker, distance };
    });

    return withDist.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  }, [target, schedule.unassigned]);

  return (
    <AnimatePresence>
      {target && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed z-50 inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md"
          >
            <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[75vh] sm:max-h-[80vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
                <div className="flex items-baseline gap-2 min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate">
                    {target.mode === "pickProject"
                      ? `Assign ${target.worker.name}`
                      : `Add staff to ${target.job.siteName}`}
                  </h3>
                  <span className="text-muted-foreground shrink-0">&bull;</span>
                  <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest shrink-0">
                    {formatDayHeading(target.date)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="Close"
                  className="h-auto w-auto p-1.5 text-muted-foreground hover:text-foreground rounded-lg shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {error && (
                <div className="mx-4 mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {pending && (
                <div className="mx-4 mt-3 px-3 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                  <p className="text-xs font-bold text-amber-400">
                    {pending.workerName} is already deployed to “{pending.currentJobName}” on this
                    day. Reallocate?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        onConfirmReallocate(
                          pending.workerId,
                          pending.jobId,
                          pending.existingShiftId,
                        );
                        onClose();
                      }}
                      className="flex-1 h-auto px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-black uppercase tracking-wider hover:bg-amber-500/30 shadow-none"
                    >
                      Reallocate
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPending(null)}
                      className="flex-1 h-auto px-3 py-2 rounded-lg bg-card border-border text-muted-foreground text-[11px] font-black uppercase tracking-wider hover:text-foreground shadow-none"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="p-4 space-y-2 overflow-y-auto">
                {target.mode === "pickProject" ? (
                  activeJobs.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-bold text-center py-6">
                      No active projects available.
                    </p>
                  ) : (
                    activeJobs.map((job) => {
                      const colors = getJobColorClasses(job.id);
                      const crewCount = schedule.byJob.get(job.id)?.length ?? 0;
                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => handlePick(target.worker.id, target.worker.name, job.id)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-3 rounded-xl border border-border bg-card hover:border-primary text-left transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.bullet}`}
                            />
                            <div className="min-w-0">
                              <div className={`text-xs font-bold truncate ${colors.text}`}>
                                {job.siteName}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-black font-mono uppercase tracking-wider mt-0.5">
                                {job.jobRef}
                              </div>
                            </div>
                          </div>
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-black shrink-0">
                            <Users className="w-3.5 h-3.5" /> {crewCount}
                          </span>
                        </button>
                      );
                    })
                  )
                ) : unassignedWorkersWithDistance.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-bold text-center py-6">
                    Everyone is already deployed on this day.
                  </p>
                ) : (
                  unassignedWorkersWithDistance.map(({ worker, distance }) => (
                    <button
                      key={worker.id}
                      type="button"
                      onClick={() => handlePick(worker.id, worker.name, target.job.id)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-3 rounded-xl border border-border bg-card hover:border-primary text-left transition-all cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">{worker.name}</div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                          {worker.role} {worker.postcode ? `• ${worker.postcode}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {distance !== null && (
                          <span className="flex items-center gap-1 text-[10px] font-mono font-bold bg-primary/10 text-primary px-1.5 py-1 rounded-md shrink-0">
                            <MapPin className="w-3 h-3" />
                            {distance.toFixed(1)} mi
                          </span>
                        )}
                        <TicketWarningBadge worker={worker} />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

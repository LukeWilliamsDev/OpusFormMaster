import React, { useMemo } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { usePortal } from "../context/PortalContext";
import { formatUKDate } from "../utils/week";
import { getJobColorClasses } from "../components/calendar/jobColors";

export const MyShiftsPage: React.FC = () => {
  const { user, workers, jobs, shifts } = usePortal();

  const myWorkerIds = useMemo(
    () =>
      new Set(workers.filter((worker) => worker.email === user?.email).map((worker) => worker.id)),
    [user?.email, workers],
  );
  const myShifts = useMemo(
    () =>
      shifts
        .filter((shift) => myWorkerIds.has(shift.workerId))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [myWorkerIds, shifts],
  );
  const jobsById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-4xl mx-auto animate-fade-in space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          My schedule
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground">Assigned shifts</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only shifts assigned to your staff record are shown here.
        </p>
      </div>

      {myShifts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card px-6 py-16 text-center">
          <CalendarDays className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm font-bold text-muted-foreground">
            No assigned shifts in the current schedule window.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {myShifts.map((shift) => {
            const job = jobsById.get(shift.jobId);
            const colors = job ? getJobColorClasses(job.id) : undefined;
            return (
              <article
                key={shift.id}
                className="flex items-center justify-between gap-4 rounded-xl border-2 border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {formatUKDate(shift.date)}
                  </p>
                  <h2 className="mt-1 truncate text-base font-bold text-foreground">
                    {job?.siteName ?? "Assigned site"}
                  </h2>
                  {job?.postcode && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {job.postcode}
                    </p>
                  )}
                </div>
                {job && (
                  <span
                    className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${colors?.bg}`}
                  >
                    {job.jobRef}
                  </span>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

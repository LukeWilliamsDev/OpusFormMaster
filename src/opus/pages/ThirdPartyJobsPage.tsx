import React, { useMemo } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { usePortal } from "../context/PortalContext";

export const ThirdPartyJobsPage: React.FC = () => {
  const { workers, jobs, shifts } = usePortal();
  const ownedWorkerIds = useMemo(() => new Set(workers.map((worker) => worker.id)), [workers]);
  const assignedJobs = useMemo(
    () =>
      jobs.filter((job) =>
        shifts.some((shift) => shift.jobId === job.id && ownedWorkerIds.has(shift.workerId)),
      ),
    [jobs, shifts, ownedWorkerIds],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Assigned sites
        </p>
        <h1 className="mt-2 text-2xl font-black text-foreground">Assigned sites</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only sites where your approved staff are assigned.
        </p>
      </header>
      {assignedJobs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No current or future assignments.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignedJobs.map((job) => {
            const assignedStaff = workers.filter((worker) =>
              shifts.some((shift) => shift.jobId === job.id && shift.workerId === worker.id),
            );
            return (
              <Link
                key={job.id}
                to={`/portal/third-party/jobs/${job.id}`}
                className="group block rounded-2xl border-2 border-border bg-card p-5 transition-colors hover:border-primary"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-foreground">{job.siteName}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {job.postcode} · {assignedStaff.length} staff assigned · {job.currentPours}{" "}
                      pours
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-xs">
                  <span className="text-muted-foreground">Read-only site overview</span>
                  <span className="font-black uppercase tracking-widest text-primary">
                    View site
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Site access</p>
        <p className="mt-3 text-sm font-bold">Read-only overview</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Add notes, site photos, and Third Party Attachments. Your uploads remain private to you.
        </p>
      </div>
    </div>
  );
};

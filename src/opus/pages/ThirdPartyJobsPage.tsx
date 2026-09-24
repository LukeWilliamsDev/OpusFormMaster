import React, { useMemo } from "react";
import { ArrowRight, CheckCircle2, MapPin } from "lucide-react";
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
    <div className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6 lg:py-12">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Work and sites
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Assigned sites</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your approved staff and the sites they are assigned to.
        </p>
      </header>
      {assignedJobs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No current or future assignments.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {assignedJobs.map((job) => {
            const assignedStaff = workers.filter((worker) =>
              shifts.some((shift) => shift.jobId === job.id && shift.workerId === worker.id),
            );
            return (
              <Link
                key={job.id}
                to={`/portal/third-party/jobs/${job.id}`}
                className="group block rounded-2xl border-2 border-border bg-card p-5 shadow-sm transition-colors hover:border-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-foreground">{job.siteName}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {job.postcode}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    {job.status}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-lg font-black">{assignedStaff.length}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Staff assigned
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-lg font-black">{job.currentPours}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Pours
                    </p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between rounded-lg bg-primary/5 p-3 sm:col-span-1">
                    <span className="text-xs font-black text-primary">Open site record</span>
                    <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-black">Updates stay with the site record.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add notes and attachments from the site page. Site photos are supplied by Opus Form.
          </p>
        </div>
      </div>
    </div>
  );
};

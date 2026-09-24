import React, { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { formatUKDate } from "../utils/week";

const isCompletedJob = (job: any) =>
  ["completed", "complete", "closed"].includes(String(job.status).toLowerCase());

const needsAttention = (job: any) =>
  ["pending", "on-hold", "on hold"].includes(String(job.status).toLowerCase());

const statusLabel = (status: string) =>
  status.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

export const ThirdPartyJobsPage: React.FC = () => {
  const { workers, jobs, shifts, dataLoading } = usePortal();
  const [showCompleted, setShowCompleted] = useState(false);
  const ownedWorkerIds = useMemo(() => new Set(workers.map((worker) => worker.id)), [workers]);
  const assignedJobs = useMemo(
    () =>
      jobs.filter((job) =>
        shifts.some((shift) => shift.jobId === job.id && ownedWorkerIds.has(shift.workerId)),
      ),
    [jobs, shifts, ownedWorkerIds],
  );
  const activeJobs = assignedJobs.filter((job) => !isCompletedJob(job));
  const attentionJobs = activeJobs.filter(needsAttention);
  const currentJobs = activeJobs.filter((job) => !needsAttention(job));
  const completedJobs = assignedJobs.filter(isCompletedJob);
  const assignedStaffCount = new Set(
    shifts
      .filter((shift) => assignedJobs.some((job) => job.id === shift.jobId))
      .map((shift) => shift.workerId),
  ).size;

  const renderSiteCard = (job: any, variant: "attention" | "active" | "completed") => {
    const assignedStaff = workers.filter((worker) =>
      shifts.some((shift) => shift.jobId === job.id && shift.workerId === worker.id),
    );
    const dates = shifts
      .filter((shift) => shift.jobId === job.id)
      .map((shift) => shift.date)
      .sort();
    const today = new Date().toISOString().slice(0, 10);
    const pastDates = dates.filter((value) => value <= today);
    const pastDate = pastDates[pastDates.length - 1];
    const date = isCompletedJob(job)
      ? (pastDate ?? dates[0])
      : (dates.find((value) => value >= today) ?? dates[dates.length - 1]);
    const dateLabel = isCompletedJob(job)
      ? pastDate
        ? "Last shift"
        : "Scheduled date"
      : "Next shift";
    const staffNames = assignedStaff.map((worker) => worker.name).filter(Boolean);
    const actionLabel =
      variant === "completed"
        ? "Open history"
        : variant === "attention"
          ? "Review site"
          : "View site";
    return (
      <Link
        key={job.id}
        to={`/portal/third-party/jobs/${job.id}`}
        className={`group block rounded-2xl border-2 bg-card p-5 shadow-sm transition-colors hover:border-primary ${variant === "attention" ? "border-amber-500/50" : "border-border"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-foreground">{job.siteName}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {job.postcode}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-widest ${variant === "attention" ? "bg-amber-500/10 text-amber-700" : "bg-emerald-500/10 text-emerald-600"}`}
          >
            {statusLabel(job.status)}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {date && (
            <span className="rounded-lg border border-border px-3 py-2">
              {dateLabel} · {formatUKDate(date)}
            </span>
          )}
          <span className="rounded-lg border border-border px-3 py-2">
            {assignedStaff.length} staff assigned
          </span>
          <span className="rounded-lg border border-border px-3 py-2">
            {job.currentPours} pours
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            {staffNames.length > 0
              ? staffNames.slice(0, 2).join(" · ") +
                (staffNames.length > 2 ? ` +${staffNames.length - 2}` : "")
              : "No staff assigned"}
          </span>
          <span className="flex shrink-0 items-center gap-2 text-xs font-black text-primary">
            {actionLabel}{" "}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    );
  };

  if (dataLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6 lg:py-12">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2].map((item) => (
            <div key={item} className="h-48 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6 lg:py-12">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Work and sites
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Assigned sites</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Focus on active work. Completed sites stay in history.
        </p>
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
          {activeJobs.length} active · {completedJobs.length} completed · {assignedStaffCount} staff
          assigned
        </p>
      </header>

      {assignedJobs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No assigned sites.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {attentionJobs.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-amber-700">
                  Needs your attention
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  These sites need confirmation or a follow-up.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {attentionJobs.map((job) => renderSiteCard(job, "attention"))}
              </div>
            </section>
          )}

          {currentJobs.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Active and upcoming
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {currentJobs.map((job) => renderSiteCard(job, "active"))}
              </div>
            </section>
          )}

          {completedJobs.length > 0 && (
            <section className="space-y-3">
              <button
                type="button"
                onClick={() => setShowCompleted((visible) => !visible)}
                className="flex w-full items-center justify-between text-left"
              >
                <span>
                  <span className="block text-sm font-black uppercase tracking-widest text-muted-foreground">
                    Completed history
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {completedJobs.length} site{completedJobs.length === 1 ? "" : "s"}
                  </span>
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${showCompleted ? "rotate-180" : ""}`}
                />
              </button>
              {showCompleted && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {completedJobs.map((job) => renderSiteCard(job, "completed"))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};

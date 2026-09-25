import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronRight, MapPin, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { formatUKDate, toLondonISODate } from "../utils/week";

const isCompletedJob = (job: any) =>
  ["completed", "complete", "closed"].includes(String(job.status).toLowerCase());

const needsAttention = (job: any) =>
  ["pending", "on-hold", "on hold"].includes(String(job.status).toLowerCase());

const statusLabel = (status: string) =>
  status.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

const getJobDate = (jobId: string, shifts: any[], completed: boolean) => {
  const dates = shifts
    .filter((shift) => shift.jobId === jobId && shift.date)
    .map((shift) => shift.date)
    .sort();
  if (!dates.length) return null;
  const today = toLondonISODate();
  const pastDates = dates.filter((date) => date <= today);
  if (completed) {
    return {
      label: pastDates.length ? "Last shift" : "Date on record",
      date: pastDates.at(-1) ?? dates[0],
    };
  }
  return { label: "Next shift", date: dates.find((date) => date >= today) ?? dates.at(-1) };
};

type SiteFilter = "all" | "active" | "attention" | "completed";

export const ThirdPartyJobsPage: React.FC = () => {
  const { workers, jobs, shifts, dataLoading } = usePortal();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SiteFilter>("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const ownedWorkerIds = useMemo(() => new Set(workers.map((worker) => worker.id)), [workers]);
  const assignedJobs = useMemo(
    () =>
      jobs.filter((job) =>
        shifts.some((shift) => shift.jobId === job.id && ownedWorkerIds.has(shift.workerId)),
      ),
    [jobs, shifts, ownedWorkerIds],
  );
  const activeJobs = assignedJobs.filter((job) => !isCompletedJob(job));
  const completedJobs = assignedJobs.filter(isCompletedJob);
  const attentionJobs = activeJobs.filter(needsAttention);
  const nextActiveJob = [...activeJobs].sort((a, b) =>
    (getJobDate(a.id, shifts, false)?.date ?? "9999-12-31").localeCompare(
      getJobDate(b.id, shifts, false)?.date ?? "9999-12-31",
    ),
  )[0];
  const visibleJobs = assignedJobs.filter((job) => {
    const matchesSearch = `${job.siteName} ${job.postcode ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && !isCompletedJob(job)) ||
      (filter === "attention" && needsAttention(job)) ||
      (filter === "completed" && isCompletedJob(job));
    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    if (!visibleJobs.length) return;
    if (!selectedJobId || !visibleJobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(visibleJobs[0].id);
    }
  }, [selectedJobId, visibleJobs]);

  const selectedJob = assignedJobs.find((job) => job.id === selectedJobId) ?? null;
  const assignedStaffForJob = (jobId: string) =>
    workers.filter((worker) =>
      shifts.some((shift) => shift.jobId === jobId && shift.workerId === worker.id),
    );
  const assignedStaffCount = new Set(
    shifts
      .filter((shift) => assignedJobs.some((job) => job.id === shift.jobId))
      .map((shift) => shift.workerId),
  ).size;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobileViewport(media.matches);
    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);

  if (dataLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:py-12 2xl:max-w-[1500px]">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:py-12 2xl:max-w-[1500px]">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Work and sites
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            Assigned sites
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Find a site quickly, then manage its record in one place.
          </p>
          <p className="mt-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
            {activeJobs.length} assigned · {completedJobs.length} completed · {assignedStaffCount}{" "}
            staff assigned
          </p>
        </div>
        {nextActiveJob && (
          <Link
            to={`/portal/third-party/jobs/${nextActiveJob.id}`}
            className="rounded-xl bg-primary px-5 py-3 text-center text-xs font-black uppercase tracking-widest text-primary-foreground"
          >
            Open next site <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
          </Link>
        )}
      </header>

      {assignedJobs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No assigned sites yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sites assigned to your approved staff will appear here automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search sites by name or postcode"
                  aria-label="Search assigned sites"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </label>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-lg border border-border px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-primary"
                >
                  Clear search
                </button>
              )}
            </div>
            <label className="mt-3 block sm:hidden">
              <span className="sr-only">Filter assigned sites</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as SiteFilter)}
                aria-label="Filter assigned sites"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="all">All sites · {assignedJobs.length}</option>
                <option value="active">Open · {activeJobs.length}</option>
                <option value="attention">Needs attention · {attentionJobs.length}</option>
                <option value="completed">Completed · {completedJobs.length}</option>
              </select>
            </label>
            <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
              {(
                [
                  ["all", `All sites · ${assignedJobs.length}`],
                  ["active", `Open · ${activeJobs.length}`],
                  ["attention", `Needs attention · ${attentionJobs.length}`],
                  ["completed", `Completed · ${completedJobs.length}`],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${filter === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(360px,440px)_minmax(0,1fr)] xl:items-start">
            <section className="min-w-0 overflow-hidden rounded-2xl border-2 border-border bg-card p-4 xl:sticky xl:top-24">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-black">Site directory</h2>
                <span className="text-xs text-muted-foreground">{visibleJobs.length} shown</span>
              </div>
              <div className="mt-3 space-y-2 xl:max-h-[calc(100vh-23rem)] xl:overflow-y-auto xl:pr-1">
                {visibleJobs.map((job) => {
                  const completed = isCompletedJob(job);
                  const jobDate = getJobDate(job.id, shifts, completed);
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => {
                        if (isMobileViewport) {
                          navigate(`/portal/third-party/jobs/${job.id}`);
                        } else {
                          setSelectedJobId(job.id);
                        }
                      }}
                      className={`grid w-full min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_auto_1rem] items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selectedJobId === job.id ? "border-primary bg-primary/5 ring-2 ring-primary/10" : "border-border hover:border-primary"}`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
                        {completed ? "✓" : "↗"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black" title={job.siteName}>
                          {job.siteName}
                        </span>
                        <span
                          className="mt-0.5 block truncate text-xs text-muted-foreground"
                          title={`${job.postcode ?? ""} · ${jobDate ? `${jobDate.label} ${formatUKDate(jobDate.date)}` : "No shift date"}`}
                        >
                          {job.postcode} ·{" "}
                          {jobDate
                            ? `${jobDate.label} ${formatUKDate(jobDate.date)}`
                            : "No shift date"}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest ${needsAttention(job) ? "bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200" : completed ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"}`}
                      >
                        {statusLabel(job.status)}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
                {!visibleJobs.length && (
                  <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
                    No sites match this search.
                  </p>
                )}
              </div>
            </section>

            <section className="hidden min-w-0 rounded-2xl border-2 border-border bg-card p-5 md:block">
              {selectedJob ? (
                (() => {
                  const completed = isCompletedJob(selectedJob);
                  const jobDate = getJobDate(selectedJob.id, shifts, completed);
                  const staff = assignedStaffForJob(selectedJob.id);
                  return (
                    <>
                      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                            Site record
                          </p>
                          <h2 className="mt-1 break-words text-2xl font-black">
                            {selectedJob.siteName}
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {selectedJob.postcode} · {statusLabel(selectedJob.status)}
                          </p>
                          {jobDate && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {jobDate.label} · {formatUKDate(jobDate.date)}
                            </p>
                          )}
                        </div>
                        <Link
                          to={`/portal/third-party/jobs/${selectedJob.id}`}
                          className="w-full whitespace-nowrap rounded-lg border border-border px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest hover:border-primary xl:w-auto"
                        >
                          Open full site record
                        </Link>
                      </div>
                      {completed && (
                        <p className="mt-5 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                          Completed sites are view-only. Photos, attachments, and conversation
                          history remain available.
                        </p>
                      )}
                      <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-3">
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Assigned staff
                          </p>
                          <p className="mt-2 text-2xl font-black">{staff.length}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">approved workers</p>
                        </div>
                        <div className="rounded-lg border border-border p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Current pours
                          </p>
                          <p className="mt-2 text-2xl font-black">
                            {selectedJob.currentPours ?? 0}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            site record value
                          </p>
                        </div>
                      </div>
                      <div className="mt-6 border-t border-border pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-black">Assigned staff</h3>
                          <Link
                            to="/portal/third-party/staff"
                            className="text-[10px] font-black uppercase tracking-widest text-primary"
                          >
                            View staff →
                          </Link>
                        </div>
                        <div className="mt-3 space-y-2">
                          {staff.length ? (
                            staff.map((worker) => (
                              <div
                                key={worker.id}
                                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold" title={worker.name}>
                                    {worker.name}
                                  </p>
                                  <p className="mt-1 text-[10px] text-muted-foreground">
                                    {worker.role}
                                  </p>
                                </div>
                                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
                                  Approved
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No approved staff assigned.
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-6 border-t border-border pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-black">Site record</h3>
                          <Link
                            to={`/portal/third-party/jobs/${selectedJob.id}`}
                            className="text-[10px] font-black uppercase tracking-widest text-primary"
                          >
                            Open record →
                          </Link>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          View photos supplied by Opus Form, attachments, and conversation history
                          on the full site record.
                        </p>
                      </div>
                    </>
                  );
                })()
              ) : (
                <p className="text-sm text-muted-foreground">Select a site to view its record.</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

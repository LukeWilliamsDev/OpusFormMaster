import React, { useMemo, useState } from "react";
import { ArrowRight, ChevronRight, MapPin, Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { formatUKDate, toLondonISODate } from "../utils/week";

const isCompletedJob = (job: any) =>
  ["completed", "complete", "closed"].includes(String(job.status).toLowerCase());

const needsAttention = (job: any) =>
  ["pending", "on-hold", "on hold"].includes(String(job.status).toLowerCase());

const siteStateLabel = (job: any, completed: boolean) =>
  completed ? "Completed" : needsAttention(job) ? "Needs attention" : "Open";

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

const buildListQuery = (search: string, filter: SiteFilter) => {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (filter !== "all") params.set("filter", filter);
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const ThirdPartyJobsPage: React.FC = () => {
  const { workers, jobs, shifts, dataLoading } = usePortal();
  const location = useLocation();
  const navigate = useNavigate();
  const initialParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [search, setSearch] = useState(initialParams.get("search") ?? "");
  const [filter, setFilter] = useState<SiteFilter>(
    (initialParams.get("filter") as SiteFilter) || "all",
  );
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
  const assignedStaffCount = new Set(
    shifts
      .filter((shift) => assignedJobs.some((job) => job.id === shift.jobId))
      .map((shift) => shift.workerId),
  ).size;
  const updateListState = (nextSearch: string, nextFilter: SiteFilter) => {
    setSearch(nextSearch);
    setFilter(nextFilter);
    navigate(`/portal/third-party/sites${buildListQuery(nextSearch, nextFilter)}`, {
      replace: true,
    });
  };
  const openSite = (jobId: string) => {
    navigate(`/portal/third-party/sites/${jobId}${buildListQuery(search, filter)}`);
  };

  if (dataLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:py-12 2xl:max-w-[1500px]">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 pb-28 sm:px-6 lg:py-12 lg:pb-12 2xl:max-w-[1500px]">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Work and sites
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            Assigned sites
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Find a site quickly, then open its full record.
          </p>
          <p className="mt-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
            {activeJobs.length} assigned · {completedJobs.length} completed · {assignedStaffCount}{" "}
            staff assigned
          </p>
        </div>
        {nextActiveJob && (
          <Link
            to={`/portal/third-party/sites/${nextActiveJob.id}`}
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
                  onChange={(event) => updateListState(event.target.value, filter)}
                  placeholder="Search sites by name or postcode"
                  aria-label="Search assigned sites"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </label>
              {search && (
                <button
                  type="button"
                  onClick={() => updateListState("", filter)}
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
                onChange={(event) => updateListState(search, event.target.value as SiteFilter)}
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
                  onClick={() => updateListState(search, value)}
                  aria-pressed={filter === value}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${filter === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <section className="min-w-0 overflow-hidden rounded-2xl border-2 border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-sm font-black">Site directory</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose a site to open its full record.
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {visibleJobs.length} shown
              </span>
            </div>
            <div className="divide-y divide-border">
              {visibleJobs.map((job) => {
                const completed = isCompletedJob(job);
                const jobDate = getJobDate(job.id, shifts, completed);
                const stateLabel = siteStateLabel(job, completed);
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => openSite(job.id)}
                    aria-label={`Open ${job.siteName} (${stateLabel})`}
                    className={`grid w-full min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_auto_1rem] items-center gap-3 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-5 ${completed ? "bg-muted/25 hover:bg-muted/50" : "hover:bg-primary/5"}`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${completed ? "bg-muted text-muted-foreground" : needsAttention(job) ? "bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200" : "bg-primary/10 text-primary"}`}
                    >
                      {completed ? "✓" : "↗"}
                    </span>
                    <span className="min-w-0">
                      <span className="block break-words text-sm font-black" title={job.siteName}>
                        {job.siteName}
                      </span>
                      <span
                        className="mt-0.5 block break-words text-xs text-muted-foreground"
                        title={`${job.postcode ?? ""} · ${jobDate ? `${jobDate.label} ${formatUKDate(jobDate.date)}` : "No shift date"}`}
                      >
                        {job.postcode} ·{" "}
                        {jobDate
                          ? `${jobDate.label} ${formatUKDate(jobDate.date)}`
                          : "No shift date"}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest ${needsAttention(job) ? "bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200" : completed ? "bg-muted text-muted-foreground ring-1 ring-inset ring-border" : "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"}`}
                    >
                      {stateLabel}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
              {!visibleJobs.length && (
                <div className="p-8 text-center">
                  <p className="text-sm font-bold">No sites match this search.</p>
                  <button
                    type="button"
                    onClick={() => updateListState("", "all")}
                    className="mt-2 text-xs font-black uppercase tracking-widest text-primary"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronRight, MapPin, Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { ThirdPartyDataError } from "../components/ThirdPartyDataState";
import {
  getSiteState,
  isCompletedSite,
  siteNeedsAttention,
  siteStateStyles,
} from "../utils/siteStatus";
import { formatUKDate, toLondonISODate } from "../utils/week";

type SiteFilter = "all" | "today" | "upcoming" | "completed" | "attention";
const SITE_FILTERS: SiteFilter[] = ["all", "today", "upcoming", "completed", "attention"];

const filterStyles: Record<SiteFilter, string> = {
  all: "border-primary bg-primary/10 text-primary",
  today:
    "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-400/40 dark:bg-sky-400/20 dark:text-sky-100",
  upcoming:
    "border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-400/40 dark:bg-violet-400/20 dark:text-violet-100",
  completed:
    "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/20 dark:text-emerald-100",
  attention:
    "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/20 dark:text-amber-100",
};

function siteDate(jobId: string, shifts: { jobId: string; date: string }[], completed: boolean) {
  const dates = shifts
    .filter((shift) => shift.jobId === jobId)
    .map((shift) => shift.date)
    .sort();
  if (!dates.length) return null;
  const today = toLondonISODate();
  const past = dates.filter((date) => date <= today);
  return completed
    ? { label: past.length ? "Last shift" : "Date on record", date: past.at(-1) ?? dates[0] }
    : { label: "Next shift", date: dates.find((date) => date >= today) ?? dates.at(-1) };
}

const buildQuery = (search: string, filter: SiteFilter) => {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (filter !== "all") params.set("filter", filter);
  const query = params.toString();
  return query ? `?${query}` : "";
};

function foremanStatusLabel(status: string): string {
  const normalized = status.toLowerCase().trim();
  if (["completed", "complete", "closed"].includes(normalized)) return "Complete";
  if (["in-progress", "active"].includes(normalized)) return "In progress";
  if (normalized === "on-hold") return "Blocked";
  return "Ready to start";
}

export const ForemanSitesPage: React.FC = () => {
  const { currentStaffId, jobs, shifts, dataLoading, dataError, reloadPortalData } = usePortal();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [search, setSearch] = useState(params.get("search") ?? "");
  const requestedFilter = params.get("filter");
  const [filter, setFilter] = useState<SiteFilter>(
    requestedFilter && SITE_FILTERS.includes(requestedFilter as SiteFilter)
      ? (requestedFilter as SiteFilter)
      : "all",
  );
  useEffect(() => {
    const nextParams = new URLSearchParams(location.search);
    const nextFilter = nextParams.get("filter");
    setSearch(nextParams.get("search") ?? "");
    setFilter(
      nextFilter && SITE_FILTERS.includes(nextFilter as SiteFilter)
        ? (nextFilter as SiteFilter)
        : "all",
    );
  }, [location.search]);

  const ownWorkerIds = useMemo(
    () => (currentStaffId ? new Set([currentStaffId]) : new Set<string>()),
    [currentStaffId],
  );
  const assignedJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const jobShifts = shifts.filter(
          (shift) => shift.jobId === job.id && ownWorkerIds.has(shift.workerId),
        );
        return isCompletedSite(job) || jobShifts.some((shift) => shift.date >= toLondonISODate());
      }),
    [jobs, ownWorkerIds, shifts],
  );
  const today = toLondonISODate();
  const todayJobs = assignedJobs.filter((job) =>
    shifts.some(
      (shift) => shift.jobId === job.id && shift.date === today && ownWorkerIds.has(shift.workerId),
    ),
  );
  const upcomingJobs = assignedJobs.filter(
    (job) =>
      !isCompletedSite(job) &&
      !todayJobs.some((todayJob) => todayJob.id === job.id) &&
      shifts.some(
        (shift) => shift.jobId === job.id && shift.date > today && ownWorkerIds.has(shift.workerId),
      ),
  );
  const completedJobs = assignedJobs.filter(isCompletedSite);
  const attentionJobs = assignedJobs.filter(siteNeedsAttention);
  const visibleJobs = assignedJobs.filter((job) => {
    const text = `${job.siteName} ${job.postcode ?? ""} ${job.jobRef}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "today" && todayJobs.some((item) => item.id === job.id)) ||
      (filter === "upcoming" && upcomingJobs.some((item) => item.id === job.id)) ||
      (filter === "completed" && isCompletedSite(job)) ||
      (filter === "attention" && siteNeedsAttention(job));
    return matchesSearch && matchesFilter;
  });

  const updateListState = (nextSearch: string, nextFilter: SiteFilter) => {
    setSearch(nextSearch);
    setFilter(nextFilter);
    navigate(`/portal/foreman/sites${buildQuery(nextSearch, nextFilter)}`, { replace: true });
  };

  if (dataLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-12"
      >
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <ThirdPartyDataError message={dataError} onRetry={reloadPortalData} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-4 py-6 pb-12 sm:px-6 lg:py-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Work and sites
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            Assigned sites
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Search and open a site record.</p>
          <p className="mt-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
            {todayJobs.length} today · {upcomingJobs.length} upcoming · {completedJobs.length}{" "}
            completed
          </p>
        </div>
        {todayJobs[0] && (
          <Link
            to={`/portal/foreman/sites/${todayJobs[0].id}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-black uppercase tracking-widest text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Open today&apos;s site <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </header>

      {assignedJobs.length === 0 ? (
        <section className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold">No assigned sites yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Sites will appear here when logistics assigns a shift to your staff record.
          </p>
          <Link
            to="/portal/contact"
            className="mt-4 inline-flex min-h-11 items-center text-xs font-black uppercase tracking-widest text-primary underline-offset-4 hover:underline"
          >
            Contact operations if you expected a site{" "}
            <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                value={search}
                onChange={(event) => updateListState(event.target.value, filter)}
                placeholder="Search site, postcode, or job reference"
                aria-label="Search assigned sites"
                className="min-h-11 w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </label>
            <label className="mt-3 block sm:hidden">
              <span className="sr-only">Filter assigned sites</span>
              <select
                value={filter}
                onChange={(event) => updateListState(search, event.target.value as SiteFilter)}
                className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                aria-label="Filter assigned sites"
              >
                <option value="all">All sites · {assignedJobs.length}</option>
                <option value="today">Today · {todayJobs.length}</option>
                <option value="upcoming">Upcoming · {upcomingJobs.length}</option>
                <option value="attention">Needs attention · {attentionJobs.length}</option>
                <option value="completed">Completed · {completedJobs.length}</option>
              </select>
            </label>
            <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
              {(
                [
                  ["all", `All sites · ${assignedJobs.length}`],
                  ["today", `Today · ${todayJobs.length}`],
                  ["upcoming", `Upcoming · ${upcomingJobs.length}`],
                  ["attention", `Needs attention · ${attentionJobs.length}`],
                  ["completed", `Completed · ${completedJobs.length}`],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateListState(search, value)}
                  aria-pressed={filter === value}
                  className={`min-h-11 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${filter === value ? filterStyles[value] : "border-border text-muted-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border-2 border-border bg-card">
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
                const state = getSiteState(job);
                const styles = siteStateStyles[state];
                const date = siteDate(job.id, shifts, isCompletedSite(job));
                return (
                  <Link
                    key={job.id}
                    to={`/portal/foreman/sites/${job.id}${buildQuery(search, filter)}`}
                    className={`grid min-h-20 w-full min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_1rem] items-center gap-3 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:grid-cols-[2.25rem_minmax(0,1fr)_auto_1rem] sm:p-4 ${styles.row}`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${styles.icon}`}
                      aria-hidden="true"
                    >
                      {isCompletedSite(job) ? "✓" : "↗"}
                    </span>
                    <span className="min-w-0">
                      <span className="block break-words text-sm font-black leading-5">
                        {job.siteName}
                      </span>
                      <span className="mt-0.5 block break-words text-xs leading-4 text-muted-foreground">
                        {job.postcode || "No postcode"} ·{" "}
                        {date ? `${date.label} ${formatUKDate(date.date)}` : "No shift date"}
                      </span>
                      <span
                        className={`mt-2 inline-flex max-w-full rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest sm:hidden ${styles.badge}`}
                      >
                        {foremanStatusLabel(job.status)}
                      </span>
                    </span>
                    <span
                      className={`hidden shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest sm:inline-flex ${styles.badge}`}
                    >
                      {foremanStatusLabel(job.status)}
                    </span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
              {!visibleJobs.length && (
                <div className="p-8 text-center">
                  <p className="text-sm font-bold">No sites match these filters.</p>
                  <button
                    type="button"
                    onClick={() => updateListState("", "all")}
                    className="mt-3 min-h-11 text-xs font-black uppercase tracking-widest text-primary underline-offset-4 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

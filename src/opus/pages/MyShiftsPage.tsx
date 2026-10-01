import React, { useMemo } from "react";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { formatUKDate } from "../utils/week";

function londonToday(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export const MyShiftsPage: React.FC = () => {
  const { currentStaffId, jobs, shifts } = usePortal();
  const today = londonToday();
  const jobsById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);
  const groupedSites = useMemo(() => {
    const byJob = new Map<string, Map<string, { total: number; mine: boolean }>>();
    for (const shift of shifts) {
      if (!currentStaffId || shift.workerId !== currentStaffId) continue;
      const dates = byJob.get(shift.jobId) ?? new Map();
      const current = dates.get(shift.date) ?? { total: 0, mine: false };
      current.total += 1;
      current.mine = true;
      dates.set(shift.date, current);
      byJob.set(shift.jobId, dates);
    }
    return [...byJob.entries()]
      .map(([jobId, dates]) => ({
        jobId,
        job: jobsById.get(jobId),
        dates: [...dates.entries()]
          .map(([date, summary]) => ({ date, ...summary }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      }))
      .sort((a, b) =>
        (a.dates[0]?.date ?? "9999-12-31").localeCompare(b.dates[0]?.date ?? "9999-12-31"),
      );
  }, [currentStaffId, jobsById, shifts]);

  const canOpenSite = (jobId: string, date: string) => {
    const job = jobsById.get(jobId);
    const isCompleted = Boolean(
      job && ["completed", "complete", "closed"].includes(job.status.toLowerCase().trim()),
    );
    return Boolean(job && (date >= today || isCompleted));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-foreground sm:px-6 lg:py-10">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Foreman schedule
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">My shifts</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Grouped by site, then date. Crew assignments on the same date stay together.
        </p>
      </header>

      {groupedSites.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <CalendarDays
            className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60"
            aria-hidden="true"
          />
          <h2 className="text-lg font-bold">No assigned shifts</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Your shifts will appear here when logistics assigns site work to your staff record.
          </p>
        </section>
      ) : (
        <div className="space-y-5">
          {groupedSites.map(({ jobId, job, dates }) => (
            <section
              key={jobId}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="border-b border-border px-5 py-4 sm:px-6">
                <h2 className="text-base font-black">{job?.siteName ?? "Assigned site"}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {job?.postcode && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {job.postcode}
                    </span>
                  )}
                  {job?.jobRef && <span>{job.jobRef}</span>}
                  <span>
                    {dates.length} scheduled date{dates.length === 1 ? "" : "s"}
                  </span>
                </p>
              </div>
              <div className="divide-y divide-border">
                {dates.map((shift) => {
                  const isToday = shift.date === today;
                  const isPast = shift.date < today;
                  const canOpen = canOpenSite(jobId, shift.date);
                  const content = (
                    <article className="flex min-w-0 items-center gap-4 px-5 py-4 sm:px-6">
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isToday ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                        aria-hidden="true"
                      >
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                            {isToday ? "Today" : isPast ? "Past assignment" : "Upcoming"}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatUKDate(shift.date)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {shift.total} crew assigned · Your shift
                        </p>
                      </div>
                      {canOpen && (
                        <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      )}
                    </article>
                  );
                  return canOpen ? (
                    <Link
                      key={shift.date}
                      to={`/portal/foreman/sites/${jobId}`}
                      className="block transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    >
                      {content}
                    </Link>
                  ) : (
                    <React.Fragment key={shift.date}>{content}</React.Fragment>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

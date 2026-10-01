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
  const myWorkerIds = useMemo(
    () => (currentStaffId ? new Set([currentStaffId]) : new Set<string>()),
    [currentStaffId],
  );
  const myShifts = useMemo(
    () =>
      shifts
        .filter((shift) => myWorkerIds.has(shift.workerId))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [myWorkerIds, shifts],
  );
  const jobsById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);
  const groups = [
    { key: "today", label: "Today", shifts: myShifts.filter((shift) => shift.date === today) },
    {
      key: "upcoming",
      label: "Upcoming",
      shifts: myShifts.filter((shift) => shift.date > today),
    },
    {
      key: "past",
      label: "Past assignments",
      shifts: myShifts.filter((shift) => shift.date < today),
    },
  ];
  const nextShift = groups.find((group) => group.shifts.length)?.shifts[0];

  const canOpenSite = (shift: (typeof myShifts)[number]) => {
    const job = jobsById.get(shift.jobId);
    const isPast = shift.date < today;
    const isCompleted = Boolean(
      job && ["completed", "complete", "closed"].includes(job.status.toLowerCase().trim()),
    );
    return Boolean(job && (!isPast || isCompleted));
  };

  const renderShift = (shift: (typeof myShifts)[number]) => {
    const job = jobsById.get(shift.jobId);
    const isToday = shift.date === today;
    const isPast = shift.date < today;
    const canOpen = canOpenSite(shift);
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
            <span className="text-xs text-muted-foreground">{formatUKDate(shift.date)}</span>
          </div>
          <h3 className="mt-1 break-words text-sm font-bold sm:text-base">
            {job?.siteName ?? "Assigned site"}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {job?.postcode && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {job.postcode}
              </span>
            )}
            {job?.jobRef && <span>{job.jobRef}</span>}
            <span>Time not provided</span>
          </p>
        </div>
        {canOpen && <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
      </article>
    );
    return canOpen ? (
      <Link
        key={shift.id}
        to={`/portal/foreman/sites/${job!.id}`}
        className="block transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        {content}
      </Link>
    ) : (
      <React.Fragment key={shift.id}>{content}</React.Fragment>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 text-foreground sm:px-6 lg:py-10">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Work and schedule
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">My shifts</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Review the sites and dates assigned to your staff record.
        </p>
      </header>

      {myShifts.length === 0 ? (
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
        <>
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-primary">
              Next shift
            </p>
            <h2 className="mt-2 text-xl font-black">
              {jobsById.get(nextShift?.jobId ?? "")?.siteName ?? "Assigned site"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {nextShift ? formatUKDate(nextShift.date) : "No upcoming date"} · Time not provided
            </p>
            {nextShift && canOpenSite(nextShift) && (
              <Link
                to={`/portal/foreman/sites/${nextShift.jobId}`}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-black uppercase tracking-wider text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Open site <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </section>
          <div className="space-y-5">
            {groups.map(
              (group) =>
                group.shifts.length > 0 && (
                  <section
                    key={group.key}
                    className="overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <div className="border-b border-border px-5 py-4 sm:px-6">
                      <h2 className="text-xs font-black uppercase tracking-[0.14em]">
                        {group.label}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {group.shifts.length} assignment{group.shifts.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="divide-y divide-border">{group.shifts.map(renderShift)}</div>
                  </section>
                ),
            )}
          </div>
        </>
      )}
    </div>
  );
};

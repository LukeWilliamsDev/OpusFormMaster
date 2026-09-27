import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { supabase } from "../../integrations/supabase/client";
import { formatUKDate } from "../utils/week";
import { getCurrentTickets, getTicketStatus } from "../utils/workerValidation";

const db = supabase as any;
const isCompletedJob = (job: any) =>
  ["completed", "complete", "closed"].includes(String(job.status).toLowerCase());
const statusLabel = (status: string) =>
  status.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
const getJobDate = (jobId: string, shifts: any[], completed: boolean) => {
  const dates = shifts
    .filter((shift) => shift.jobId === jobId && shift.date)
    .map((shift) => shift.date)
    .sort();
  if (!dates.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  const pastDates = dates.filter((date) => date <= today);
  return completed
    ? {
        label: pastDates.length ? "Last shift" : "Scheduled date",
        date: pastDates.at(-1) ?? dates[0],
      }
    : {
        label: "Next shift",
        date: dates.find((date) => date >= today) ?? dates.at(-1) ?? dates[0],
      };
};

const getGreeting = () => {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/London",
    }).format(new Date()),
  );
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
};

export const ThirdPartyDashboardPage: React.FC = () => {
  const { workers, jobs, shifts, dataLoading } = usePortal();
  const [pendingCount, setPendingCount] = useState(0);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [unansweredJobId, setUnansweredJobId] = useState<string | null>(null);
  useEffect(() => {
    db.from("third_party_staff_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }: { count: number | null }) => setPendingCount(count ?? 0));
  }, []);
  useEffect(() => {
    const loadUnanswered = async () => {
      const { data: notes } = await db.from("third_party_job_notes").select("id, job_id");
      if (!notes?.length) return;
      const { data: replies } = await db
        .from("third_party_job_note_replies")
        .select("note_id")
        .in(
          "note_id",
          notes.map((note: any) => note.id),
        );
      const replied = new Set((replies ?? []).map((reply: any) => reply.note_id));
      const unanswered = notes.filter((note: any) => !replied.has(note.id));
      setUnansweredCount(unanswered.length);
      setUnansweredJobId(unanswered[0]?.job_id ?? null);
    };
    void loadUnanswered();
  }, []);
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
  const nextJob =
    [...activeJobs].sort((a, b) => {
      const aDate = getJobDate(a.id, shifts, false)?.date ?? "9999-12-31";
      const bDate = getJobDate(b.id, shifts, false)?.date ?? "9999-12-31";
      return aDate.localeCompare(bDate);
    })[0] ?? null;
  const expiringCertificateCount = workers.reduce(
    (count, worker) =>
      count +
      getCurrentTickets(worker.tickets ?? []).filter((ticket) =>
        ["EXPIRED", "EXPIRING_SOON"].includes(getTicketStatus(ticket)),
      ).length,
    0,
  );
  const actionCount = pendingCount + unansweredCount + expiringCertificateCount;
  const assignedStaffForJob = (jobId: string) =>
    workers.filter((worker) =>
      shifts.some((shift) => shift.jobId === jobId && shift.workerId === worker.id),
    );

  if (dataLoading)
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Portal home
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            {getGreeting()}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Your partner access is active. Assigned sites appear here automatically; completed sites
            are view-only.
          </p>
        </div>
        <Link
          to="/portal/third-party/jobs"
          className="rounded-xl bg-primary px-5 py-3 text-center text-xs font-black uppercase tracking-widest text-primary-foreground"
        >
          View assigned sites <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
        </Link>
      </header>
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
        {activeJobs.length} active sites · {completedJobs.length} completed · {workers.length}{" "}
        approved staff
      </p>

      {actionCount > 0 && (
        <section className="rounded-2xl border-2 border-amber-500/40 bg-card p-5 dark:border-amber-400/40">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-200" />
            <h2 className="text-sm font-black uppercase tracking-widest">Needs attention</h2>
          </div>
          <div className="mt-4 space-y-2">
            {pendingCount > 0 && (
              <Link
                to="/portal/third-party/staff"
                className="flex items-center justify-between rounded-lg border border-border px-3 py-3 text-sm hover:border-primary"
              >
                <span>Staff submissions waiting for review</span>
                <b>{pendingCount}</b>
              </Link>
            )}
            {expiringCertificateCount > 0 && (
              <Link
                to="/portal/third-party/staff"
                className="flex items-center justify-between rounded-lg border border-border px-3 py-3 text-sm hover:border-primary"
              >
                <span>Certificates expired or expiring soon</span>
                <b>{expiringCertificateCount}</b>
              </Link>
            )}
            {unansweredCount > 0 && (
              <Link
                to={
                  unansweredJobId
                    ? `/portal/third-party/jobs/${unansweredJobId}`
                    : "/portal/third-party/jobs"
                }
                className="flex items-center justify-between rounded-lg border border-border px-3 py-3 text-sm hover:border-primary"
              >
                <span>Site notes without a response</span>
                <b>{unansweredCount}</b>
              </Link>
            )}
          </div>
        </section>
      )}

      <section className="rounded-2xl border-2 border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              Next scheduled site
            </p>
            {nextJob ? (
              <>
                <h2 className="mt-1 text-xl font-black">{nextJob.siteName}</h2>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {nextJob.postcode}
                </p>
              </>
            ) : (
              <h2 className="mt-1 text-xl font-black">No active sites assigned</h2>
            )}
          </div>
          {nextJob && (
            <span
              className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${["pending", "on-hold"].includes(String(nextJob.status).toLowerCase()) ? "bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200" : "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"}`}
            >
              {statusLabel(nextJob.status)}
            </span>
          )}
        </div>
        {nextJob ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {getJobDate(nextJob.id, shifts, false)?.label ?? "Shift date"}
              </p>
              <p className="mt-2 text-lg font-black">
                {getJobDate(nextJob.id, shifts, false)?.date
                  ? formatUKDate(getJobDate(nextJob.id, shifts, false)!.date)
                  : "Not set"}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Assigned staff
              </p>
              <p className="mt-2 text-lg font-black">{assignedStaffForJob(nextJob.id).length}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">approved workers</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Site record
              </p>
              <p className="mt-2 text-lg font-black">{nextJob.currentPours ?? 0} pours</p>
              <p className="mt-1 text-[10px] text-muted-foreground">current value</p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Completed sites remain available in Assigned sites.
          </p>
        )}
        {nextJob && (
          <div className="mt-5 flex justify-end">
            <Link
              to={`/portal/third-party/jobs/${nextJob.id}`}
              className="rounded-lg border border-border px-4 py-2 text-xs font-black uppercase tracking-widest hover:border-primary"
            >
              Open site record <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-2xl border-2 border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              Your work
            </p>
            <h2 className="mt-1 text-lg font-black">Active sites</h2>
          </div>
          <Link
            to="/portal/third-party/jobs"
            className="text-xs font-black uppercase tracking-widest text-primary"
          >
            View all →
          </Link>
        </div>
        {activeJobs.length ? (
          <div className="mt-4 space-y-2">
            {activeJobs.slice(0, 4).map((job) => {
              const date = getJobDate(job.id, shifts, false);
              return (
                <Link
                  key={job.id}
                  to={`/portal/third-party/jobs/${job.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-border px-3 py-3 hover:border-primary sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    <span className="block text-sm font-bold">{job.siteName}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {date ? `${date.label} · ${formatUKDate(date.date)}` : "No shift date"} ·{" "}
                      {job.postcode}
                    </span>
                  </span>
                  <span className="self-start rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
                    {statusLabel(job.status)}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            No active sites currently assigned.
          </div>
        )}
      </section>
      {completedJobs.length > 0 && (
        <Link
          to="/portal/third-party/jobs"
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          {completedJobs.length} completed site{completedJobs.length === 1 ? "" : "s"} available in
          history
        </Link>
      )}
    </div>
  );
};

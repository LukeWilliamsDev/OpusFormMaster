import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Plus,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { supabase } from "../../integrations/supabase/client";
import { formatUKDate, toLondonISODate } from "../utils/week";
import { getCurrentTickets, getTicketStatus } from "../utils/workerValidation";

const db = supabase as any;
const isCompletedJob = (job: any) =>
  ["completed", "complete", "closed"].includes(String(job.status).toLowerCase());
const statusLabel = (status: string) =>
  status.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
const getJobDate = (jobId: string, shifts: any[], completed = false) => {
  const dates = shifts
    .filter((shift) => shift.jobId === jobId && shift.date)
    .map((shift) => shift.date)
    .sort();
  if (!dates.length) return null;
  const today = toLondonISODate();
  const pastDates = dates.filter((date) => date <= today);
  return completed
    ? {
        label: pastDates.length ? "Last shift" : "Date on record",
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
    [...activeJobs].sort((a, b) =>
      (getJobDate(a.id, shifts)?.date ?? "9999-12-31").localeCompare(
        getJobDate(b.id, shifts)?.date ?? "9999-12-31",
      ),
    )[0] ?? null;
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
  const hasAttention = (worker: (typeof workers)[number]) =>
    getCurrentTickets(worker.tickets ?? []).some((ticket) =>
      ["EXPIRED", "EXPIRING_SOON"].includes(getTicketStatus(ticket)),
    );
  const statusTone = (status: string) =>
    ["pending", "on-hold", "on hold"].includes(status.toLowerCase())
      ? "bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200"
      : "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200";

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
            Manage your people and assigned work from one place.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            to="/portal/third-party/staff?add=1"
            className="rounded-xl bg-primary px-5 py-3 text-center text-xs font-black uppercase tracking-widest text-primary-foreground"
          >
            <Plus className="mr-1 inline h-3.5 w-3.5" />
            Add staff member
          </Link>
          <Link
            to="/portal/third-party/jobs"
            className="rounded-xl border border-border px-5 py-3 text-center text-xs font-black uppercase tracking-widest hover:border-primary"
          >
            View assigned sites <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
          </Link>
        </div>
      </header>
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
        {workers.length} approved staff · {activeJobs.length} assigned sites ·{" "}
        {completedJobs.length} completed
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

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                People
              </p>
              <h2 className="mt-1 text-xl font-black">Your staff</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Submit people for review and keep their records current.
              </p>
            </div>
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Approved
              </p>
              <p className="mt-2 text-2xl font-black">{workers.length}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">staff records</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Pending
              </p>
              <p className="mt-2 text-2xl font-black">{pendingCount}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">submissions</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {workers.slice(0, 3).map((worker) => (
              <Link
                key={worker.id}
                to="/portal/third-party/staff"
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3 hover:border-primary"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{worker.name}</span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {worker.role}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest ${hasAttention(worker) ? "bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200" : "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"}`}
                >
                  {hasAttention(worker) ? "Attention" : "Current"}
                </span>
              </Link>
            ))}
            {!workers.length && (
              <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
                No approved staff yet. Add your first staff member to get started.
              </p>
            )}
          </div>
          <Link
            to="/portal/third-party/staff"
            className="mt-4 block text-xs font-black uppercase tracking-widest text-primary"
          >
            View all staff →
          </Link>
        </section>

        <section className="rounded-2xl border-2 border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Sites</p>
              <h2 className="mt-1 text-xl font-black">Assigned work</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Open a site to view its people, files, photos, and conversation.
              </p>
            </div>
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          {nextJob ? (
            <div className="mt-5 rounded-xl border border-primary/40 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Next scheduled site
                  </p>
                  <p className="mt-1 truncate text-sm font-black">{nextJob.siteName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {nextJob.postcode} · {getJobDate(nextJob.id, shifts)?.label}{" "}
                    {formatUKDate(getJobDate(nextJob.id, shifts)!.date)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest ${statusTone(nextJob.status)}`}
                >
                  {statusLabel(nextJob.status)}
                </span>
              </div>
              <Link
                to={`/portal/third-party/jobs/${nextJob.id}`}
                className="mt-4 inline-flex items-center text-xs font-black uppercase tracking-widest text-primary"
              >
                Open site record <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-dashed border-border p-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-bold">No open sites assigned</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Completed sites remain available in site history.
                </p>
              </div>
            </div>
          )}
          <div className="mt-4 space-y-2">
            {activeJobs
              .filter((job) => job.id !== nextJob?.id)
              .slice(0, 3)
              .map((job) => (
                <Link
                  key={job.id}
                  to={`/portal/third-party/jobs/${job.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3 hover:border-primary"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{job.siteName}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {getJobDate(job.id, shifts)?.date
                        ? `${getJobDate(job.id, shifts)?.label} · ${formatUKDate(getJobDate(job.id, shifts)!.date)}`
                        : "No shift date"}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                </Link>
              ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/portal/third-party/jobs"
              className="text-xs font-black uppercase tracking-widest text-primary"
            >
              View assigned sites →
            </Link>
            {completedJobs.length > 0 && (
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {completedJobs.length} completed in history
              </span>
            )}
          </div>
        </section>
      </div>
      {completedJobs.length > 0 && (
        <Link
          to="/portal/third-party/jobs"
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Completed sites are view-only
        </Link>
      )}
    </div>
  );
};

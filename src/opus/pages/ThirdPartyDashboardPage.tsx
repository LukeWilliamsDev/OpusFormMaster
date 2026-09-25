import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, MapPin, Plus, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { supabase } from "../../integrations/supabase/client";
import { formatUKDate, toLondonISODate } from "../utils/week";
import { getCurrentTickets, getTicketStatus } from "../utils/workerValidation";
import { ThirdPartyDataError } from "../components/ThirdPartyDataState";

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
  const { workers, jobs, shifts, dataLoading, dataError, reloadPortalData } = usePortal();
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
  const assignedStaffForJob = (jobId: string) =>
    workers.filter((worker) =>
      shifts.some((shift) => shift.jobId === jobId && shift.workerId === worker.id),
    );
  const hasAttention = (worker: (typeof workers)[number]) =>
    getCurrentTickets(worker.tickets ?? []).some((ticket) =>
      ["EXPIRED", "EXPIRING_SOON"].includes(getTicketStatus(ticket)),
    );
  const attentionWorkerCount = workers.filter(hasAttention).length;
  const firstAttentionWorker = workers.find(hasAttention);
  const actionCount = pendingCount + unansweredCount + expiringCertificateCount;
  const statusTone = (status: string) =>
    ["pending", "on-hold", "on hold"].includes(status.toLowerCase())
      ? "bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200"
      : "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200";

  if (dataLoading)
    return (
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:py-12 2xl:max-w-[1500px]">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    );

  if (dataError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12 2xl:max-w-[1500px]">
        <ThirdPartyDataError message={dataError} onRetry={reloadPortalData} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 pb-28 sm:px-6 lg:py-12 lg:pb-12 2xl:max-w-[1500px]">
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
            to="/portal/third-party/staff/new"
            className="rounded-xl bg-primary px-5 py-3 text-center text-xs font-black uppercase tracking-widest text-primary-foreground"
          >
            <Plus className="mr-1 inline h-3.5 w-3.5" />
            Add staff member
          </Link>
          <Link
            to="/portal/third-party/sites"
            className="rounded-xl border border-border px-5 py-3 text-center text-xs font-black uppercase tracking-widest hover:border-primary"
          >
            View assigned sites <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
          </Link>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Staff needing attention
          </p>
          <p className="mt-3 text-3xl font-black">{attentionWorkerCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Review certificates</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Open sites
          </p>
          <p className="mt-3 text-3xl font-black">{activeJobs.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeJobs.length ? "Current assignments" : "No active sites assigned"}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border border-border bg-card p-4 sm:col-span-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Completed sites
          </p>
          <p className="mt-3 text-3xl font-black">{completedJobs.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">View site history</p>
        </div>
      </div>

      {actionCount > 0 && (
        <section className="rounded-2xl border border-amber-500/60 bg-card p-4 sm:p-5 dark:border-amber-400/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-200" />
              <h2 className="text-sm font-black">Needs your attention</h2>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              {actionCount} {actionCount === 1 ? "item" : "items"}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {pendingCount > 0 && (
              <Link
                to="/portal/third-party/staff"
                className="flex flex-col gap-2 rounded-xl border border-border bg-background px-3 py-3 hover:border-primary sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="block text-sm font-bold">Staff submission needs review</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {pendingCount} {pendingCount === 1 ? "submission" : "submissions"} waiting
                  </span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Review staff →
                </span>
              </Link>
            )}
            {expiringCertificateCount > 0 && (
              <Link
                to={
                  firstAttentionWorker
                    ? `/portal/third-party/staff/${firstAttentionWorker.id}`
                    : "/portal/third-party/staff?filter=attention"
                }
                className="flex flex-col gap-2 rounded-xl border border-border bg-background px-3 py-3 hover:border-primary sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="block text-sm font-bold">Certificate needs review</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {expiringCertificateCount}{" "}
                    {expiringCertificateCount === 1 ? "certificate" : "certificates"} expired or
                    expiring soon
                  </span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Review staff →
                </span>
              </Link>
            )}
            {unansweredCount > 0 && (
              <Link
                to={
                  unansweredJobId
                    ? `/portal/third-party/sites/${unansweredJobId}`
                    : "/portal/third-party/sites"
                }
                className="flex flex-col gap-2 rounded-xl border border-border bg-background px-3 py-3 hover:border-primary sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="block text-sm font-bold">Site note needs a response</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {unansweredCount} {unansweredCount === 1 ? "note" : "notes"} waiting for a reply
                  </span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Respond →
                </span>
              </Link>
            )}
          </div>
        </section>
      )}

      <div className="hidden gap-5 sm:grid md:grid-cols-2">
        <section className="rounded-2xl border-2 border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                People
              </p>
              <h2 className="mt-1 text-xl font-black">Your staff</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Open a staff record to manage certificates and assignments.
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
                to={`/portal/third-party/staff/${worker.id}`}
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
              <h2 className="mt-1 text-xl font-black">Open sites</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Open a site record to view its current work.
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
                to={`/portal/third-party/sites/${nextJob.id}`}
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
                  to={`/portal/third-party/sites/${job.id}`}
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
              to="/portal/third-party/sites"
              className="text-xs font-black uppercase tracking-widest text-primary"
            >
              View open sites →
            </Link>
            {completedJobs.length > 0 && (
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {completedJobs.length} completed in history
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

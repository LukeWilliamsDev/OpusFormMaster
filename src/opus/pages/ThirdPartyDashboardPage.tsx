import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { supabase } from "../../integrations/supabase/client";
import { getCurrentTickets, getTicketStatus } from "../utils/workerValidation";

const db = supabase as any;
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
const statusLabel = (status: string) =>
  status.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

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
      if (!notes?.length) {
        setUnansweredCount(0);
        setUnansweredJobId(null);
        return;
      }
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
  const activeJobs = assignedJobs.filter(
    (job) => !["completed", "complete", "closed"].includes(String(job.status).toLowerCase()),
  );
  const nextJob = activeJobs[0] ?? assignedJobs[0];
  const nextJobIsCompleted = Boolean(
    nextJob && ["completed", "complete", "closed"].includes(String(nextJob.status).toLowerCase()),
  );
  const nextJobStatus = nextJobIsCompleted
    ? "Completed"
    : nextJob
      ? statusLabel(nextJob.status)
      : null;
  const expiringCertificateCount = workers.reduce(
    (count, worker) =>
      count +
      getCurrentTickets(worker.tickets ?? []).filter((ticket) => {
        const status = getTicketStatus(ticket);
        return status === "EXPIRED" || status === "EXPIRING_SOON";
      }).length,
    0,
  );
  const actionCount = pendingCount + unansweredCount + expiringCertificateCount;
  if (dataLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Third-party portal
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
            {getGreeting()}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Everything your team needs for assigned work, approvals, and site updates.
          </p>
        </div>
        <Link
          to="/portal/third-party/staff"
          className="rounded-xl bg-primary px-5 py-3 text-center text-xs font-black uppercase tracking-widest text-primary-foreground"
        >
          + Add staff member
        </Link>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Your staff", workers.length, "approved and visible", "/portal/third-party/staff"],
          [
            "Assigned sites",
            assignedJobs.length,
            "assigned to your staff",
            "/portal/third-party/jobs",
          ],
          [
            "Action needed",
            actionCount,
            actionCount ? "needs your attention" : "you are all caught up",
            actionCount && unansweredCount > 0 && unansweredJobId
              ? `/portal/third-party/jobs/${unansweredJobId}`
              : "/portal/third-party/staff",
          ],
        ].map(([label, count, description, href]) => (
          <Link
            key={String(label)}
            to={String(href)}
            className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-5 shadow-sm transition-colors hover:border-primary"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <p className="mt-5 text-4xl font-black tracking-tight">{count}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
      {actionCount > 0 && (
        <section className="rounded-2xl border-2 border-border bg-card p-5">
          <h2 className="text-sm font-black uppercase tracking-widest">Needs attention</h2>
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
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border-2 border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-widest">
              {nextJobIsCompleted ? "Latest site" : "Next up"}
            </h2>
            <span
              className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${nextJobIsCompleted ? "bg-muted text-muted-foreground" : nextJob?.status === "pending" || nextJob?.status === "on-hold" ? "bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200" : "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-200"}`}
            >
              {nextJobStatus}
            </span>
          </div>
          {nextJob ? (
            <Link
              to={`/portal/third-party/jobs/${nextJob.id}`}
              className="group block rounded-xl border border-border p-4 transition-colors hover:border-primary"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">{nextJob.siteName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {nextJob.postcode} · {nextJob.currentPours} pours
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{nextJob.status}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              No assigned sites yet.
            </p>
          )}
          <Link
            to="/portal/third-party/jobs"
            className="mt-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary"
          >
            <CalendarDays className="h-3.5 w-3.5" /> View assigned sites
          </Link>
        </section>
        <section className="rounded-2xl border-2 border-border bg-card p-5">
          <h2 className="text-sm font-black uppercase tracking-widest">Quick links</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/portal/third-party/staff"
              className="rounded-lg border border-border px-3 py-2 text-xs font-bold"
            >
              View staff
            </Link>
            <Link
              to="/portal/third-party/jobs"
              className="rounded-lg border border-border px-3 py-2 text-xs font-bold"
            >
              View sites
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

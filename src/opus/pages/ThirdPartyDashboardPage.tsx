import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { supabase } from "../../integrations/supabase/client";

const db = supabase as any;

export const ThirdPartyDashboardPage: React.FC = () => {
  const { workers, jobs, shifts } = usePortal();
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    db.from("third_party_staff_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }: { count: number | null }) => setPendingCount(count ?? 0));
  }, []);
  const ownedWorkerIds = useMemo(() => new Set(workers.map((worker) => worker.id)), [workers]);
  const assignedJobs = useMemo(
    () =>
      jobs.filter((job) =>
        shifts.some((shift) => shift.jobId === job.id && ownedWorkerIds.has(shift.workerId)),
      ),
    [jobs, shifts, ownedWorkerIds],
  );
  const nextJob = assignedJobs[0];
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Third-party portal
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Good morning</h1>
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
            pendingCount,
            pendingCount ? "pending review" : "you are all caught up",
            "/portal/third-party/staff",
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
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border-2 border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-widest">Next up</h2>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
              On track
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

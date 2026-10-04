import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import { MANAGEMENT_WRITE_ROLES, usePortal } from "../context/PortalContext";
import { ShiftResponses } from "../components/ShiftResponses";
import { handleError } from "../utils/errorHandler";
import { getWeatherOnDate, useJobForecast } from "../utils/weather";
import { formatUKDate, toLondonISODate } from "../utils/week";
import type { Job } from "../types/erp";

type ExpiringTicketAlert = {
  alertId: string;
  workerId: string;
  workerName: string;
  ticketType: string;
  diffDays: number;
  isExpired: boolean;
};

const ACTIVE_STATUSES = new Set<Job["status"]>(["active", "in-progress"]);

function getGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/London",
    }).format(new Date()),
  );
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function getJobDate(jobId: string, shifts: { jobId: string; date: string }[]) {
  const dates = shifts
    .filter((shift) => shift.jobId === jobId)
    .map((shift) => shift.date)
    .sort();
  if (!dates.length) return null;
  const today = toLondonISODate();
  return dates.find((date) => date >= today) ?? dates.at(-1) ?? null;
}

function getStatusLabel(status: Job["status"]) {
  if (status === "active" || status === "in-progress") return "In progress";
  if (status === "on-hold") return "On hold";
  if (status === "completed") return "Completed";
  return "Upcoming";
}

function getStatusClass(status: Job["status"]) {
  if (status === "active" || status === "in-progress") {
    return "bg-success/10 text-success";
  }
  if (status === "on-hold") return "bg-warning/10 text-warning";
  return "bg-secondary text-muted-foreground";
}

function formatRelativeExpiry(days: number, isExpired: boolean) {
  if (isExpired) return `Expired ${Math.max(1, Math.abs(days))} days ago`;
  return `Expires in ${days} days`;
}

const WeatherAttentionRow: React.FC<{
  job: Job;
  onRiskChange: (jobId: string, risk: { condition: string; date: string } | null) => void;
}> = ({ job, onRiskChange }) => {
  const { forecast, loading } = useJobForecast(job.postcode);
  const risk = useMemo(() => {
    if (!forecast) return null;
    const today = new Date();
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const dateString = toLondonISODate(date);
      const weather = getWeatherOnDate(forecast, dateString);
      if (weather?.isImpactful) return { condition: weather.condition, date: dateString };
    }
    return null;
  }, [forecast]);

  useEffect(() => {
    if (!loading) onRiskChange(job.id, risk);
  }, [job.id, loading, onRiskChange, risk]);

  if (loading || !risk) return null;
  return (
    <Link
      to={`/portal/ledger?jobId=${job.id}`}
      className="flex flex-col gap-2 border-b border-border px-4 py-4 last:border-b-0 hover:bg-secondary/50 sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-foreground">
          Weather risk at {job.siteName}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {risk.condition} forecast for {formatUKDate(risk.date)}
        </span>
      </span>
      <span className="min-h-11 shrink-0 rounded-lg px-2 py-3 text-sm font-medium text-primary">
        Open job
      </span>
    </Link>
  );
};

export const DashboardPage: React.FC = () => {
  const {
    workers,
    jobs,
    shifts,
    profile,
    user,
    dataLoading,
    dataRefreshing,
    dataRefreshError,
    dataError,
    reloadPortalData,
    role,
  } = usePortal();
  const canWrite = role ? MANAGEMENT_WRITE_ROLES.includes(role) : false;
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(() => new Set());
  const [confirmAlert, setConfirmAlert] = useState<ExpiringTicketAlert | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [weatherRisks, setWeatherRisks] = useState<
    Record<string, { condition: string; date: string } | null>
  >({});

  const expiringTickets = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const alerts: ExpiringTicketAlert[] = [];
    workers.forEach((worker) => {
      if (worker.isArchived) return;
      worker.tickets?.forEach((ticket) => {
        const expiry = new Date(ticket.expiryDate);
        expiry.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
        const isExpired = diffDays < 0;
        if (!isExpired && diffDays > 30) return;
        const alertId = `${worker.id}-${ticket.id}`;
        if (snoozedIds.has(alertId)) return;
        alerts.push({
          alertId,
          workerId: worker.id,
          workerName: worker.name,
          ticketType: ticket.type,
          diffDays,
          isExpired,
        });
      });
    });
    return alerts.sort((a, b) => a.diffDays - b.diffDays);
  }, [snoozedIds, workers]);

  const activeJobs = useMemo(() => jobs.filter((job) => ACTIVE_STATUSES.has(job.status)), [jobs]);
  const weatherJobs = activeJobs.slice(0, 3);
  const currentJobs = useMemo(
    () =>
      jobs
        .filter((job) => ACTIVE_STATUSES.has(job.status) || job.status === "pending")
        .sort((a, b) =>
          (getJobDate(a.id, shifts) ?? "9999").localeCompare(getJobDate(b.id, shifts) ?? "9999"),
        )
        .slice(0, 5),
    [jobs, shifts],
  );
  const nextJob = currentJobs[0] ?? null;
  const nextJobDate = nextJob ? getJobDate(nextJob.id, shifts) : null;
  const nextJobCrewCount =
    nextJob && nextJobDate
      ? new Set(
          shifts
            .filter((shift) => shift.jobId === nextJob.id && shift.date === nextJobDate)
            .map((shift) => shift.workerId),
        ).size
      : 0;

  const handleWeatherRiskChange = useCallback(
    (jobId: string, risk: { condition: string; date: string } | null) => {
      setWeatherRisks((current) =>
        current[jobId] === risk ? current : { ...current, [jobId]: risk },
      );
    },
    [],
  );
  const weatherChecksComplete = weatherJobs.every((job) => weatherRisks[job.id] !== undefined);

  const handleReminder = async (alert: ExpiringTicketAlert) => {
    if (!canWrite) return;
    const worker = workers.find((candidate) => candidate.id === alert.workerId);
    if (!worker?.email) {
      toast.warning("No email address on file for this staff member");
      return;
    }
    if (!profile?.tenant_id) {
      toast.error("Your profile is still loading. Please try again in a moment.");
      return;
    }
    if (!user?.email) {
      toast.error("We could not verify the signed-in actor. Please sign in again.");
      return;
    }
    setConfirmLoading(true);
    const toastId = toast.loading("Sending compliance reminder…");
    try {
      const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
      const { data, error: insertError } = await supabase
        .from("document_requests")
        .insert({
          worker_id: alert.workerId,
          requested_certs: [alert.ticketType],
          expires_at: expiresAt,
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      const uploadUrl = `${window.location.origin}/#/submit-credentials?token=${data.id}`;
      const { error: emailError } = await supabase.functions.invoke("send-compliance-email", {
        body: {
          toEmail: worker.email,
          workerName: worker.name,
          requestedCerts: [alert.ticketType],
          uploadUrl,
          expiresAt,
        },
      });
      if (emailError) throw new Error(emailError.message);
      await supabase.rpc("log_anonymous_audit", {
        p_user_email: user.email,
        p_action: "COMPLIANCE_REMINDER_SENT",
        p_target_type: "staff",
        p_target_id: alert.workerId,
        p_details: {
          ticket_type: alert.ticketType,
          request_id: data.id,
          worker_email: worker.email,
        },
      });
      toast.success(`Reminder sent to ${worker.name}`, { id: toastId });
    } catch (error) {
      const { message } = handleError(error, { message: "Failed to send compliance reminder" });
      toast.error(`Reminder failed: ${message}`, { id: toastId });
      void supabase.functions
        .invoke("send-admin-alert", {
          body: {
            subject: `Compliance reminder failed — ${alert.workerName}`,
            body: `A compliance reminder for ${alert.workerName} (${alert.ticketType}) could not be sent.\n\nWorker ID: ${alert.workerId}\nError: ${message}`,
          },
        })
        .catch((alertError) => console.error("Admin failure alert also failed", alertError));
    } finally {
      setConfirmLoading(false);
      setConfirmAlert(null);
    }
  };

  const loadingView = (
    <div className="portal-page-container space-y-6 py-8 lg:py-12" aria-busy="true">
      <div className="h-28 animate-pulse rounded-2xl bg-muted" />
      <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );

  if (dataLoading) return loadingView;
  if (dataError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <div className="rounded-2xl border border-destructive/30 bg-card p-8">
          <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
          <h1 className="mt-4 text-xl font-black">Operations data could not be loaded</h1>
          <p className="mt-2 text-sm text-muted-foreground">{dataError}</p>
          <button
            type="button"
            onClick={reloadPortalData}
            className="mt-6 min-h-11 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const attentionCount =
    expiringTickets.length + weatherJobs.filter((job) => weatherRisks[job.id]).length;
  return (
    <div className="portal-page-container space-y-7 py-8 lg:py-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Overview</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
            {getGreeting()}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            See what needs attention and what is happening across your sites.
          </p>
          <p
            className="mt-3 flex items-center gap-2 text-[10px] font-medium text-muted-foreground"
            aria-live="polite"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${dataRefreshError ? "bg-warning" : dataRefreshing ? "animate-pulse bg-primary" : "bg-success"}`}
              aria-hidden="true"
            />
            {dataRefreshError ?? (dataRefreshing ? "Updating data…" : "Updated just now")}
          </p>
        </div>
      </header>

      <section aria-labelledby="attention-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="attention-heading" className="text-xl font-semibold tracking-tight">
            Action needed today
          </h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-warning/40 bg-card">
          {expiringTickets.map((alert) => (
            <div
              key={alert.alertId}
              className="flex flex-col gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <Link
                to={`/portal/roster?view=staff&workerId=${alert.workerId}`}
                className="min-w-0 rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <span className="block text-sm font-bold">
                  {alert.workerName}&apos;s {alert.ticketType} needs review
                </span>
                <span
                  className={`mt-1 block text-xs ${alert.isExpired ? "text-destructive" : "text-warning"}`}
                >
                  {formatRelativeExpiry(alert.diffDays, alert.isExpired)}
                </span>
              </Link>
              <div className="flex items-center gap-3 sm:shrink-0">
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setConfirmAlert(alert)}
                    className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Request update
                  </button>
                )}
                <Link
                  to={`/portal/roster?view=staff&workerId=${alert.workerId}`}
                  className="min-h-11 rounded-lg px-2 py-2 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Open person
                </Link>
                <button
                  type="button"
                  onClick={() => setSnoozedIds((current) => new Set(current).add(alert.alertId))}
                  aria-label={`Snooze ${alert.workerName}'s ${alert.ticketType} alert`}
                  className="min-h-11 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Remind me later
                </button>
              </div>
            </div>
          ))}
          {weatherJobs.map((job) => (
            <WeatherAttentionRow key={job.id} job={job} onRiskChange={handleWeatherRiskChange} />
          ))}
          {!weatherChecksComplete && (
            <div className="px-4 py-4 text-xs text-muted-foreground" role="status">
              Checking current site conditions…
            </div>
          )}
          {attentionCount === 0 && weatherChecksComplete && (
            <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Nothing needs attention right now.
            </div>
          )}
        </div>
      </section>

      <ShiftResponses />

      <section aria-labelledby="operations-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="operations-heading" className="text-xl font-semibold tracking-tight">
            Today&apos;s work
          </h2>
          <Link
            to="/portal/ledger"
            className="min-h-11 rounded-lg px-2 py-3 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Open jobs
          </Link>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-base font-semibold">Active jobs</h3>
              <p className="mt-1 text-xs text-muted-foreground">Current and next scheduled work</p>
            </div>
            {currentJobs.length > 0 ? (
              currentJobs.map((job) => {
                const date = getJobDate(job.id, shifts);
                return (
                  <Link
                    key={job.id}
                    to={`/portal/ledger?jobId=${job.id}`}
                    className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-b-0 hover:bg-muted focus:bg-muted focus:outline-none"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{job.siteName}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {job.postcode} ·{" "}
                        {date
                          ? date === toLondonISODate()
                            ? "Next shift today"
                            : `Next shift ${formatUKDate(date)}`
                          : "No shift scheduled"}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-widest ${getStatusClass(job.status)}`}
                    >
                      {getStatusLabel(job.status)}
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                No active or upcoming sites.
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-base font-semibold">Next on the schedule</h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              One concise view of the next decision, without repeating the full calendar.
            </p>
            {nextJob ? (
              <div className="mt-5 divide-y divide-border border-y border-border">
                {[
                  {
                    label: nextJob.siteName,
                    value:
                      nextJobDate === toLondonISODate()
                        ? "Today"
                        : nextJobDate
                          ? formatUKDate(nextJobDate)
                          : "No date",
                  },
                  {
                    label: "Crew scheduled",
                    value: `${nextJobCrewCount} ${nextJobCrewCount === 1 ? "person" : "people"}`,
                  },
                  {
                    label: "Open shifts",
                    value: "View schedule",
                    href: "/portal/roster?view=calendar",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 py-3 text-xs"
                  >
                    <span>{row.label}</span>
                    {row.href ? (
                      <Link to={row.href} className="font-semibold text-primary hover:underline">
                        {row.value}
                      </Link>
                    ) : (
                      <span className="font-semibold text-primary">{row.value}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                No upcoming work is scheduled.
              </p>
            )}
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={canWrite && Boolean(confirmAlert)}
        onOpenChange={(open) => {
          if (!open && !confirmLoading) setConfirmAlert(null);
        }}
        tone="neutral"
        tag="Send compliance reminder"
        title="Send compliance reminder"
        message={
          confirmAlert ? (
            <>
              Send a reminder to <strong>{confirmAlert.workerName}</strong> requesting an updated{" "}
              <strong>{confirmAlert.ticketType}</strong> credential.
            </>
          ) : null
        }
        confirmLabel="Send reminder"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (confirmAlert) void handleReminder(confirmAlert);
        }}
      />
    </div>
  );
};

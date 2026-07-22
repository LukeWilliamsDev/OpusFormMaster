// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ClipboardList,
  Target,
  UserCheck,
  TrendingUp,
  Search,
  AlertTriangle,
  ArrowRight,
  UserPlus,
  Calculator,
  CheckCircle,
  FileText,
  X,
  MapPin,
  Briefcase,
} from "lucide-react";
import { usePortal } from "../context/PortalContext";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

export const DashboardPage: React.FC = () => {
  const { workers, jobs, shifts, profile } = usePortal();
  const navigate = useNavigate();

  // Search & Command Bar State
  const [commandInput, setCommandInput] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [snoozedAlertIds, setSnoozedAlertIds] = useState(new Set());
  const [remindConfirmAlert, setRemindConfirmAlert] = useState(null);
  const [isSendingRemind, setIsSendingRemind] = useState(false);

  // Load quotes on mount to support global search
  useEffect(() => {
    const loadQuotes = async () => {
      try {
        const { data } = await supabase.from("quotes").select("*");
        if (data) {
          setQuotes(
            data.map((q) => ({
              id: q.id,
              reference: q.reference || "EST-DRAFT",
              clientName: q.client_info?.entity || "Unknown Client",
              netTotal: q.totals?.netTotal || 0,
              date: q.date,
            })),
          );
        }
      } catch (e) {
        console.error("Failed to load quotes for dashboard search", e);
      }
    };
    loadQuotes();
  }, []);

  // Timeframe State for metrics
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("weekly");

  const activeJobsFiltered = useMemo(() => {
    if (timeframe === "daily") {
      const todayStr = new Date().toISOString().split("T")[0];
      const todayJobIds = new Set(shifts.filter((s) => s.date === todayStr).map((s) => s.jobId));
      return jobs.filter(
        (j) => todayJobIds.has(j.id) && (j.status === "in-progress" || j.status === "active"),
      );
    }
    if (timeframe === "weekly") {
      return jobs.filter((j) => j.status === "in-progress" || j.status === "active");
    }
    return jobs.filter(
      (j) => j.status === "in-progress" || j.status === "active" || j.status === "pending",
    );
  }, [jobs, shifts, timeframe]);

  const activePoursCountFiltered = useMemo(
    () => activeJobsFiltered.reduce((sum, j) => sum + (j.currentPours || 0), 0),
    [activeJobsFiltered],
  );
  const contractMaxPoursCountFiltered = useMemo(
    () => activeJobsFiltered.reduce((sum, j) => sum + (j.contractMaxPours || 0), 0),
    [activeJobsFiltered],
  );

  const scheduledWorkersCountFiltered = useMemo(() => {
    const today = new Date();
    const dates = [];
    let limit = 1;
    if (timeframe === "weekly") limit = 7;
    if (timeframe === "monthly") limit = 30;

    for (let i = 0; i < limit; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    const filteredShifts = shifts.filter((s) => dates.includes(s.date));
    return new Set(filteredShifts.map((s) => s.workerId)).size;
  }, [shifts, timeframe]);

  const pipelineValueFiltered = useMemo(() => {
    const fullValue = jobs
      .filter((j) => j.status === "in-progress" || j.status === "active")
      .reduce((sum, j) => sum + (Number(j.scheduleValue) || 0), 0);
    if (timeframe === "daily") return Math.round(fullValue / 30);
    if (timeframe === "weekly") return Math.round(fullValue / 4);
    return fullValue;
  }, [jobs, timeframe]);

  // Compute expiring tickets
  const expiringTickets = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const list = [];

    workers.forEach((worker) => {
      if (worker.isArchived) return;
      worker.tickets?.forEach((ticket) => {
        const expiry = new Date(ticket.expiryDate);
        expiry.setHours(0, 0, 0, 0);

        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const isExpired = diffDays < 0;
        const isExpiringSoon = diffDays >= 0 && diffDays <= 30;

        const alertId = `${worker.id}-${ticket.id}`;

        if ((isExpired || isExpiringSoon) && !snoozedAlertIds.has(alertId)) {
          list.push({
            alertId,
            workerId: worker.id,
            workerName: worker.name,
            workerRole: worker.role,
            workerPhone: worker.phone,
            ticketId: ticket.id,
            ticketType: ticket.type,
            expiryDate: ticket.expiryDate,
            ticketNumber: ticket.ticketNumber,
            diffDays,
            isExpired,
            isExpiringSoon,
          });
        }
      });
    });

    return list.sort((a, b) => a.diffDays - b.diffDays);
  }, [workers, snoozedAlertIds]);

  // Filter Search Assets
  const searchResults = useMemo(() => {
    if (!commandInput.trim()) return null;
    const query = commandInput.toLowerCase();

    const matchedJobs = jobs
      .filter(
        (j) =>
          (j.siteName || "").toLowerCase().includes(query) ||
          (j.jobRef || "").toLowerCase().includes(query) ||
          (j.mainContractor && j.mainContractor.toLowerCase().includes(query)),
      )
      .slice(0, 4);

    const matchedWorkers = workers
      .filter(
        (w) =>
          (w.name || "").toLowerCase().includes(query) ||
          (w.role || "").toLowerCase().includes(query),
      )
      .slice(0, 4);

    const matchedQuotes = quotes
      .filter(
        (q) =>
          (q.reference || "").toLowerCase().includes(query) ||
          (q.clientName || "").toLowerCase().includes(query),
      )
      .slice(0, 4);

    return {
      jobs: matchedJobs,
      workers: matchedWorkers,
      quotes: matchedQuotes,
      hasAny: matchedJobs.length > 0 || matchedWorkers.length > 0 || matchedQuotes.length > 0,
    };
  }, [commandInput, jobs, workers, quotes]);

  // Command input handlers
  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults && searchResults.hasAny) {
      // Navigate to the first matching item if present
      if (searchResults.jobs.length > 0) {
        navigate(`/portal/ledger?jobId=${searchResults.jobs[0].id}`);
      } else if (searchResults.workers.length > 0) {
        navigate(`/portal/roster?view=staff&workerId=${searchResults.workers[0].id}`);
      }
      setCommandInput("");
    }
  };

  // Inline Alert Actions
  const handleRemindAlert = async (alert) => {
    const worker = workers.find((w) => w.id === alert.workerId);
    if (!worker?.email) {
      toast.warning("No email address on file for this worker");
      return;
    }

    setIsSendingRemind(true);
    const sendingToastId = toast.loading("SENDING REMINDER", {
      description: `Sending compliance reminder to ${worker.name}...`,
    });
    try {
      // 1. Create document_request row (7-day window)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const { data, error: insertError } = await supabase
        .from("document_requests")
        .insert({
          worker_id: alert.workerId,
          requested_certs: [alert.ticketType],
          expires_at: expiresAt.toISOString(),
          tenant_id: profile?.tenant_id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Build secure upload URL
      const uploadUrl = `${window.location.origin}/#/submit-credentials?token=${data.id}`;

      // 3. Invoke send-compliance-email edge function
      const { error: emailError } = await supabase.functions.invoke("send-compliance-email", {
        body: {
          toEmail: worker.email,
          workerName: worker.name,
          requestedCerts: [alert.ticketType],
          uploadUrl,
          expiresAt: expiresAt.toISOString(),
        },
      });

      if (emailError) throw new Error(emailError.message);

      // 4. Audit log
      await supabase.rpc("log_anonymous_audit", {
        p_user_email: "admin@opusform.co.uk",
        p_action: "COMPLIANCE_REMINDER_SENT",
        p_target_type: "staff",
        p_target_id: alert.workerId,
        p_details: {
          ticket_type: alert.ticketType,
          request_id: data.id,
          worker_email: worker.email,
        },
      });

      toast.success(`Compliance reminder sent to ${worker.name}`, { id: sendingToastId });
    } catch (e: any) {
      console.error("Failed to send compliance reminder:", e);
      toast.warning("Failed to send reminder: " + (e.message || "Unknown error"), {
        id: sendingToastId,
      });

      // Fire-and-forget admin failure alert
      supabase.functions
        .invoke("send-admin-alert", {
          body: {
            subject: `Compliance Reminder Failed — ${alert.workerName}`,
            body: `A compliance reminder for ${alert.workerName} (${alert.ticketType}) could not be sent.\n\nWorker ID: ${alert.workerId}\nError: ${e.message || "Unknown error"}\n\nPlease review the document_requests table and retry manually.`,
          },
        })
        .catch((adminErr) => console.error("Admin alert also failed:", adminErr));
    } finally {
      setIsSendingRemind(false);
    }
  };

  const handleSnoozeAlert = (alertId) => {
    setSnoozedAlertIds((prev) => {
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });
    toast("Alert snoozed for 24 hours");
  };

  const handleUpdateAlert = (workerId) => {
    navigate(`/portal/roster?view=staff&workerId=${workerId}`);
  };

  return (
    <div className="py-6 lg:py-10 px-4 sm:px-6 max-w-7xl 2xl:max-w-[1700px] mx-auto space-y-8 animate-fade-in font-sans">
      {/* Command search + timeframe selector, grouped as one unit */}
      <div className="space-y-3">
        <div className="relative">
          <form onSubmit={handleCommandSubmit} className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search
                className={`w-5 h-5 transition-colors duration-200 ${isSearchFocused ? "text-primary" : "text-muted-foreground"}`}
              />
            </div>
            <input
              type="text"
              className="w-full bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary/40 rounded-xl pl-12 pr-28 py-3.5 text-sm text-foreground placeholder-muted-foreground/60 outline-none transition-all duration-200 min-h-[48px]"
              placeholder="Search site, staff name, role, or estimate ref..."
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />
            <div className="absolute inset-y-0 right-3 flex items-center space-x-2">
              <kbd className="hidden sm:inline-flex items-center bg-secondary border border-border text-[11px] px-2 py-0.5 rounded font-mono text-muted-foreground font-semibold">
                ESC
              </kbd>
              {commandInput && (
                <button
                  type="button"
                  onClick={() => setCommandInput("")}
                  className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          {/* Dropdown Floating Panel for matches */}
          <AnimatePresence>
            {isSearchFocused && commandInput.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
              >
                {/* Data search matches */}
                {searchResults && (
                  <div className="max-h-80 overflow-y-auto divide-y divide-border p-2 space-y-3">
                    {/* Job Matches */}
                    {searchResults.jobs.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wider px-3 py-1 block">
                          Matching Jobs
                        </span>
                        <div className="space-y-0.5">
                          {searchResults.jobs.map((job) => (
                            <div
                              key={job.id}
                              onMouseDown={() => navigate(`/portal/ledger?jobId=${job.id}`)}
                              className="px-3 py-2 hover:bg-secondary rounded-lg cursor-pointer flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-2.5">
                                <Briefcase className="w-4 h-4 text-primary" />
                                <span className="text-[12px] font-semibold text-foreground">
                                  {job.siteName}
                                </span>
                                <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                  {job.jobRef}
                                </span>
                              </div>
                              <span className="text-[11px] text-muted-foreground uppercase font-bold">
                                {job.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Worker Matches */}
                    {searchResults.workers.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wider px-3 py-1 block">
                          Matching Staff
                        </span>
                        <div className="space-y-0.5">
                          {searchResults.workers.map((worker) => (
                            <div
                              key={worker.id}
                              onMouseDown={() =>
                                navigate(`/portal/roster?view=staff&workerId=${worker.id}`)
                              }
                              className="px-3 py-2 hover:bg-secondary rounded-lg cursor-pointer flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-2.5">
                                <UserCheck className="w-4 h-4 text-primary" />
                                <span className="text-[12px] font-semibold text-foreground">
                                  {worker.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                  {worker.role}
                                </span>
                              </div>
                              <span className="text-[11px] text-success font-semibold">Ready</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quote Matches */}
                    {searchResults.quotes.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wider px-3 py-1 block">
                          Matching Estimates
                        </span>
                        <div className="space-y-0.5">
                          {searchResults.quotes.map((quote) => (
                            <div
                              key={quote.id}
                              onMouseDown={() =>
                                navigate(`/portal/pipeline?view=pipeline-registry`)
                              }
                              className="px-3 py-2 hover:bg-secondary rounded-lg cursor-pointer flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-2.5">
                                <FileText className="w-4 h-4 text-primary" />
                                <span className="text-[12px] font-semibold text-foreground">
                                  {quote.clientName}
                                </span>
                                <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                  {quote.reference}
                                </span>
                              </div>
                              <span className="text-[12px] font-mono text-foreground font-semibold">
                                £{quote.netTotal.toLocaleString("en-GB")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!searchResults.hasAny && (
                      <div className="p-4 text-center text-[12px] text-muted-foreground">
                        No matched jobs, staff, or quotes found for "{commandInput}"
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Operations Summary
          </h2>
          <div className="flex items-center gap-1">
            {(["daily", "weekly", "monthly"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  timeframe === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3 Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Metric 1 */}
        <div className="bg-card border border-border hover:border-primary/40 rounded-xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Active Job Sites
              </span>
              <div className="text-3xl font-bold text-foreground mt-1 font-mono tracking-tight">
                {activeJobsFiltered.length}
              </div>
            </div>

            {/* SVG Circular Gauge */}
            <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  stroke="var(--border)"
                  strokeWidth="2.5"
                  fill="transparent"
                />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 18}
                  strokeDashoffset={
                    2 *
                    Math.PI *
                    18 *
                    (1 -
                      (contractMaxPoursCountFiltered
                        ? activePoursCountFiltered / contractMaxPoursCountFiltered
                        : 0))
                  }
                />
              </svg>
              <span className="absolute text-[8px] font-bold text-foreground/85 font-mono">
                {contractMaxPoursCountFiltered
                  ? Math.round((activePoursCountFiltered / contractMaxPoursCountFiltered) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-medium">Pours progress</span>
              <span className="font-mono text-foreground font-bold">
                {activePoursCountFiltered} / {contractMaxPoursCountFiltered} Pours
              </span>
            </div>
            <button
              onClick={() => navigate("/portal/ledger")}
              className="text-[10px] font-black uppercase tracking-wider text-primary hover:text-foreground transition-colors text-left flex items-center gap-1 mt-1 cursor-pointer"
            >
              Log Pour / Inspect Ledger &rarr;
            </button>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-card border border-border hover:border-primary/40 rounded-xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Scheduled Crew
              </span>
              <div className="text-3xl font-bold text-foreground mt-1 font-mono tracking-tight">
                {scheduledWorkersCountFiltered}
              </div>
            </div>
            <UserCheck className="w-5 h-5 text-success opacity-80" />
          </div>

          <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Crew active:</span>
                <span className="font-mono text-foreground font-bold">
                  {workers.length
                    ? Math.round((scheduledWorkersCountFiltered / workers.length) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
                <div
                  className="bg-success h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${workers.length ? (scheduledWorkersCountFiltered / workers.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <button
              onClick={() => navigate("/portal/roster")}
              className="text-[10px] font-black uppercase tracking-wider text-success hover:text-foreground transition-colors text-left flex items-center gap-1 mt-1 cursor-pointer"
            >
              Manage Shift Dispatch &rarr;
            </button>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-card border border-border hover:border-primary/40 rounded-xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Pipeline Run-Rate
              </span>
              <div className="text-3xl font-bold text-primary mt-1 font-mono tracking-tight">
                £{pipelineValueFiltered.toLocaleString("en-GB")}
              </div>
            </div>

            {/* Sparkline mini-graph */}
            <div className="w-14 h-7 shrink-0">
              <svg className="w-full h-full" viewBox="0 0 100 40">
                <path
                  d={
                    timeframe === "daily"
                      ? "M 0 35 Q 25 30 50 15 T 100 10"
                      : timeframe === "weekly"
                        ? "M 0 30 Q 25 25 50 20 T 100 5"
                        : "M 0 25 Q 25 20 50 18 T 100 2"
                  }
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                />
                <path
                  d={
                    timeframe === "daily"
                      ? "M 0 35 Q 25 30 50 15 T 100 10 L 100 40 L 0 40 Z"
                      : timeframe === "weekly"
                        ? "M 0 30 Q 25 25 50 20 T 100 5 L 100 40 L 0 40 Z"
                        : "M 0 25 Q 25 20 50 18 T 100 2 L 100 40 L 0 40 Z"
                  }
                  fill="url(#sparkline-grad)"
                  opacity="0.15"
                />
                <defs>
                  <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-medium">Contracts ledger</span>
              <span className="font-mono text-foreground font-bold">Excludes VAT</span>
            </div>
            <button
              onClick={() => navigate("/portal/pipeline")}
              className="text-[10px] font-black uppercase tracking-wider text-primary hover:text-foreground transition-colors text-left flex items-center gap-1 mt-1 cursor-pointer"
            >
              Open Quotes & Billing Board &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Compliance Alerts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Compliance Alerts (2/3 width) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 flex flex-col space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h2 className="text-base font-bold text-foreground font-archivo uppercase tracking-wide">
                Compliance Warnings
              </h2>
            </div>
            <span className="text-[12px] bg-destructive/10 text-destructive px-2.5 py-1 rounded-md font-bold font-mono">
              {expiringTickets.length} Action Required
            </span>
          </div>

          <div className="divide-y divide-border flex-1 overflow-y-auto max-h-[360px]">
            {expiringTickets.map((alert) => (
              <div
                key={alert.alertId}
                onClick={() => handleUpdateAlert(alert.workerId)}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2.5 border-l-[3px] hover:bg-background transition-colors cursor-pointer ${
                  alert.isExpired ? "border-l-destructive" : "border-l-warning"
                }`}
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
                    <span className="font-bold text-foreground leading-none">
                      {alert.workerName}
                    </span>
                    {alert.workerRole && (
                      <span className="text-muted-foreground">&bull; {alert.workerRole}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    <span
                      className={`font-bold ${
                        alert.isExpired ? "text-destructive" : "text-warning"
                      }`}
                    >
                      {alert.isExpired
                        ? `Expired ${Math.abs(alert.diffDays)}d ago`
                        : `Expiring in ${alert.diffDays}d`}
                    </span>
                    {" — "}
                    {alert.ticketType}
                    {alert.ticketNumber && ` (${alert.ticketNumber})`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRemindConfirmAlert(alert);
                    }}
                    className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-secondary hover:bg-muted text-foreground/85 transition-colors cursor-pointer"
                  >
                    Remind
                  </button>
                </div>
              </div>
            ))}

            {expiringTickets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-success/80" />
                <div>
                  <h4 className="text-[12px] font-bold text-foreground">Roster Fully Compliant</h4>
                  <p className="text-[12px] text-muted-foreground mt-1">
                    All active operatives have up-to-date qualifications.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Remind Confirmation Modal */}
          <ConfirmDialog
            open={!!remindConfirmAlert}
            onOpenChange={(open) => {
              if (!open) setRemindConfirmAlert(null);
            }}
            tone="neutral"
            tag="Send Compliance Reminder"
            title="Send Compliance Reminder"
            message={
              remindConfirmAlert && (
                <>
                  Send a compliance reminder email to{" "}
                  <span className="text-foreground font-bold">{remindConfirmAlert.workerName}</span>{" "}
                  requesting they update their{" "}
                  <span className="text-foreground font-bold">{remindConfirmAlert.ticketType}</span>{" "}
                  credential which{" "}
                  {remindConfirmAlert.isExpired ? (
                    <span className="text-destructive font-bold">
                      expired {Math.abs(remindConfirmAlert.diffDays)} days ago
                    </span>
                  ) : (
                    <span className="text-warning font-bold">
                      expires in {remindConfirmAlert.diffDays} days
                    </span>
                  )}
                  .
                </>
              )
            }
            confirmLabel="Confirm Send"
            cancelLabel="Cancel"
            onConfirm={() => {
              handleRemindAlert(remindConfirmAlert);
              setRemindConfirmAlert(null);
            }}
          />
        </div>

        {/* Right Column: Quick Actions Panel (1/3 width) */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold text-foreground font-archivo uppercase tracking-wide">
              Quick Operations
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {/* Add Staff */}
            <button
              onClick={() => navigate("/portal/roster?view=staff&addWorker=1")}
              className="w-full text-left p-4 rounded-xl bg-background border border-border hover:border-success/40 hover:bg-secondary transition-all group flex items-center justify-between cursor-pointer min-h-[44px]"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-lg bg-success/10 text-success group-hover:bg-success group-hover:text-foreground transition-all">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[12px] font-bold text-foreground">Add New Staff</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Register a worker and upload safety certifications
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-foreground/30 group-hover:text-foreground group-hover:translate-x-1 transition-all" />
            </button>

            {/* Create Quote */}
            <button
              onClick={() => navigate("/portal/pipeline?view=quote-builder")}
              className="w-full text-left p-4 rounded-xl bg-background border border-border hover:border-primary/40 hover:bg-secondary transition-all group flex items-center justify-between cursor-pointer min-h-[44px]"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-foreground transition-all">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[12px] font-bold text-foreground">Create Quote</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Build a client invoice with custom VAT/CIS settings
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-foreground/30 group-hover:text-foreground group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

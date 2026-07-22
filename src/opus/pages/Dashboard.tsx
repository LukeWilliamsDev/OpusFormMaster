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
  UserPlus,
  Calculator,
  CheckCircle,
  FileText,
  X,
  MapPin,
  Briefcase,
  CloudRain,
  CalendarDays,
} from "lucide-react";
import { usePortal } from "../context/PortalContext";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { useJobForecast, getWeatherOnDate } from "../utils/weather";
import { toLocalISODate } from "../utils/week";

const TIMEFRAME_DAYS = { daily: 1, weekly: 7, monthly: 30 };

function formatUKDate(isoDate) {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function formatDayCount(days) {
  if (days < 60) return `${days}d`;
  if (days < 730) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

const JobWeatherRow: React.FC<{
  job: any;
  timeframe: string;
  onStatusChange: (id: string, atRisk: boolean) => void;
  onSelectDate: (date: string) => void;
}> = ({ job, timeframe, onStatusChange, onSelectDate }) => {
  const { forecast } = useJobForecast(job.postcode);

  const worst = useMemo(() => {
    if (!forecast) return null;
    const days = TIMEFRAME_DAYS[timeframe] || 7;
    const today = new Date();
    let best = null;
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = toLocalISODate(d);
      const info = getWeatherOnDate(forecast, dateStr);
      if (info?.isImpactful && (!best || (info.riskLevel === "High" && best.riskLevel !== "High"))) {
        best = { ...info, date: dateStr };
      }
    }
    return best;
  }, [forecast, timeframe]);

  useEffect(() => {
    onStatusChange(job.id, !!worst);
  }, [worst, job.id]);

  if (!worst) return null;

  return (
    <div
      onClick={() => onSelectDate(worst.date)}
      className="flex items-center justify-between gap-2 px-2 py-2.5 hover:bg-secondary/60 transition-colors cursor-pointer"
    >
      <div className="flex-1 min-w-0 flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[12px]">
        <span className="font-bold text-foreground">{job.siteName}</span>
        <span className="text-muted-foreground">&bull; {job.postcode}</span>
        <span className="text-muted-foreground">&bull; {worst.condition} forecast on {formatUKDate(worst.date)}</span>
      </div>
      <span
        className={`text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded shrink-0 ${
          worst.riskLevel === "High"
            ? "bg-destructive/10 text-destructive"
            : "bg-warning/10 text-warning"
        }`}
      >
        {worst.riskLevel} Risk
      </span>
    </div>
  );
};

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
  const [weatherRiskByJob, setWeatherRiskByJob] = useState({});
  const handleWeatherStatusChange = React.useCallback((jobId, atRisk) => {
    setWeatherRiskByJob((prev) => {
      if (prev[jobId] === atRisk) return prev;
      return { ...prev, [jobId]: atRisk };
    });
  }, []);

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

  const weatherWarningCount = useMemo(
    () => activeJobsFiltered.filter((j) => weatherRiskByJob[j.id]).length,
    [activeJobsFiltered, weatherRiskByJob],
  );


  const crewPerSiteFiltered = useMemo(() => {
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

    return activeJobsFiltered.map((job) => {
      const jobShifts = filteredShifts.filter((s) => s.jobId === job.id);
      const jobShiftDates = new Set(jobShifts.map((s) => s.date));
      return {
        jobId: job.id,
        siteName: job.siteName,
        crewCount: new Set(jobShifts.map((s) => s.workerId)).size,
        workerIds: jobShifts.map((s) => s.workerId),
        nextDate: dates.find((d) => jobShiftDates.has(d)) || dates[0],
      };
    });
  }, [shifts, timeframe, activeJobsFiltered]);

  const scheduledWorkersOnActiveSites = useMemo(
    () => new Set(crewPerSiteFiltered.flatMap((site) => site.workerIds)).size,
    [crewPerSiteFiltered],
  );

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

        <div className="border-t border-border" />
      </div>

      {/* Quick Operations */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        <button
          onClick={() => navigate("/portal/roster?view=staff")}
          className="p-4 rounded-xl bg-card border border-border hover:border-success/40 hover:bg-secondary transition-all group flex items-center gap-3 cursor-pointer min-h-[44px]"
        >
          <div className="p-2.5 rounded-lg bg-success/10 text-success group-hover:bg-success group-hover:text-foreground transition-all shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <span className="text-[12px] font-bold text-foreground text-left">Staff</span>
        </button>

        <button
          onClick={() => navigate("/portal/roster?view=staff&addWorker=1")}
          className="p-4 rounded-xl bg-card border border-border hover:border-success/40 hover:bg-secondary transition-all group flex items-center gap-3 cursor-pointer min-h-[44px]"
        >
          <div className="p-2.5 rounded-lg bg-success/10 text-success group-hover:bg-success group-hover:text-foreground transition-all shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
          <span className="text-[12px] font-bold text-foreground text-left">Add New Staff</span>
        </button>

        <button
          onClick={() => navigate("/portal/ledger")}
          className="p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-secondary transition-all group flex items-center gap-3 cursor-pointer min-h-[44px]"
        >
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-foreground transition-all shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <span className="text-[12px] font-bold text-foreground text-left">Job Ledger</span>
        </button>

        <button
          onClick={() => navigate("/portal/roster")}
          className="p-4 rounded-xl bg-card border border-border hover:border-success/40 hover:bg-secondary transition-all group flex items-center gap-3 cursor-pointer min-h-[44px]"
        >
          <div className="p-2.5 rounded-lg bg-success/10 text-success group-hover:bg-success group-hover:text-foreground transition-all shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <span className="text-[12px] font-bold text-foreground text-left">Calendar</span>
        </button>

        <button
          onClick={() => navigate("/portal/pipeline?view=pipeline-registry")}
          className="p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-secondary transition-all group flex items-center gap-3 cursor-pointer min-h-[44px]"
        >
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-foreground transition-all shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-[12px] font-bold text-foreground text-left">Manage Quotes</span>
        </button>

        <button
          onClick={() => navigate("/portal/pipeline?view=quote-builder")}
          className="p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-secondary transition-all group flex items-center gap-3 cursor-pointer min-h-[44px]"
        >
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-foreground transition-all shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <span className="text-[12px] font-bold text-foreground text-left">Create Quote</span>
        </button>
      </div>

      {/* Timeframe selector */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground truncate min-w-0">
          Operations Summary
        </h2>
        <div className="flex items-center gap-1 shrink-0">
          {(["daily", "weekly", "monthly"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-2 py-1 text-[9px] sm:px-2.5 sm:text-[10px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
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

      {/* Operations Summary panel — one shell, internal hairlines instead of stacked cards */}
      <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y divide-border sm:divide-y-0 sm:divide-x sm:divide-border">
            {/* Active Job Sites */}
            <div className="p-6 space-y-4 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <h2 className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Active Job Sites
                  </h2>
                </div>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                  {activeJobsFiltered.length}
                </span>
              </div>

              <div className="divide-y divide-border max-h-[320px] overflow-y-auto -mx-6">
                {activeJobsFiltered.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => navigate(`/portal/ledger?jobId=${job.id}`)}
                    className="flex items-center justify-between gap-2 px-6 py-2.5 min-h-[52px] hover:bg-secondary/60 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-foreground truncate">{job.siteName}</div>
                      <div className="text-[11px] text-muted-foreground">{job.postcode}</div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded shrink-0">
                      {job.status}
                    </span>
                  </div>
                ))}

                {activeJobsFiltered.length === 0 && (
                  <p className="text-[12px] text-muted-foreground py-4 text-center">
                    No active job sites for the selected timeframe.
                  </p>
                )}
              </div>
            </div>

            {/* Scheduled Crew per site */}
            <div className="p-6 space-y-4 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <UserCheck className="w-4 h-4 text-success shrink-0" />
                  <h2 className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Scheduled Crew
                  </h2>
                </div>
                {scheduledWorkersOnActiveSites > 0 && (
                  <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full shrink-0">
                    {scheduledWorkersOnActiveSites}
                  </span>
                )}
              </div>

              <div className="divide-y divide-border max-h-[320px] overflow-y-auto -mx-6">
                {crewPerSiteFiltered.map((site) => (
                  <div
                    key={site.jobId}
                    onClick={() =>
                      navigate(`/portal/roster?view=calendar&group=project&date=${site.nextDate}`)
                    }
                    className="flex items-center justify-between gap-2 px-6 py-2.5 min-h-[52px] hover:bg-secondary/60 transition-colors cursor-pointer"
                  >
                    <span className="text-[13px] font-bold text-foreground truncate">{site.siteName}</span>
                    <span className="text-[12px] font-mono text-muted-foreground font-bold shrink-0">
                      {site.crewCount} crew
                    </span>
                  </div>
                ))}

                {crewPerSiteFiltered.length === 0 && (
                  <p className="text-[12px] text-muted-foreground py-4 text-center">
                    No active job sites for the selected timeframe.
                  </p>
                )}
              </div>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y divide-border sm:divide-y-0 sm:divide-x sm:divide-border">
            {/* Compliance Alerts */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                  <h2 className="text-sm font-medium text-muted-foreground whitespace-nowrap">Compliance</h2>
                </div>
                <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full shrink-0">
                  {expiringTickets.length}
                </span>
              </div>

              <div className="divide-y divide-border flex-1 overflow-y-auto max-h-[280px]">
                {expiringTickets.map((alert) => (
                  <div
                    key={alert.alertId}
                    onClick={() => handleUpdateAlert(alert.workerId)}
                    className="flex flex-col gap-1 px-2 py-2.5 hover:bg-secondary/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold text-foreground truncate">{alert.workerName}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRemindConfirmAlert(alert);
                        }}
                        className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-secondary hover:bg-muted text-foreground/85 transition-colors cursor-pointer shrink-0"
                      >
                        Remind
                      </button>
                    </div>
                    <span
                      className={`text-[11px] font-bold ${alert.isExpired ? "text-destructive" : "text-warning"}`}
                    >
                      {alert.isExpired
                        ? `Expired ${formatDayCount(Math.abs(alert.diffDays))} ago`
                        : `Expiring in ${formatDayCount(alert.diffDays)}`}
                      {" — "}
                      {alert.ticketType}
                    </span>
                  </div>
                ))}

                {expiringTickets.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                    <CheckCircle className="w-8 h-8 text-success/80" />
                    <p className="text-[11px] text-muted-foreground">Roster fully compliant.</p>
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

            {/* Weather Warnings */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-warning shrink-0" />
                  <h2 className="text-sm font-medium text-muted-foreground whitespace-nowrap">Weather</h2>
                </div>
                <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full shrink-0">
                  {weatherWarningCount}
                </span>
              </div>

              <div className="divide-y divide-border flex-1 overflow-y-auto max-h-[280px]">
                {activeJobsFiltered.map((job) => (
                  <JobWeatherRow
                    key={job.id}
                    job={job}
                    timeframe={timeframe}
                    onStatusChange={handleWeatherStatusChange}
                    onSelectDate={(date) =>
                      navigate(`/portal/roster?view=calendar&group=project&date=${date}`)
                    }
                  />
                ))}

                {activeJobsFiltered.length > 0 && weatherWarningCount === 0 && (
                  <div className="flex items-center gap-2 py-3 px-1">
                    <CheckCircle className="w-4 h-4 text-success/80 shrink-0" />
                    <p className="text-[11px] text-muted-foreground">No weather risks for active sites.</p>
                  </div>
                )}

                {activeJobsFiltered.length === 0 && (
                  <div className="flex items-center gap-2 py-3 px-1">
                    <CheckCircle className="w-4 h-4 text-success/80 shrink-0" />
                    <p className="text-[11px] text-muted-foreground">No active job sites to check.</p>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

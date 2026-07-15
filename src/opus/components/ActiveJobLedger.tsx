// @ts-nocheck
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CloudSun, AlertCircle, ChevronRight, HardHat, DollarSign } from "lucide-react";
import { Job } from "../types/erp";

interface ActiveJobLedgerProps {
  filteredJobs: Job[];
  filterStatus: Job["status"] | "all";
  setFilterStatus: (status: Job["status"] | "all") => void;
  onSelectJob: (id: string) => void;
  getJobActionRequired: (job: Job) => {
    hasAction: boolean;
    weather: { condition: string; temperature: number } | null;
    followup: { reason: string } | null;
  };
}

export const ActiveJobLedger: React.FC<ActiveJobLedgerProps> = ({
  filteredJobs,
  filterStatus,
  setFilterStatus,
  onSelectJob,
  getJobActionRequired,
}) => {
  return (
    <div className="space-y-5">
      {/* Header controls & filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center space-x-2.5">
          <HardHat className="w-5 h-5 text-[#6C8295]" />
          <h2 className="text-base font-bold text-foreground font-archivo uppercase tracking-wide">
            Job Ledger
          </h2>
        </div>
        <div className="w-full sm:w-auto">
          <div className="flex flex-wrap items-center bg-card border border-border rounded-lg p-1 gap-1">
            {(["all", "in-progress", "pending", "completed"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`rounded px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 min-h-[36px] flex items-center justify-center cursor-pointer ${
                  filterStatus === status
                    ? "bg-[#6C8295] text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {status.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ledger list container */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xl">
        {/* Table Header (hidden on mobile) */}
        <div className="hidden md:grid md:grid-cols-[120px_2.2fr_1.3fr_1.5fr_110px_100px] gap-4 px-5 py-3.5 border-b border-border bg-muted/40">
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
            Job Ref
          </span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
            Site / Contractor
          </span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
            Site Warnings
          </span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
            Pour Progress
          </span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground text-right">
            Value
          </span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground text-right">
            Status
          </span>
        </div>

        <div className="divide-y divide-border">
          <AnimatePresence mode="popLayout">
            {filteredJobs.length === 0 ? (
              <div className="px-5 py-16 text-center text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
                No jobs matching filter
              </div>
            ) : (
              filteredJobs.map((job) => {
                const action = getJobActionRequired(job);
                const progressPercent = Math.min(
                  100,
                  ((job.currentPours || 0) / (job.contractMaxPours || 1)) * 100,
                );

                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    layout
                    onClick={() => onSelectJob(job.id)}
                    className="group flex flex-col md:grid md:grid-cols-[120px_2.2fr_1.3fr_1.5fr_110px_100px] gap-4 px-5 py-4 md:py-0 md:min-h-[64px] items-center hover:bg-muted/30 transition-all duration-150 cursor-pointer border-b border-border bg-card relative overflow-hidden"
                  >
                    {/* Job Ref Column */}
                    <div className="flex justify-between items-center w-full md:w-auto md:contents">
                      <div className="text-[13px] font-mono font-semibold text-[#6C8295] group-hover:text-foreground transition-colors">
                        {job.jobRef}
                      </div>

                      {/* Mobile-only status badge */}
                      <div className="md:hidden">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase border ${
                            job.status === "in-progress"
                              ? "bg-[#6C8295]/10 border-[#6C8295]/20 text-[#6C8295]"
                              : job.status === "pending"
                                ? "bg-[#f59e0b]/10 border-[#f59e0b]/20 text-[#f59e0b]"
                                : "bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]"
                          }`}
                        >
                          {job.status === "in-progress" ? "In Progress" : job.status}
                        </span>
                      </div>
                    </div>

                    {/* Site / Contractor Column */}
                    <div className="w-full md:w-auto space-y-0.5 py-1">
                      <div className="text-[14px] font-semibold text-foreground group-hover:text-[#6C8295] transition-colors">
                        {job.siteName}
                      </div>
                      <div className="text-[12px] text-muted-foreground font-medium">
                        {job.mainContractor}
                      </div>

                      {/* Mobile-only warning badges & Value / Progress */}
                      <div className="md:hidden space-y-2 mt-3 pt-2.5 border-t border-border">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {action.weather && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#ef4444]/10 px-1.5 py-0.5 border border-[#ef4444]/20 text-[11px] font-bold text-[#ef4444]">
                              <CloudSun className="w-3.5 h-3.5" />
                              <span>
                                {action.weather.condition} ({action.weather.temperature}°C)
                              </span>
                            </span>
                          )}
                          {action.followup && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#f59e0b]/10 px-1.5 py-0.5 border border-[#f59e0b]/20 text-[11px] font-bold text-[#f59e0b]">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{action.followup.reason}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[12px] text-foreground">
                          <span className="font-semibold">
                            Value:{" "}
                            <span className="font-mono text-foreground">
                              £{Number(job.scheduleValue || 0).toLocaleString("en-GB")}
                            </span>
                          </span>
                          <span className="font-semibold">
                            Pours:{" "}
                            <span className="font-mono text-foreground">
                              {job.currentPours} / {job.contractMaxPours}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Warnings Column */}
                    <div className="hidden md:flex flex-col items-start justify-center gap-1.5 w-full text-left">
                      {action.weather || action.followup ? (
                        <>
                          {action.weather && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#ef4444]/10 px-2 py-0.5 border border-[#ef4444]/20 text-[11px] font-bold text-[#ef4444] shrink-0">
                              <CloudSun className="w-3.5 h-3.5" />
                              <span>
                                {action.weather.condition} ({action.weather.temperature}°C)
                              </span>
                            </span>
                          )}
                          {action.followup && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#f59e0b]/10 px-2 py-0.5 border border-[#f59e0b]/20 text-[11px] font-bold text-[#f59e0b] shrink-0">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{action.followup.reason}</span>
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[12px] text-muted-foreground font-medium">—</span>
                      )}
                    </div>

                    {/* Pour Progress Column */}
                    <div className="hidden md:flex flex-col w-full space-y-1 py-1 text-left">
                      <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                        <span>
                          {job.currentPours} / {job.contractMaxPours} pours
                        </span>
                        <span className="font-mono text-foreground">
                          {progressPercent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#6C8295] rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Desktop Value Column */}
                    <div className="hidden md:block text-right text-[13px] font-mono font-bold text-foreground pr-2">
                      £{Number(job.scheduleValue || 0).toLocaleString("en-GB")}
                    </div>

                    {/* Status Column (Desktop-only) */}
                    <div className="hidden md:block text-right">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase border tracking-wider ${
                          job.status === "in-progress"
                            ? "bg-[#6C8295]/10 border-[#6C8295]/20 text-[#6C8295]"
                            : job.status === "pending"
                              ? "bg-[#f59e0b]/10 border-[#f59e0b]/20 text-[#f59e0b]"
                              : "bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]"
                        }`}
                      >
                        {job.status === "in-progress" ? "In Progress" : job.status}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { CardGrid } from "../components/CardGrid";
import { motion, AnimatePresence } from "motion/react";
import { CloudSun, AlertCircle, HardHat, CalendarRange } from "lucide-react";
import { Job } from "../types/erp";
import { useJobForecast, getWeatherOnDate } from "../utils/weather";
import { formatUKDate, isValidISODate, toLocalISODate } from "../utils/week";
import { PortalFilterGroup } from "./PortalNavigationPrimitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ActiveJobLedgerProps {
  filteredJobs: Job[];
  filterStatus: Job["status"] | "all" | "archived";
  setFilterStatus: (status: Job["status"] | "all" | "archived") => void;
  onSelectJob: (id: string) => void;
  onUpdateJobDates: (
    jobId: string,
    startDate: string | undefined,
    endDate: string | undefined,
  ) => void;
  canEditDates: boolean;
  getJobFollowup: (job: Job) => { reason: string } | null;
}

/**
 * Weather is fetched live per postcode, so it renders through its own
 * component (rows are inline JSX, not components, and hooks can't live in a
 * .map callback). Also owns the empty-state dash for both badges.
 */
const JobWarnings: React.FC<{ job: Job; followup: { reason: string } | null; dense?: boolean }> = ({
  job,
  followup,
  dense,
}) => {
  const { forecast } = useJobForecast(job.postcode);
  const weather = getWeatherOnDate(forecast, toLocalISODate(new Date()));
  const showWeather = weather?.isImpactful;

  if (!showWeather && !followup) {
    return dense ? null : <span className="text-[12px] text-muted-foreground font-medium">—</span>;
  }

  const badgePad = dense ? "px-1.5 py-0.5" : "px-2 py-0.5";

  return (
    <>
      {showWeather && (
        <span
          className={`inline-flex items-center gap-1 rounded bg-destructive/10 ${badgePad} border border-destructive/20 text-[11px] font-bold text-destructive shrink-0`}
        >
          <CloudSun className="w-3.5 h-3.5" />
          <span>
            {weather.condition} ({weather.temperature}°C)
          </span>
        </span>
      )}
      {followup && (
        <span
          className={`inline-flex items-center gap-1 rounded bg-warning/10 ${badgePad} border border-warning/20 text-[11px] font-bold text-warning shrink-0`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{followup.reason}</span>
        </span>
      )}
    </>
  );
};

export const ActiveJobLedger: React.FC<ActiveJobLedgerProps> = ({
  filteredJobs,
  filterStatus,
  setFilterStatus,
  onSelectJob,
  onUpdateJobDates,
  canEditDates,
  getJobFollowup,
}) => {
  const [dateJob, setDateJob] = React.useState<Job | null>(null);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [dateError, setDateError] = React.useState<string | null>(null);

  const openDateEditor = (event: React.MouseEvent, job: Job) => {
    event.stopPropagation();
    setDateJob(job);
    setStartDate(job.startDate ?? "");
    setEndDate(job.endDate ?? "");
    setDateError(null);
  };

  const closeDateEditor = () => {
    setDateJob(null);
    setDateError(null);
  };

  const saveDateEditor = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dateJob) return;
    if (dateJob.status !== "completed" && (!startDate || !endDate)) {
      setDateError("Set both a start date and an end date.");
      return;
    }
    if ((startDate && !isValidISODate(startDate)) || (endDate && !isValidISODate(endDate))) {
      setDateError("Enter valid calendar dates.");
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setDateError("The end date must be on or after the start date.");
      return;
    }

    onUpdateJobDates(dateJob.id, startDate || undefined, endDate || undefined);
    closeDateEditor();
  };

  return (
    <div className="space-y-5">
      {/* Header controls & filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center space-x-2.5">
          <HardHat className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-foreground font-archivo uppercase tracking-wide">
            Job Ledger
          </h2>
        </div>
        <div className="w-full sm:w-auto">
          <PortalFilterGroup
            value={filterStatus}
            onChange={setFilterStatus}
            ariaLabel="Filter jobs"
            options={[
              { value: "all", label: "All jobs" },
              { value: "in-progress", label: "In progress" },
              { value: "pending", label: "Pending" },
              { value: "completed", label: "Completed" },
              { value: "archived", label: "Archived" },
            ]}
          />
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        Showing {filteredJobs.length}{" "}
        {filterStatus === "all" ? "" : `${filterStatus.replace("-", " ")} `}jobs.
      </p>

      {/* Ledger list container */}
      <div className="lg:bg-card lg:border lg:border-border rounded-xl lg:overflow-hidden lg:shadow-2xl">
        {/* Table Header (hidden on mobile) */}
        <div className="hidden lg:grid lg:grid-cols-[120px_2.2fr_1.3fr_1.5fr_100px] gap-4 px-5 py-3.5 border-b border-border bg-muted/40">
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
            Job Ref
          </span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
            Site / Contractor
          </span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
            Site Warnings
          </span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground text-center">
            Progress
          </span>
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground text-right">
            Status
          </span>
        </div>

        <div className="flex flex-col gap-3 lg:gap-0 lg:divide-y lg:divide-border">
          <AnimatePresence mode="popLayout">
            {filteredJobs.length === 0 ? (
              <div className="px-5 py-16 text-center text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
                No jobs matching filter
              </div>
            ) : (
              filteredJobs.map((job) => {
                const followup = getJobFollowup(job);
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
                    role="button"
                    tabIndex={0}
                    aria-label={`Open job ${job.jobRef}, ${job.siteName}`}
                    onClick={() => onSelectJob(job.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectJob(job.id);
                      }
                    }}
                    className="group flex flex-col lg:grid lg:grid-cols-[120px_2.2fr_1.3fr_1.5fr_100px] gap-4 px-5 py-5 lg:py-0 lg:min-h-[64px] items-center hover:bg-muted/30 active:bg-muted/30 transition-all duration-150 cursor-pointer border border-border lg:border-0 lg:border-b rounded-xl lg:rounded-none shadow-lg lg:shadow-none border-l-[3px] border-l-primary/25 hover:border-l-primary active:border-l-primary bg-card relative overflow-hidden"
                  >
                    {/* Job Ref Column */}
                    <div className="flex justify-between items-center w-full lg:w-auto lg:contents">
                      <div className="text-[13px] font-mono font-semibold text-primary group-hover:text-foreground transition-colors">
                        {job.jobRef}
                      </div>

                      {/* Mobile-only status badge */}
                      <div className="lg:hidden">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase border ${
                            job.status === "in-progress"
                              ? "bg-primary/10 border-primary/20 text-primary"
                              : job.status === "pending"
                                ? "bg-warning/10 border-warning/20 text-warning"
                                : "bg-success/10 border-success/20 text-success"
                          }`}
                        >
                          {job.status === "in-progress" ? "In Progress" : job.status}
                        </span>
                      </div>
                    </div>

                    {/* Site / Contractor Column */}
                    <div className="w-full lg:w-auto space-y-0.5 py-1">
                      <div className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors">
                        {job.siteName}
                      </div>
                      <div className="text-[12px] text-muted-foreground font-medium">
                        {job.mainContractor}
                      </div>
                      {canEditDates && (
                        <button
                          type="button"
                          onClick={(event) => openDateEditor(event, job)}
                          onKeyDown={(event) => event.stopPropagation()}
                          className="mt-1 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-foreground"
                          aria-label={`Set dates for ${job.siteName}`}
                        >
                          <CalendarRange className="size-3" />
                          {job.startDate && job.endDate
                            ? `${formatUKDate(job.startDate)} – ${formatUKDate(job.endDate)}`
                            : "Set dates"}
                        </button>
                      )}

                      {/* Mobile-only warning badges & Value / Progress */}
                      <div className="lg:hidden space-y-2 mt-3 pt-2.5 border-t border-border">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <JobWarnings job={job} followup={followup} dense />
                        </div>
                        <div className="flex items-center justify-between text-[12px] text-foreground">
                          <span className="font-semibold" id={`job-progress-label-${job.id}`}>
                            Progress
                          </span>
                          <span className="font-mono text-foreground">
                            {progressPercent.toFixed(0)}%
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-labelledby={`job-progress-label-${job.id}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={progressPercent}
                          className="h-1.5 w-full overflow-hidden rounded-full bg-primary/20"
                        >
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Desktop Warnings Column */}
                    <div className="hidden lg:flex flex-col items-start justify-center gap-1.5 w-full text-left">
                      <JobWarnings job={job} followup={followup} />
                    </div>

                    {/* Progress Column */}
                    <div className="hidden lg:flex items-center justify-center w-full py-1 text-center">
                      <span
                        className="text-[13px] font-mono font-bold text-foreground"
                        role="progressbar"
                        aria-label={`Progress for ${job.jobRef}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progressPercent}
                      >
                        {progressPercent.toFixed(0)}%
                      </span>
                    </div>

                    {/* Status Column (Desktop-only) */}
                    <div className="hidden lg:block text-right">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase border tracking-wider ${
                          job.status === "in-progress"
                            ? "bg-primary/10 border-primary/20 text-primary"
                            : job.status === "pending"
                              ? "bg-warning/10 border-warning/20 text-warning"
                              : "bg-success/10 border-success/20 text-success"
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

      <Dialog open={!!dateJob} onOpenChange={(open) => !open && closeDateEditor()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set job dates</DialogTitle>
            <DialogDescription>
              {dateJob?.siteName} will appear in the site schedule only within this inclusive range.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveDateEditor} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Start date
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
                />
              </label>
              <label className="space-y-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                End date
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
                />
              </label>
            </div>
            {dateError && (
              <p className="text-xs font-semibold text-destructive" role="alert">
                {dateError}
              </p>
            )}
            <DialogFooter>
              <button
                type="button"
                onClick={closeDateEditor}
                className="rounded-lg border-2 border-border px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90"
              >
                Save dates
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

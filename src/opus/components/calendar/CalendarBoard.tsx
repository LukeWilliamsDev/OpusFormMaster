import React, { useState, useEffect, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, CalendarPlus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Job, Worker, ScheduledShift } from "../../types/erp";
import {
  addWeeks,
  getMonday,
  getWeekDays,
  isValidISODate,
  parseLocalISODate,
  toLocalISODate,
} from "../../utils/week";
import { useDaySchedule } from "../../hooks/useDaySchedule";
import { useShiftActions } from "../../hooks/useShiftActions";
import { useWeekSchedule } from "../../hooks/useWeekSchedule";
import { AssignSheet, AssignTarget } from "./AssignSheet";
import { DayTabs } from "./DayTabs";
import { ProjectDayList } from "./ProjectDayList";
import { StaffDayList } from "./StaffDayList";
import { WeekGridProject } from "./WeekGridProject";
import { WeekGridStaff } from "./WeekGridStaff";
import { WeekHeader } from "./WeekHeader";
import { PortalTabRail } from "../PortalNavigationPrimitives";

export type CalendarGroup = "staff" | "project";

interface CalendarBoardProps {
  jobs: Job[];
  workers: Worker[];
  shifts: ScheduledShift[];
  setShifts: React.Dispatch<React.SetStateAction<ScheduledShift[]>>;
  group: CalendarGroup;
  date: string;
  onChangeGroup: (group: CalendarGroup) => void;
  onChangeDate: (date: string) => void;
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  canEdit?: boolean;
}

interface SiteScheduleForm {
  jobId: string;
  startDate: string;
  endDate: string;
}

export const CalendarBoard: React.FC<CalendarBoardProps> = ({
  jobs,
  workers,
  shifts,
  setShifts,
  group,
  date,
  onChangeGroup,
  onChangeDate,
  setJobs,
  canEdit = true,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [siteScheduleForm, setSiteScheduleForm] = useState<SiteScheduleForm | null>(null);
  const [siteScheduleError, setSiteScheduleError] = useState<string | null>(null);

  const activeJobs = useMemo(() => jobs.filter((job) => job.status !== "completed"), [jobs]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const weekDays = getWeekDays(toLocalISODate(getMonday(parseLocalISODate(date))));
  const schedule = useDaySchedule(workers, jobs, shifts, date, debouncedSearchQuery);
  const weekSchedule = useWeekSchedule(workers, jobs, shifts, weekDays, debouncedSearchQuery);
  // Unfiltered view for the assign sheet: true crew counts and the full
  // available-staff list, regardless of what's typed in the search box. Keyed
  // off the assign target's own date since a week-grid click can target any
  // visible weekday, not just the page's currently-selected date.
  const assignSheetDate = assignTarget?.date ?? date;
  const fullSchedule = useDaySchedule(workers, jobs, shifts, assignSheetDate, "");
  const { assignWorker, confirmReallocate, removeShift } = useShiftActions(
    workers,
    jobs,
    shifts,
    setShifts,
  );

  const handleNavigateWeek = (deltaWeeks: number) => {
    onChangeDate(addWeeks(date, deltaWeeks));
  };

  const openSiteScheduleForm = () => {
    const job = activeJobs[0];
    if (!job) return;
    setSiteScheduleForm({
      jobId: job.id,
      startDate: job.startDate ?? "",
      endDate: job.endDate ?? "",
    });
    setSiteScheduleError(null);
  };

  const handleSiteScheduleJobChange = (jobId: string) => {
    const job = activeJobs.find((candidate) => candidate.id === jobId);
    if (!job) return;
    setSiteScheduleForm({
      jobId,
      startDate: job.startDate ?? "",
      endDate: job.endDate ?? "",
    });
    setSiteScheduleError(null);
  };

  const saveSiteSchedule = () => {
    if (!siteScheduleForm) return;
    const { jobId, startDate, endDate } = siteScheduleForm;
    if ((startDate && !endDate) || (!startDate && endDate)) {
      setSiteScheduleError("Set both dates, or clear both dates.");
      return;
    }
    if ((startDate && !isValidISODate(startDate)) || (endDate && !isValidISODate(endDate))) {
      setSiteScheduleError("Enter valid calendar dates.");
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setSiteScheduleError("The end date must be on or after the start date.");
      return;
    }

    setJobs((currentJobs) =>
      currentJobs.map((job) =>
        job.id === jobId
          ? { ...job, startDate: startDate || undefined, endDate: endDate || undefined }
          : job,
      ),
    );
    setSiteScheduleForm(null);
    setSiteScheduleError(null);
  };

  // --- Site Office Design Constants ---
  const SITE_BORDER = "border-border";
  const SITE_CARD = "bg-background border-2 " + SITE_BORDER;

  return (
    <div className="space-y-4 font-sans">
      {/* Toggle + Search + Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <PortalTabRail
          ariaLabel="Schedule grouping"
          items={[
            {
              label: "Sites",
              active: group === "project",
              onSelect: () => onChangeGroup("project"),
            },
            { label: "Staff", active: group === "staff", onSelect: () => onChangeGroup("staff") },
          ]}
          className="min-w-0 md:min-w-[10rem]"
        />

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          <div className="relative md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff or sites…"
              className={`w-full ${SITE_CARD} pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-schedule-action transition-colors`}
            />
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={openSiteScheduleForm}
              disabled={activeJobs.length === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-border bg-card px-3 py-2 text-[10px] font-black uppercase tracking-wider text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CalendarPlus className="size-3.5" />
              Set site dates
            </button>
          )}
        </div>
      </div>

      {siteScheduleForm && (
        <section
          aria-labelledby="site-schedule-dates-title"
          className="rounded-xl border-2 border-border bg-card p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="site-schedule-dates-title"
                className="text-xs font-black uppercase tracking-widest text-foreground"
              >
                Site schedule dates
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                A site appears here only within this inclusive date range.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSiteScheduleForm(null)}
              className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground"
              aria-label="Close site schedule dates"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
            <label className="space-y-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Site
              <select
                value={siteScheduleForm.jobId}
                onChange={(event) => handleSiteScheduleJobChange(event.target.value)}
                className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
              >
                {activeJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.siteName} · {job.jobRef}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Start date
              <input
                type="date"
                value={siteScheduleForm.startDate}
                onChange={(event) =>
                  setSiteScheduleForm({ ...siteScheduleForm, startDate: event.target.value })
                }
                className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
              />
            </label>
            <label className="space-y-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              End date
              <input
                type="date"
                value={siteScheduleForm.endDate}
                onChange={(event) =>
                  setSiteScheduleForm({ ...siteScheduleForm, endDate: event.target.value })
                }
                className="w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
              />
            </label>
            <button
              type="button"
              onClick={saveSiteSchedule}
              className="rounded-lg bg-schedule-action px-4 py-2 text-[10px] font-black uppercase tracking-wider text-schedule-action-foreground hover:bg-schedule-action-hover"
            >
              Save dates
            </button>
          </div>
          {siteScheduleError && (
            <p className="text-xs font-semibold text-destructive" role="alert">
              {siteScheduleError}
            </p>
          )}
        </section>
      )}

      <WeekHeader weekDays={weekDays} onNavigate={handleNavigateWeek} />

      <div className="xl:hidden space-y-4">
        <DayTabs weekDays={weekDays} selectedDate={date} onSelect={onChangeDate} />

        <AnimatePresence mode="wait">
          <motion.div
            key={`${group}-${date}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {group === "staff" ? (
              <StaffDayList
                schedule={schedule}
                date={date}
                searchQuery={debouncedSearchQuery}
                onAssign={
                  canEdit
                    ? (worker) => setAssignTarget({ mode: "pickProject", worker, date })
                    : undefined
                }
                onRemoveShift={canEdit ? removeShift : undefined}
                canEdit={canEdit}
              />
            ) : (
              <ProjectDayList
                jobs={jobs}
                schedule={schedule}
                date={date}
                onAddStaff={
                  canEdit ? (job) => setAssignTarget({ mode: "pickWorker", job, date }) : undefined
                }
                onRemoveShift={canEdit ? removeShift : undefined}
                canEdit={canEdit}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="hidden overflow-x-auto pb-2 xl:block">
        <div
          className={`grid min-w-[1100px] grid-cols-[repeat(5,minmax(220px,1fr))] border-2 ${SITE_BORDER} rounded-xl ${SITE_CARD.replace("bg-white", "")} overflow-hidden`}
        >
          {group === "staff" ? (
            <WeekGridStaff
              weekDays={weekDays}
              weekSchedule={weekSchedule}
              searchQuery={debouncedSearchQuery}
              onAssign={
                canEdit
                  ? (worker, assignDate) =>
                      setAssignTarget({ mode: "pickProject", worker, date: assignDate })
                  : undefined
              }
              onRemoveShift={canEdit ? removeShift : undefined}
              canEdit={canEdit}
            />
          ) : (
            <WeekGridProject
              jobs={jobs}
              weekDays={weekDays}
              weekSchedule={weekSchedule}
              onAddStaff={
                canEdit
                  ? (job, assignDate) =>
                      setAssignTarget({ mode: "pickWorker", job, date: assignDate })
                  : undefined
              }
              onRemoveShift={canEdit ? removeShift : undefined}
              canEdit={canEdit}
            />
          )}
        </div>
      </div>

      {canEdit && (
        <AssignSheet
          target={assignTarget}
          jobs={jobs}
          schedule={fullSchedule}
          onAssign={(workerId, jobId) => assignWorker(workerId, jobId, assignSheetDate)}
          onConfirmReallocate={(workerId, jobId, existingShiftId) =>
            confirmReallocate(workerId, jobId, assignSheetDate, existingShiftId)
          }
          onClose={() => setAssignTarget(null)}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Job, Worker, ScheduledShift } from "../../types/erp";
import {
  addWeeks,
  getMonday,
  getWeekDays,
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
  canEdit?: boolean;
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
  canEdit = true,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);

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
        </div>
      </div>

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

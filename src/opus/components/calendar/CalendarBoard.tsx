import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  LayoutGrid,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
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
  const SITE_AMBER = "bg-amber-600 text-white shadow-amber-600/20";
  const SITE_STONE = "bg-card text-muted-foreground hover:text-foreground hover:bg-background";
  const SITE_BORDER = "border-border";
  const SITE_CARD = "bg-background border-2 " + SITE_BORDER;

  return (
    <div className="space-y-4 font-sans">
      {/* Toggle + Search + Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="grid grid-cols-2 md:flex md:items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeGroup("project")}
            className={`flex items-center justify-center md:justify-start gap-2 px-3.5 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl border-2 transition-all cursor-pointer ${
              group === "project"
                ? SITE_AMBER + " border-amber-600"
                : SITE_STONE + " " + SITE_BORDER
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>SITES</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeGroup("staff")}
            className={`flex items-center justify-center md:justify-start gap-2 px-3.5 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl border-2 transition-all cursor-pointer ${
              group === "staff" ? SITE_AMBER + " border-amber-600" : SITE_STONE + " " + SITE_BORDER
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>STAFF</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          <div className="relative md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search operatives or sites…"
              className={`w-full ${SITE_CARD} pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-600 dark:focus:border-amber-400 transition-colors`}
            />
          </div>
        </div>
      </div>

      <WeekHeader weekDays={weekDays} onNavigate={handleNavigateWeek} />

      <div className="2xl:hidden space-y-4">
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
                onAssign={(worker) => setAssignTarget({ mode: "pickProject", worker, date })}
                onRemoveShift={removeShift}
              />
            ) : (
              <ProjectDayList
                jobs={jobs}
                schedule={schedule}
                date={date}
                onAddStaff={(job) => setAssignTarget({ mode: "pickWorker", job, date })}
                onRemoveShift={removeShift}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="hidden 2xl:block pb-2">
        <div
          className={`grid grid-cols-[repeat(5,minmax(240px,1fr))] border-2 ${SITE_BORDER} rounded-xl ${SITE_CARD.replace("bg-white", "")} overflow-hidden`}
        >
          {group === "staff" ? (
            <WeekGridStaff
              weekDays={weekDays}
              weekSchedule={weekSchedule}
              searchQuery={debouncedSearchQuery}
              onAssign={(worker, assignDate) =>
                setAssignTarget({ mode: "pickProject", worker, date: assignDate })
              }
              onRemoveShift={removeShift}
            />
          ) : (
            <WeekGridProject
              jobs={jobs}
              weekDays={weekDays}
              weekSchedule={weekSchedule}
              onAddStaff={(job, assignDate) =>
                setAssignTarget({ mode: "pickWorker", job, date: assignDate })
              }
              onRemoveShift={removeShift}
            />
          )}
        </div>
      </div>

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
    </div>
  );
};

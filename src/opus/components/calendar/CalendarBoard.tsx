import React, { useState, useEffect, useMemo } from "react";
import { Layers, LayoutGrid, List, Search } from "lucide-react";
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
  const [layout, setLayout] = useState<"list" | "grid">("list");

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

  return (
    <div className="max-w-3xl md:max-w-none mx-auto space-y-4">
      {/* Toggle + search + filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="grid grid-cols-2 md:flex md:items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeGroup("staff")}
            className={`flex items-center justify-center md:justify-start gap-2 px-3.5 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer ${
              group === "staff"
                ? "bg-primary border-primary text-white shadow-lg shadow-primary/10"
                : "bg-card/50 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Staff</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeGroup("project")}
            className={`flex items-center justify-center md:justify-start gap-2 px-3.5 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer ${
              group === "project"
                ? "bg-primary border-primary text-white shadow-lg shadow-primary/10"
                : "bg-card/50 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Project</span>
          </button>
        </div>

        <div className="flex flex-row items-center gap-2">
          <div className="relative flex-1 md:flex-none md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff or projects…"
              className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex items-center bg-card border border-border rounded-xl p-1 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setLayout("list")}
              aria-label="List view"
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer ${
                layout === "list"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayout("grid")}
              aria-label="Grid view"
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer ${
                layout === "grid"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <WeekHeader weekDays={weekDays} onNavigate={handleNavigateWeek} />

      <div className={layout === "list" ? "space-y-4" : "hidden"}>
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

      <div className={layout === "grid" ? "pb-2 overflow-x-auto" : "hidden"}>
        <div className="grid grid-cols-[repeat(5,minmax(240px,1fr))] border border-border rounded-xl bg-card overflow-hidden min-w-[1200px] 2xl:min-w-0">
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

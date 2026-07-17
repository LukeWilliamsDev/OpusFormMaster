import React, { useState, useMemo } from "react";
import { Layers, LayoutGrid, Search } from "lucide-react";
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
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);

  // Filter workers based on selected role
  const filteredWorkers = useMemo(() => {
    if (selectedRole === "all") return workers;
    return workers.filter((w) => w.role?.toLowerCase() === selectedRole.toLowerCase());
  }, [workers, selectedRole]);

  // Extract unique roles from workers for the filter dropdown
  const uniqueRoles = useMemo(() => {
    const rolesSet = new Set(workers.map((w) => w.role).filter(Boolean));
    return Array.from(rolesSet).sort();
  }, [workers]);

  const weekDays = getWeekDays(toLocalISODate(getMonday(parseLocalISODate(date))));
  const schedule = useDaySchedule(filteredWorkers, jobs, shifts, date, searchQuery);
  const weekSchedule = useWeekSchedule(filteredWorkers, jobs, shifts, weekDays, searchQuery);
  // Unfiltered view for the assign sheet: true crew counts and the full
  // available-staff list, regardless of what's typed in the search box. Keyed
  // off the assign target's own date since a week-grid click can target any
  // visible weekday, not just the page's currently-selected date.
  const assignSheetDate = assignTarget?.date ?? date;
  const fullSchedule = useDaySchedule(filteredWorkers, jobs, shifts, assignSheetDate, "");
  const { assignWorker, confirmReallocate, removeShift } = useShiftActions(
    filteredWorkers,
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeGroup("staff")}
            className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer ${
              group === "staff"
                ? "bg-primary border-primary text-white shadow-lg shadow-primary/10"
                : "bg-card/50 border-border text-gray-400 hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Staff</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeGroup("project")}
            className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer ${
              group === "project"
                ? "bg-primary border-primary text-white shadow-lg shadow-primary/10"
                : "bg-card/50 border-border text-gray-400 hover:text-foreground"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Project</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          {group === "staff" && (
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              <option value="all">All Roles</option>
              {uniqueRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          )}

          <div className="relative sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff or projects…"
              className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-foreground placeholder:text-gray-600 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      <WeekHeader weekDays={weekDays} onNavigate={handleNavigateWeek} />

      <div className="md:hidden space-y-4">
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

      <div className="hidden md:block overflow-x-auto pb-2 -mx-1 px-1">
        <div className="grid grid-cols-[repeat(5,minmax(240px,1fr))] gap-3">
          {group === "staff" ? (
            <WeekGridStaff
              weekDays={weekDays}
              weekSchedule={weekSchedule}
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

import React, { useState } from "react";
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
import { AssignSheet, AssignTarget } from "./AssignSheet";
import { DayTabs } from "./DayTabs";
import { ProjectDayList } from "./ProjectDayList";
import { StaffDayList } from "./StaffDayList";
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
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);

  const weekDays = getWeekDays(toLocalISODate(getMonday(parseLocalISODate(date))));
  const schedule = useDaySchedule(workers, jobs, shifts, date, searchQuery);
  // Unfiltered view for the assign sheet: true crew counts and the full
  // available-staff list, regardless of what's typed in the search box.
  const fullSchedule = useDaySchedule(workers, jobs, shifts, date, "");
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
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Toggle + search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeGroup("staff")}
            className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer ${
              group === "staff"
                ? "bg-[#5C7285] border-[#5C7285] text-white shadow-lg shadow-[#5C7285]/10"
                : "bg-[#16161a]/50 border-[#2a2a30] text-gray-400 hover:text-white"
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
                ? "bg-[#5C7285] border-[#5C7285] text-white shadow-lg shadow-[#5C7285]/10"
                : "bg-[#16161a]/50 border-[#2a2a30] text-gray-400 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Project</span>
          </button>
        </div>

        <div className="relative sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff or projects…"
            className="w-full bg-[#16161a] border border-[#2a2a30] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#5C7285] transition-colors"
          />
        </div>
      </div>

      <WeekHeader weekDays={weekDays} onNavigate={handleNavigateWeek} />
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
              onAssign={(worker) => setAssignTarget({ mode: "pickProject", worker })}
              onRemoveShift={removeShift}
            />
          ) : (
            <ProjectDayList
              jobs={jobs}
              schedule={schedule}
              date={date}
              onAddStaff={(job) => setAssignTarget({ mode: "pickWorker", job })}
              onRemoveShift={removeShift}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <AssignSheet
        target={assignTarget}
        date={date}
        jobs={jobs}
        schedule={fullSchedule}
        onAssign={(workerId, jobId) => assignWorker(workerId, jobId, date)}
        onConfirmReallocate={(workerId, jobId, existingShiftId) =>
          confirmReallocate(workerId, jobId, date, existingShiftId)
        }
        onClose={() => setAssignTarget(null)}
      />
    </div>
  );
};

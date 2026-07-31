import React, { useEffect, useState } from "react";
import { Worker } from "../../types/erp";
import { DaySchedule } from "../../hooks/useDaySchedule";
import { WeekDay } from "../../utils/week";
import { StaffCard } from "./StaffCard";
import { RoleAccordion } from "./RoleAccordion";
import { groupWorkersByCategory } from "./roleCategories";

interface WeekGridStaffProps {
  weekDays: WeekDay[];
  weekSchedule: Map<string, DaySchedule>;
  searchQuery: string;
  onAssign: (worker: Worker, date: string) => void;
  onRemoveShift: (shiftId: string) => void;
}

export const WeekGridStaff: React.FC<WeekGridStaffProps> = ({
  weekDays,
  weekSchedule,
  searchQuery,
  onAssign,
  onRemoveShift,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const weekKey = weekDays.map((d) => d.date).join(",");
  const isSearching = searchQuery.trim().length > 0;

  // Site office design constants
  const SITE_STONE_BG = "bg-stone-50 dark:bg-slate-800/50";
  const SITE_STONE_BORDER = "border-stone-200 dark:border-slate-700";
  const SITE_BORDER_R = "border-r " + SITE_STONE_BORDER + " last:border-r-0";
  const SITE_DEPLOYED_TEXT = "text-emerald-600 dark:text-emerald-400";
  const SITE_EMPTY_TEXT = "text-stone-400 dark:text-stone-500";
  const SITE_DIVIDER = "bg-stone-200 dark:bg-slate-700";
  const SITE_AVAILABLE_TEXT = "text-stone-500 dark:text-stone-400";

  useEffect(() => {
    setExpanded(new Set());
  }, [weekKey]);

  useEffect(() => {
    if (!isSearching) setExpanded(new Set());
  }, [isSearching]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <>
      {weekDays.map((day) => {
        const schedule = weekSchedule.get(day.date);
        const assigned = schedule?.assigned ?? [];
        const unassigned = schedule?.unassigned ?? [];
        const isEmpty = assigned.length === 0 && unassigned.length === 0;
        const deployedGroups = groupWorkersByCategory(assigned, (a) => a.worker.role);
        const availableGroups = groupWorkersByCategory(unassigned, (w) => w.role);

        return (
          <div key={day.date} className={`min-w-0 p-3 space-y-3 ${SITE_BORDER_R} ${SITE_STONE_BG}`}>
            <div className="flex items-center justify-between gap-1.5 px-0.5">
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-[11px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
                  {day.shortName}
                </span>
                <span className="text-[11px] font-bold font-mono text-stone-500 dark:text-stone-400">
                  {day.date.split("-")[2]}
                </span>
              </div>
              <span className={`text-[11px] font-black shrink-0 ${SITE_DEPLOYED_TEXT}`}>
                {schedule?.deployedCount ? schedule.deployedCount : "0 deployed"}
              </span>
            </div>

            {isEmpty ? (
              <div
                className={`py-4 text-center text-[10px] font-bold uppercase tracking-wider ${SITE_EMPTY_TEXT}`}
              >
                No operatives scheduled
              </div>
            ) : (
              <>
                {deployedGroups.length > 0 && (
                  <div className="space-y-1.5">
                    {deployedGroups.map(({ category, items }) => {
                      const key = `${day.date}:deployed:${category}`;
                      return (
                        <RoleAccordion
                          key={key}
                          category={category}
                          count={items.length}
                          isOpen={isSearching || expanded.has(key)}
                          onToggle={() => toggle(key)}
                        >
                          {items.map(({ worker, shift, job }) => (
                            <StaffCard
                              key={worker.id}
                              worker={worker}
                              job={job}
                              shift={shift}
                              onRemove={onRemoveShift}
                              size="row"
                            />
                          ))}
                        </RoleAccordion>
                      );
                    })}
                  </div>
                )}

                {availableGroups.length > 0 && (
                  <div className="space-y-1.5">
                    {deployedGroups.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className={`h-px flex-1 ${SITE_DIVIDER}`} />
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest ${SITE_AVAILABLE_TEXT} shrink-0`}
                        >
                          AVAILABLE
                        </span>
                        <div className={`h-px flex-1 ${SITE_DIVIDER}`} />
                      </div>
                    )}
                    {availableGroups.map(({ category, items }) => {
                      const key = `${day.date}:available:${category}`;
                      return (
                        <RoleAccordion
                          key={key}
                          category={category}
                          count={items.length}
                          isOpen={isSearching || expanded.has(key)}
                          onToggle={() => toggle(key)}
                        >
                          {items.map((worker) => (
                            <StaffCard
                              key={worker.id}
                              worker={worker}
                              onAssign={() => onAssign(worker, day.date)}
                              size="row"
                            />
                          ))}
                        </RoleAccordion>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </>
  );
};

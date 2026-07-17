import React from "react";
import { Worker } from "../../types/erp";
import { DaySchedule } from "../../hooks/useDaySchedule";
import { WeekDay } from "../../utils/week";
import { StaffCard } from "./StaffCard";

interface WeekGridStaffProps {
  weekDays: WeekDay[];
  weekSchedule: Map<string, DaySchedule>;
  onAssign: (worker: Worker, date: string) => void;
  onRemoveShift: (shiftId: string) => void;
}

export const WeekGridStaff: React.FC<WeekGridStaffProps> = ({
  weekDays,
  weekSchedule,
  onAssign,
  onRemoveShift,
}) => (
  <>
    {weekDays.map((day) => {
      const schedule = weekSchedule.get(day.date);
      const assigned = schedule?.assigned ?? [];
      const unassigned = schedule?.unassigned ?? [];
      const isEmpty = assigned.length === 0 && unassigned.length === 0;

      return (
        <div
          key={day.date}
          className="min-w-0 border border-border rounded-xl bg-card p-2.5 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-1.5 px-0.5">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {day.shortName}
              </span>
              <span className="text-[10px] font-bold font-mono text-gray-500">
                {day.date.split("-")[2]}
              </span>
            </div>
            <span className="text-[10px] font-black text-success shrink-0">
              {schedule?.deployedCount ?? 0}
            </span>
          </div>

          {isEmpty ? (
            <div className="py-4 text-center text-[10px] font-bold uppercase tracking-wider text-gray-600">
              No matches
            </div>
          ) : (
            <>
              {assigned.length > 0 && (
                <div className="space-y-2">
                  {assigned.map(({ worker, shift, job }) => (
                    <StaffCard
                      key={worker.id}
                      worker={worker}
                      job={job}
                      shift={shift}
                      onRemove={onRemoveShift}
                      size="dense"
                    />
                  ))}
                </div>
              )}

              {unassigned.length > 0 && (
                <div className="space-y-2">
                  {assigned.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 shrink-0">
                        Available
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  {unassigned.map((worker) => (
                    <StaffCard
                      key={worker.id}
                      worker={worker}
                      onAssign={() => onAssign(worker, day.date)}
                      size="dense"
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      );
    })}
  </>
);

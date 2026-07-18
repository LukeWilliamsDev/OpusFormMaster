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
          className="min-w-0 p-3 space-y-3 border-r border-border last:border-r-0"
        >
          <div className="flex items-center justify-between gap-1.5 px-0.5">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                {day.shortName}
              </span>
              <span className="text-[11px] font-bold font-mono text-muted-foreground">
                {day.date.split("-")[2]}
              </span>
            </div>
            <span
              className={`text-[11px] font-black shrink-0 ${
                schedule?.deployedCount ? "text-success" : "text-muted-foreground"
              }`}
            >
              {schedule?.deployedCount ? schedule.deployedCount : "0 deployed"}
            </span>
          </div>

          {isEmpty ? (
            <div className="py-4 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              No matches
            </div>
          ) : (
            <>
              {assigned.length > 0 && (
                <div className="border border-border rounded-lg bg-background/40 px-2">
                  {assigned.map(({ worker, shift, job }) => (
                    <StaffCard
                      key={worker.id}
                      worker={worker}
                      job={job}
                      shift={shift}
                      onRemove={onRemoveShift}
                      size="row"
                    />
                  ))}
                </div>
              )}

              {unassigned.length > 0 && (
                <div className="space-y-2">
                  {assigned.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground shrink-0">
                        Available
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <div className="border border-border rounded-lg bg-background/40 px-2">
                    {unassigned.map((worker) => (
                      <StaffCard
                        key={worker.id}
                        worker={worker}
                        onAssign={() => onAssign(worker, day.date)}
                        size="row"
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      );
    })}
  </>
);

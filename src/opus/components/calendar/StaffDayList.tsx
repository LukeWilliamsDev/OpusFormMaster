import React from "react";
import { Users } from "lucide-react";
import { Worker } from "../../types/erp";
import { formatDayHeading } from "../../utils/week";
import { DaySchedule } from "../../hooks/useDaySchedule";
import { StaffCard } from "./StaffCard";

interface StaffDayListProps {
  schedule: DaySchedule;
  date: string;
  onAssign: (worker: Worker) => void;
  onRemoveShift: (shiftId: string) => void;
}

export const StaffDayList: React.FC<StaffDayListProps> = ({
  schedule,
  date,
  onAssign,
  onRemoveShift,
}) => {
  const { assigned, unassigned, deployedCount } = schedule;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-bold text-muted-foreground">{formatDayHeading(date)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-black text-success">{deployedCount} staff deployed</span>
      </div>

      {assigned.length === 0 && unassigned.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground border border-dashed border-border rounded-xl">
          <Users className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">
            No staff match this view
          </span>
        </div>
      ) : (
        <>
          <div className="border border-border rounded-xl bg-card px-3">
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

          {unassigned.length > 0 && (
            <div className="space-y-2.5">
              {assigned.length > 0 && (
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Available ({unassigned.length})
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              <div className="border border-border rounded-xl bg-card px-3">
                {unassigned.map((worker) => (
                  <StaffCard
                    key={worker.id}
                    worker={worker}
                    onAssign={() => onAssign(worker)}
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
};

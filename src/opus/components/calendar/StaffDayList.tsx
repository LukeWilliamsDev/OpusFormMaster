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
        <span className="font-bold text-gray-400">{formatDayHeading(date)}</span>
        <span className="text-gray-600">·</span>
        <span className="font-black text-success">{deployedCount} staff deployed</span>
      </div>

      {assigned.length === 0 && unassigned.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-gray-500 border border-dashed border-border rounded-xl">
          <Users className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">
            No staff match this view
          </span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {assigned.map(({ worker, shift, job }) => (
              <StaffCard
                key={worker.id}
                worker={worker}
                job={job}
                shift={shift}
                onRemove={onRemoveShift}
              />
            ))}
          </div>

          {unassigned.length > 0 && (
            <div className="space-y-2.5">
              {assigned.length > 0 && (
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                    Available ({unassigned.length})
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {unassigned.map((worker) => (
                  <StaffCard key={worker.id} worker={worker} onAssign={() => onAssign(worker)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

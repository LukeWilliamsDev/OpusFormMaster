import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Worker } from "../../types/erp";
import { formatDayHeading } from "../../utils/week";
import { DayAssignment, DaySchedule } from "../../hooks/useDaySchedule";
import { StaffCard } from "./StaffCard";
import { RoleAccordion } from "./RoleAccordion";
import { groupWorkersByCategory } from "./roleCategories";

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpanded(new Set());
  }, [date]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const deployedGroups = groupWorkersByCategory(assigned, (a) => a.worker.role);
  const availableGroups = groupWorkersByCategory(unassigned, (w) => w.role);

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
          {deployedGroups.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Already Deployed ({assigned.length})
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {deployedGroups.map(({ category, items }) => {
                  const key = `deployed:${category}`;
                  return (
                    <RoleAccordion
                      key={key}
                      category={category}
                      count={items.length}
                      isOpen={expanded.has(key)}
                      onToggle={() => toggle(key)}
                    >
                      {items.map(({ worker, shift, job }: DayAssignment) => (
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
            </div>
          )}

          {availableGroups.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Available ({unassigned.length})
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {availableGroups.map(({ category, items }) => {
                  const key = `available:${category}`;
                  return (
                    <RoleAccordion
                      key={key}
                      category={category}
                      count={items.length}
                      isOpen={expanded.has(key)}
                      onToggle={() => toggle(key)}
                    >
                      {items.map((worker: Worker) => (
                        <StaffCard
                          key={worker.id}
                          worker={worker}
                          onAssign={() => onAssign(worker)}
                          size="row"
                        />
                      ))}
                    </RoleAccordion>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

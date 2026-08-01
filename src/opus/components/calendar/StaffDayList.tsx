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
  searchQuery: string;
  onAssign: (worker: Worker) => void;
  onRemoveShift: (shiftId: string) => void;
}

export const StaffDayList: React.FC<StaffDayListProps> = ({
  schedule,
  date,
  searchQuery,
  onAssign,
  onRemoveShift,
}) => {
  const { assigned, unassigned, deployedCount } = schedule;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const isSearching = searchQuery.trim().length > 0;

  // Site office design constants
  const SITE_STONE_BG = "bg-card border-2 border-border rounded-xl";
  const SITE_STONE_BORDER = "border-border";
  const SITE_DIVIDER = "bg-background";
  const SITE_DEPLOYED_TEXT = "text-success";
  const SITE_EMPTY_TEXT = "text-muted-foreground";
  const SITE_AVAILABLE_TEXT = "text-muted-foreground";
  const SITE_HEADER_TEXT = "text-muted-foreground";
  const SITE_HEADING_TEXT = "text-foreground";

  useEffect(() => {
    setExpanded(new Set());
  }, [date]);

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

  const deployedGroups = groupWorkersByCategory(assigned, (a) => a.worker.role);
  const availableGroups = groupWorkersByCategory(unassigned, (w) => w.role);

  return (
    <div className={`space-y-4 ${SITE_STONE_BG} p-4`}>
      <div className="flex items-center gap-2 text-xs">
        <span className={`font-bold ${SITE_HEADER_TEXT}`}>{formatDayHeading(date)}</span>
        <span className={SITE_HEADER_TEXT}>·</span>
        <span className={`font-black ${SITE_DEPLOYED_TEXT}`}>
          {deployedCount} operatives deployed
        </span>
      </div>

      {assigned.length === 0 && unassigned.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center border-2 border-dashed border-border rounded-xl">
          <Users className="w-6 h-6 text-muted-foreground/50" />
          <span className={`text-xs font-bold uppercase tracking-wider ${SITE_EMPTY_TEXT}`}>
            No operatives scheduled
          </span>
        </div>
      ) : (
        <>
          {deployedGroups.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 pt-2">
                <div className={`h-px flex-1 ${SITE_DIVIDER}`} />
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${SITE_DEPLOYED_TEXT}`}
                >
                  ALREADY DEPLOYED ({assigned.length})
                </span>
                <div className={`h-px flex-1 ${SITE_DIVIDER}`} />
              </div>
              <div className="space-y-2">
                {deployedGroups.map(({ category, items }) => {
                  const key = `deployed:${category}`;
                  return (
                    <RoleAccordion
                      key={key}
                      category={category}
                      count={items.length}
                      isOpen={isSearching || expanded.has(key)}
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
                <div className={`h-px flex-1 ${SITE_DIVIDER}`} />
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${SITE_AVAILABLE_TEXT}`}
                >
                  AVAILABLE ({unassigned.length})
                </span>
                <div className={`h-px flex-1 ${SITE_DIVIDER}`} />
              </div>
              <div className="space-y-2">
                {availableGroups.map(({ category, items }) => {
                  const key = `available:${category}`;
                  return (
                    <RoleAccordion
                      key={key}
                      category={category}
                      count={items.length}
                      isOpen={isSearching || expanded.has(key)}
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

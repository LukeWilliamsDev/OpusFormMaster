import React from "react";
import { Plus, X } from "lucide-react";
import { Job, Worker, ScheduledShift } from "../../types/erp";
import { getJobColorClasses } from "./jobColors";
import { getRoleColorClasses } from "./roleColors";
import { TicketWarningBadge } from "./TicketWarningBadge";

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : (parts[0]?.[0] ?? "");
};

interface StaffCardProps {
  worker: Worker;
  job?: Job;
  shift?: ScheduledShift;
  onAssign?: () => void;
  onRemove?: (shiftId: string) => void;
  /** Hides the assignment chip — used inside project sections where the project is the heading. */
  compact?: boolean;
  /** Denser sizing for narrow week-grid columns, or a flat list row (no per-person card) for long rosters. Defaults to the normal card sizing. */
  size?: "default" | "dense" | "row";
}

export const StaffCard: React.FC<StaffCardProps> = ({
  worker,
  job,
  shift,
  onAssign,
  onRemove,
  compact,
  size = "default",
}) => {
  const isAssigned = Boolean(shift);
  const colors = job ? getJobColorClasses(job.id) : null;
  const roleColors = getRoleColorClasses(worker.role);
  const dense = size === "dense";

  if (size === "row") {
    return (
      <div
        onClick={!isAssigned ? onAssign : undefined}
        className={`flex items-center gap-3 py-2 border-b border-border/70 [.light-theme_&]:border-border last:border-0 transition-opacity ${
          isAssigned ? "" : "opacity-75 [.light-theme_&]:opacity-90 hover:opacity-100"
        } ${
          !isAssigned && onAssign
            ? "pointer-events-none 2xl:pointer-events-auto 2xl:cursor-pointer 2xl:hover:bg-secondary/30 2xl:-mx-2 2xl:px-2 2xl:rounded-lg"
            : ""
        }`}
      >
        <div
          className={`w-7 h-7 rounded-full border flex items-center justify-center font-black text-[10px] shrink-0 ${roleColors.lightBg} ${roleColors.border} ${roleColors.text}`}
        >
          {getInitials(worker.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-foreground text-xs truncate" title={worker.name}>
            {worker.name}
          </h4>
          <p
            className="text-muted-foreground [.light-theme_&]:text-slate-600 font-bold uppercase tracking-widest text-[10px] truncate"
            title={worker.role}
          >
            {worker.role}
          </p>
        </div>
        <div className="pointer-events-auto">
          <TicketWarningBadge worker={worker} compact />
        </div>
        {isAssigned && job && colors ? (
          <span
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-bold shrink-0 max-w-[40%] ${colors.border} ${colors.lightBg} ${colors.text}`}
            title={job.siteName}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.bullet}`} />
            <span className="truncate">{job.siteName}</span>
          </span>
        ) : (
          onAssign && (
            <button
              type="button"
              onClick={onAssign}
              className="pointer-events-auto 2xl:hidden flex items-center gap-1 px-2 py-2.5 -my-1 rounded-lg border border-solid border-slate-600 [.light-theme_&]:border-slate-400 text-slate-300 [.light-theme_&]:text-slate-700 hover:text-foreground hover:border-primary font-black uppercase tracking-wider text-[10px] transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3 h-3" />
              Assign
            </button>
          )
        )}
        {onRemove && shift && (
          <button
            type="button"
            onClick={() => onRemove(shift.id)}
            aria-label={`Remove ${worker.name}`}
            className="p-2.5 -m-1 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`border rounded-xl bg-card transition-all ${
        dense ? "p-3 space-y-2" : "p-4 space-y-3"
      } ${isAssigned ? "border-border" : "border-border opacity-60 hover:opacity-100"}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`rounded-full border flex items-center justify-center font-black shrink-0 ${
              dense ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-[11px]"
            } ${roleColors.lightBg} ${roleColors.border} ${roleColors.text}`}
          >
            {getInitials(worker.name)}
          </div>
          <div className="min-w-0">
            <h4
              className={`font-bold text-foreground leading-tight ${
                dense ? "text-xs truncate whitespace-nowrap max-w-[150px]" : "text-sm break-words"
              }`}
              title={worker.name}
            >
              {worker.name}
            </h4>
            <p
              className={`text-muted-foreground font-bold uppercase tracking-widest mt-1 ${
                dense ? "text-[11px]" : "text-[11px]"
              }`}
            >
              {worker.role}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TicketWarningBadge worker={worker} compact={dense} />
          {compact && shift && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(shift.id)}
              aria-label={`Remove ${worker.name}`}
              className="p-1 -m-1 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {!compact &&
        isAssigned &&
        job &&
        colors &&
        (dense ? (
          <div
            className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg border ${colors.border} ${colors.lightBg}`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.bullet}`} />
              <span className={`text-[11px] font-bold truncate ${colors.text}`}>
                {job.siteName}
              </span>
            </div>
            {onRemove && shift && (
              <button
                type="button"
                onClick={() => onRemove(shift.id)}
                aria-label={`Remove ${worker.name} from ${job.siteName}`}
                className="p-1 -m-1 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <div
            className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${colors.border} ${colors.lightBg}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${colors.bullet}`} />
              <span className={`text-xs font-bold truncate ${colors.text}`}>{job.siteName}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-black font-mono uppercase tracking-wider text-muted-foreground">
                {job.jobRef.split("-").slice(0, 2).join("-")}
              </span>
              {onRemove && shift && (
                <button
                  type="button"
                  onClick={() => onRemove(shift.id)}
                  aria-label={`Remove ${worker.name} from ${job.siteName}`}
                  className="p-1 -m-1 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

      {!compact && !isAssigned && onAssign && (
        <button
          type="button"
          onClick={onAssign}
          className={`w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary font-black uppercase tracking-wider transition-colors cursor-pointer ${
            dense ? "px-2 py-1.5 text-[10px]" : "px-2.5 py-2 text-[11px]"
          }`}
        >
          <Plus className={dense ? "w-3 h-3" : "w-3.5 h-3.5"} />
          {dense ? "Assign" : "Assign to Project"}
        </button>
      )}
    </div>
  );
};

import React from "react";
import { Plus, X } from "lucide-react";
import { Job, Worker, ScheduledShift } from "../../types/erp";
import { getJobColorClasses } from "./jobColors";
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
  /** Denser sizing for narrow week-grid columns. Defaults to the normal card sizing. */
  size?: "default" | "dense";
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
  const dense = size === "dense";

  return (
    <div
      className={`border rounded-xl bg-[#16161a] transition-all ${
        dense ? "p-2.5 space-y-2" : "p-4 space-y-3"
      } ${isAssigned ? "border-[#2a2a30]" : "border-[#2a2a30] opacity-60 hover:opacity-100"}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`rounded-full border flex items-center justify-center font-black shrink-0 ${
              dense ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-[11px]"
            } ${
              colors
                ? `${colors.lightBg} ${colors.border} ${colors.text}`
                : "bg-gray-800 border-gray-700 text-gray-400"
            }`}
          >
            {getInitials(worker.name)}
          </div>
          <div className="min-w-0">
            <h4
              className={`font-bold text-white leading-tight ${
                dense ? "text-xs truncate whitespace-nowrap max-w-[110px]" : "text-sm break-words"
              }`}
              title={worker.name}
            >
              {worker.name}
            </h4>
            <p
              className={`text-gray-500 font-bold uppercase tracking-widest mt-1 ${
                dense ? "text-[10px]" : "text-[11px]"
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
              className="p-1 -m-1 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
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
                className="p-1 -m-1 text-gray-500 hover:text-red-400 transition-colors cursor-pointer shrink-0"
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
              <span className="text-[10px] font-black font-mono uppercase tracking-wider text-gray-500">
                {job.jobRef.split("-").slice(0, 2).join("-")}
              </span>
              {onRemove && shift && (
                <button
                  type="button"
                  onClick={() => onRemove(shift.id)}
                  aria-label={`Remove ${worker.name} from ${job.siteName}`}
                  className="p-1 -m-1 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
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
          className={`w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#3a3a42] text-gray-500 hover:text-white hover:border-[#6C8295] font-black uppercase tracking-wider transition-colors cursor-pointer ${
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

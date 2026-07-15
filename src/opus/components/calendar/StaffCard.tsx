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
}

export const StaffCard: React.FC<StaffCardProps> = ({
  worker,
  job,
  shift,
  onAssign,
  onRemove,
  compact,
}) => {
  const isAssigned = Boolean(shift);
  const colors = job ? getJobColorClasses(job.id) : null;

  return (
    <div
      className={`border rounded-xl bg-[#16161a] p-4 space-y-3 transition-all ${
        isAssigned ? "border-[#2a2a30]" : "border-[#2a2a30] opacity-60 hover:opacity-100"
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-full border flex items-center justify-center font-black text-[11px] shrink-0 ${
              colors
                ? `${colors.lightBg} ${colors.border} ${colors.text}`
                : "bg-gray-800 border-gray-700 text-gray-400"
            }`}
          >
            {getInitials(worker.name)}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white break-words leading-tight">
              {worker.name}
            </h4>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1">
              {worker.role}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TicketWarningBadge worker={worker} />
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

      {!compact && isAssigned && job && colors && (
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
      )}

      {!compact && !isAssigned && onAssign && (
        <button
          type="button"
          onClick={onAssign}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-dashed border-[#3a3a42] text-gray-500 hover:text-white hover:border-[#6C8295] text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Assign to Project
        </button>
      )}
    </div>
  );
};

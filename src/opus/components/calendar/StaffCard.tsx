import React, { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Job, Worker, ScheduledShift } from "../../types/erp";
import { getJobColorClasses } from "./jobColors";
import { getRoleColorClasses } from "./roleColors";
import { getWorstTicketWarning } from "../../utils/workerValidation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  const [confirmRemove, setConfirmRemove] = useState(false);
  const rowContainerRef = useRef<HTMLDivElement>(null);
  const rowMeasureRef = useRef<HTMLDivElement>(null);
  const [rowStacked, setRowStacked] = useState(false);
  const isAssigned = Boolean(shift);
  const colors = job ? getJobColorClasses(job.id) : null;
  const roleColors = getRoleColorClasses(worker.role);
  const dense = size === "dense";
  const ticketWarning = getWorstTicketWarning(worker);
  const blocked = ticketWarning?.status === "EXPIRED";
  const blockedTitle = blocked
    ? `Cannot deploy: ${ticketWarning.ticket.type} ticket expired ${new Date(ticketWarning.ticket.expiryDate).toLocaleDateString("en-GB")}`
    : undefined;

  // Site office design constants
  const SITE_AMBER = "bg-amber-600 text-white shadow-amber-600/20 hover:bg-amber-700";
  const SITE_STONE_BG = "bg-card";
  const SITE_STONE_BORDER = "border-border";
  const SITE_STONE_TEXT = "text-foreground";
  const SITE_MUTED_TEXT = "text-muted-foreground";
  const SITE_EMPTY_TEXT = "text-muted-foreground";
  const SITE_CARD = `border-2 ${SITE_STONE_BORDER} ${SITE_STONE_BG} rounded-xl transition-all`;
  const SITE_CARD_ASSIGNED = "border-success/30";
  const SITE_CARD_UNASSIGNED = "opacity-70 hover:opacity-100";
  const SITE_ROW_CARD = `flex items-center gap-3 py-2.5 border-b ${SITE_STONE_BORDER} last:border-0 transition-opacity`;
  const SITE_ROW_UNASSIGNED =
    "opacity-75 2xl:pointer-events-auto 2xl:cursor-pointer 2xl:hover:bg-background 2xl:-mx-2 2xl:px-2 2xl:rounded-lg";
  const SITE_BUTTON_PRIMARY = `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-black uppercase tracking-wider text-[10px] transition-colors cursor-pointer shrink-0 ${SITE_AMBER}`;
  const SITE_BUTTON_SECONDARY = `flex items-center gap-1 px-2 py-1.5 rounded-lg border border-dashed ${SITE_STONE_BORDER} ${SITE_MUTED_TEXT} hover:text-foreground hover:border-amber-600 dark:hover:border-amber-400 font-black uppercase tracking-wider text-[10px] transition-colors cursor-pointer shrink-0`;
  const SITE_BUTTON_DANGER = `pointer-events-auto flex items-center px-2 py-2.5 -my-1 rounded-lg border border-dashed border-red-500/50 text-red-400 [.light-theme_&]:text-red-600 font-black uppercase tracking-wider text-[10px] whitespace-nowrap shrink-0 cursor-not-allowed`;
  const SITE_REMOVE_BTN =
    "p-2.5 -m-1 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer shrink-0";
  const SITE_REMOVE_BTN_DENSE =
    "p-1 -m-1 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer";
  const SITE_TAG = `flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-bold shrink-0`;
  const SITE_AVATAR = `w-7 h-7 rounded-full border flex items-center justify-center font-black text-[10px] shrink-0`;

  useEffect(() => {
    if (size !== "row") return;
    const container = rowContainerRef.current;
    const measure = rowMeasureRef.current;
    if (!container || !measure) return;
    const check = () => setRowStacked(measure.scrollWidth > container.clientWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(container);
    return () => ro.disconnect();
  }, [size, worker.name, worker.role, job?.siteName, isAssigned, blocked]);

  if (size === "row") {
    const avatarNode = (
      <div
        className={`w-7 h-7 rounded-full border flex items-center justify-center font-black text-[10px] shrink-0 ${roleColors.lightBg} ${roleColors.border} ${roleColors.text}`}
      >
        {getInitials(worker.name)}
      </div>
    );
    const nameNode = (
      <div className="flex items-baseline gap-2 shrink-0">
        <h4 className="font-bold text-foreground text-xs whitespace-nowrap" title={worker.name}>
          {worker.name}
        </h4>
        <p
          className={`${SITE_MUTED_TEXT} font-bold uppercase tracking-widest text-[10px] whitespace-nowrap`}
          title={worker.role}
        >
          {worker.role}
        </p>
      </div>
    );
    const tagNode =
      isAssigned && job && colors ? (
        <span
          className={`${SITE_TAG} ${colors.border} ${colors.lightBg} ${colors.text}`}
          title={job.siteName}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.bullet}`} />
          <span className="whitespace-nowrap">{job.siteName}</span>
        </span>
      ) : (
        onAssign &&
        (blocked ? (
          <span title={blockedTitle} className={SITE_BUTTON_DANGER}>
            No Ticket
          </span>
        ) : (
          <button type="button" onClick={onAssign} className={SITE_BUTTON_PRIMARY}>
            <Plus className="w-3 h-3" />
            Assign
          </button>
        ))
      );
    const removeBtnNode = onRemove && shift && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setConfirmRemove(true);
        }}
        aria-label={`Remove ${worker.name}`}
        className={SITE_REMOVE_BTN}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    );

    return (
      <>
        <div ref={rowContainerRef} className="relative">
          {/* Invisible nowrap clone used only to measure whether the inline layout fits. */}
          <div
            ref={rowMeasureRef}
            aria-hidden
            className="absolute inset-x-0 top-0 flex items-center gap-3 invisible pointer-events-none -z-10"
          >
            {avatarNode}
            {nameNode}
            {tagNode}
            {removeBtnNode}
          </div>

          {rowStacked ? (
            <div
              onClick={!isAssigned && !blocked ? onAssign : undefined}
              className={`flex flex-col gap-2 py-2.5 border-b ${SITE_STONE_BORDER} last:border-0 transition-opacity ${isAssigned ? SITE_CARD_ASSIGNED : SITE_CARD_UNASSIGNED} ${!isAssigned && onAssign && !blocked ? SITE_ROW_UNASSIGNED : ""}`}
            >
              <div className="flex items-center gap-3">
                {avatarNode}
                <div className="min-w-0 flex-1">{nameNode}</div>
                {removeBtnNode}
              </div>
              {tagNode && <div className="ml-10">{tagNode}</div>}
            </div>
          ) : (
            <div
              onClick={!isAssigned && !blocked ? onAssign : undefined}
              className={`flex items-center gap-3 py-2.5 border-b ${SITE_STONE_BORDER} last:border-0 transition-opacity ${isAssigned ? SITE_CARD_ASSIGNED : SITE_CARD_UNASSIGNED} ${!isAssigned && onAssign && !blocked ? SITE_ROW_UNASSIGNED : ""}`}
            >
              {avatarNode}
              {nameNode}
              <div className="ml-auto flex items-center gap-3">
                {tagNode}
                {removeBtnNode}
              </div>
            </div>
          )}
        </div>
        {onRemove && shift && (
          <ConfirmDialog
            open={confirmRemove}
            onOpenChange={setConfirmRemove}
            tone="destructive"
            title={`Remove ${worker.name}?`}
            message={
              job
                ? `This unassigns ${worker.name} from ${job.siteName}.`
                : `This unassigns ${worker.name} from this shift.`
            }
            confirmLabel="Remove"
            onConfirm={() => onRemove(shift.id)}
          />
        )}
      </>
    );
  }

  const jobBadgeContent =
    job && colors && isAssigned ? (
      <div
        className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[10px] font-bold overflow-hidden ${colors.border} ${colors.lightBg}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.bullet}`} />
        <span className={`flex-1 line-clamp-1 ${colors.text}`}>{job.siteName}</span>
      </div>
    ) : null;

  const renderJobAssignment = () => {
    return null;
  };

  return (
    <>
      <div
        className={`${SITE_CARD} ${isAssigned ? SITE_CARD_ASSIGNED : SITE_CARD_UNASSIGNED} ${dense ? "p-3 space-y-2" : "p-4 space-y-3"}`}
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`${SITE_AVATAR} ${roleColors.lightBg} ${roleColors.border} ${roleColors.text} ${dense ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-[11px]"}`}
            >
              {getInitials(worker.name)}
            </div>
            <div className="w-full flex-1 min-w-0">
              <h4
                className={`font-bold text-foreground leading-tight ${dense ? "text-xs truncate whitespace-nowrap" : "text-sm truncate"}`}
                title={worker.name}
              >
                {worker.name}
              </h4>
              <p
                className={`${SITE_MUTED_TEXT} font-bold uppercase tracking-widest mt-1 ${dense ? "text-[11px]" : "text-[11px]"}`}
              >
                {worker.role}
              </p>
              {jobBadgeContent && <div className="mt-2 w-full">{jobBadgeContent}</div>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {((!compact && isAssigned) || compact) && onRemove && shift && (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                aria-label={`Remove ${worker.name}`}
                className={SITE_REMOVE_BTN_DENSE}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Job assignment display */}
        {renderJobAssignment()}

        {!compact && !isAssigned && onAssign && blocked && (
          <span
            title={blockedTitle}
            className={`w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-red-500/50 text-red-400 [.light-theme_&]:text-red-600 font-black uppercase tracking-wider cursor-not-allowed ${dense ? "px-2 py-1.5 text-[10px]" : "px-2.5 py-2 text-[11px]"}`}
          >
            No Valid Ticket
          </span>
        )}

        {!compact && !isAssigned && onAssign && !blocked && (
          <button
            type="button"
            onClick={onAssign}
            className={`w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed ${SITE_STONE_BORDER} ${SITE_MUTED_TEXT} hover:text-foreground hover:border-amber-600 dark:hover:border-amber-400 font-black uppercase tracking-wider transition-colors cursor-pointer ${dense ? "px-2 py-1.5 text-[10px]" : "px-2.5 py-2 text-[11px]"}`}
          >
            <Plus className={dense ? "w-3 h-3" : "w-3.5 h-3.5"} />
            {dense ? "Assign" : "Assign to Site"}
          </button>
        )}
      </div>
      {onRemove && shift && (
        <ConfirmDialog
          open={confirmRemove}
          onOpenChange={setConfirmRemove}
          tone="destructive"
          title={`Remove ${worker.name}?`}
          message={
            job
              ? `This unassigns ${worker.name} from ${job.siteName}.`
              : `This unassigns ${worker.name} from this shift.`
          }
          confirmLabel="Remove"
          onConfirm={() => onRemove(shift.id)}
        />
      )}
    </>
  );
};

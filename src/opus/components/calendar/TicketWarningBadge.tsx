import React from "react";
import { AlertTriangle } from "lucide-react";
import { Worker } from "../../types/erp";
import { getWorstTicketWarning } from "../../utils/workerValidation";

/**
 * Worst-ticket warning chip: red for an expired ticket, amber for one
 * expiring within 30 days, nothing when all tickets are valid.
 */
export const TicketWarningBadge: React.FC<{ worker: Worker }> = ({ worker }) => {
  const worst = getWorstTicketWarning(worker);
  if (!worst) return null;

  const colorClasses =
    worst.status === "EXPIRED" || worst.status === "INVALID"
      ? "bg-status-error/12 border-status-error/30 text-status-error"
      : "bg-status-warning/10 border-status-warning/25 text-status-warning";
  const statusDescription =
    worst.status === "INVALID"
      ? "has an invalid expiry date"
      : worst.status === "EXPIRED"
        ? "expired"
        : "expiring soon";

  return (
    <span
      className={`inline-flex items-center justify-center border shrink-0 rounded-md gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${colorClasses}`}
      title={`${worst.ticket.type} certificate ${statusDescription}`}
    >
      {worst.ticket.type}
      <AlertTriangle className="w-3 h-3" />
    </span>
  );
};

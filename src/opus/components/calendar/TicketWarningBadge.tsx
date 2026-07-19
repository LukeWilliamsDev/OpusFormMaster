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
    worst.status === "EXPIRED"
      ? "bg-red-500/25 [.light-theme_&]:bg-red-500/15 border-red-500/50 [.light-theme_&]:border-red-600/60 text-red-400 [.light-theme_&]:text-red-600"
      : "bg-amber-500/25 [.light-theme_&]:bg-amber-500/15 border-amber-500/50 [.light-theme_&]:border-amber-600/60 text-amber-400 [.light-theme_&]:text-amber-700";

  return (
    <span
      className={`inline-flex items-center justify-center border shrink-0 rounded-md gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${colorClasses}`}
      title={`${worst.ticket.type} ticket ${worst.status === "EXPIRED" ? "expired" : "expiring soon"} (${new Date(worst.ticket.expiryDate).toLocaleDateString("en-GB")})`}
    >
      {worst.ticket.type}
      <AlertTriangle className="w-3 h-3" />
    </span>
  );
};

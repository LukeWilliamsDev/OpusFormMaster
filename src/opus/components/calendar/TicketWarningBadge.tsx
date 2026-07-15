import React from "react";
import { AlertTriangle } from "lucide-react";
import { Worker, Ticket } from "../../types/erp";
import { getTicketStatus } from "../../utils/workerValidation";

/**
 * Worst-ticket warning chip: red for an expired ticket, amber for one
 * expiring within 30 days, nothing when all tickets are valid.
 */
export const TicketWarningBadge: React.FC<{ worker: Worker }> = ({ worker }) => {
  const tickets = worker.tickets ?? [];
  let worst: { ticket: Ticket; status: "EXPIRED" | "EXPIRING_SOON" } | null = null;
  for (const ticket of tickets) {
    const status = getTicketStatus(ticket);
    if (status === "EXPIRED") {
      worst = { ticket, status };
      break;
    }
    if (status === "EXPIRING_SOON" && !worst) {
      worst = { ticket, status };
    }
  }
  if (!worst) return null;

  const colorClasses =
    worst.status === "EXPIRED"
      ? "bg-red-500/20 border-red-500/30 text-red-400"
      : "bg-amber-500/20 border-amber-500/30 text-amber-400";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider shrink-0 ${colorClasses}`}
      title={`${worst.ticket.type} ticket ${worst.status === "EXPIRED" ? "expired" : "expiring soon"} (${worst.ticket.expiryDate})`}
    >
      {worst.ticket.type}
      <AlertTriangle className="w-3 h-3" />
    </span>
  );
};

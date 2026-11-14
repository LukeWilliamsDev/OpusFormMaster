import React from "react";
import { Ticket } from "../types/erp";
import { getTicketStatus } from "../utils/workerValidation";
import { ShieldAlert } from "lucide-react";

interface TicketStatusBadgeProps {
  ticket: Ticket;
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ ticket }) => {
  const status = getTicketStatus(ticket);
  if (status === "VALID") return null;

  const colorClasses =
    status === "EXPIRED" || status === "INVALID"
      ? "bg-status-error/12 border-status-error/30 text-status-error"
      : "bg-status-warning/10 border-status-warning/25 text-status-warning";
  const statusText =
    status === "INVALID" ? "NEEDS REVIEW" : status === "EXPIRED" ? "EXPIRED" : "EXPIRING";

  return (
    <span
      className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${colorClasses}`}
    >
      {statusText}
    </span>
  );
};

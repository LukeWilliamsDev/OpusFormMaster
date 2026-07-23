import React from "react";
import { Ticket } from "../types/erp";
import { getTicketStatus } from "../utils/workerValidation";
import { ShieldAlert } from "lucide-react";

interface TicketStatusBadgeProps {
  ticket: Ticket;
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ ticket }) => {
  const status = getTicketStatus(ticket);
  if (status === "ACTIVE") return null;

  const colorClasses =
    status === "EXPIRED"
      ? "bg-red-500/20 border-red-500/30 text-red-400"
      : "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse";
  const statusText = status === "EXPIRED" ? "EXPIRED" : "EXPIRING";

  return (
    <span
      className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${colorClasses}`}
    >
      {statusText}
    </span>
  );
};

// @ts-nocheck
import React from 'react';
import { Ticket } from '../types/erp';
import { getTicketStatus } from '../utils/workerValidation';
import { ShieldAlert } from 'lucide-react';

interface TicketStatusBadgeProps {
  ticket: Ticket;
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ ticket }) => {
  const status = getTicketStatus(ticket);
  let colorClasses = '';
  if (status === 'EXPIRED') {
    colorClasses = 'bg-red-500/20 border-red-500/30 text-red-400';
  } else if (status === 'EXPIRING_SOON') {
    colorClasses = 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse';
  } else {
    colorClasses = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  }

  let statusText = 'ACTIVE';
  if (status === 'EXPIRED') statusText = 'EXPIRED';
  else if (status === 'EXPIRING_SOON') statusText = 'EXPIRING';

  return (
    <span 
      className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${colorClasses}`}
    >
      {statusText}
    </span>
  );
};

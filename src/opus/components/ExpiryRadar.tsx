// @ts-nocheck
import React from "react";
import { AlertTriangle, ShieldCheck, HelpCircle } from "lucide-react";

interface TicketInfo {
  workerId: string;
  workerName: string;
  workerRole: string;
  ticketId: string;
  ticketType: string;
  expiryDate: string;
  ticketNumber: string;
  diffDays: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

interface ExpiryRadarProps {
  expiringTickets: TicketInfo[];
  onSelectWorker?: (workerId: string) => void;
}

export const ExpiryRadar: React.FC<ExpiryRadarProps> = ({ expiringTickets, onSelectWorker }) => {
  // Urgency Classification & Sorting:
  // 1. EXPIRED tickets (diffDays < 0) are shown first.
  // 2. Tickets expiring in <= 14 days are shown second.
  // 3. Tickets expiring in <= 30 days are shown third.
  // 4. Valid tickets are shown last.
  const sortedTickets = React.useMemo(() => {
    return [...expiringTickets].sort((a, b) => {
      const getCategory = (t: TicketInfo) => {
        if (t.diffDays < 0) return 1;
        if (t.diffDays <= 14) return 2;
        if (t.diffDays <= 30) return 3;
        return 4;
      };

      const catA = getCategory(a);
      const catB = getCategory(b);

      if (catA !== catB) {
        return catA - catB;
      }

      // Secondary sort: closest to expiry date first
      return a.diffDays - b.diffDays;
    });
  }, [expiringTickets]);

  const getTicketStyle = (ticket: TicketInfo) => {
    if (ticket.diffDays < 0) {
      // Expired (Red Theme)
      return {
        cardBg: "bg-red-950/20 border-red-900/30 hover:border-red-700/50 hover:bg-red-950/30",
        badgeBg: "bg-red-900/50 text-red-400 border-red-800/40",
        statusText: "Blocked",
        daysText: "Expired",
        daysColor: "text-red-400",
        iconColor: "text-red-500",
      };
    } else if (ticket.diffDays <= 14) {
      // <= 14 days (Amber Theme)
      return {
        cardBg:
          "bg-amber-950/30 border-amber-900/30 hover:border-amber-700/50 hover:bg-amber-950/40",
        badgeBg: "bg-amber-900/50 text-amber-400 border-amber-800/40",
        statusText: "Critical",
        daysText: `${ticket.diffDays} days left`,
        daysColor: "text-amber-400",
        iconColor: "text-amber-500",
      };
    } else if (ticket.diffDays <= 30) {
      // <= 30 days (Soft Yellow/Orange Theme)
      return {
        cardBg:
          "bg-yellow-950/15 border-yellow-900/25 hover:border-yellow-800/45 hover:bg-yellow-950/25",
        badgeBg: "bg-yellow-900/40 text-yellow-400 border-yellow-800/30",
        statusText: "Warning",
        daysText: `${ticket.diffDays} days left`,
        daysColor: "text-yellow-400",
        iconColor: "text-yellow-500",
      };
    } else {
      // Valid (Emerald Theme)
      return {
        cardBg:
          "bg-emerald-950/20 border-emerald-900/30 hover:border-emerald-700/50 hover:bg-emerald-950/30",
        badgeBg: "bg-emerald-900/50 text-emerald-400 border-emerald-800/40",
        statusText: "Valid",
        daysText: `${ticket.diffDays} days left`,
        daysColor: "text-emerald-400",
        iconColor: "text-emerald-500",
      };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-3">
        <div className="flex items-center gap-2 text-[11px] font-black tracking-widest uppercase text-white font-archivo">
          <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>30-Day Expiry Radar</span>
        </div>
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
          Compliance Control
        </span>
      </div>

      <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl p-4 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <span>Operational compliance warning dashboard</span>
          <span className="text-[10px] text-[#888] font-mono font-bold">
            Total: {sortedTickets.length} flagged
          </span>
        </div>

        {/* Responsive grid to prevent horizontal scrolling on mobile viewports */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTickets.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500 col-span-full flex flex-col items-center justify-center gap-2">
              <ShieldCheck className="w-8 h-8 text-emerald-500 opacity-60" />
              <span className="font-black uppercase tracking-widest text-[9px]">
                All active personnel are fully compliant
              </span>
            </div>
          ) : (
            sortedTickets.map((ticketInfo) => {
              const style = getTicketStyle(ticketInfo);
              return (
                <div
                  key={`${ticketInfo.workerId}-${ticketInfo.ticketId}`}
                  onClick={() => onSelectWorker?.(ticketInfo.workerId)}
                  className={`w-full py-4 px-4 rounded-xl border bg-[#1A1B1E] flex flex-col gap-2.5 transition-all duration-150 cursor-pointer select-none ${style.cardBg}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-white truncate mr-2">
                        {ticketInfo.workerName}
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border shrink-0 ${style.badgeBg}`}
                      >
                        {style.statusText}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">
                      {ticketInfo.workerRole}
                    </div>
                  </div>

                  <div className="h-px bg-[#2e2e2e]/50" />

                  <div className="flex justify-between items-center text-xs gap-2">
                    <div className="flex flex-col truncate">
                      <span className="text-gray-300 font-semibold truncate text-[11px]">
                        {ticketInfo.ticketType} Card
                      </span>
                      <span className="text-gray-500 text-[9px] font-mono font-bold truncate mt-0.5">
                        No. {ticketInfo.ticketNumber}
                      </span>
                    </div>

                    <div className="text-right flex flex-col items-end shrink-0">
                      <span className={`font-mono font-bold text-[11px] ${style.daysColor}`}>
                        {style.daysText}
                      </span>
                      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                        Exp: {ticketInfo.expiryDate}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

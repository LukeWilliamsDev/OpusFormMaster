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
      // Expired
      return {
        cardBg: "bg-destructive/10 border-destructive/20 hover:border-destructive/40 hover:bg-destructive/15",
        badgeBg: "bg-destructive/20 text-destructive border-destructive/30",
        statusText: "Blocked",
        daysText: "Expired",
        daysColor: "text-destructive",
        iconColor: "text-destructive",
      };
    } else if (ticket.diffDays <= 14) {
      // <= 14 days (Critical — stronger warning tint)
      return {
        cardBg: "bg-warning/15 border-warning/30 hover:border-warning/50 hover:bg-warning/20",
        badgeBg: "bg-warning/25 text-warning border-warning/40",
        statusText: "Critical",
        daysText: `${ticket.diffDays} days left`,
        daysColor: "text-warning",
        iconColor: "text-warning",
      };
    } else if (ticket.diffDays <= 30) {
      // <= 30 days (softer warning tint)
      return {
        cardBg: "bg-warning/5 border-warning/15 hover:border-warning/30 hover:bg-warning/10",
        badgeBg: "bg-warning/15 text-warning border-warning/25",
        statusText: "Warning",
        daysText: `${ticket.diffDays} days left`,
        daysColor: "text-warning",
        iconColor: "text-warning",
      };
    } else {
      // Valid
      return {
        cardBg: "bg-success/10 border-success/20 hover:border-success/40 hover:bg-success/15",
        badgeBg: "bg-success/20 text-success border-success/30",
        statusText: "Valid",
        daysText: `${ticket.diffDays} days left`,
        daysColor: "text-success",
        iconColor: "text-success",
      };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 text-[11px] font-black tracking-widest uppercase text-foreground font-archivo">
          <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>30-Day Expiry Radar</span>
        </div>
        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
          Compliance Control
        </span>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Operational compliance warning dashboard</span>
          <span className="text-[10px] text-muted-foreground font-mono font-bold">
            Total: {sortedTickets.length} flagged
          </span>
        </div>

        {/* Responsive grid to prevent horizontal scrolling on mobile viewports */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTickets.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground col-span-full flex flex-col items-center justify-center gap-2">
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
                  className={`w-full py-4 px-4 rounded-xl border bg-background flex flex-col gap-2.5 transition-all duration-150 cursor-pointer select-none ${style.cardBg}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-foreground truncate mr-2">
                        {ticketInfo.workerName}
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border shrink-0 ${style.badgeBg}`}
                      >
                        {style.statusText}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">
                      {ticketInfo.workerRole}
                    </div>
                  </div>

                  <div className="h-px bg-border/50" />

                  <div className="flex justify-between items-center text-xs gap-2">
                    <div className="flex flex-col truncate">
                      <span className="text-foreground font-semibold truncate text-[11px]">
                        {ticketInfo.ticketType} Card
                      </span>
                      <span className="text-muted-foreground text-[9px] font-mono font-bold truncate mt-0.5">
                        No. {ticketInfo.ticketNumber}
                      </span>
                    </div>

                    <div className="text-right flex flex-col items-end shrink-0">
                      <span className={`font-mono font-bold text-[11px] ${style.daysColor}`}>
                        {style.daysText}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                        Exp: {new Date(ticketInfo.expiryDate).toLocaleDateString("en-GB")}
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

import React from "react";
import { UserCheck, Phone } from "lucide-react";
import { Worker } from "../types/erp";

interface PourLog {
  id: string;
  pourNumber: number;
  date: string;
  mixType: string;
  volumeM3: number;
  status: "completed" | "scheduled";
  notes?: string;
}

export function getNextScheduledPour(pourLogs: PourLog[]): PourLog | null {
  const scheduled = pourLogs.filter((p) => p.status === "scheduled");
  if (scheduled.length === 0) return null;
  return [...scheduled].sort((a, b) => (a.date || "").localeCompare(b.date || ""))[0];
}

interface PersistentJobHeaderProps {
  groupedStaff: { [key: string]: Worker[] };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export const PersistentJobHeader: React.FC<PersistentJobHeaderProps> = ({ groupedStaff }) => {
  const staffCount = Object.values(groupedStaff).reduce((sum, list) => sum + list.length, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <UserCheck className="w-4 h-4 text-primary" />
        <h2 className="text-base font-bold text-foreground">Staff On Site</h2>
        <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
          {staffCount}
        </span>
      </div>

      <div className="space-y-4">
        {Object.keys(groupedStaff).length > 0 ? (
          Object.keys(groupedStaff).map((roleName) => (
            <div key={roleName} className="space-y-1.5">
              <div className="text-[12px] text-primary font-bold uppercase tracking-wider border-b border-border pb-1">
                {roleName} ({groupedStaff[roleName].length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {groupedStaff[roleName].map((w) => (
                  <div
                    key={w.id}
                    className="bg-background border border-border rounded-lg p-2.5 flex items-center gap-3 hover:border-primary/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                      {initials(w.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground truncate">{w.name}</div>
                      {w.phone && (
                        <div className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                          {w.phone}
                        </div>
                      )}
                    </div>
                    {w.phone && (
                      <a
                        href={`tel:${w.phone}`}
                        aria-label={`Call ${w.name}`}
                        className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors shrink-0"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs text-muted-foreground py-4 text-center uppercase tracking-wider">
            No staff members scheduled to this job site.
          </div>
        )}
      </div>
    </div>
  );
};

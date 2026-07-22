import React, { useState } from "react";
import {
  CloudRain,
  CloudSun,
  Snowflake,
  Wind,
  Loader,
  UserCheck,
  Phone,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
  weatherData: {
    temperature: number;
    condition: string;
    riskLevel: string;
    isImpactful: boolean;
  } | null;
  loadingWeather: boolean;
  groupedStaff: { [key: string]: Worker[] };
  statusPills?: React.ReactNode;
}

export const PersistentJobHeader: React.FC<PersistentJobHeaderProps> = ({
  weatherData,
  loadingWeather,
  groupedStaff,
  statusPills,
}) => {
  const [staffExpanded, setStaffExpanded] = useState(false);
  const staffCount = Object.values(groupedStaff).reduce((sum, list) => sum + list.length, 0);

  return (
    <div className="bg-card border border-border rounded-xl divide-y divide-border">
      <div className="p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          {statusPills}
          {loadingWeather ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader className="w-4 h-4 animate-spin text-primary" />
              <span>Fetching weather...</span>
            </div>
          ) : weatherData ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                {weatherData.condition === "Rain" ? (
                  <CloudRain className="w-5 h-5 text-muted-foreground shrink-0" />
                ) : weatherData.condition === "Frost" ? (
                  <Snowflake className="w-5 h-5 text-muted-foreground shrink-0" />
                ) : weatherData.condition === "Wind" ? (
                  <Wind className="w-5 h-5 text-muted-foreground shrink-0" />
                ) : (
                  <CloudSun className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm font-bold text-foreground">
                  {weatherData.temperature}°C
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {weatherData.condition}
                </span>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                  weatherData.isImpactful
                    ? "bg-destructive/15 text-destructive border border-destructive/20"
                    : "bg-success/15 text-success border border-success/20"
                }`}
              >
                {weatherData.riskLevel} Risk
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Weather unavailable</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setStaffExpanded((v) => !v)}
          className="flex items-center gap-2 cursor-pointer shrink-0"
        >
          <UserCheck className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">{staffCount} active</span>
          {staffExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {staffExpanded && (
        <div className="p-3">
          <div className="mt-3 space-y-4">
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
                        className="bg-background border border-border rounded-lg p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">{w.name}</div>
                          {w.phone && (
                            <a
                              href={`tel:${w.phone}`}
                              className="text-[11px] text-primary hover:underline font-mono flex items-center gap-1 mt-0.5"
                            >
                              <Phone className="w-2.5 h-2.5" /> {w.phone}
                            </a>
                          )}
                        </div>
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
      )}
    </div>
  );
};

import React from "react";
import { CloudRain, CloudSun, Plus, Snowflake, Thermometer, Users, Wind } from "lucide-react";
import { Job } from "../../types/erp";
import { useJobForecast, getWeatherOnDate } from "../../utils/weather";
import { formatDayHeading } from "../../utils/week";
import { DaySchedule } from "../../hooks/useDaySchedule";
import { getJobColorClasses } from "./jobColors";
import { StaffCard } from "./StaffCard";

const WeatherChip: React.FC<{ job: Job; date: string }> = ({ job, date }) => {
  const { forecast } = useJobForecast(job.postcode);
  const weather = getWeatherOnDate(forecast, date);
  if (!weather) return null;

  const colorClass = !weather.isImpactful
    ? "bg-success/10 border-success/30 text-success"
    : weather.riskLevel === "High"
      ? "bg-warning/10 border-warning/30 text-warning"
      : "bg-warning/10 border-warning/20 text-warning";

  return (
    <div
      className={`flex items-center justify-between px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg border text-[9px] sm:text-[11px] font-black uppercase tracking-[0.04em] sm:tracking-[0.08em] ${colorClass}`}
    >
      <div className="flex items-center gap-1 sm:gap-1.5">
        {weather.condition === "Rain" ? (
          <CloudRain className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
        ) : weather.condition === "Frost" ? (
          <Snowflake className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
        ) : weather.condition === "Wind" ? (
          <Wind className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
        ) : (
          <CloudSun className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
        )}
        <span>{weather.condition}</span>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <span className="opacity-90">{weather.riskLevel} RISK</span>
        <span className="flex items-center gap-0.5 opacity-80">
          <Thermometer className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0" /> {weather.temperature}°C
        </span>
      </div>
    </div>
  );
};

interface ProjectDayListProps {
  jobs: Job[];
  schedule: DaySchedule;
  date: string;
  onAddStaff: (job: Job) => void;
  onRemoveShift: (shiftId: string) => void;
}

export const ProjectDayList: React.FC<ProjectDayListProps> = ({
  jobs,
  schedule,
  date,
  onAddStaff,
  onRemoveShift,
}) => {
  const activeJobs = jobs.filter((j) => j.status !== "completed");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[11px] sm:text-xs">
        <span className="font-bold text-muted-foreground">{formatDayHeading(date)}</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-black text-success">{schedule.deployedCount} staff deployed</span>
      </div>

      {activeJobs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground border border-dashed border-border rounded-xl">
          <Users className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">No active projects</span>
        </div>
      ) : (
        activeJobs.map((job) => {
          const crew = schedule.byJob.get(job.id) ?? [];
          const colors = getJobColorClasses(job.id);

          return (
            <div
              key={job.id}
              className={`border rounded-xl bg-card p-3 space-y-2 ${colors.border}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 ${colors.bullet}`}
                  />
                  <h3 className={`text-[11px] sm:text-sm font-bold truncate ${colors.text}`}>
                    {job.siteName}
                  </h3>
                </div>
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  <span className="text-[9px] sm:text-[10px] font-black font-mono uppercase tracking-wider text-muted-foreground">
                    {job.jobRef.split("-").slice(0, 2).join("-")}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-muted-foreground">
                    <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {crew.length}
                  </span>
                </div>
              </div>

              <WeatherChip job={job} date={date} />

              {crew.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {crew.map(({ worker, shift }) => (
                    <StaffCard
                      key={worker.id}
                      worker={worker}
                      job={job}
                      shift={shift}
                      onRemove={onRemoveShift}
                      compact
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => onAddStaff(job)}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Add Staff Member
              </button>
            </div>
          );
        })
      )}
    </div>
  );
};

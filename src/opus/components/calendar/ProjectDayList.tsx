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
    ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400"
    : weather.riskLevel === "High"
      ? "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400"
      : "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400";

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

// Site office design constants
const SITE_STONE_BG =
  "bg-stone-50 dark:bg-slate-800/50 border-2 border-stone-200 dark:border-slate-700 rounded-xl";
const SITE_DIVIDER = "bg-stone-200 dark:bg-slate-700";
const SITE_DEPLOYED_TEXT = "text-emerald-600 dark:text-emerald-400";
const SITE_EMPTY_TEXT = "text-stone-400 dark:text-stone-500";
const SITE_AVAILABLE_TEXT = "text-stone-500 dark:text-stone-400";
const SITE_HEADER_TEXT = "text-stone-500 dark:text-stone-400";
const SITE_JOB_CARD =
  "border border-stone-200 dark:border-slate-700 rounded-lg bg-stone-100/50 dark:bg-slate-800/50 p-3 space-y-2";
const SITE_ADD_STAFF =
  "w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-stone-200 dark:border-slate-700 text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:border-amber-600 dark:hover:border-amber-400 text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer";

export const ProjectDayList: React.FC<ProjectDayListProps> = ({
  jobs,
  schedule,
  date,
  onAddStaff,
  onRemoveShift,
}) => {
  const activeJobs = jobs.filter((j) => j.status !== "completed");

  return (
    <div className={`space-y-4 ${SITE_STONE_BG} p-4`}>
      <div className="flex items-center gap-2 text-[11px] sm:text-xs">
        <span className={`font-bold ${SITE_HEADER_TEXT}`}>{formatDayHeading(date)}</span>
        <span className={SITE_HEADER_TEXT}>·</span>
        <span className={`font-black ${SITE_DEPLOYED_TEXT}`}>
          {schedule.deployedCount} operatives deployed
        </span>
      </div>

      {activeJobs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center border-2 border-dashed border-stone-200 dark:border-slate-700 rounded-xl">
          <Users className="w-6 h-6 text-stone-300 dark:text-stone-600" />
          <span className={`text-xs font-bold uppercase tracking-wider ${SITE_EMPTY_TEXT}`}>
            No sites active
          </span>
        </div>
      ) : (
        activeJobs.map((job) => {
          const crew = schedule.byJob.get(job.id) ?? [];
          const colors = getJobColorClasses(job.id);

          return (
            <div key={job.id} className={SITE_JOB_CARD}>
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
                  <span className="text-[9px] sm:text-[10px] font-black font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {job.jobRef.split("-").slice(0, 2).join("-")}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-black text-stone-500 dark:text-stone-400">
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

              <button type="button" onClick={() => onAddStaff(job)} className={SITE_ADD_STAFF}>
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                ADD OPERATIVES
              </button>
            </div>
          );
        })
      )}
    </div>
  );
};

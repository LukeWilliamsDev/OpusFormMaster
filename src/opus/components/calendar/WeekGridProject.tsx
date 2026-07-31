import React from "react";
import { CloudRain, CloudSun, Plus, Snowflake, Thermometer, Users, Wind } from "lucide-react";
import { Job } from "../../types/erp";
import { useJobForecast, getWeatherOnDate } from "../../utils/weather";
import { DaySchedule } from "../../hooks/useDaySchedule";
import { WeekDay } from "../../utils/week";
import { getJobColorClasses } from "./jobColors";
import { StaffCard } from "./StaffCard";

const DenseWeatherChip: React.FC<{ job: Job; date: string }> = ({ job, date }) => {
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
      className={`flex items-center justify-between gap-1 px-1.5 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider ${colorClass}`}
      title={weather.advice}
    >
      <span className="flex items-center gap-1 truncate">
        {weather.condition === "Rain" ? (
          <CloudRain className="w-2.5 h-2.5 shrink-0" />
        ) : weather.condition === "Frost" ? (
          <Snowflake className="w-2.5 h-2.5 shrink-0" />
        ) : weather.condition === "Wind" ? (
          <Wind className="w-2.5 h-2.5 shrink-0" />
        ) : (
          <CloudSun className="w-2.5 h-2.5 shrink-0" />
        )}
        <span className="truncate">
          {weather.condition} · {weather.riskLevel}
        </span>
      </span>
      <span className="flex items-center gap-0.5 opacity-80 shrink-0">
        <Thermometer className="w-2.5 h-2.5" /> {weather.temperature}°
      </span>
    </div>
  );
};

interface WeekGridProjectProps {
  jobs: Job[];
  weekDays: WeekDay[];
  weekSchedule: Map<string, DaySchedule>;
  onAddStaff: (job: Job, date: string) => void;
  onRemoveShift: (shiftId: string) => void;
}

// Site office design constants
const SITE_STONE_BG = "bg-stone-50 dark:bg-slate-800/50";
const SITE_STONE_BORDER = "border-stone-200 dark:border-slate-700";
const SITE_BORDER_R = "border-r " + SITE_STONE_BORDER + " last:border-r-0";
const SITE_DEPLOYED_TEXT = "text-emerald-600 dark:text-emerald-400";
const SITE_EMPTY_TEXT = "text-stone-400 dark:text-stone-500";
const SITE_JOB_CARD =
  "border border-stone-200 dark:border-slate-700 rounded-lg bg-stone-100/50 dark:bg-slate-800/50 p-2 space-y-2";
const SITE_ADD_STAFF =
  "w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-stone-200 dark:border-slate-700 text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:border-amber-600 dark:hover:border-amber-400 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer";

export const WeekGridProject: React.FC<WeekGridProjectProps> = ({
  jobs,
  weekDays,
  weekSchedule,
  onAddStaff,
  onRemoveShift,
}) => {
  const activeJobs = jobs.filter((j) => j.status !== "completed");

  return (
    <>
      {weekDays.map((day) => {
        const schedule = weekSchedule.get(day.date);

        return (
          <div key={day.date} className={`min-w-0 p-3 space-y-3 ${SITE_BORDER_R} ${SITE_STONE_BG}`}>
            <div className="flex items-center justify-between gap-1.5 px-0.5">
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-[11px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
                  {day.shortName}
                </span>
                <span className="text-[11px] font-bold font-mono text-stone-500 dark:text-stone-400">
                  {day.date.split("-")[2]}
                </span>
              </div>
              <span className={`text-[11px] font-black shrink-0 ${SITE_DEPLOYED_TEXT}`}>
                {schedule?.deployedCount ? schedule.deployedCount : "0 deployed"}
              </span>
            </div>

            {activeJobs.length === 0 ? (
              <div
                className={`py-4 text-center text-[10px] font-bold uppercase tracking-wider ${SITE_EMPTY_TEXT}`}
              >
                No sites active
              </div>
            ) : (
              activeJobs.map((job) => {
                const crew = schedule?.byJob.get(job.id) ?? [];
                const colors = getJobColorClasses(job.id);

                return (
                  <div key={job.id} className={SITE_JOB_CARD}>
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${colors.bullet}`} />
                        <h4 className={`text-[12px] font-bold truncate ${colors.text}`}>
                          {job.siteName}
                        </h4>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] font-black text-stone-500 dark:text-stone-400 shrink-0">
                        <Users className="w-3 h-3" /> {crew.length}
                      </span>
                    </div>

                    <DenseWeatherChip job={job} date={day.date} />

                    {crew.length > 0 && (
                      <div className="space-y-1.5">
                        {crew.map(({ worker, shift }) => (
                          <StaffCard
                            key={worker.id}
                            worker={worker}
                            job={job}
                            shift={shift}
                            onRemove={onRemoveShift}
                            compact
                            size="dense"
                          />
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onAddStaff(job, day.date)}
                      aria-label={`Add operatives to ${job.siteName}`}
                      className={SITE_ADD_STAFF}
                    >
                      <Plus className="w-3 h-3" />
                      <span className="hidden xl:inline">ADD OPERATIVES</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </>
  );
};

import React from "react";
import { Plus, Users } from "lucide-react";
import { Job } from "../../types/erp";
import { getWeatherForJob } from "../../utils/weather";
import { DaySchedule } from "../../hooks/useDaySchedule";
import { WeekDay } from "../../utils/week";
import { getJobColorClasses } from "./jobColors";
import { StaffCard } from "./StaffCard";

const DenseWeatherChip: React.FC<{ job: Job }> = ({ job }) => {
  const weather = getWeatherForJob(job);
  if (!weather || !weather.isImpactful) return null;

  const colorClass =
    weather.riskLevel === "High"
      ? "bg-[#2B1D11] border-[#C3813B] text-[#FFB057]"
      : "bg-[#252011] border-[#9E8530] text-[#E0C043]";

  return (
    <div
      className={`px-1.5 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider truncate ${colorClass}`}
      title={`${weather.condition} · ${weather.riskLevel} risk · ${weather.temperature}°C`}
    >
      {weather.condition} · {weather.riskLevel}
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
          <div
            key={day.date}
            className="min-w-0 border border-border rounded-xl bg-card p-2.5 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-1.5 px-0.5">
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {day.shortName}
                </span>
                <span className="text-[10px] font-bold font-mono text-gray-500">
                  {day.date.split("-")[2]}
                </span>
              </div>
              <span className="text-[10px] font-black text-[#8FB996] shrink-0">
                {schedule?.deployedCount ?? 0}
              </span>
            </div>

            {activeJobs.length === 0 ? (
              <div className="py-4 text-center text-[10px] font-bold uppercase tracking-wider text-gray-600">
                No projects
              </div>
            ) : (
              activeJobs.map((job) => {
                const crew = schedule?.byJob.get(job.id) ?? [];
                const colors = getJobColorClasses(job.id);

                return (
                  <div
                    key={job.id}
                    className={`border rounded-lg bg-muted/30 p-2 space-y-2 ${colors.border}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${colors.bullet}`} />
                        <h4 className={`text-[11px] font-bold truncate ${colors.text}`}>
                          {job.siteName}
                        </h4>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-black text-gray-500 shrink-0">
                        <Users className="w-3 h-3" /> {crew.length}
                      </span>
                    </div>

                    <DenseWeatherChip job={job} />

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
                      aria-label={`Add staff to ${job.siteName}`}
                      className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-border text-gray-500 hover:text-foreground hover:border-primary text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span className="hidden xl:inline">Add Staff</span>
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

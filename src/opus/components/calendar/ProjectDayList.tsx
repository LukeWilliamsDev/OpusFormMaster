import React from "react";
import { CloudRain, CloudSun, Plus, Snowflake, Thermometer, Users, Wind } from "lucide-react";
import { Job } from "../../types/erp";
import { getWeatherForJob } from "../../utils/weather";
import { formatDayHeading } from "../../utils/week";
import { DaySchedule } from "../../hooks/useDaySchedule";
import { getJobColorClasses } from "./jobColors";
import { StaffCard } from "./StaffCard";

const WeatherChip: React.FC<{ job: Job }> = ({ job }) => {
  const weather = getWeatherForJob(job);
  if (!weather || !weather.isImpactful) return null;

  const colorClass =
    weather.riskLevel === "High"
      ? "bg-[#2B1D11] border-[#C3813B] text-[#FFB057]"
      : "bg-[#252011] border-[#9E8530] text-[#E0C043]";

  return (
    <div
      className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-[0.08em] ${colorClass}`}
    >
      <div className="flex items-center gap-1.5">
        {weather.condition === "Rain" ? (
          <CloudRain className="w-3 h-3 shrink-0" />
        ) : weather.condition === "Frost" ? (
          <Snowflake className="w-3 h-3 shrink-0" />
        ) : weather.condition === "Wind" ? (
          <Wind className="w-3 h-3 shrink-0" />
        ) : (
          <CloudSun className="w-3 h-3 shrink-0" />
        )}
        <span>{weather.condition}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="opacity-90">{weather.riskLevel} RISK</span>
        <span className="flex items-center gap-0.5 opacity-80">
          <Thermometer className="w-2.5 h-2.5 shrink-0" /> {weather.temperature}°C
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
      <div className="flex items-center gap-2 text-xs">
        <span className="font-bold text-gray-400">{formatDayHeading(date)}</span>
        <span className="text-gray-600">·</span>
        <span className="font-black text-[#8FB996]">{schedule.deployedCount} staff deployed</span>
      </div>

      {activeJobs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-gray-500 border border-dashed border-[#2a2a30] rounded-xl">
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
              className={`border rounded-xl bg-[#1a1a1e] p-4 space-y-3 ${colors.border}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.bullet}`} />
                  <h3 className={`text-sm font-bold truncate ${colors.text}`}>{job.siteName}</h3>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[10px] font-black font-mono uppercase tracking-wider text-gray-500">
                    {job.jobRef.split("-").slice(0, 2).join("-")}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-black text-gray-400">
                    <Users className="w-3.5 h-3.5" /> {crew.length}
                  </span>
                </div>
              </div>

              <WeatherChip job={job} />

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
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-dashed border-[#3a3a42] text-gray-500 hover:text-white hover:border-primary text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Staff Member
              </button>
            </div>
          );
        })
      )}
    </div>
  );
};

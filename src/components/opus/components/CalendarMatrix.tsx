// @ts-nocheck
import React, { useState } from 'react';
import { ChevronDown, AlertCircle, ChevronLeft, ChevronRight, 
  Calendar, 
  MapPin, 
  Search, 
  CloudSun,
  CloudRain,
  Snowflake,
  Wind,
  Sun,
  Thermometer,
  UserCheck,
  CheckCircle,
  X,
  User,
  Trash2,
  Briefcase
} from 'lucide-react';
import { Job, Worker, WeatherRisk } from '../types/erp';
import { getWeatherForJob } from '../utils/weather';

interface Shift {
  id: string;
  workerId: string;
  jobId: string;
  date: string;
}

interface CalendarMatrixProps {
  jobs: Job[];
  workers: Worker[];
  shifts: Shift[];
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
  activeWorkerToAssign: Worker | null;
  setActiveWorkerToAssign: React.Dispatch<React.SetStateAction<Worker | null>>;
  WEEK_DAYS: { dayName: string; date: string; shortName: string }[];
  weekOffset: number;
  setWeekOffset: React.Dispatch<React.SetStateAction<number>>;
  selectedMobileDay: string;
  setSelectedMobileDay: React.Dispatch<React.SetStateAction<string>>;
  handleAssignWorker: (workerId: string, jobId: string, date: string) => void;
  handleAssignWorkerFullWeek: (workerId: string, jobId: string) => void;
  handleRemoveShift: (shift: Shift) => void;
  handleDeleteWorker: (workerId: string) => void;
  handleEditWorker: (updatedWorker: Worker) => void;
}

const WeatherIndicator = ({ weather }: { weather: ReturnType<typeof getWeatherForJob> }) => {
  if (!weather) return null;

  return (
    <div className={`p-1.5 px-2 rounded border flex items-center justify-between ${weather.isImpactful ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-[#1a1a1a] border-[#2e2e2e] text-[#a0a0a0]'}`}>
      <div className="flex items-center gap-2">
        {weather.condition === 'Rain' ? <CloudRain className="w-3.5 h-3.5" /> :
         weather.condition === 'Frost' ? <Snowflake className="w-3.5 h-3.5" /> :
         weather.condition === 'Wind' ? <Wind className="w-3.5 h-3.5" /> :
         weather.condition === 'Clear' ? <Sun className="w-3.5 h-3.5 text-amber-500" /> :
         <CloudSun className="w-3.5 h-3.5" />}
        <span className="text-[8.5px] font-black uppercase tracking-widest">{weather.condition}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[8.5px] font-black uppercase tracking-widest">{weather.riskLevel} Risk</span>
        <span className="text-[8.5px] font-black tracking-widest flex items-center gap-1 opacity-80">
          <Thermometer className="w-3 h-3" /> {weather.temperature}°C
        </span>
      </div>
    </div>
  );
};

export const CalendarMatrix: React.FC<CalendarMatrixProps> = ({
  jobs,
  workers,
  shifts,
  setShifts,
  activeWorkerToAssign,
  setActiveWorkerToAssign,
  WEEK_DAYS,
  weekOffset,
  setWeekOffset,
  selectedMobileDay,
  setSelectedMobileDay,
  handleAssignWorker,
  handleAssignWorkerFullWeek,
  handleRemoveShift,
  handleDeleteWorker,
  handleEditWorker
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(jobs[0]?.id || null);
  const followups = [
    { name: 'Riverside P2', keyword: 'Riverside', fallbackId: '1', reason: 'Site Access Auth' },
    { name: 'Marina Dev', keyword: 'Marina', fallbackId: '5', reason: 'Design Variation' },
    { name: 'Oakwood Hub', keyword: 'Oakwood', fallbackId: '2', reason: 'Materials Delay' }
  ];

  const getJobActionRequired = (job: Job) => {
    const weather = getWeatherForJob(job);
    const followup = followups.find(f => job.siteName.toLowerCase().includes(f.keyword.toLowerCase()));
    
    if (weather.isImpactful || followup) {
      return {
        hasAction: true,
        weather: weather.isImpactful ? weather : null,
        followup: followup || null
      };
    }
    return { hasAction: false, weather: null, followup: null };
  };
  
  // Quick Edit Modal State
  const [editingShiftInfo, setEditingShiftInfo] = useState<{ shift: Shift, worker: Worker } | null>(null);
  
  // Form State for Quick Edit
  const [editPhone, setEditPhone] = useState('');

  const filteredJobs = jobs.filter(j => 
    j.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.jobRef.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const getDayShiftsForJob = (jobId: string, date: string) => {
    const explicitShifts = shifts.filter(s => s.jobId === jobId && s.date === date);
    const job = jobs.find(j => j.id === jobId);
    const jobAssignedWorkerIds = job?.assignedWorkers || [];
    
    // Combine explicit shifts and job-level assigned workers
    const assignedWorkerShifts = jobAssignedWorkerIds.map(wId => ({
      id: `job-assigned-${wId}-${date}`,
      workerId: wId,
      jobId: jobId,
      date: date
    }));

    let allShifts = [...explicitShifts];
    for (const js of assignedWorkerShifts) {
      if (!allShifts.some(s => s.workerId === js.workerId)) {
        allShifts.push(js);
      }
    }
    
    // Filter out removed shifts
    allShifts = allShifts.filter(s => !s.isRemoved);
    
    return allShifts;
  };

  return (
    <div className="relative">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Pane: Active Projects List */}
        <div className="w-full lg:w-1/3 bg-[#242424] border border-[#333] rounded-xl flex flex-col shrink-0">
          <div className="p-4 border-b border-[#333]">
            <div className="flex items-center gap-2 text-[8.5px] font-black uppercase tracking-widest text-[#888] mb-3">
              <Briefcase className="w-4 h-4 text-[#5C7285]" />
              Active Projects
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-[#5C7285] transition-colors placeholder:text-[#555]"
              />
            </div>
          </div>
          <div className="flex-1 p-3 space-y-2">
            {filteredJobs.map(job => {
              const isActive = selectedJobId === job.id;
              const action = getJobActionRequired(job);
              return (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isActive 
                      ? 'bg-[#1e1e1e] border-[#5C7285] ring-1 ring-[#5C7285]/30' 
                      : 'bg-[#1a1a1a] border-[#2e2e2e] hover:border-[#444]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[8.5px] font-black text-[#5C7285] tracking-widest uppercase">
                      {job.jobRef}
                    </span>
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[7px] font-black tracking-widest uppercase border ${
                      job.status === 'in-progress' ? 'bg-[#1e2a3a]/80 border-[#3a5a8a] text-[#8ab4f8]' :
                      job.status === 'pending' ? 'bg-[#2a2a1e]/80 border-[#66661a] text-[#c0c040]' :
                      'bg-[#1a2e1a]/80 border-[#3a7a3a] text-[#81c995]'
                    }`}>
                      {job.status.replace('-', ' ')}
                    </span>
                  </div>
                  
                  <h4 className="text-[11px] font-black text-white uppercase tracking-wider truncate mb-1">
                    {job.siteName}
                  </h4>
                  
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#777] uppercase tracking-widest mb-2.5">
                    <MapPin className="w-3 h-3 text-[#555]" />
                    {job.postcode}
                  </div>
                  
                  {/* Action Required Badges */}
                  {(action.weather || action.followup) && (
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-[#333]/50">
                      {action.weather && (
                        <span className="inline-flex items-center w-fit gap-1 rounded bg-[#3a2024]/40 px-1.5 py-0.5 border border-[#ff8591]/20 text-[8.5px] font-black tracking-widest uppercase text-[#ff8591]">
                          <CloudSun className="w-2.5 h-2.5" />
                          {action.weather.condition} ({action.weather.temperature}°C)
                        </span>
                      )}
                      {action.followup && (
                        <span className="inline-flex items-center w-fit gap-1 rounded bg-[#3a2e20]/40 px-1.5 py-0.5 border border-[#f59e0b]/20 text-[8.5px] font-black tracking-widest uppercase text-[#f59e0b]">
                          <AlertCircle className="w-2.5 h-2.5" />
                          {action.followup.reason}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
            {filteredJobs.length === 0 && (
              <div className="text-center py-6 text-[8.5px] font-black uppercase tracking-widest text-[#555]">
                No projects found
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Selected Job Timeline */}
        <div className="w-full lg:w-2/3 bg-[#242424] border border-[#333] rounded-xl flex flex-col">
          {selectedJob ? (
            <>
              <div className="p-5 border-b border-[#333] bg-[#1e1e1e]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3 font-archivo">
                      <Calendar className="w-5 h-5 text-[#5C7285]" />
                      {selectedJob.siteName} Timeline
                    </h2>
                    <div className="text-[8.5px] font-black text-[#888] uppercase tracking-widest mt-1">
                      Weekly Assignment Schedule
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-[#1a1a1a] p-1 rounded-lg border border-[#333]">
                    <button 
                      onClick={() => setWeekOffset(prev => prev - 1)}
                      className="p-1.5 hover:bg-[#2a2a2a] text-[#888] hover:text-white rounded-md transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[9px] font-black text-[#888] uppercase tracking-widest min-w-[120px] text-center whitespace-nowrap">
                      {(() => {
                        if (!WEEK_DAYS || !WEEK_DAYS.length) return '';
                        const format = (dateStr) => {
                          const [y, m, d] = dateStr.split('-');
                          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          return `${d} ${months[parseInt(m, 10) - 1]}`;
                        };
                        return `${format(WEEK_DAYS[0].date)} - ${format(WEEK_DAYS[WEEK_DAYS.length - 1].date)}`;
                      })()}
                    </span>
                    <button 
                      onClick={() => setWeekOffset(prev => prev + 1)}
                      className="p-1.5 hover:bg-[#2a2a2a] text-[#888] hover:text-white rounded-md transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-5 space-y-6">
                {WEEK_DAYS.map(day => {
                  const dayShifts = getDayShiftsForJob(selectedJob.id, day.date);
                  const weather = getWeatherForJob(selectedJob);
                  const isWorkerAssignedHere = activeWorkerToAssign ? dayShifts.some(s => s.workerId === activeWorkerToAssign.id) : false;

                  return (
                    <div key={day.date} className="relative">
                      {/* Day Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">
                            {day.dayName}
                          </h3>
                          <span className="text-[9px] font-bold text-[#666] uppercase tracking-widest">
                            {day.date.split('-')[2]}/{day.date.split('-')[1]}
                          </span>
                        </div>
                      </div>

                      {/* Day Content */}
                      <div className={`bg-[#1a1a1a] border rounded-xl p-3 space-y-3 transition-all ${
                        activeWorkerToAssign && !isWorkerAssignedHere
                          ? 'border-[#5C7285]/40 ring-1 ring-[#5C7285]/20 hover:border-[#5C7285]' 
                          : 'border-[#2e2e2e]'
                      }`}>
                        <WeatherIndicator weather={weather} />
                        
                        {/* Assigned Crew List */}
                        <div className="space-y-2 mt-3 border-t border-[#333] pt-3">
                          <div className="text-[8.5px] font-black text-[#888] uppercase tracking-widest flex justify-between items-center">
                            <span>Deployed Crew ({dayShifts.length})</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {dayShifts.map(shift => {
                              const assignedWorker = workers.find(w => w.id === shift.workerId);
                              if (!assignedWorker) return null;
                              
                              return (
                                <div 
                                  key={shift.id} 
                                  className="flex items-center justify-between bg-[#242424] p-2 rounded-lg border border-[#333] text-left"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-white uppercase tracking-wider leading-none mb-1">{assignedWorker.name}</span>
                                    <span className="text-[9px] font-bold text-[#777] uppercase tracking-widest">{assignedWorker.role}</span>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveShift(shift)}
                                    className="p-1.5 bg-[#1a1a1a] hover:bg-[#333] rounded-md transition-colors text-[#555] hover:text-red-400 border border-[#333] hover:border-red-900/50"
                                    title="Remove from shift"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="relative mt-2">
                            <select
                              onChange={(e) => {
                                if(e.target.value) {
                                  handleAssignWorker(e.target.value, selectedJob.id, day.date);
                                  e.target.value = '';
                                }
                              }}
                              className="w-full bg-[#242424] hover:bg-[#2a2a2a] text-[#aaa] hover:text-white text-[8.5px] font-black uppercase tracking-widest border border-[#3c3c3c] rounded-lg p-2.5 pl-3 focus:outline-none appearance-none cursor-pointer transition-colors"
                              value=""
                            >
                              <option value="" disabled hidden>+ Add Staff</option>
                              {workers
                                .filter(w => !dayShifts.some(s => s.workerId === w.id))
                                .map(w => (
                                  <option key={w.id} value={w.id}>{w.name} - {w.role}</option>
                                ))
                              }
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666] pointer-events-none" />
                          </div>
                        </div>
                        

                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#555] text-[10px] font-black uppercase tracking-widest">
              Select a project to view timeline
            </div>
          )}
        </div>
      </div>

          </div>
  );
};

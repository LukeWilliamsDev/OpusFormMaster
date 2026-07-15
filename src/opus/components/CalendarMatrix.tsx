// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, AlertCircle, ChevronLeft, ChevronRight, 
  Calendar, MapPin, Search, CloudSun, CloudRain, Snowflake, Wind, Sun, Thermometer,
  UserCheck, CheckCircle, X, User, Trash2, Briefcase, LayoutGrid, Layers, Info, UserPlus, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Job, Worker } from '../types/erp';
import { getWeatherForJob } from '../utils/weather';
import { validateWorkerForDeployment } from '../utils/workerValidation';

interface Shift {
  id: string;
  workerId: string;
  jobId: string;
  date: string;
  isRemoved?: boolean;
}

interface CalendarMatrixProps {
  jobs: Job[];
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  shifts: Shift[];
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
  activeWorkerToAssign: Worker | null;
  setActiveWorkerToAssign: React.Dispatch<React.SetStateAction<Worker | null>>;
}

const getWeekDays = (offset: number) => {
  const baseDate = new Date('2026-07-06T00:00:00Z');
  baseDate.setDate(baseDate.getDate() + (offset * 7));
  
  const days = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const shortNames = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  
  for (let i = 0; i < 5; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    days.push({
      dayName: dayNames[i],
      date: d.toISOString().split('T')[0],
      shortName: shortNames[i]
    });
  }
  return days;
};

const WeatherIndicator = ({ weather }: { weather: ReturnType<typeof getWeatherForJob> }) => {
  if (!weather) return null;

  return (
    <div className={`p-1.5 px-2 rounded border flex items-center justify-between ${weather.isImpactful ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-[#16161a] border-[#2a2a30] text-[#a0a0a0]'}`}>
      <div className="flex items-center gap-2">
        {weather.condition === 'Rain' ? <CloudRain className="w-3.5 h-3.5" /> :
         weather.condition === 'Frost' ? <Snowflake className="w-3.5 h-3.5" /> :
         weather.condition === 'Wind' ? <Wind className="w-3.5 h-3.5" /> :
         weather.condition === 'Clear' ? <Sun className="w-3.5 h-3.5 text-amber-500" /> :
         <CloudSun className="w-3.5 h-3.5" />}
        <span className="text-[11px] font-black uppercase tracking-widest">{weather.condition}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-black uppercase tracking-widest">{weather.riskLevel} Risk</span>
        <span className="text-[11px] font-black tracking-widest flex items-center gap-1 opacity-80">
          <Thermometer className="w-3 h-3" /> {weather.temperature}°C
        </span>
      </div>
    </div>
  );
};

const CompactWeatherWarning = ({ weather }: { weather: ReturnType<typeof getWeatherForJob> }) => {
  if (!weather || !weather.isImpactful) return null;

  const isHighRisk = weather.riskLevel === 'High';
  const colorClass = isHighRisk 
    ? 'bg-[#2B1D11] border-[#C3813B] text-[#FFB057]' 
    : 'bg-[#252011] border-[#9E8530] text-[#E0C043]';

  return (
    <div className={`inline-flex items-center justify-between w-full px-2 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-[0.08em] ${colorClass}`}>
      <div className="flex items-center gap-1.5">
        {weather.condition === 'Rain' ? <CloudRain className="w-3 h-3 shrink-0" /> :
         weather.condition === 'Frost' ? <Snowflake className="w-3 h-3 shrink-0" /> :
         weather.condition === 'Wind' ? <Wind className="w-3 h-3 shrink-0" /> :
         <CloudSun className="w-3 h-3 shrink-0" />}
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

export const CalendarMatrix: React.FC<CalendarMatrixProps> = ({
  jobs,
  workers,
  setWorkers,
  shifts,
  setShifts,
  activeWorkerToAssign,
  setActiveWorkerToAssign
}) => {
  const [calendarMode, setCalendarMode] = useState<'grid' | 'timeline'>('grid');
  const [isCompact, setIsCompact] = useState<boolean>(false);
  const [gridSearchQuery, setGridSearchQuery] = useState('');
  const [gridRoleFilter, setGridRoleFilter] = useState<'ALL' | 'Supervisor' | 'Operative' | 'Telehandler' | 'Groundworker'>('ALL');

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const WEEK_DAYS = getWeekDays(weekOffset);

  // Mobile state for tap-to-expand details
  const [expandedMobileShiftId, setExpandedMobileShiftId] = useState<string | null>(null);
  const [expandedMobileProjectId, setExpandedMobileProjectId] = useState<string | null>(null);
  const [mobileActiveDayDate, setMobileActiveDayDate] = useState<string>('2026-07-06');

  // Tablet/desktop active tooltip cell tracking state
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [projectStatusFilter, setProjectStatusFilter] = useState<'ALL' | 'in-progress' | 'pending' | 'completed'>('ALL');

  // Close active tooltip cell when clicking outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.calendar-cell-interactive')) {
        setActiveCellId(null);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  // Keep mobile selected day in sync when the week changes
  useEffect(() => {
    if (WEEK_DAYS && WEEK_DAYS.length > 0) {
      setMobileActiveDayDate(WEEK_DAYS[0].date);
    }
  }, [weekOffset]);

  // Assign worker helper
  const handleAssignWorker = (workerId: string, jobId: string, date: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    // Check if they are already assigned here
    const alreadyAssigned = shifts.some(s => s.workerId === workerId && s.jobId === jobId && s.date === date);
    if (alreadyAssigned) return;

    // Validate tickets
    const validation = validateWorkerForDeployment(worker, worker.role);
    if (!validation.isValid) {
      alert(`DEPLOYMENT BLOCKED: ${worker.name} cannot be assigned. Reason: ${validation.reason}`);
      return;
    }

    // Check if worker is already assigned to a DIFFERENT job on this exact day
    const busyElsewhere = shifts.find(s => s.workerId === workerId && s.date === date && !s.isRemoved);
    if (busyElsewhere) {
      const otherJob = jobs.find(j => j.id === busyElsewhere.jobId);
      if (!confirm(`${worker.name} is already deployed to "${otherJob?.siteName || 'Another project'}" on this day. Reallocate to this project?`)) {
        return;
      }
      // Remove previous assignment on this day
      setShifts(prev => prev.filter(s => s.id !== busyElsewhere.id));
    }

    // Add new shift
    const newShift: Shift = {
      id: `shift-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      workerId,
      jobId,
      date
    };
    setShifts(prev => [...prev, newShift]);
    
    setActiveWorkerToAssign(null);
  };

  const handleRemoveShift = (shift: Shift) => {
    if (shift.id.startsWith('job-assigned-')) {
      setShifts(prev => [
        ...prev,
        {
          id: `removed-${shift.workerId}-${shift.jobId}-${shift.date}`,
          workerId: shift.workerId,
          jobId: shift.jobId,
          date: shift.date,
          isRemoved: true
        }
      ]);
    } else {
      setShifts(prev => prev.filter(s => s.id !== shift.id));
    }
  };

  // Search and selector filters for legacy/Timeline view
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

  const filteredJobs = jobs.filter(j => 
    j.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.jobRef.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const getDayShiftsForJob = (jobId: string, date: string) => {
    const explicitShifts = shifts.filter(s => s.jobId === jobId && s.date === date);
    const job = jobs.find(j => j.id === jobId);
    const jobAssignedWorkerIds = job?.assignedWorkers || [];
    
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
    
    allShifts = allShifts.filter(s => !s.isRemoved);
    return allShifts;
  };

  // Helper to resolve shift for any worker on any day (2D Matrix Grid)
  const getWorkerShiftForDate = (workerId: string, date: string) => {
    const explicit = shifts.find(s => s.workerId === workerId && s.date === date);
    if (explicit) {
      return explicit.isRemoved ? null : explicit;
    }
    
    for (const job of jobs) {
      if (job.assignedWorkers?.includes(workerId)) {
        const removed = shifts.some(s => s.workerId === workerId && s.jobId === job.id && s.date === date && s.isRemoved);
        if (!removed) {
          return {
            id: `job-assigned-${workerId}-${date}`,
            workerId,
            jobId: job.id,
            date
          };
        }
      }
    }
    return null;
  };

  // Filter workers in the 2D matrix
  const filteredGridWorkers = workers.filter(w => {
    if (w.isArchived) return false;
    const matchesSearch = w.name.toLowerCase().includes(gridSearchQuery.toLowerCase()) || 
                          w.role.toLowerCase().includes(gridSearchQuery.toLowerCase());
    const matchesRole = gridRoleFilter === 'ALL' || w.role === gridRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Filter jobs/projects in the 2D Project Matrix
  const filteredGridJobs = jobs.filter(job => {
    const matchesSearch = job.siteName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.jobRef.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = projectStatusFilter === 'ALL' || job.status === projectStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Map JobId to distinct styling classes
  const getJobColorClasses = (jobId: string) => {
    switch (jobId) {
      case '1': // Riverside
        return {
          bg: 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400 hover:bg-emerald-950/60 hover:border-emerald-700/50',
          text: 'text-emerald-400',
          border: 'border-emerald-800/40',
          bullet: 'bg-emerald-500',
          lightBg: 'bg-emerald-500/10'
        };
      case '2': // Oakwood
        return {
          bg: 'bg-blue-950/40 border-blue-800/40 text-blue-400 hover:bg-blue-950/60 hover:border-blue-700/50',
          text: 'text-blue-400',
          border: 'border-blue-800/40',
          bullet: 'bg-blue-500',
          lightBg: 'bg-blue-500/10'
        };
      case '3': // Brentwood (completed)
        return {
          bg: 'bg-purple-950/40 border-purple-800/40 text-purple-400 hover:bg-purple-950/60 hover:border-purple-700/50',
          text: 'text-purple-400',
          border: 'border-purple-800/40',
          bullet: 'bg-purple-500',
          lightBg: 'bg-purple-500/10'
        };
      case '4': // Central Square
        return {
          bg: 'bg-sky-950/40 border-sky-800/40 text-sky-400 hover:bg-sky-950/60 hover:border-sky-700/50',
          text: 'text-sky-400',
          border: 'border-sky-800/40',
          bullet: 'bg-sky-500',
          lightBg: 'bg-sky-500/10'
        };
      case '5': // Marina
        return {
          bg: 'bg-amber-950/40 border-amber-800/40 text-amber-400 hover:bg-amber-950/60 hover:border-amber-700/50',
          text: 'text-amber-400',
          border: 'border-amber-800/40',
          bullet: 'bg-amber-500',
          lightBg: 'bg-amber-500/10'
        };
      default:
        return {
          bg: 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-850',
          text: 'text-gray-400',
          border: 'border-gray-800',
          bullet: 'bg-gray-500',
          lightBg: 'bg-gray-500/10'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar View Control Center */}
      <div className="bg-[#1a1a1e] border border-[#2a2a30] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Navigation / Mode Selection */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setCalendarMode('grid')}
            className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer ${
              calendarMode === 'grid' 
                ? 'bg-[#6C8295] border-[#6C8295] text-white shadow-lg shadow-[#6C8295]/10' 
                : 'bg-[#16161a]/50 border-[#2a2a30] text-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Staff</span>
          </button>
          
          <button
            type="button"
            onClick={() => setCalendarMode('timeline')}
            className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer ${
              calendarMode === 'timeline' 
                ? 'bg-[#6C8295] border-[#6C8295] text-white shadow-lg shadow-[#6C8295]/10' 
                : 'bg-[#16161a]/50 border-[#2a2a30] text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Project</span>
          </button>
        </div>

        {/* Dynamic Controls depending on mode */}
        <div className="flex flex-wrap items-center gap-4 justify-between md:justify-end w-full md:w-auto">
          {calendarMode === 'grid' && (
            <div className="flex items-center gap-2 bg-[#16161a] border border-[#2a2a30] rounded-lg p-1">
              <button
                type="button"
                onClick={() => setIsCompact(true)}
                className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  isCompact ? 'bg-[#2a2a2a] text-white border border-[#3e3e3e]' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Compact
              </button>
              <button
                type="button"
                onClick={() => setIsCompact(false)}
                className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  !isCompact ? 'bg-[#2a2a2a] text-white border border-[#3e3e3e]' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Detailed
              </button>
            </div>
          )}

          {/* Week Date Picker Navigation */}
          <div className="flex items-center gap-1.5 bg-[#16161a] p-1 rounded-lg border border-[#2a2a30]">
            <button 
              type="button"
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-1.5 hover:bg-[#2a2a2a] text-[#888] hover:text-white rounded-md transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-black text-[#888] uppercase tracking-widest min-w-[130px] text-center whitespace-nowrap px-1">
              {(() => {
                if (!WEEK_DAYS || !WEEK_DAYS.length) return '';
                const format = (dateStr: string) => {
                  const [y, m, d] = dateStr.split('-');
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  return `${d} ${months[parseInt(m, 10) - 1]}`;
                };
                return `${format(WEEK_DAYS[0].date)} - ${format(WEEK_DAYS[WEEK_DAYS.length - 1].date)}`;
              })()}
            </span>
            <button 
              type="button"
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-1.5 hover:bg-[#2a2a2a] text-[#888] hover:text-white rounded-md transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {calendarMode === 'grid' ? (
          <motion.div 
            key="grid-mode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* High-Density Grid Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#1a1a1e] p-3 border border-[#2a2a30] rounded-xl">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter staff by name or role..."
                  value={gridSearchQuery}
                  onChange={(e) => setGridSearchQuery(e.target.value)}
                  className="w-full bg-[#16161a] border border-[#2a2a30] text-xs text-white rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#6C8295] transition-colors placeholder:text-gray-600 font-medium"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 items-center justify-end w-full sm:w-auto">
                {['ALL', 'Supervisor', 'Operative', 'Telehandler', 'Groundworker'].map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setGridRoleFilter(role as any)}
                    className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-wider border rounded-md transition-all cursor-pointer ${
                      gridRoleFilter === role 
                        ? 'bg-white/10 text-white border-white/20' 
                        : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* HIGH-DENSITY DESKTOP GRID - Hidden on mobile, shown on md and above */}
            <div className="hidden md:block relative border border-gray-800 rounded-xl bg-gray-950 shadow-xl">
              <div className="w-full scrollbar-thin">
                <table className="w-full border-collapse text-left table-fixed">
                  <thead>
                    <tr className="border-b border-gray-800 bg-[#16161a]">
                      {/* Sticky Upper Left Corner Header */}
                      <th className="sticky top-0 left-0 z-40 bg-[#16161a] border-b border-r border-gray-800 p-3 lg:p-4 w-[20%] shadow-[4px_0_12px_-3px_rgba(0,0,0,0.6)]">
                        <div className="flex flex-col justify-center h-8">
                          <span className="text-[11px] lg:text-[11px] font-black text-white uppercase tracking-[0.2em] truncate">Operative Staff</span>
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Deployment Grid ({filteredGridWorkers.length})</span>
                        </div>
                      </th>
                      
                      {/* Sticky X-Axis Day Headers */}
                      {WEEK_DAYS.map(day => (
                        <th 
                          key={day.date}
                          className="sticky top-0 z-20 bg-[#16161a] border-b border-gray-800 p-3 lg:p-4 text-center w-[16%]"
                        >
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-[11px] lg:text-[11px] font-black text-white uppercase tracking-[0.15em]">{day.dayName}</span>
                            <span className="text-[11px] lg:text-[11px] font-bold text-gray-500 font-mono tracking-wider mt-0.5">
                              {day.date.split('-')[2]}/{day.date.split('-')[1]}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-800">
                    {filteredGridWorkers.map((worker, rowIndex) => (
                      <tr 
                        key={worker.id}
                        className="group/row hover:bg-gray-900/20 transition-colors"
                      >
                        {/* Sticky Y-Axis First Column (Operative Details) */}
                        <td className="sticky left-0 z-30 bg-[#16161a] border-r border-gray-800 p-3 lg:p-4 shadow-[5px_0_15px_-4px_rgba(0,0,0,0.7)] group-hover/row:bg-gray-900 transition-colors">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 font-bold uppercase text-[11px] shrink-0">
                              {worker.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-[11px] lg:text-xs font-bold text-white tracking-wide truncate">{worker.name}</h4>
                              <p className="text-[11px] lg:text-[11px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5 truncate">{worker.role}</p>
                            </div>
                          </div>
                        </td>

                        {/* Cells mapping weekdays */}
                        {WEEK_DAYS.map((day, dayIndex) => {
                          const shift = getWorkerShiftForDate(worker.id, day.date);
                          const job = shift ? jobs.find(j => j.id === shift.jobId) : null;
                          const hasTickets = worker.tickets && worker.tickets.length > 0;
                          const colors = job ? getJobColorClasses(job.id) : null;
                          
                          const cellId = `${worker.id}-${day.date}`;
                          const isTooltipActive = activeCellId === cellId;
                          const isTooltipBelow = rowIndex < 2; // Position tooltip below if in the top rows to prevent viewport cut-off

                          // Determine horizontal adjustment classes to prevent tooltip clipping on screen edges
                          let horizontalClass = 'left-1/2 -translate-x-1/2';
                          let arrowClass = 'left-1/2 -translate-x-1/2';

                          if (dayIndex === 0) {
                            horizontalClass = 'left-0 translate-x-0';
                            arrowClass = 'left-6';
                          } else if (dayIndex === WEEK_DAYS.length - 1) {
                            horizontalClass = 'right-0 left-auto translate-x-0';
                            arrowClass = 'right-6';
                          }

                          return (
                            <td 
                              key={day.date}
                              className="border-r border-gray-800 p-2 lg:p-2.5 align-middle relative hover:bg-gray-900/10 transition-colors text-center"
                            >
                              {job && shift ? (
                                <div 
                                  className="relative group/block h-full calendar-cell-interactive"
                                  onMouseEnter={() => setActiveCellId(cellId)}
                                  onMouseLeave={() => setActiveCellId(null)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveCellId(prev => prev === cellId ? null : cellId);
                                  }}
                                >
                                  {isCompact ? (
                                    /* COMPACT VIEW */
                                    <div 
                                      className={`h-8 w-full border-l-4 rounded flex items-center justify-center font-bold text-[11px] lg:text-[11px] uppercase tracking-widest cursor-pointer transition-all ${colors?.bg} ${colors?.border}`}
                                    >
                                      <span className="truncate px-1">{job.siteName.slice(0, 3)}</span>
                                    </div>
                                  ) : (
                                    /* DETAILED VIEW */
                                    <div 
                                      className={`p-2 rounded-lg border text-left text-[11px] lg:text-[10.5px] font-medium leading-normal cursor-pointer transition-all ${colors?.bg} ${colors?.border} relative`}
                                    >
                                      <div className="flex items-start justify-between gap-1">
                                        <span className="font-bold text-white truncate block w-full">
                                          {job.siteName}
                                        </span>
                                      </div>
                                      <span className="text-[11px] lg:text-[11px] font-black text-gray-400 uppercase tracking-widest block mt-1 truncate">
                                        Ref: {job.jobRef}
                                      </span>
                                    </div>
                                  )}

                                  {/* Delete Shift Button inside Block */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleRemoveShift(shift);
                                    }}
                                    className={`absolute -top-1.5 -right-1.5 p-1 bg-black/95 hover:bg-red-900 border border-gray-800 hover:border-red-700/50 rounded-full text-gray-500 hover:text-white transition-all z-10 shadow-lg cursor-pointer ${
                                      isTooltipActive ? 'opacity-100' : 'opacity-0 group-hover/block:opacity-100'
                                    }`}
                                    title="Deallocate worker from shift"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>

                                  {/* INTERACTIVE POPOVER TOOLTIP */}
                                  <div 
                                    className={`absolute ${isTooltipBelow ? 'top-full mt-2' : 'bottom-full mb-2'} ${horizontalClass} w-64 p-4 bg-[#1a1a1e] border border-[#2a2a30] rounded-xl shadow-2xl transition-all duration-150 z-50 text-left backdrop-blur-md ${
                                      isTooltipActive 
                                        ? 'opacity-100 scale-100 pointer-events-auto' 
                                        : 'opacity-0 scale-95 pointer-events-none'
                                    }`}
                                    onClick={(e) => e.stopPropagation()} // Prevent closing popover when clicking inside it
                                  >
                                    <div className={`absolute ${isTooltipBelow ? 'bottom-full -mb-1 border-b-[#1A1B1E]' : 'top-full -mt-1 border-t-[#1A1B1E]'} ${arrowClass} border-4 border-transparent`}></div>
                                    
                                    <div className="text-[11px] font-black text-gray-500 uppercase tracking-[0.15em] mb-1">
                                      SHIFT ALLOCATION DETAILS
                                    </div>
                                    
                                    <h5 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                                      <Briefcase className="w-3.5 h-3.5 text-[#6C8295]" />
                                      {job.siteName}
                                    </h5>
                                    <p className="text-[11px] font-medium text-gray-400 mb-3">
                                      Ref: {job.jobRef} &bull; Client: {job.mainContractor}
                                    </p>

                                    <div className="pt-2.5 border-t border-gray-800 space-y-2">
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-gray-500 uppercase tracking-widest font-black text-[11px]">Operative:</span>
                                        <span className="text-gray-300 font-bold">{worker.name}</span>
                                      </div>
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-gray-500 uppercase tracking-widest font-black text-[11px]">Deployed Role:</span>
                                        <span className="text-[#6C8295] font-bold">{worker.role}</span>
                                      </div>
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-gray-500 uppercase tracking-widest font-black text-[11px]">Postcode:</span>
                                        <span className="text-gray-300 font-semibold">{job.postcode}</span>
                                      </div>
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-gray-500 uppercase tracking-widest font-black text-[11px]">Date:</span>
                                        <span className="text-gray-300 font-bold font-mono">{day.dayName}, {day.date}</span>
                                      </div>
                                    </div>

                                    {hasTickets && (
                                      <div className="mt-3 pt-2.5 border-t border-gray-800 text-[11px] font-black uppercase tracking-wider text-emerald-400/90 flex items-center gap-1.5">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                        Compliance Authenticated
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                /* Empty allocation slot overlay */
                                <div className="relative group/add min-h-[44px] flex items-center justify-center rounded-lg border border-transparent hover:border-gray-800 hover:bg-gray-900/10 transition-all cursor-pointer">
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleAssignWorker(worker.id, e.target.value, day.date);
                                        e.target.value = '';
                                      }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 bg-[#16161a] text-white"
                                    value=""
                                    title={`Deploy ${worker.name} to project`}
                                  >
                                    <option value="" disabled className="bg-[#16161a] text-white">Deploy Project...</option>
                                    {jobs.filter(j => j.status !== 'completed').map(j => (
                                      <option key={j.id} value={j.id} className="bg-[#16161a] text-white">
                                        {j.siteName} [{j.jobRef}]
                                      </option>
                                    ))}
                                  </select>
                                  
                                  <div className="text-[11px] font-bold text-gray-600 uppercase tracking-widest opacity-0 group-hover/add:opacity-100 transition-opacity pointer-events-none flex items-center gap-1">
                                    <span>+ Allocate</span>
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE INTERACTIVE VIEW - Default on small screens, hidden on md and above */}
            <div className="block md:hidden space-y-4">
              {/* Day selector tabs for quick tap switching - 5 column layout to fit fully on mobile without scrollbars */}
              <div className="grid grid-cols-5 gap-1.5 pb-1">
                {WEEK_DAYS.map(day => {
                  const isActive = mobileActiveDayDate === day.date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setMobileActiveDayDate(day.date)}
                      className={`py-2 text-center rounded-lg border transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-[#6C8295] border-[#6C8295] text-white shadow-md' 
                          : 'bg-[#1a1a1e] border-[#2a2a30] text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="text-[11px] font-black uppercase tracking-wider leading-none">{day.shortName}</div>
                      <div className="text-[11px] font-bold font-mono mt-1">{day.date.split('-')[2]}</div>
                    </button>
                  );
                })}
              </div>

              {/* Stacked Cards list for selected day */}
              <div className="bg-[#1a1a1e] border border-[#2a2a30] rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#2a2a30] pb-2.5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#6C8295]" />
                    {WEEK_DAYS.find(d => d.date === mobileActiveDayDate)?.dayName || 'Selected Day'}
                  </h3>
                  <span className="text-[11px] font-bold text-gray-500 font-mono">{mobileActiveDayDate}</span>
                </div>

                <div className="space-y-2.5">
                  {filteredGridWorkers.map(worker => {
                    const shift = getWorkerShiftForDate(worker.id, mobileActiveDayDate);
                    const job = shift ? jobs.find(j => j.id === shift.jobId) : null;
                    const hasTickets = worker.tickets && worker.tickets.length > 0;
                    const colors = job ? getJobColorClasses(job.id) : null;
                    const isExpanded = expandedMobileShiftId === `${worker.id}-${mobileActiveDayDate}`;

                    return (
                      <div 
                        key={worker.id}
                        className={`border rounded-lg overflow-hidden bg-[#16161a] transition-all ${
                          job ? colors?.border : 'border-[#2a2a30]'
                        }`}
                      >
                        {/* Summary Header Card - stacked layout to avoid truncation */}
                        <div 
                          onClick={() => {
                            if (job) {
                              setExpandedMobileShiftId(isExpanded ? null : `${worker.id}-${mobileActiveDayDate}`);
                            }
                          }}
                          className="p-4 flex flex-col gap-3.5 cursor-pointer hover:bg-white/[0.02]"
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 font-black text-[11px] shrink-0 mt-0.5">
                                {worker.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-white break-words leading-tight">
                                  {worker.name}
                                </h4>
                                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-1.5">
                                  {worker.role}
                                </p>
                              </div>
                            </div>

                            {job && (
                              <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 mt-1 ${
                                isExpanded ? 'rotate-180 text-white' : ''
                              }`} />
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-white/[0.03] w-full">
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest shrink-0">
                              Status / Project:
                            </span>
                            {job ? (
                              <div className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-widest rounded border break-words ${colors?.bg} ${colors?.border}`}>
                                {job.siteName}
                              </div>
                            ) : (
                              /* Tap to Assign Dropdown directly on card summary */
                              <div className="relative w-full sm:w-auto">
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAssignWorker(worker.id, e.target.value, mobileActiveDayDate);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="w-full sm:w-auto bg-[#16161a] border border-dashed border-[#2a2a30] hover:border-gray-600 rounded px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer outline-none text-left bg-[#16161a] text-white"
                                  value=""
                                >
                                  <option value="" disabled className="bg-[#16161a] text-white">+ Deploy / Allocate</option>
                                  {jobs.filter(j => j.status !== 'completed').map(j => (
                                    <option key={j.id} value={j.id} className="bg-[#16161a] text-white">{j.siteName} [{j.jobRef}]</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Collapsible Detail Section (Tap to Expand accordion on Mobile) */}
                        {job && isExpanded && (
                          <div className="border-t border-gray-800/80 bg-[#16161a] p-3 text-left space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-gray-500 uppercase font-black text-[11px] tracking-wider block">Project Name:</span>
                                <span className="text-white font-bold">{job.siteName}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 uppercase font-black text-[11px] tracking-wider block">Contractor / Client:</span>
                                <span className="text-white font-semibold">{job.mainContractor}</span>
                              </div>
                              <div className="mt-1">
                                <span className="text-gray-500 uppercase font-black text-[11px] tracking-wider block">Project Reference:</span>
                                <span className="text-gray-300 font-mono text-[11px]">{job.jobRef}</span>
                              </div>
                              <div className="mt-1">
                                <span className="text-gray-500 uppercase font-black text-[11px] tracking-wider block">Postcode:</span>
                                <span className="text-gray-300 font-semibold">{job.postcode}</span>
                              </div>
                            </div>

                            {hasTickets && (
                              <div className="p-2 bg-emerald-950/20 border border-emerald-900/30 rounded text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                Compliance Verified (Tickets OK)
                              </div>
                            )}

                            <div className="flex gap-2.5 pt-1.5 border-t border-gray-800/85 justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveShift(shift!)}
                                className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/50 border border-red-900/30 rounded text-[11px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3 h-3" /> Deallocate Shift
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* High-Density 2D Project Grid - Fully Refactored for complete visual and interaction parity with Staff Grid */
          <motion.div 
            key="timeline-mode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* High-Density Project Grid Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#1a1a1e] p-3 border border-[#2a2a30] rounded-xl">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter projects by site name or reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#16161a] border border-[#2a2a30] text-xs text-white rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#6C8295] transition-colors placeholder:text-gray-600 font-medium"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 items-center justify-end w-full sm:w-auto">
                {['ALL', 'in-progress', 'pending', 'completed'].map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setProjectStatusFilter(status as any)}
                    className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-wider border rounded-md transition-all cursor-pointer ${
                      projectStatusFilter === status 
                        ? 'bg-white/10 text-white border-white/20' 
                        : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'
                    }`}
                  >
                    {status.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* HIGH-DENSITY DESKTOP PROJECT GRID - Hidden on mobile, shown on md and above */}
            <div className="hidden md:block relative border border-gray-800 rounded-xl bg-gray-950 shadow-xl">
              <div className="w-full scrollbar-thin">
                <table className="w-full border-collapse text-left table-fixed">
                  <thead>
                    <tr className="border-b border-gray-800 bg-[#16161a]">
                      {/* Sticky Upper Left Corner Header */}
                      <th className="sticky top-0 left-0 z-40 bg-[#16161a] border-b border-r border-gray-800 p-3 lg:p-4 w-[20%] shadow-[4px_0_12px_-3px_rgba(0,0,0,0.6)]">
                        <div className="text-[11px] font-black tracking-widest text-gray-500 uppercase">
                          ACTIVE PROJECTS
                        </div>
                      </th>
                      {WEEK_DAYS.map(day => (
                        <th 
                          key={day.date} 
                          className="p-3 lg:p-4 text-center min-w-[120px] lg:min-w-[140px] border-r border-gray-800/60 bg-[#16161a]"
                        >
                          <div className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">{day.dayName}</div>
                          <div className="text-[11px] font-bold font-mono text-gray-600 mt-1">{day.date}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-800">
                    {filteredGridJobs.map((job, rowIndex) => (
                      <tr 
                        key={job.id}
                        className="group/row hover:bg-gray-900/20 transition-colors"
                      >
                        {/* Sticky Left Column: Project Details */}
                        <td className="sticky left-0 z-30 bg-[#16161a] group-hover/row:bg-gray-900/40 border-r border-gray-800 p-3 lg:p-4 shadow-[4px_0_12px_-3px_rgba(0,0,0,0.6)]">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-mono font-bold text-[#8a9bb0] tracking-wider uppercase">
                                {job.jobRef}
                              </span>
                              <div className="text-xs font-bold text-white truncate w-full">
                                {job.siteName}
                              </div>
                              <div className="text-[11px] font-medium text-gray-500 truncate w-full flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5 shrink-0 text-[#6C8295]" />
                                <span>{job.postcode}</span>
                              </div>
                            </div>
                            <CompactWeatherWarning weather={getWeatherForJob(job)} />
                          </div>
                        </td>

                        {/* Cells mapping weekdays */}
                        {WEEK_DAYS.map((day, dayIndex) => {
                          const dayShifts = getDayShiftsForJob(job.id, day.date);
                          const cellId = `project-${job.id}-${day.date}`;
                          const isTooltipActive = activeCellId === cellId;
                          const isTooltipBelow = rowIndex < 2; // Position tooltip below if in top rows to prevent viewport cut-off

                          // Determine horizontal adjustment classes to prevent tooltip clipping on screen edges
                          let horizontalClass = 'left-1/2 -translate-x-1/2';
                          let arrowClass = 'left-1/2 -translate-x-1/2';

                          if (dayIndex === 0) {
                            horizontalClass = 'left-0 translate-x-0';
                            arrowClass = 'left-6';
                          } else if (dayIndex === WEEK_DAYS.length - 1) {
                            horizontalClass = 'right-0 left-auto translate-x-0';
                            arrowClass = 'right-6';
                          }

                          const colors = getJobColorClasses(job.id);

                          return (
                            <td 
                              key={day.date}
                              className="border-r border-gray-800 p-2 lg:p-2.5 align-middle relative hover:bg-gray-900/10 transition-colors text-center font-sans"
                            >
                              <div 
                                className="relative group/block h-full calendar-cell-interactive"
                                onMouseEnter={() => setActiveCellId(cellId)}
                                onMouseLeave={() => setActiveCellId(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveCellId(prev => prev === cellId ? null : cellId);
                                }}
                              >
                                {dayShifts.length > 0 ? (
                                  /* COMPACT / DETAILED ALLOCATED VIEW */
                                  <div 
                                    className={`p-2 lg:p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col items-start text-left min-h-[58px] justify-between relative ${colors?.bg} ${colors?.border}`}
                                  >
                                    {isCompact ? (
                                      /* COMPACT VIEW */
                                      <div className="flex items-center gap-1.5 w-full h-full justify-center min-h-[36px]">
                                        <Users className="w-3.5 h-3.5 text-white/70" />
                                        <span className="font-mono text-xs font-black">{dayShifts.length}</span>
                                      </div>
                                    ) : (
                                      /* DETAILED VIEW */
                                      <>
                                        <div className="text-[11px] font-bold text-white flex items-center gap-1.5 truncate w-full">
                                          <Users className="w-3 h-3 text-[#6C8295] shrink-0" />
                                          <span>{dayShifts.length} Deployed</span>
                                        </div>
                                        <div className="text-[11px] font-semibold text-gray-300 truncate w-full mt-1.5 max-h-[24px] overflow-hidden leading-tight">
                                          {dayShifts.slice(0, 2).map((s, i) => {
                                            const w = workers.find(work => work.id === s.workerId);
                                            return w ? (i > 0 ? `, ${w.name.split(' ')[0]}` : w.name.split(' ')[0]) : '';
                                          })}
                                          {dayShifts.length > 2 && '...'}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  /* EMPTY ALLOCATION CELL PLACEHOLDER */
                                  <div 
                                    className="h-full min-h-[58px] rounded-lg border border-dashed border-gray-800/40 hover:border-gray-700 hover:bg-gray-900/10 transition-all flex items-center justify-center group/add cursor-pointer"
                                  >
                                    <div className="text-[11px] font-bold text-gray-600 uppercase tracking-widest opacity-0 group-hover/add:opacity-100 transition-opacity pointer-events-none flex items-center gap-1">
                                      <span>+ Allocate</span>
                                    </div>
                                  </div>
                                )}

                                {/* INTERACTIVE POPOVER TOOLTIP */}
                                <div 
                                  className={`absolute ${isTooltipBelow ? 'top-full mt-2' : 'bottom-full mb-2'} ${horizontalClass} w-64 p-4 bg-[#1a1a1e] border border-[#2a2a30] rounded-xl shadow-2xl transition-all duration-150 z-50 text-left backdrop-blur-md ${
                                    isTooltipActive 
                                      ? 'opacity-100 scale-100 pointer-events-auto' 
                                      : 'opacity-0 scale-95 pointer-events-none'
                                  }`}
                                  onClick={(e) => e.stopPropagation()} // Prevent closing popover when clicking inside it
                                >
                                  <div className={`absolute ${isTooltipBelow ? 'bottom-full -mb-1 border-b-[#1A1B1E]' : 'top-full -mt-1 border-t-[#1A1B1E]'} ${arrowClass} border-4 border-transparent`}></div>
                                  
                                  <div className="text-[11px] font-black text-gray-500 uppercase tracking-[0.15em] mb-1">
                                    PROJECT ALLOCATION DETAILS
                                  </div>
                                  
                                  <h5 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                                    <Briefcase className="w-3.5 h-3.5 text-[#6C8295]" />
                                    {job.siteName}
                                  </h5>
                                  <p className="text-[11px] font-medium text-gray-400 mb-3">
                                    Ref: {job.jobRef} &bull; Client: {job.mainContractor}
                                  </p>

                                  <div className="space-y-2 text-[11px] text-gray-300">
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-500 uppercase tracking-widest font-black text-[11px]">Date:</span>
                                      <span className="text-gray-300 font-bold font-mono">{day.dayName}, {day.date}</span>
                                    </div>
                                  </div>

                                  {/* Weather Integration */}
                                  <div className="my-2.5">
                                    <WeatherIndicator weather={getWeatherForJob(job)} />
                                  </div>

                                  <div className="text-[11px] font-black text-gray-500 uppercase tracking-[0.15em] mb-1.5 mt-3">
                                    DEPLOYED CREW ({dayShifts.length})
                                  </div>

                                  <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin pr-1 mb-3">
                                    {dayShifts.length === 0 ? (
                                      <div className="text-[11px] text-gray-500 italic py-1">No staff members deployed.</div>
                                    ) : (
                                      dayShifts.map(shift => {
                                        const assignedWorker = workers.find(w => w.id === shift.workerId);
                                        if (!assignedWorker) return null;
                                        return (
                                          <div key={shift.id} className="flex items-center justify-between bg-[#16161a] p-2 rounded-lg border border-[#2a2a30]">
                                            <div className="flex flex-col min-w-0">
                                              <span className="text-[11px] font-bold text-white truncate">{assignedWorker.name}</span>
                                              <span className="text-[11px] font-medium text-gray-400 mt-0.5">{assignedWorker.role}</span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveShift(shift);
                                              }}
                                              className="p-1 hover:bg-red-950/40 rounded transition-colors text-gray-500 hover:text-red-400 border border-[#2a2a30] hover:border-red-900/40 cursor-pointer flex items-center justify-center"
                                              title="Remove from shift"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>

                                  {/* Deployment Dropdown */}
                                  <div className="relative mt-2" onClick={(e) => e.stopPropagation()}>
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleAssignWorker(e.target.value, job.id, day.date);
                                          e.target.value = '';
                                        }
                                      }}
                                      className="w-full bg-[#16161a] hover:bg-[#16161a] text-gray-300 hover:text-white text-[11px] font-semibold border border-[#2a2a30] rounded-lg p-2 pr-8 focus:outline-none appearance-none cursor-pointer transition-colors"
                                      value=""
                                    >
                                      <option value="" disabled hidden className="bg-[#16161a] text-white">+ Add Staff Member</option>
                                      {workers
                                        .filter(w => !w.isArchived && !dayShifts.some(s => s.workerId === w.id))
                                        .map(w => (
                                          <option key={w.id} value={w.id} className="bg-[#16161a] text-white">{w.name} - {w.role}</option>
                                        ))
                                      }
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                  </div>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE INTERACTIVE PROJECT VIEW - Hidden on md and above */}
            <div className="block md:hidden space-y-4">
              {/* Day Selector Tabs */}
              <div className="grid grid-cols-5 gap-1.5 pb-1">
                {WEEK_DAYS.map(day => {
                  const isActive = mobileActiveDayDate === day.date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setMobileActiveDayDate(day.date)}
                      className={`py-2 text-center rounded-lg border transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-[#6C8295] border-[#6C8295] text-white shadow-md' 
                          : 'bg-[#1a1a1e] border-[#2a2a30] text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="text-[11px] font-black uppercase tracking-wider leading-none">{day.shortName}</div>
                      <div className="text-[11px] font-bold font-mono mt-1">{day.date.split('-')[2]}</div>
                    </button>
                  );
                })}
              </div>

              {/* Stacked Cards for Projects */}
              <div className="bg-[#1a1a1e] border border-[#2a2a30] rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#2a2a30] pb-2.5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#6C8295]" />
                    Projects Schedule
                  </h3>
                  <span className="text-[11px] font-bold text-gray-500 font-mono font-mono">
                    {WEEK_DAYS.find(d => d.date === mobileActiveDayDate)?.dayName || 'Selected Day'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {filteredGridJobs.map(job => {
                    const dayShifts = getDayShiftsForJob(job.id, mobileActiveDayDate);
                    const colors = getJobColorClasses(job.id);
                    const isExpanded = expandedMobileProjectId === `${job.id}-${mobileActiveDayDate}`;
                    const weather = getWeatherForJob(job);

                    return (
                      <div 
                        key={job.id}
                        className={`border rounded-lg overflow-hidden bg-[#16161a] transition-all ${colors?.border}`}
                      >
                        {/* Summary Header Card */}
                        <div 
                          onClick={() => {
                            setExpandedMobileProjectId(isExpanded ? null : `${job.id}-${mobileActiveDayDate}`);
                          }}
                          className="p-4 flex flex-col gap-2.5 cursor-pointer hover:bg-white/[0.02]"
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div>
                              <span className="text-[11px] font-mono font-bold text-[#8a9bb0] tracking-wider uppercase">
                                {job.jobRef}
                              </span>
                              <h4 className="text-sm font-bold text-white break-words leading-tight mt-0.5">
                                {job.siteName}
                              </h4>
                              <p className="text-[11px] text-gray-500 font-medium mt-1">
                                Client: {job.mainContractor}
                              </p>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 mt-1 ${
                              isExpanded ? 'rotate-180 text-white' : ''
                            }`} />
                          </div>

                          <CompactWeatherWarning weather={weather} />

                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.03] w-full text-[11px]">
                            <span className="text-gray-500 font-black uppercase tracking-widest text-[11px]">Deployed Crew:</span>
                            <span className="text-white font-bold font-mono">{dayShifts.length} Staff Members</span>
                          </div>
                        </div>

                        {/* Collapsible details (Accordion) */}
                        {isExpanded && (
                          <div className="border-t border-gray-800/80 bg-[#16161a] p-4 text-left space-y-4">
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-gray-500 uppercase font-black text-[11px] tracking-wider block">Postcode:</span>
                                <span className="text-white font-bold">{job.postcode}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 uppercase font-black text-[11px] tracking-wider block">Status:</span>
                                <span className="text-white font-semibold uppercase">{job.status}</span>
                              </div>
                            </div>

                            {/* Weather */}
                            <WeatherIndicator weather={weather} />

                            {/* Crew management list */}
                            <div className="space-y-2 pt-2 border-t border-gray-800/60">
                              <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest block">Allocated Staff:</span>
                              
                              <div className="space-y-2">
                                {dayShifts.length === 0 ? (
                                  <div className="text-[11px] text-gray-500 italic">No workers allocated for this day.</div>
                                ) : (
                                  dayShifts.map(shift => {
                                    const w = workers.find(work => work.id === shift.workerId);
                                    if (!w) return null;
                                    return (
                                      <div key={shift.id} className="flex items-center justify-between bg-[#16161a] p-2.5 rounded-lg border border-gray-800">
                                        <div className="flex flex-col">
                                          <span className="text-xs font-bold text-white">{w.name}</span>
                                          <span className="text-[11px] font-medium text-gray-400 mt-0.5">{w.role}</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveShift(shift)}
                                          className="p-1 bg-[#16161a] hover:bg-red-950/40 rounded transition-colors text-gray-500 hover:text-red-400 border border-gray-800 cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {/* Assignment picker directly on mobile card */}
                              <div className="relative mt-3">
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAssignWorker(e.target.value, job.id, mobileActiveDayDate);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="w-full bg-[#16161a] text-gray-300 text-xs font-semibold border border-gray-800 rounded-lg p-2.5 focus:outline-none appearance-none cursor-pointer"
                                  value=""
                                >
                                  <option value="" disabled hidden className="bg-[#16161a] text-white">+ Deploy Staff Member</option>
                                  {workers
                                    .filter(w => !w.isArchived && !dayShifts.some(s => s.workerId === w.id))
                                    .map(w => (
                                      <option key={w.id} value={w.id} className="bg-[#16161a] text-white">{w.name} - {w.role}</option>
                                    ))
                                  }
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/*
 * PLATFORM NOTES:
 *
 * This calendar cell interaction logic seamlessly caters to both desktop (hover-first) and tablet (touch-first) environments:
 *
 * 1. Desktop Mode (Hover):
 *    - Moving the mouse cursor over any shift allocation cell triggers `onMouseEnter` which updates `activeCellId` with the target cell ID.
 *    - This instantly transitions the tooltip/popover from hidden to visible with a smooth scale and fade transition.
 *    - Moving the mouse cursor away triggers `onMouseLeave` which resets `activeCellId` to `null`, hiding the tooltip immediately.
 *
 * 2. Tablet Mode (Touch):
 *    - Tapping a shift allocation cell triggers the `onClick` handler, toggling `activeCellId` between the cell ID and `null`. This acts as a robust toggle.
 *    - Tapping anywhere else on the document triggers a global click listener (registered via `useEffect` tracking clicks outside `.calendar-cell-interactive`), which resets `activeCellId` to `null` and cleans up any open tooltips.
 *    - Inside the popover, event propagation is stopped via `e.stopPropagation()`, ensuring that interactions with the popover itself (or its children) do not close it.
 */

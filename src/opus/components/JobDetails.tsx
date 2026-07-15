// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { ChevronLeft, CloudRain } from 'lucide-react';
import { Job, Worker } from '../types/erp';
import { getWeatherForJob } from '../utils/weather';

interface PourLog {
  id: string;
  pourNumber: number;
  date: string;
  mixType: string;
  volumeM3: number;
  status: 'completed' | 'on-hold';
  notes: string;
}

interface JobDetailsProps {
  job: Job;
  workers: Worker[];
  onBack: () => void;
  onUpdateJob: (updatedJob: Job) => void;
}

export const JobDetails: React.FC<JobDetailsProps> = ({
  job,
  workers,
  onBack,
  onUpdateJob
}) => {
  const [status, setStatus] = useState<Job['status']>(job.status);
  const [currentPours, setCurrentPours] = useState<number>(job.currentPours || 0);
  const [contractMaxPours, setContractMaxPours] = useState<number>(job.contractMaxPours || 0);

  // Pour logs state
  const [pourLogs, setPourLogs] = useState<PourLog[]>([]);
  const [isAddingPour, setIsAddingPour] = useState(false);
  const [newPourMix, setNewPourMix] = useState('C35/45');
  const [newPourVolume, setNewPourVolume] = useState('34');
  const [newPourNotes, setNewPourNotes] = useState('');

  const weather = getWeatherForJob(job);

  // Sync state if job prop updates
  useEffect(() => {
    setStatus(job.status);
    setCurrentPours(job.currentPours || 0);
    setContractMaxPours(job.contractMaxPours || 0);
  }, [job]);

  // Load mocks of pour logs for this specific job
  useEffect(() => {
    const list: PourLog[] = [];
    const count = job.currentPours || 0;
    for (let i = 1; i <= count; i++) {
      let mixType = 'C32/40';
      let volumeM3 = 30;
      let dateStr = '';
      
      if (i === 5) {
        mixType = 'C35/45';
        volumeM3 = 34;
        dateStr = '2026-07-09';
      } else if (i === 4) {
        mixType = 'C32/40';
        volumeM3 = 28;
        dateStr = '2026-07-06';
      } else {
        mixType = i % 2 === 0 ? 'C32/40' : 'C28/35';
        volumeM3 = 20 + i * 2;
        const dayOffset = (count - i) * 3 + 1;
        const d = new Date();
        d.setDate(d.getDate() - dayOffset);
        dateStr = d.toISOString().split('T')[0];
      }

      list.push({
        id: `${job.id}-pour-${i}`,
        pourNumber: i,
        date: dateStr,
        mixType,
        volumeM3,
        status: 'completed',
        notes: `Structural slab pour #${i} completed successfully.`
      });
    }
    // Reverse the list to show newest pours at the top (like Pour #5 then Pour #4)
    setPourLogs(list.reverse());
  }, [job.id, job.currentPours]);

  const handleStatusChange = (newStatus: Job['status']) => {
    setStatus(newStatus);
    onUpdateJob({ ...job, status: newStatus });
  };

  const handleAddPourSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPourNumber = currentPours + 1;
    const newLog: PourLog = {
      id: `${job.id}-pour-${Date.now()}`,
      pourNumber: newPourNumber,
      date: new Date().toISOString().split('T')[0],
      mixType: newPourMix,
      volumeM3: Number(newPourVolume),
      status: 'completed',
      notes: newPourNotes || `Manual entry pour #${newPourNumber}`
    };

    // Prepend to show newest first
    const updatedLogs = [newLog, ...pourLogs];
    setPourLogs(updatedLogs);
    
    const nextPourCount = currentPours + 1;
    setCurrentPours(nextPourCount);
    
    onUpdateJob({
      ...job,
      currentPours: nextPourCount
    });

    setIsAddingPour(false);
    setNewPourNotes('');
  };

  const formatPourDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const pourPercent = Math.round((currentPours / (contractMaxPours || 1)) * 100);

  return (
    <div className="space-y-6 font-sans text-[#E4E4E7] p-6 max-w-5xl mx-auto bg-[#0F1012] min-h-screen">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-1 text-[#94A3B8] hover:text-white font-medium text-sm transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 text-[#475569]" />
          <span>Job Ledger</span>
        </button>
        <div className="text-xs font-semibold bg-[#1E293B] border border-[#334155] text-[#94A3B8] px-3 py-1 rounded-md font-mono">
          {job.jobRef.replace('-X', '')}
        </div>
      </div>

      {/* Title & Contractor info */}
      <div className="space-y-1 pb-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">{job.siteName}</h1>
        <p className="text-sm text-[#94A3B8]">{job.mainContractor} · <span className="font-mono">{job.postcode}</span></p>
      </div>

      {/* Main Grid: Status & Pour Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Project Status Selector Card */}
        <div className="bg-[#161619] border border-[#27272A] rounded-xl p-5">
          <div className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider mb-4">Project Status</div>
          <div className="flex bg-[#0F1012] p-1 rounded-lg border border-[#27272A] gap-1">
            {(['in-progress', 'pending', 'completed'] as const).map((s) => {
              const isActive = (s === 'in-progress' && status === 'in-progress') || 
                               (s === 'pending' && status === 'pending') || 
                               (s === 'completed' && status === 'completed');
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`flex-1 text-center py-2.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[#3D4E5D] text-white' 
                      : 'text-[#525866] hover:text-[#94A3B8]'
                  }`}
                >
                  {s === 'in-progress' ? 'In Progress' : s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pour Progress Card */}
        <div className="bg-[#161619] border border-[#27272A] rounded-xl p-5">
          <div className="text-[10px] text-[#71717A] font-bold uppercase tracking-wider mb-3">Pour Progress</div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-semibold text-white">{currentPours} of {contractMaxPours} contracted</span>
            <span className="text-[#FF9F0A] text-sm font-bold">{pourPercent}%</span>
          </div>
          <div className="h-1.5 bg-[#27272A] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#FF9F0A] rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, (currentPours / (contractMaxPours || 1)) * 100)}%` }} 
            />
          </div>
        </div>

      </div>

      {/* Compliance / Weather Warning Alert Card */}
      {weather && (
        <div className="bg-[#1C150A] border border-[#45320F] rounded-xl p-4.5 flex items-start gap-3.5">
          <CloudRain className="w-5.5 h-5.5 text-[#FF9F0A] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-[14px] font-bold text-[#FF9F0A]">
              Rain · {weather.riskLevel} Compliance Risk · {weather.temperature}°C
            </div>
            <div className="text-[13px] text-[#FF9F0A]/85">
              Pours should be postponed until conditions improve.
            </div>
          </div>
        </div>
      )}

      {/* Pour History Logs Card */}
      <div className="bg-[#161619] border border-[#27272A] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">Pour History</h2>
          <button 
            onClick={() => setIsAddingPour(!isAddingPour)}
            className="px-3.5 py-1.5 bg-[#161619] border border-[#27272A] hover:bg-[#27272A] rounded-lg text-[12px] font-bold text-white transition-colors cursor-pointer"
          >
            {isAddingPour ? 'Cancel' : '+ Log Pour'}
          </button>
        </div>

        {isAddingPour && (
          <form onSubmit={handleAddPourSubmit} className="mb-4 p-4 bg-[#0F1012] border border-[#27272A] rounded-lg space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-1">Mix Type</label>
                <select
                  value={newPourMix}
                  onChange={(e) => setNewPourMix(e.target.value)}
                  className="w-full bg-[#161619] border border-[#27272A] text-xs text-white rounded-lg px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="C28/35">C28/35</option>
                  <option value="C32/40">C32/40</option>
                  <option value="C35/45">C35/45</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-1">Volume (m³)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newPourVolume}
                  onChange={(e) => setNewPourVolume(e.target.value)}
                  className="w-full bg-[#161619] border border-[#27272A] text-xs text-white rounded-lg px-3 py-2 outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-1">Pour Notes</label>
              <input
                type="text"
                placeholder="Notes..."
                value={newPourNotes}
                onChange={(e) => setNewPourNotes(e.target.value)}
                className="w-full bg-[#161619] border border-[#27272A] text-xs text-white rounded-lg px-3 py-2 outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button type="submit" className="px-4 py-2 bg-[#3D4E5D] text-white font-bold rounded-lg text-xs cursor-pointer">
                Commit Pour Log
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2.5">
          {pourLogs.map((log) => (
            <div key={log.id} className="flex justify-between items-center p-4 bg-[#161619] border border-[#27272A] rounded-xl hover:bg-[#1a1a1f] transition-all">
              <div className="space-y-1">
                <div className="text-sm font-bold text-white">Pour #{log.pourNumber}</div>
                <div className="text-xs text-[#71717A]">{log.mixType} · {log.volumeM3}m³</div>
              </div>
              <div className="text-xs text-[#71717A] font-semibold">{formatPourDate(log.date)}</div>
            </div>
          ))}

          {pourLogs.length === 0 && (
            <div className="py-8 text-center text-xs text-[#525866] uppercase tracking-wider">
              No pours logged yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

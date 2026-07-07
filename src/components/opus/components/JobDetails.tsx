import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Layers, 
  MapPin, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  Activity,
  CloudSun,
  CloudRain,
  Snowflake,
  Wind,
  Sun,
  Thermometer,
  Shield,
  FileText,
  Clock
} from 'lucide-react';
import { Job, WeatherRisk, Worker, Ticket } from '../types/erp';
import { getWeatherForJob } from '../utils/weather';

interface SiteAllocationGatekeeperProps {
  job: Job;
  workers: Worker[];
  onUpdateJob: (updatedJob: Job) => void;
}

export const SiteAllocationGatekeeper: React.FC<SiteAllocationGatekeeperProps> = ({ job, workers, onUpdateJob }) => {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const workersList = workers;

  const assignedWorkerIds = job.assignedWorkers || [];
  const availableWorkers = workersList.filter(w => !assignedWorkerIds.includes(w.id));

  const anchorDate = new Date('2026-07-05');

  const validateWorkerDeployment = (worker: Worker): { isValid: boolean; reason: string | null } => {
    // 1. Must possess a valid, unexpired "CSCS" safety ticket
    const cscsTicket = worker.tickets.find(t => t.type === 'CSCS');
    if (!cscsTicket) {
      return { isValid: false, reason: `DEPLOYMENT BLOCKED: ${worker.name} lacks a CSCS safety ticket.` };
    }
    const cscsExp = new Date(cscsTicket.expiryDate);
    if (cscsExp < anchorDate) {
      return { isValid: false, reason: `DEPLOYMENT BLOCKED: ${worker.name}'s CSCS safety ticket expired on ${cscsTicket.expiryDate}.` };
    }

    // 2. Telehandler role demands active 'Telehandler' ticket
    if (worker.role === 'Telehandler') {
      const telTicket = worker.tickets.find(t => t.type === 'Telehandler');
      if (!telTicket) {
        return { isValid: false, reason: `DEPLOYMENT BLOCKED: ${worker.name} is a Telehandler but lacks a 'Telehandler' qualification ticket.` };
      }
      const telExp = new Date(telTicket.expiryDate);
      if (telExp < anchorDate) {
        return { isValid: false, reason: `DEPLOYMENT BLOCKED: ${worker.name}'s 'Telehandler' qualification expired on ${telTicket.expiryDate}.` };
      }
    }

    // 3. Supervisor role demands active 'Supervisor' ticket
    if (worker.role === 'Supervisor') {
      const supTicket = worker.tickets.find(t => t.type === 'Supervisor');
      if (!supTicket) {
        return { isValid: false, reason: `DEPLOYMENT BLOCKED: ${worker.name} is a Supervisor but lacks a 'Supervisor' qualification ticket.` };
      }
      const supExp = new Date(supTicket.expiryDate);
      if (supExp < anchorDate) {
        return { isValid: false, reason: `DEPLOYMENT BLOCKED: ${worker.name}'s 'Supervisor' qualification expired on ${supTicket.expiryDate}.` };
      }
    }

    return { isValid: true, reason: null };
  };

  const handleDeploy = () => {
    if (!selectedWorkerId) return;
    setErrorMessage(null);

    const worker = workersList.find(w => w.id === selectedWorkerId);
    if (!worker) return;

    const validation = validateWorkerDeployment(worker);
    if (!validation.isValid) {
      setErrorMessage(validation.reason);
      return;
    }

    const updatedAssigned = [...assignedWorkerIds, worker.id];
    onUpdateJob({
      ...job,
      assignedWorkers: updatedAssigned
    });

    setSelectedWorkerId('');
  };

  const handleWithdraw = (workerId: string) => {
    const updatedAssigned = assignedWorkerIds.filter(id => id !== workerId);
    onUpdateJob({
      ...job,
      assignedWorkers: updatedAssigned
    });
  };

  const getTicketStatus = (ticket: { expiryDate: string }) => {
    const expiryDate = new Date(ticket.expiryDate);
    if (expiryDate < anchorDate) {
      return 'Expired';
    }
    
    const diffTime = expiryDate.getTime() - anchorDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 30) {
      return 'ExpiringSoon';
    }
    
    return 'Valid';
  };

  const currentSquad = workersList.filter(w => assignedWorkerIds.includes(w.id));

  return (
    <div className="bg-[#242424] border border-[#333] rounded-xl overflow-hidden p-5 space-y-4">
      <div className="border-b border-[#2e2e2e] pb-3 flex justify-between items-center">
        <div className="flex items-center gap-2.5 text-[11px] font-extrabold tracking-widest uppercase text-[#e0e0e0]">
          <Shield className="w-4 h-4 text-[#5C7285]" />
          Deployment Gatekeeper Matrix
        </div>
        <span className="text-[9px] font-black tracking-widest text-[#555] uppercase">
          Anchor: 05 JUL 2026
        </span>
      </div>

      <div className="space-y-3">
        <div className="text-[9px] font-bold text-[#777] uppercase tracking-widest">
          Deploy Qualified Subcontractor
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedWorkerId}
            onChange={(e) => {
              setSelectedWorkerId(e.target.value);
              setErrorMessage(null);
            }}
            className="flex-1 bg-[#1e1e1e] border border-[#333] text-xs font-bold text-white rounded-lg px-3 py-2 outline-none focus:border-[#5C7285] cursor-pointer uppercase tracking-wider"
          >
            <option value="" disabled className="text-white/20">Select Operative to deploy...</option>
            {availableWorkers.map(w => (
              <option key={w.id} value={w.id}>
                {w.name} &bull; {w.role.toUpperCase()}
              </option>
            ))}
          </select>
          <button
            onClick={handleDeploy}
            disabled={!selectedWorkerId}
            className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-150 ${
              selectedWorkerId 
                ? 'bg-[#5C7285] hover:bg-[#6c8295] text-white cursor-pointer active:scale-95' 
                : 'bg-[#1e1e1e] text-white/20 border border-white/5 cursor-not-allowed'
            }`}
          >
            Deploy Squad
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-start gap-2.5 animate-pulse">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
            {errorMessage}
          </div>
        </div>
      )}

      <div className="space-y-3 pt-2">
        <div className="text-[9px] font-bold text-[#777] uppercase tracking-widest">
          Active Project Crew ({currentSquad.length})
        </div>

        <div className="space-y-2.5">
          {currentSquad.map(worker => (
            <div key={worker.id} className="p-3 bg-[#1c1c1e] border border-[#2e2e2e] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold text-white uppercase tracking-wider">{worker.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[7px] font-black text-white/50 uppercase tracking-widest">
                    {worker.role}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {worker.tickets.map(ticket => {
                    const status = getTicketStatus(ticket);
                    let badgeClass = '';
                    if (status === 'Expired') {
                      badgeClass = 'bg-red-500/10 border-red-500/20 text-red-400';
                    } else if (status === 'ExpiringSoon') {
                      badgeClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse';
                    } else {
                      badgeClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                    }

                    return (
                      <span 
                        key={ticket.id} 
                        className={`px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider border ${badgeClass}`}
                        title={`Ticket #${ticket.ticketNumber} Exp: ${ticket.expiryDate}`}
                      >
                        {ticket.type} ({ticket.expiryDate})
                      </span>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => handleWithdraw(worker.id)}
                className="px-2.5 py-1 bg-transparent hover:bg-red-500/10 border border-[#2e2e2e] hover:border-red-500/30 text-[#666] hover:text-red-400 rounded text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer shrink-0"
              >
                Withdraw
              </button>
            </div>
          ))}

          {currentSquad.length === 0 && (
            <div className="text-center py-6 border border-dashed border-[#2e2e2e] rounded-lg text-[10px] font-bold uppercase tracking-widest text-[#444]">
              No crew deployed to site yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PourLog {
  id: string;
  pourNumber: number;
  date: string;
  mixType: string;
  volumeM3: number;
  status: 'completed' | 'scheduled';
  notes: string;
}

interface JobDetailsProps {
  job: Job;
  workers: Worker[];
  onBack: () => void;
  onUpdateJob: (updatedJob: Job) => void;
}

export const JobDetails: React.FC<JobDetailsProps> = ({ job, workers, onBack, onUpdateJob }) => {
  const [status, setStatus] = useState<Job['status']>(job.status);
  const [currentPours, setCurrentPours] = useState<number>(job.currentPours);
  const [contractMaxPours, setContractMaxPours] = useState<number>(job.contractMaxPours);
  const [scheduleValue, setScheduleValue] = useState<number>(job.scheduleValue);
  
  // Storing/retrieving pour logs in localStorage specific to this job
  const [pourLogs, setPourLogs] = useState<PourLog[]>(() => {
    const key = `opus_job_pours_${job.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing pour logs', e);
      }
    }
    
    // Generate some initial pour logs if none exist
    const logs: PourLog[] = [];
    for (let i = 1; i <= job.currentPours; i++) {
      logs.push({
        id: `${job.id}-pour-${i}`,
        pourNumber: i,
        date: new Date(Date.now() - (job.currentPours - i) * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        mixType: i % 2 === 0 ? 'C32/40 Concrete' : 'C35/45 Concrete',
        volumeM3: 24 + (i * 4) % 15,
        status: 'completed',
        notes: `Standard pour section ${String.fromCharCode(64 + i)} verified by clerk.`
      });
    }
    return logs;
  });

  // State for recording a new pour
  const [isAddingPour, setIsAddingPour] = useState(false);
  const [newPourMix, setNewPourMix] = useState('C35/45 Concrete');
  const [newPourVolume, setNewPourVolume] = useState(30);
  const [newPourNotes, setNewPourNotes] = useState('');

  // Simulated Weather Risk calculation
  const weather = getWeatherForJob(job);

  useEffect(() => {
    localStorage.setItem(`opus_job_pours_${job.id}`, JSON.stringify(pourLogs));
  }, [pourLogs, job.id]);

  const handleStatusChange = (newStatus: Job['status']) => {
    setStatus(newStatus);
    onUpdateJob({
      ...job,
      status: newStatus
    });
  };

  const handleUpdateContractPours = (val: number) => {
    setContractMaxPours(val);
    onUpdateJob({
      ...job,
      contractMaxPours: val
    });
  };

  const handleUpdateScheduleValue = (val: number) => {
    setScheduleValue(val);
    onUpdateJob({
      ...job,
      scheduleValue: val
    });
  };

  const handleAddPourSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPourNumber = pourLogs.length + 1;
    const newLog: PourLog = {
      id: `${job.id}-pour-${Date.now()}`,
      pourNumber: newPourNumber,
      date: new Date().toISOString().split('T')[0],
      mixType: newPourMix,
      volumeM3: Number(newPourVolume),
      status: 'completed',
      notes: newPourNotes || `Manual entry pour #${newPourNumber}`
    };

    const updatedLogs = [...pourLogs, newLog];
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

  // Pour progress percentage
  const pourPercent = Math.min(100, (currentPours / contractMaxPours) * 100);

  return (
    <div className="min-h-screen bg-[#1A1B1E] text-[#e0e0e0] font-sans pb-24 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10">
        
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="px-3 py-1.5 bg-[#242424] hover:bg-[#2d2d2d] border border-[#333] text-[#b0b8c4] hover:text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Ledger</span>
            </button>
            <div className="text-[10px] text-[#555] font-bold uppercase tracking-widest hidden sm:block">
              / Job Control Panel
            </div>
          </div>

          {/* Quick Status Control */}
          <div className="flex items-center gap-3 bg-[#242424] border border-[#333] p-1.5 rounded-lg">
            <span className="text-[9px] font-bold text-[#555] uppercase tracking-widest px-2">Job Status</span>
            <div className="flex gap-1">
              {(['in-progress', 'pending', 'completed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-md transition-all ${
                    status === s 
                      ? s === 'in-progress' ? 'bg-[#1e2a3a] border border-[#2a4060] text-[#6090c0]' :
                        s === 'pending' ? 'bg-[#2a2a1e] border border-[#44440a] text-[#888844]' :
                        'bg-[#1a2e1a] border border-[#2a5a2a] text-[#4a9a4a]'
                      : 'text-[#666] hover:text-[#999] bg-transparent border border-transparent'
                  }`}
                >
                  {s.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="mb-8 bg-[#242424] border border-[#333] rounded-xl overflow-hidden shadow-sm">
          {/* Header Row */}
          <div className="bg-[#1e1e1e] border-b border-[#333] p-4 sm:px-6 flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-extrabold text-[#5C7285] tracking-widest uppercase bg-[#5C7285]/10 border border-[#5C7285]/20 px-3 py-1.5 rounded-md">
              Job Ref: {job.jobRef}
            </span>
          </div>
          
          {/* Main Info */}
          <div className="p-4 sm:p-6 space-y-4">
            <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wide">
              {job.siteName}
            </h1>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-xs text-[#888] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#5C7285]" /> 
                <span className="text-[#e0e0e0]">{job.postcode}</span>
              </div>
              <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-[#444]" />
              <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2e2e2e] px-3 py-1.5 rounded-md w-fit">
                <span className="text-[#666]">Contractor:</span>
                <span className="text-[#e0e0e0]">{job.mainContractor}</span>
              </div>
            </div>

            {/* Weather Warning */}
            {weather && (
              <div className={`mt-6 p-4 border rounded-lg flex items-start gap-3 ${weather.isImpactful ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-[#1e1e1e] border-[#2e2e2e] text-[#a0a0a0]'}`}>
                <div className="mt-0.5 shrink-0">
                  {weather.condition === 'Rain' ? <CloudRain className="w-5 h-5" /> :
                   weather.condition === 'Frost' ? <Snowflake className="w-5 h-5" /> :
                   weather.condition === 'Wind' ? <Wind className="w-5 h-5" /> :
                   weather.condition === 'Clear' ? <Sun className="w-5 h-5 text-amber-500" /> :
                   <CloudSun className="w-5 h-5" />}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                      {weather.condition} • {weather.riskLevel} Risk
                    </span>
                    <span className="text-[10px] font-bold tracking-widest flex items-center gap-1 opacity-80">
                      <Thermometer className="w-3 h-3" /> {weather.temperature}°C
                    </span>
                  </div>
                  <div className="text-xs font-medium leading-relaxed opacity-90">
                    {weather.advice}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

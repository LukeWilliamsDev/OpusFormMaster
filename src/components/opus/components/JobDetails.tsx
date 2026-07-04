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
  Shield,
  FileText,
  Clock
} from 'lucide-react';
import { Job, WeatherRisk } from '../types/erp';
import { getWeatherForJob } from '../utils/weather';

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
  onBack: () => void;
  onUpdateJob: (updatedJob: Job) => void;
}

export const JobDetails: React.FC<JobDetailsProps> = ({ job, onBack, onUpdateJob }) => {
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
  const exceedsContract = currentPours > contractMaxPours;

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
        <div className="mb-8 p-6 bg-[#242424] border border-[#333] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-[#5C7285] tracking-widest uppercase bg-[#5C7285]/10 px-2.5 py-1 rounded">
                Job Ref: {job.jobRef}
              </span>
              {exceedsContract && (
                <span className="text-[9px] font-bold text-red-400 bg-red-950/40 border border-red-900/50 px-2 py-0.5 rounded uppercase tracking-wider">
                  Contract Excess
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide">
              {job.siteName}
            </h1>
            <div className="flex items-center gap-4 text-[11px] text-[#777] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> {job.postcode}
              </span>
              <span>&bull;</span>
              <span>Contractor: {job.mainContractor}</span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4 md:w-80 shrink-0">
            <div className="bg-[#1e1e1e] p-3 border border-[#2e2e2e] rounded-lg">
              <div className="text-[9px] font-bold text-[#555] uppercase tracking-widest">Pours Complete</div>
              <div className="text-xl font-bold text-white mt-1">
                {currentPours} <span className="text-xs text-[#555]">/ {contractMaxPours}</span>
              </div>
            </div>
            <div className="bg-[#1e1e1e] p-3 border border-[#2e2e2e] rounded-lg">
              <div className="text-[9px] font-bold text-[#555] uppercase tracking-widest">Schedule Value</div>
              <div className="text-xl font-bold text-white mt-1">
                £{scheduleValue.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Columns (Details + Pour register) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Concrete Pour Register Card */}
            <div className="bg-[#242424] border border-[#333] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-[#2e2e2e] flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-[11px] font-extrabold tracking-widest uppercase text-[#e0e0e0]">
                  <Layers className="w-4 h-4 text-[#777]" />
                  Pour Register Log
                </div>
                {!isAddingPour && (
                  <button
                    onClick={() => setIsAddingPour(true)}
                    className="px-3 py-1.5 bg-[#5C7285] hover:bg-[#6c8295] text-white text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Concrete Pour</span>
                  </button>
                )}
              </div>

              <div className="p-5">
                {isAddingPour && (
                  <form onSubmit={handleAddPourSubmit} className="mb-6 p-4 bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#b0b8c4] pb-2 border-b border-[#2e2e2e]">
                      Record Concrete Delivery & Pour
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-[#555] uppercase tracking-widest block mb-1.5">Concrete Mix Specification</label>
                        <select 
                          value={newPourMix}
                          onChange={(e) => setNewPourMix(e.target.value)}
                          className="w-full bg-[#1A1B1E] border border-[#2e2e2e] text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-[#5C7285] font-medium"
                        >
                          <option value="C32/40 Concrete">C32/40 Concrete</option>
                          <option value="C35/45 Concrete">C35/45 Concrete</option>
                          <option value="C40/50 Concrete">C40/50 Concrete</option>
                          <option value="C12/15 Concrete">C12/15 Concrete (Muted)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-[#555] uppercase tracking-widest block mb-1.5">Volume (Cubic Meters)</label>
                        <input 
                          type="number"
                          required
                          min="1"
                          value={newPourVolume}
                          onChange={(e) => setNewPourVolume(Number(e.target.value))}
                          className="w-full bg-[#1A1B1E] border border-[#2e2e2e] text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-[#5C7285] font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-[#555] uppercase tracking-widest block mb-1.5">Clerk/Quality Notes</label>
                      <textarea
                        value={newPourNotes}
                        onChange={(e) => setNewPourNotes(e.target.value)}
                        placeholder="Pour placement details, weather at site, batch tick reference..."
                        rows={2}
                        className="w-full bg-[#1A1B1E] border border-[#2e2e2e] text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-[#5C7285] placeholder:text-[#444] font-medium resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingPour(false)}
                        className="px-3 py-1.5 bg-transparent text-[#555] hover:text-[#888] text-[9px] font-bold uppercase tracking-wider transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-[#5C7285] text-white text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors"
                      >
                        Commit Pour Log Entry
                      </button>
                    </div>
                  </form>
                )}

                {pourLogs.length === 0 ? (
                  <div className="py-12 text-center text-[10px] font-bold uppercase tracking-widest text-[#555] space-y-2">
                    <Activity className="w-6 h-6 mx-auto text-[#444] stroke-1" />
                    <div>No pours logged for this contract yet</div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {pourLogs.map((log) => (
                      <div key={log.id} className="p-4 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#b0b8c4]">
                              Pour #{log.pourNumber}
                            </span>
                            <span className="text-[8px] font-extrabold uppercase bg-emerald-950/40 text-emerald-500 border border-emerald-900/30 px-1.5 py-0.5 rounded">
                              Dispatched & Signed
                            </span>
                          </div>
                          <div className="text-[12px] font-bold text-white">
                            {log.mixType} &bull; {log.volumeM3}m³ Volume
                          </div>
                          <p className="text-[10px] text-[#777] font-medium leading-relaxed uppercase">
                            {log.notes}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#555] font-bold uppercase tracking-widest shrink-0">
                          <Clock className="w-3.5 h-3.5 text-[#444]" />
                          <span>{log.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* QA & Specifications Checklist */}
            <div className="bg-[#242424] border border-[#333] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-[#2e2e2e]">
                <div className="flex items-center gap-2.5 text-[11px] font-extrabold tracking-widest uppercase text-[#e0e0e0]">
                  <Shield className="w-4 h-4 text-[#777]" />
                  Site QA & Compliance Audits
                </div>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Sub-grade Compaction Test', checked: true, detail: 'PASSED - Verified by Resident Engineer' },
                  { label: 'Formwork Stability Check', checked: true, detail: 'APPROVED - Struts checked' },
                  { label: 'Reinforcement Fixing Inspection', checked: true, detail: 'PASSED - Cover block clearance verified' },
                  { label: 'Slump Flow Consistency', checked: currentPours > 0, detail: currentPours > 0 ? 'MONITORED - C35 mix checked on arrival' : 'Pending active pour checks' }
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg flex items-start gap-3">
                    <CheckCircle2 className={`w-4.5 h-4.5 shrink-0 mt-0.5 ${item.checked ? 'text-emerald-500' : 'text-[#444]'}`} />
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-extrabold text-white uppercase tracking-wide">{item.label}</div>
                      <div className="text-[9px] text-[#555] uppercase tracking-wider font-bold">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column (Control Panel, Parameters, Weather Risk) */}
          <div className="space-y-8">
            
            {/* Parameters Control Card */}
            <div className="bg-[#242424] border border-[#333] rounded-xl p-5 space-y-5">
              <div className="text-[11px] font-extrabold tracking-widest uppercase text-[#e0e0e0] pb-3 border-b border-[#2e2e2e]">
                Contract Scope & Values
              </div>

              {/* Progress visualizer */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-[#555]">Pour Ledger Capacity</span>
                  <span className={exceedsContract ? 'text-red-400' : 'text-[#b0b8c4]'}>
                    {pourPercent.toFixed(0)}% Utilized
                  </span>
                </div>
                <div className="h-2 w-full bg-[#1A1B1E] border border-[#2e2e2e] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      exceedsContract ? 'bg-red-500' : 'bg-[#5C7285]'
                    }`}
                    style={{ width: `${pourPercent}%` }}
                  />
                </div>
                <div className="text-[9px] text-[#555] uppercase tracking-wide leading-relaxed">
                  {exceedsContract 
                    ? 'Caution: Current pour count exceeds contract maximum. Verify billing for extras.' 
                    : `${contractMaxPours - currentPours} remaining contract pours available before quota limit.`}
                </div>
              </div>

              {/* Edit contract variables */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-[9px] font-bold text-[#555] uppercase tracking-widest block mb-1.5">Contract Quota Pours</label>
                  <input 
                    type="number" 
                    min="1"
                    value={contractMaxPours}
                    onChange={(e) => handleUpdateContractPours(Number(e.target.value))}
                    className="w-full bg-[#1e1e1e] border border-[#333] text-xs font-bold text-white rounded-lg px-3 py-2 outline-none focus:border-[#5C7285]"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-[#555] uppercase tracking-widest block mb-1.5">Schedule Contract Value (£)</label>
                  <input 
                    type="number" 
                    step="500"
                    min="1000"
                    value={scheduleValue}
                    onChange={(e) => handleUpdateScheduleValue(Number(e.target.value))}
                    className="w-full bg-[#1e1e1e] border border-[#333] text-xs font-bold text-white rounded-lg px-3 py-2 outline-none focus:border-[#5C7285]"
                  />
                </div>
              </div>
            </div>

            {/* Weather & Location Risk Evaluation */}
            <div className="bg-[#242424] border border-[#333] rounded-xl p-5 space-y-4">
              <div className="text-[11px] font-extrabold tracking-widest uppercase text-[#e0e0e0] pb-3 border-b border-[#2e2e2e] flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-[#777]" />
                Postcode Weather Risk
              </div>

              <div className="p-4 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[16px] font-black text-white uppercase tracking-wide">
                      {weather.temperature}°C &bull; {weather.condition}
                    </div>
                    <div className="text-[10px] text-[#555] font-bold uppercase tracking-widest mt-0.5">
                      Forecast for {job.postcode}
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-[8px] font-black uppercase tracking-wider border ${
                    weather.riskLevel === 'High' ? 'bg-red-950/40 border-red-900/50 text-red-400' :
                    weather.riskLevel === 'Medium' ? 'bg-amber-950/40 border-amber-900/50 text-amber-400' :
                    'bg-emerald-950/40 border-emerald-900/50 text-emerald-400'
                  }`}>
                    {weather.riskLevel} Risk
                  </span>
                </div>

                <div className="pt-2 border-t border-[#2e2e2e] space-y-2">
                  <div className="text-[9px] text-[#555] uppercase tracking-widest font-black flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Curing Advisory Note
                  </div>
                  <p className="text-[10px] text-[#777] font-medium uppercase leading-relaxed">
                    {weather.advice}
                  </p>
                </div>
              </div>
            </div>

            {/* Document References & Archival */}
            <div className="bg-[#242424] border border-[#333] rounded-xl p-5 space-y-3.5">
              <div className="text-[11px] font-extrabold tracking-widest uppercase text-[#e0e0e0] pb-3 border-b border-[#2e2e2e] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#777]" />
                Contract Files
              </div>
              
              <div className="space-y-2">
                {[
                  { name: 'Signed_Contract_Agreement.pdf', size: '1.4 MB' },
                  { name: 'Formwork_Engineering_Design.pdf', size: '4.2 MB' },
                  { name: 'Slump_Test_Certificates.pdf', size: '840 KB' }
                ].map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] hover:bg-[#1e1e1e] p-1.5 rounded transition-colors cursor-pointer">
                    <span className="font-bold text-[#b0b8c4] truncate max-w-[170px] uppercase tracking-tight">{file.name}</span>
                    <span className="text-[9px] text-[#555] font-semibold shrink-0 uppercase">{file.size}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

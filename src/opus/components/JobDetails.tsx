// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  X, MapPin, Activity, CloudSun, CloudRain, Snowflake, Wind, 
  Sun, Thermometer, ClipboardList, Truck, Phone
} from 'lucide-react';
import { Job, Worker } from '../types/erp';
import { getWeatherForJob } from '../utils/weather';
import { OSMMap } from './OSMMap';
import { SiteAllocationGatekeeper } from './SiteAllocationGatekeeper';

interface Supplier {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: string;
  coords: { lat: number; lng: number };
  services: string[];
}

const getPostcodeCoordinates = (postcode: string): { lat: number; lng: number } => {
  const code = postcode.trim().toUpperCase();
  if (code.startsWith('SW1A')) return { lat: 51.5012, lng: -0.1419 }; // London Riverside
  if (code.startsWith('M1')) return { lat: 53.4808, lng: -2.2350 }; // Manchester Oakwood
  if (code.startsWith('CM14')) return { lat: 51.6216, lng: 0.3017 }; // Brentwood Hub
  if (code.startsWith('B1')) return { lat: 52.4797, lng: -1.9027 }; // Birmingham Central
  if (code.startsWith('EH1')) return { lat: 55.9533, lng: -3.1883 }; // Edinburgh Marina
  
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lat = 51.5 + (Math.abs(hash % 100) / 100) * 3;
  const lng = -0.15 - (Math.abs((hash >> 2) % 100) / 100) * 3;
  return { lat, lng };
};

const getSuppliersForJob = (postcode: string, centerCoords: { lat: number; lng: number }): Supplier[] => {
  const code = postcode.trim().toUpperCase();
  if (code.startsWith('SW1A')) {
    return [
      {
        id: 's-1',
        name: 'Travis Perkins - Westminster',
        address: '110-116 Battersea Park Road, London, SW11 4LY',
        phone: '+44 20 7622 9355',
        distance: '1.2 miles',
        coords: { lat: 51.4772, lng: -0.1512 },
        services: ['Reinforcement Mesh', 'Steel Rebar', 'Formwork Oils', 'Concrete Spacers']
      },
      {
        id: 's-2',
        name: 'Speedy Hire - London Central',
        address: '12-14 Park Street, Southwark, London, SE1 9AB',
        phone: '+44 20 3824 4510',
        distance: '2.1 miles',
        coords: { lat: 51.5050, lng: -0.0930 },
        services: ['Vibrating Pokers', 'Power Floats', 'Concrete Mixers', 'Screed Bar Hire']
      },
      {
        id: 's-3',
        name: 'HSS Hire - Victoria',
        address: '127 Vauxhall Bridge Road, London, SW1V 2EP',
        phone: '+44 20 7828 3212',
        distance: '0.8 miles',
        coords: { lat: 51.4912, lng: -0.1345 },
        services: ['Double Beam Screed', 'Vibrating Plates', 'Wheelbarrows', 'Concrete Slump Kits']
      }
    ];
  }
  if (code.startsWith('M1')) {
    return [
      {
        id: 's-1',
        name: 'Speedy Hire - Manchester City',
        address: '100 Hyde Road, Ardwick, Manchester, M12 5AR',
        phone: '+44 161 273 6611',
        distance: '1.2 miles',
        coords: { lat: 53.4715, lng: -2.2132 },
        services: ['Concrete Mixers', 'Vibrating Pokers', 'Screeders']
      },
      {
        id: 's-2',
        name: 'Jewson - Manchester East',
        address: 'Every Street, Ancoats, Manchester, M4 7ES',
        phone: '+44 161 273 2181',
        distance: '0.9 miles',
        coords: { lat: 53.4811, lng: -2.2175 },
        services: ['Steel Fabric Mesh', 'Concrete Spacers']
      }
    ];
  }
  return [
    {
      id: 's-fb1',
      name: `Speedy Tool & Plant Hire (${code})`,
      address: `Industrial Estate Road, ${code}`,
      phone: '+44 131 999 0122',
      distance: '1.4 miles',
      coords: { lat: centerCoords.lat + 0.005, lng: centerCoords.lng - 0.005 },
      services: ['Vibrating Pokers', 'Compaction Plates', 'Site Mixers', 'Concrete Rakes']
    },
    {
      id: 's-fb2',
      name: `Travis Perkins Reinforcements (${code})`,
      address: `Trade Park Way, ${code}`,
      phone: '+44 131 999 0123',
      distance: '2.1 miles',
      coords: { lat: centerCoords.lat - 0.008, lng: centerCoords.lng + 0.008 },
      services: ['Steel Mesh', 'Rebar Tying Wire', 'Concrete Spacers']
    }
  ];
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
  
  const [pourLogs, setPourLogs] = useState<PourLog[]>(() => {
    const key = `opus_job_pours_${job.id}`;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Error parsing pour logs', e);
        }
      }
    }
    
    const logs: PourLog[] = [];
    for (let i = 1; i <= job.currentPours; i++) {
      logs.push({
        id: `${job.id}-pour-${i}`,
        pourNumber: i,
        date: new Date(Date.now() - (job.currentPours - i) * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        mixType: i % 2 === 0 ? 'C32/40 Concrete' : 'C35/45 Concrete',
        volumeM3: 24 + (i * 4) % 15,
        status: 'completed',
        notes: `Standard pour section ${String.fromCharCode(64 + i)} verified.`
      });
    }
    return logs;
  });

  const [isAddingPour, setIsAddingPour] = useState(false);
  const [newPourMix, setNewPourMix] = useState('C35/45 Concrete');
  const [newPourVolume, setNewPourVolume] = useState(30);
  const [newPourNotes, setNewPourNotes] = useState('');

  const siteCoords = getPostcodeCoordinates(job.postcode);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(siteCoords);

  useEffect(() => {
    const coords = getPostcodeCoordinates(job.postcode);
    setMapCenter(coords);
    setSelectedSupplierId(null);
  }, [job.postcode]);

  const suppliers = getSuppliersForJob(job.postcode, siteCoords);
  const weather = getWeatherForJob(job);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`opus_job_pours_${job.id}`, JSON.stringify(pourLogs));
    }
  }, [pourLogs, job.id]);

  const handleStatusChange = (newStatus: Job['status']) => {
    setStatus(newStatus);
    onUpdateJob({ ...job, status: newStatus });
  };

  const handleUpdateContractPours = (val: number) => {
    setContractMaxPours(val);
    onUpdateJob({ ...job, contractMaxPours: val });
  };

  const handleUpdateScheduleValue = (val: number) => {
    setScheduleValue(val);
    onUpdateJob({ ...job, scheduleValue: val });
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

  const pourPercent = Math.min(100, (currentPours / contractMaxPours) * 100);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end items-end md:items-stretch overflow-hidden">
      {/* 1. Backdrop overlay */}
      <div 
        onClick={onBack}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* 2. Interactive Drawer (Desktop) & Bottom Sheet (Mobile) Panel */}
      <div 
        className="relative w-full md:max-w-2xl lg:max-w-3xl bg-[#1e1e1e] border-t md:border-t-0 md:border-l border-[#2e2e2e] shadow-2xl flex flex-col h-[85vh] md:h-full rounded-t-2xl md:rounded-t-none overflow-hidden transition-transform duration-300 transform translate-y-0 md:translate-y-0 text-white z-10"
      >
        {/* Fixed Header */}
        <div className="bg-[#161618] border-b border-white/5 p-4 sm:p-5 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-brand-accent tracking-widest uppercase bg-brand-accent/10 border border-brand-accent/20 px-2 py-0.5 rounded">
                Ref: {job.jobRef}
              </span>
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                Job Control Center
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight truncate">
              {job.siteName}
            </h2>
          </div>

          <button 
            onClick={onBack}
            className="p-1.5 hover:bg-white/5 rounded-full border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
          
          {/* Quick Stats Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status Control */}
            <div className="bg-[#161618] border border-[#2e2e2e] rounded-xl p-4 flex flex-col justify-between gap-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Project Status</span>
              <div className="flex gap-1 bg-[#121212] p-1 rounded-lg border border-white/5">
                {(['in-progress', 'pending', 'completed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`flex-1 text-center py-1.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      status === s 
                        ? s === 'in-progress' ? 'bg-[#5C7285] text-white shadow' :
                          s === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {s.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Client Context Card */}
            <div className="bg-[#161618] border border-[#2e2e2e] rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Client Contractor</span>
              <div className="text-xs font-black text-white uppercase tracking-wider truncate mt-1">
                {job.mainContractor}
              </div>
              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mt-2">
                <MapPin className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                <span>Postcode: {job.postcode}</span>
              </div>
            </div>
          </div>

          {/* Progress & Value Configuration */}
          <div className="bg-[#161618] border border-[#2e2e2e] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-accent" />
              Slab Progress & Financial Control
            </h3>

            {/* Pour count progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <span>Pours Completed: {currentPours} / {contractMaxPours}</span>
                <span className="font-mono">{pourPercent.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-accent transition-all duration-300"
                  style={{ width: `${pourPercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Contract Max Pours</label>
                <input 
                  type="number"
                  value={contractMaxPours}
                  onChange={(e) => handleUpdateContractPours(Number(e.target.value))}
                  className="w-full bg-[#121212] border border-[#2e2e2e] text-xs font-bold font-mono text-white rounded-lg p-2.5 outline-none focus:border-[#5C7285]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Schedule Value (£)</label>
                <input 
                  type="number"
                  value={scheduleValue}
                  onChange={(e) => handleUpdateScheduleValue(Number(e.target.value))}
                  className="w-full bg-[#121212] border border-[#2e2e2e] text-xs font-bold font-mono text-white rounded-lg p-2.5 outline-none focus:border-[#5C7285]"
                />
              </div>
            </div>
          </div>

          {/* WEATHER WARNING COMPLIANCE advice */}
          {weather && (
            <div className={`p-4 border rounded-xl flex items-start gap-3.5 ${weather.isImpactful ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-[#161618] border-[#2e2e2e] text-[#a0a0a0]'}`}>
              <div className="mt-0.5 shrink-0">
                {weather.condition === 'Rain' ? <CloudRain className="w-5 h-5 text-brand-accent animate-bounce" /> :
                 weather.condition === 'Frost' ? <Snowflake className="w-5 h-5 text-brand-accent" /> :
                 weather.condition === 'Wind' ? <Wind className="w-5 h-5 text-brand-accent" /> :
                 weather.condition === 'Clear' ? <Sun className="w-5 h-5 text-amber-500" /> :
                 <CloudSun className="w-5 h-5 text-brand-accent" />}
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    {weather.condition} • {weather.riskLevel} Compliance Risk
                  </span>
                  <span className="text-[10px] font-bold tracking-widest flex items-center gap-1 opacity-80">
                    <Thermometer className="w-3 h-3 text-brand-accent" /> {weather.temperature}°C
                  </span>
                </div>
                <p className="text-xs font-medium leading-relaxed opacity-90">
                  {weather.advice}
                </p>
              </div>
            </div>
          )}

          {/* WORKFORCE DEPLOYMENT GATEKEEPER */}
          <SiteAllocationGatekeeper 
            job={job}
            workers={workers}
            onUpdateJob={onUpdateJob}
          />

          {/* POUR LOGS & TRACKER */}
          <div className="bg-[#161618] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-[#121212]/60 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#5C7285]" />
                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-white">Pour History Logs</h3>
              </div>
              <button 
                onClick={() => setIsAddingPour(!isAddingPour)}
                className="flex items-center gap-1 bg-[#222] hover:bg-[#2e2e2e] border border-[#3e3e3e] hover:border-gray-600 rounded px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-brand-accent cursor-pointer transition-colors"
              >
                {isAddingPour ? 'Cancel' : '+ Log Pour'}
              </button>
            </div>

            {isAddingPour && (
              <form onSubmit={handleAddPourSubmit} className="p-4 bg-[#121212]/30 border-b border-white/5 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Mix Type</label>
                    <select
                      value={newPourMix}
                      onChange={(e) => setNewPourMix(e.target.value)}
                      className="w-full bg-[#1e1e1e] border border-[#2e2e2e] text-xs font-bold text-white rounded p-2 outline-none cursor-pointer"
                    >
                      <option value="C28/35 Concrete">C28/35 Ready-Mix</option>
                      <option value="C32/40 Concrete">C32/40 Ready-Mix</option>
                      <option value="C35/45 Concrete">C35/45 Heavy Duty</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Volume (m³)</label>
                    <input 
                      type="number"
                      required
                      value={newPourVolume}
                      onChange={(e) => setNewPourVolume(Number(e.target.value))}
                      className="w-full bg-[#1e1e1e] border border-[#2e2e2e] text-xs font-bold font-mono text-white rounded p-2 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Log verification notes</label>
                  <textarea 
                    value={newPourNotes}
                    onChange={(e) => setNewPourNotes(e.target.value)}
                    placeholder="E.g., Structural mesh lay validated, concrete slumped at 120mm..."
                    className="w-full bg-[#1e1e1e] border border-[#2e2e2e] text-xs font-medium text-white placeholder:text-gray-700 rounded p-2 h-16 outline-none resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-[#5C7285] hover:brightness-110 rounded text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all"
                >
                  Verify and Submit Pour Record
                </button>
              </form>
            )}

            <div className="p-4 space-y-3 max-h-[250px] overflow-y-auto scrollbar-thin">
              {pourLogs.map(log => (
                <div key={log.id} className="p-3 bg-[#111]/40 border border-[#2e2e2e] rounded-lg space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white uppercase tracking-wider text-[11px]">Pour #{log.pourNumber}</span>
                    <span className="text-[9px] font-black tracking-wider text-[#5C7285] bg-[#5C7285]/10 px-2 py-0.5 rounded border border-[#5C7285]/20 uppercase">
                      Completed
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span className="font-semibold uppercase">{log.mixType} &bull; {log.volumeM3}m³</span>
                    <span className="font-mono">{log.date}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-normal italic font-medium">
                    "{log.notes}"
                  </p>
                </div>
              ))}
              {pourLogs.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                  No pour logs recorded yet
                </div>
              )}
            </div>
          </div>

          {/* LOGISTICS & SUPPLY LOCATOR MAP */}
          <div className="bg-[#161618] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-[#121212]/60 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand-accent animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-white">Logistics & Supply Locator</h3>
              </div>
              <span className="text-[8px] font-black text-white/50 bg-[#1e1e1e] border border-white/10 rounded px-2 py-0.5">
                Postcode: {job.postcode}
              </span>
            </div>

            <div className="h-[280px] w-full bg-[#111] relative border-b border-[#2e2e2e] flex items-center justify-center overflow-hidden">
              <OSMMap
                center={mapCenter}
                siteCoords={siteCoords}
                siteName={job.siteName}
                postcode={job.postcode}
                suppliers={suppliers}
                selectedSupplierId={selectedSupplierId}
                onSelectSupplier={setSelectedSupplierId}
              />
            </div>

            {/* Suppliers near site */}
            <div className="p-4 space-y-3 bg-[#121212]/20">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2">Nearby Reinforcement & Concrete Suppliers</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suppliers.map(s => {
                  const isSelected = selectedSupplierId === s.id;
                  return (
                    <div 
                      key={s.id}
                      onClick={() => {
                        setSelectedSupplierId(s.id);
                        setMapCenter(s.coords);
                      }}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-brand-accent/10 border-brand-accent' 
                          : 'bg-[#121212] border-[#2e2e2e] hover:border-[#3e3e3e]'
                      }`}
                    >
                      <h4 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center justify-between gap-1">
                        <span className="truncate">{s.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-brand-accent/10 border border-brand-accent/20 text-[7px] shrink-0">
                          {s.distance}
                        </span>
                      </h4>
                      <p className="text-[8px] text-gray-400 uppercase mt-1 truncate">{s.address}</p>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {s.services.slice(0, 2).map((serv, idx) => (
                          <span key={idx} className="px-1 py-0.5 bg-white/5 border border-white/5 text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">
                            {serv}
                          </span>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-2.5 mt-2 border-t border-white/5">
                        <a 
                          href={`tel:${s.phone.replace(/\s+/g, '')}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-[8px] font-bold text-brand-accent uppercase"
                        >
                          <Phone className="w-2.5 h-2.5" /> Call
                        </a>
                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Locate</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
